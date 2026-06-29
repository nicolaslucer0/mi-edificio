import { requireUser } from "@/lib/session";
import { getConsorcioForAdmin } from "@/lib/queries/admin";
import { buildMonthlyReport, isValidPeriod } from "@/lib/reports";

export async function GET(request: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);
  const consorcioId = searchParams.get("consorcioId") ?? "";
  const period = searchParams.get("period") ?? "";

  if (!isValidPeriod(period)) {
    return new Response("Período inválido.", { status: 400 });
  }

  // getConsorcioForAdmin returns null unless the user administers this consorcio.
  const consorcio = await getConsorcioForAdmin(user, consorcioId);
  if (!consorcio) {
    return new Response("No tenés acceso a ese consorcio.", { status: 403 });
  }

  const report = await buildMonthlyReport(consorcioId, period, consorcio.name);

  return new Response(report.csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${report.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
