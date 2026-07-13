import { requireUser } from "@/lib/session";
import {
  getClaimReceiptUrl,
  getDepositReceiptUrl,
} from "@/lib/queries/expenses";
import { getExpenditureById } from "@/lib/queries/expenditures";
import { getPrivateReceipt } from "@/lib/receipts";

/**
 * Serves a private receipt blob to an authorized user. Receipts live in a
 * private Vercel Blob store, so they can't be linked directly — this route
 * authorizes the request against the owning record and streams the file back.
 *
 * - `kind = "claim"`      → payment claim receipt (vecino's proof of payment)
 * - `kind = "expenditure"` → expenditure receipt (admin's invoice/factura)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const user = await requireUser();
  const { kind, id } = await params;

  let url: string | null = null;
  if (kind === "claim") {
    url = await getClaimReceiptUrl(user, id);
  } else if (kind === "deposit") {
    url = await getDepositReceiptUrl(user, id);
  } else if (kind === "expenditure") {
    const expenditure = await getExpenditureById(user, id);
    url = expenditure?.receiptUrl ?? null;
  } else {
    return new Response("No encontrado.", { status: 404 });
  }

  // A null url means either the receipt doesn't exist or the user isn't
  // allowed to see it — collapse both into 404 to avoid leaking existence.
  if (!url) return new Response("No encontrado.", { status: 404 });

  const receipt = await getPrivateReceipt(url);
  if (!receipt) return new Response("No encontrado.", { status: 404 });

  return new Response(receipt.stream, {
    status: 200,
    headers: {
      "Content-Type": receipt.contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    },
  });
}
