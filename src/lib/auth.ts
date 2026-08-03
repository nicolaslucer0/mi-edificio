import NextAuth, { type DefaultSession } from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { sendMagicLinkEmail } from "./email";
import { users, accounts, sessions, verificationTokens } from "./db/schema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Resend({
      from: process.env.AUTH_RESEND_FROM,
      async sendVerificationRequest({ identifier, url }) {
        await sendMagicLinkEmail({ to: identifier, url });
      },
    }),
  ],
  /**
   * Sesión en un JWT y no en la base.
   *
   * Con estrategia `database` cada request de la app hacía una consulta a
   * Postgres solo para resolver quién sos, antes de tocar nada de la página.
   * El JWT viaja en la cookie y se valida sin salir del proceso.
   *
   * El adapter se mantiene porque el magic link lo necesita para los tokens de
   * verificación y para los usuarios; lo que deja de usarse es la tabla
   * `sessions` (se conserva por si alguna vez se vuelve atrás).
   */
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/verificar",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) return false;
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1);
      return existing.length > 0;
    },
    // Con JWT el id del usuario viaja en `token.sub`, no en un `user` que
    // venga de la base: Auth.js lo pone al firmar y no se vuelve a consultar.
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      if (path.startsWith("/login")) return true;
      return !!auth?.user;
    },
  },
});
