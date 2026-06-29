import "server-only";
import { Resend } from "resend";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  memberships,
  users,
  type NotificationPrefs,
} from "@/lib/db/schema";
import { formatCurrencyCents, formatPeriod } from "./format";

const resend = new Resend(process.env.AUTH_RESEND_KEY);
const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

const REQUEST_TIME_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

const SUBJECT_TIME_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

async function getAdminEmails(
  consorcioId: string,
  prefKey: keyof NotificationPrefs,
): Promise<string[]> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      notificationPrefs: users.notificationPrefs,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      or(
        eq(memberships.role, "super_admin"),
        and(
          eq(memberships.role, "admin"),
          eq(memberships.consorcioId, consorcioId),
        ),
      ),
    );

  const seen = new Set<string>();
  const emails: string[] = [];
  for (const r of rows) {
    if (!r.email || seen.has(r.id)) continue;
    seen.add(r.id);
    if (r.notificationPrefs?.[prefKey] === false) continue;
    emails.push(r.email);
  }
  return emails;
}

/** Admin + super-admin emails for a consorcio, without pref filtering. */
export async function getConsorcioAdminEmails(
  consorcioId: string,
): Promise<string[]> {
  const rows = await db
    .select({ id: users.id, email: users.email })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      or(
        eq(memberships.role, "super_admin"),
        and(
          eq(memberships.role, "admin"),
          eq(memberships.consorcioId, consorcioId),
        ),
      ),
    );

  const seen = new Set<string>();
  const emails: string[] = [];
  for (const r of rows) {
    if (!r.email || seen.has(r.id)) continue;
    seen.add(r.id);
    emails.push(r.email);
  }
  return emails;
}

export type MagicLinkParams = {
  to: string;
  url: string;
};

export async function sendMagicLinkEmail(
  params: MagicLinkParams,
): Promise<void> {
  const from = process.env.AUTH_RESEND_FROM ?? "onboarding@resend.dev";
  const now = new Date();
  const requestedAtRaw = REQUEST_TIME_FORMATTER.format(now);
  const requestedAt =
    requestedAtRaw.charAt(0).toUpperCase() + requestedAtRaw.slice(1);
  const timeShort = SUBJECT_TIME_FORMATTER.format(now);

  const subject = `Tu acceso a Mi edificio · ${timeShort}`;

  const text = `Hola,

Acá tenés el link para entrar a Mi edificio:
${params.url}

El enlace expira en 24 horas.
Solicitado: ${requestedAt} (hora Buenos Aires)

Si no pediste este acceso, podés ignorar este mensaje.`;

  const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#18181b;background:#ffffff;">
  <div style="display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:8px;background:#f4f4f5;font-size:13px;font-weight:600;color:#52525b;letter-spacing:0.02em;margin-bottom:24px;">
    <span style="font-size:16px;line-height:1;">🏢</span>
    <span>Mi edificio</span>
  </div>
  <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;letter-spacing:-0.02em;line-height:1.25;">Tu acceso para entrar</h1>
  <p style="line-height:1.6;color:#3f3f46;margin:0 0 24px;font-size:15px;">Tocá el botón para entrar a tu cuenta. No necesitás contraseña.</p>
  <p style="margin:0 0 24px;">
    <a href="${params.url}" style="display:inline-block;padding:14px 28px;background:#18181b;color:#ffffff;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">Entrar a Mi edificio</a>
  </p>
  <p style="line-height:1.6;color:#71717a;font-size:13px;margin:0 0 4px;">El enlace expira en 24 horas.</p>
  <p style="line-height:1.6;color:#71717a;font-size:13px;margin:0 0 24px;">Solicitado: ${escapeHtml(requestedAt)} (hora Buenos Aires)</p>
  <hr style="border:0;border-top:1px solid #e4e4e7;margin:24px 0;">
  <p style="line-height:1.6;color:#a1a1aa;font-size:12px;margin:0;">Si no pediste este acceso, podés ignorar este mensaje sin problema.</p>
</div>`;

  await resend.emails.send({ from, to: params.to, subject, text, html });
}

export type ClaimNotificationParams = {
  consorcioId: string;
  unitLabel: string;
  period: string;
  amountCents: number;
  claimedBy: string;
  note: string | null;
};

export async function sendClaimNotification(
  params: ClaimNotificationParams,
): Promise<void> {
  const to = await getAdminEmails(params.consorcioId, "newClaimToValidate");
  if (to.length === 0) return;

  const from = process.env.AUTH_RESEND_FROM ?? "onboarding@resend.dev";
  const periodLabel = formatPeriod(params.period);
  const amountLabel = formatCurrencyCents(params.amountCents);

  const subject = `Pago por validar: ${periodLabel} — Unidad ${params.unitLabel}`;

  const noteLine = params.note ? `\nNotas del vecino: ${params.note}\n` : "";
  const text = `${params.claimedBy} marcó como pagada la expensa de ${periodLabel} (${amountLabel}) en la unidad ${params.unitLabel}.
${noteLine}
Ingresá a Mi edificio para validar contra el extracto bancario:
${baseUrl}/`;

  const noteHtml = params.note
    ? `<p style="line-height:1.6;"><strong>Notas:</strong> ${escapeHtml(params.note)}</p>`
    : "";

  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#18181b;">
<h2 style="margin:0 0 16px;font-size:20px;">Pago por validar</h2>
<p style="line-height:1.6;"><strong>${escapeHtml(params.claimedBy)}</strong> marcó como pagada la expensa de <strong>${periodLabel}</strong> (<strong>${amountLabel}</strong>) en la <strong>unidad ${escapeHtml(params.unitLabel)}</strong>.</p>
${noteHtml}
<p style="margin-top:24px;"><a href="${baseUrl}/" style="display:inline-block;padding:12px 24px;background:#18181b;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:500;">Validar en Mi edificio</a></p>
<p style="color:#71717a;font-size:13px;line-height:1.5;margin-top:24px;">Validá contra tu extracto bancario antes de confirmar el pago.</p>
</div>`;

  await resend.emails.send({ from, to, subject, text, html });
}

function shouldNotify(
  prefs: NotificationPrefs | null | undefined,
  key: keyof NotificationPrefs,
): boolean {
  return prefs?.[key] !== false;
}

export type PaymentConfirmedParams = {
  to: string;
  period: string;
  amountCents: number;
  unitLabel: string;
  notificationPrefs: NotificationPrefs | null;
};

export async function sendPaymentConfirmedEmail(
  params: PaymentConfirmedParams,
): Promise<void> {
  if (!shouldNotify(params.notificationPrefs, "paymentConfirmed")) return;

  const from = process.env.AUTH_RESEND_FROM ?? "onboarding@resend.dev";
  const periodLabel = formatPeriod(params.period);
  const amountLabel = formatCurrencyCents(params.amountCents);
  const subject = `Pago confirmado: ${periodLabel}`;
  const text = `Tu pago de ${periodLabel} (${amountLabel}) en la unidad ${params.unitLabel} fue confirmado por el administrador.

¡Gracias!`;

  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#18181b;">
<h2 style="margin:0 0 16px;font-size:20px;">Pago confirmado ✓</h2>
<p style="line-height:1.6;">Tu pago de <strong>${periodLabel}</strong> (<strong>${amountLabel}</strong>) en la unidad <strong>${escapeHtml(params.unitLabel)}</strong> fue confirmado por el administrador.</p>
<p style="line-height:1.6;">¡Gracias!</p>
</div>`;

  await resend.emails.send({
    from,
    to: params.to,
    subject,
    text,
    html,
  });
}

export type MonthlyReportEmailParams = {
  to: string[];
  consorcioName: string;
  period: string;
  summaryText: string;
  csv: string;
  filename: string;
};

export async function sendMonthlyReportEmail(
  params: MonthlyReportEmailParams,
): Promise<void> {
  if (params.to.length === 0) return;

  const from = process.env.AUTH_RESEND_FROM ?? "onboarding@resend.dev";
  const periodLabel = formatPeriod(params.period);
  const subject = `Reporte de cobranzas · ${params.consorcioName} · ${periodLabel}`;

  const text = `Reporte de expensas de ${params.consorcioName} — ${periodLabel}.

${params.summaryText}

Adjuntamos el detalle en CSV (se abre con Excel o Google Sheets).`;

  const summaryHtml = params.summaryText
    .split("\n")
    .map((line) => `<p style="margin:0 0 4px;line-height:1.6;">${escapeHtml(line)}</p>`)
    .join("");

  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#18181b;">
<h2 style="margin:0 0 16px;font-size:20px;">Reporte de cobranzas</h2>
<p style="line-height:1.6;"><strong>${escapeHtml(params.consorcioName)}</strong> — ${periodLabel}</p>
<div style="margin:16px 0;padding:16px;border-radius:8px;background:#f4f4f5;font-size:14px;">${summaryHtml}</div>
<p style="color:#71717a;font-size:13px;line-height:1.5;">El detalle completo va adjunto en CSV (Excel / Google Sheets).</p>
</div>`;

  await resend.emails.send({
    from,
    to: params.to,
    subject,
    text,
    html,
    attachments: [
      { filename: params.filename, content: Buffer.from(params.csv, "utf-8") },
    ],
  });
}

export type PaymentRejectedParams = {
  to: string;
  period: string;
  amountCents: number;
  unitLabel: string;
  reason: string;
  notificationPrefs: NotificationPrefs | null;
};

export async function sendPaymentRejectedEmail(
  params: PaymentRejectedParams,
): Promise<void> {
  if (!shouldNotify(params.notificationPrefs, "paymentRejected")) return;

  const from = process.env.AUTH_RESEND_FROM ?? "onboarding@resend.dev";
  const periodLabel = formatPeriod(params.period);
  const amountLabel = formatCurrencyCents(params.amountCents);
  const subject = `Pago rechazado: ${periodLabel}`;
  const text = `El administrador rechazó tu pago de ${periodLabel} (${amountLabel}) en la unidad ${params.unitLabel}.

Motivo: ${params.reason}

Ingresá a Mi edificio y volvé a apretar "Ya pagué" cuando hayas resuelto el problema:
${baseUrl}/expensas`;

  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#18181b;">
<h2 style="margin:0 0 16px;font-size:20px;">Pago rechazado</h2>
<p style="line-height:1.6;">El administrador rechazó tu pago de <strong>${periodLabel}</strong> (<strong>${amountLabel}</strong>) en la unidad <strong>${escapeHtml(params.unitLabel)}</strong>.</p>
<p style="line-height:1.6;"><strong>Motivo:</strong> ${escapeHtml(params.reason)}</p>
<p style="margin-top:24px;"><a href="${baseUrl}/expensas" style="display:inline-block;padding:12px 24px;background:#18181b;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:500;">Ver tus expensas</a></p>
<p style="color:#71717a;font-size:13px;line-height:1.5;margin-top:24px;">Cuando resuelvas el problema, volvé a apretar "Ya pagué".</p>
</div>`;

  await resend.emails.send({
    from,
    to: params.to,
    subject,
    text,
    html,
  });
}
