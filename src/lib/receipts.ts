import "server-only";
import { put, del } from "@vercel/blob";

const MAX_RECEIPT_SIZE = 4 * 1024 * 1024;

export type UploadReceiptResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function uploadReceipt(file: File): Promise<UploadReceiptResult> {
  if (file.size > MAX_RECEIPT_SIZE) {
    return { ok: false, error: "El comprobante supera los 4MB." };
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      ok: false,
      error:
        "Falta configurar Vercel Blob (BLOB_READ_WRITE_TOKEN) para subir archivos.",
    };
  }
  try {
    const safeName = file.name.replaceAll(/[^\w.-]/g, "_");
    const blob = await put(`receipts/${crypto.randomUUID()}-${safeName}`, file, {
      access: "public",
      addRandomSuffix: false,
    });
    return { ok: true, url: blob.url };
  } catch (e) {
    console.error("Failed to upload receipt:", e);
    return {
      ok: false,
      error: "No pudimos subir el comprobante. Probá de nuevo.",
    };
  }
}

export async function deleteReceipt(url: string | null): Promise<void> {
  if (!url || !process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(url);
  } catch (e) {
    console.error("Failed to delete blob:", e);
  }
}

export function getReceiptFile(formData: FormData): File | null {
  const raw = formData.get("receipt");
  if (raw instanceof File && raw.size > 0) return raw;
  return null;
}
