/** Compresión de fotos en el navegador antes de guardarlas (WebP si se puede, si no JPEG). */
export const LADO_MAXIMO = 1200;
export const PESO_MAXIMO = 350 * 1024; // por foto ya comprimida
export const FOTOS_MAXIMAS = 6;

export async function comprimirImagen(archivo: File): Promise<Blob> {
  if (!archivo.type.startsWith("image/")) throw new Error("El archivo no es una imagen.");
  const bmp = await cargar(archivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * escala));
  const h = Math.max(1, Math.round(bmp.height * escala));
  const lienzo = document.createElement("canvas");
  lienzo.width = w;
  lienzo.height = h;
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("El navegador no permite procesar la imagen.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  for (const calidad of [0.82, 0.7, 0.55, 0.4]) {
    const webp = await aBlob(lienzo, "image/webp", calidad);
    const b = webp && webp.type === "image/webp" ? webp : await aBlob(lienzo, "image/jpeg", calidad);
    if (b && b.size <= PESO_MAXIMO) return b;
  }
  throw new Error("La foto sigue muy pesada después de comprimirla. Usa una más pequeña.");
}

function aBlob(c: HTMLCanvasElement, tipo: string, calidad: number): Promise<Blob | null> {
  return new Promise((ok) => c.toBlob((b) => ok(b), tipo, calidad));
}

function cargar(archivo: File): Promise<HTMLImageElement> {
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      ok(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      mal(new Error("No se pudo abrir la imagen."));
    };
    img.src = url;
  });
}
