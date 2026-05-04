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
