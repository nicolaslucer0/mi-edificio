/**
 * Achica una foto en el teléfono antes de subirla. Una foto de un celular
 * actual pesa entre 3 y 8 MB, el comprobante se corta en 4 MB y la subida
 * en 5: sin esto, la mitad de las fotos no llegaban. A 1600 px de lado y en
 * JPEG, un comprobante queda en unos cientos de KB y se sigue leyendo bien.
 *
 * Solo para el navegador (usa canvas). Si algo falla —un formato que el
 * navegador no sabe abrir—, devuelve el archivo tal cual y que decida el
 * servidor.
 */

/** El mismo tope que valida el servidor en lib/receipts.ts. */
export const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;

const MAX_SIDE = 1600;
const QUALITY = 0.82;

export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    // Una captura chica en PNG puede pesar menos que su versión en JPEG.
    if (!blob || blob.size >= file.size) return file;
    const name = `${file.name.replace(/\.[^.]+$/, "") || "comprobante"}.jpg`;
    return new File([blob], name, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
