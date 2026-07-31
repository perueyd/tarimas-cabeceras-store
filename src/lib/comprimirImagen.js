// Encoge y comprime una foto EN EL NAVEGADOR, antes de subirla.
//
// Por qué existe: las fotos salen del celular a 3–5 MB y 4000 px de ancho, y se
// subían tal cual. En la tienda se muestran a 600 px como mucho, así que cada
// visitante descargaba veinte veces más datos de los necesarios. Eso agotó los
// 10 GB de transferencia gratuitos de Vercel Blob y estuvo a punto de dejar la
// tienda sin fotos.
//
// Una foto de 4 MB queda en 150–300 KB sin diferencia visible: entre 15 y 25
// veces menos. Es la diferencia entre agotar el plan gratuito o no acercarse.

const ANCHO_MAX = 1600; // de sobra para pantallas grandes y para hacer zoom
const CALIDAD = 0.82;   // por encima de 0.85 el archivo crece sin verse mejor

// Devuelve un File listo para subir. Si algo falla, devuelve el original: es
// preferible subir una foto pesada que no poder subirla.
export async function comprimirImagen(file) {
  if (!file || !file.type?.startsWith('image/')) return file;
  // Los SVG y GIF no se tocan: uno es texto y el otro perdería la animación.
  if (/svg|gif/i.test(file.type)) return file;

  try {
    const bitmap = await crearBitmap(file);
    const escala = Math.min(1, ANCHO_MAX / bitmap.width);
    const w = Math.round(bitmap.width * escala);
    const h = Math.round(bitmap.height * escala);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    // WebP pesa bastante menos que JPEG con la misma calidad y lo entienden
    // todos los navegadores actuales.
    const tipo = soportaWebp() ? 'image/webp' : 'image/jpeg';
    const blob = await new Promise((r) => canvas.toBlob(r, tipo, CALIDAD));
    if (!blob) return file;

    // Si comprimir no mejoró nada (fotos ya pequeñas), se queda la original.
    if (blob.size >= file.size) return file;

    const ext = tipo === 'image/webp' ? '.webp' : '.jpg';
    const nombre = file.name.replace(/\.[^.]+$/, '') + ext;
    return new File([blob], nombre, { type: tipo });
  } catch {
    return file;
  }
}

function crearBitmap(file) {
  if (window.createImageBitmap) return createImageBitmap(file);
  // Navegadores antiguos: se pasa por un <img>.
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

let cacheWebp = null;
function soportaWebp() {
  if (cacheWebp !== null) return cacheWebp;
  try {
    const c = document.createElement('canvas');
    cacheWebp = c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    cacheWebp = false;
  }
  return cacheWebp;
}

// Para mostrarle al dueño cuánto se ahorró.
export function formatearPeso(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
