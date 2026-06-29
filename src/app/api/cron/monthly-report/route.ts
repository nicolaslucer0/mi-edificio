import { db } from "@/lib/db";
import { consorcios } from "@/lib/db/schema";
import {
  buildMonthlyReport,
  previousPeriod,
  reportSummaryText,
} from "@/lib/reports";
import {
  getConsorcioAdminEmails,
  sendMonthlyReportEmail,
} from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const period = previousPeriod();
  const all = await db
    .select({ id: consorcios.id, name: consorcios.name })
    .from(consorcios);

  let sent = 0;
  for (const c of all) {
    const report = await buildMonthlyReport(c.id, period, c.name);
    if (!report.hasData) continue; // no expensas ni gastos ese mes
    const to = await getConsorcioAdminEmails(c.id);
    if (to.length === 0) continue;
    try {
      await sendMonthlyReportEmail({
        to,
        consorcioName: c.name,
        period,
        summaryText: reportSummaryText(report.summary, period),
        csv: report.csv,
        filename: report.filename,
      });
      sent += 1;
    } catch (e) {
      console.error(`Failed to send monthly report for ${c.id}:`, e);
    }
  }

  return Response.json({ ok: true, period, consorcios: all.length, sent });
}
