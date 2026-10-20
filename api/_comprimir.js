// Comprimir fotos EN EL SERVIDOR, con las mismas medidas siempre.
//
// POR QUÉ EXISTE: el panel ya encoge la foto en el navegador antes de
// mandarla, pero esa es la única protección que había — y se puede saltar.
// Basta un navegador viejo que no sepa hacerlo, o cualquiera que llame
// directamente a /api/upload, para que entre una foto de 4 MB tal cual.
//
// Así fue como se agotó la cuota gratuita del almacén en agosto de 2026 y las
// subidas quedaron bloqueadas un mes entero. Ahora el servidor comprime
// SIEMPRE, venga de donde venga: lo que se guarda ya no depende de con qué se
// subió.
//
// Las medidas son las mismas que usa scripts/elegir-fotos.mjs para las fotos
// que viven en el repositorio, para que una foto pese igual sin importar por
// qué camino entró.
import sharp from 'sharp';

export const ANCHO_MAX = 1600; // de sobra para pantallas grandes y para hacer zoom
export const ANCHO_CHICA = 400; // la de la rejilla del catálogo
export const CALIDAD = 82; // por encima de 85 el archivo crece sin verse mejor

// La transparencia se conserva entera: las fotos de producto tienen el fondo
// recortado y se tiñen del color que elige el cliente. Si se degrada el canal
// alfa aparecen bordes sucios alrededor del mueble.
const OPCIONES_WEBP = { quality: CALIDAD, alphaQuality: 100, effort: 4 };

/**
 * Deja una foto lista para publicar: la encoge si hace falta y la pasa a WebP.
 *
 * Devuelve { buffer, ancho, alto, antes, despues } para poder decirle al dueño
 * cuánto se ahorró — si no se ve el número, nadie sabe si sirvió de algo.
 */
export async function comprimir(buffer, { ancho = ANCHO_MAX } = {}) {
  const original = buffer.length;
  const img = sharp(buffer, { failOn: 'error' });
  const meta = await img.metadata();

  // `withoutEnlargement` evita agrandar una foto pequeña: estirarla no añade
  // detalle, solo peso.
  const salida = await img
    .rotate() // respeta la orientación de la cámara antes de redimensionar
    .resize({ width: ancho, withoutEnlargement: true })
    .webp(OPCIONES_WEBP)
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: salida.data,
    ancho: salida.info.width,
    alto: salida.info.height,
    antes: original,
    despues: salida.data.length,
    eraMasGrande: (meta.width || 0) > ancho,
  };
}

/**
 * La versión chica para la rejilla del catálogo.
 *
 * El catálogo enseña 49 productos a la vez: cargar las fotos grandes ahí son
 * varios megas por visita. La chica pesa una quinta parte y se ve igual a ese
 * tamaño.
 */
export async function versionChica(buffer) {
  const salida = await sharp(buffer, { failOn: 'error' })
    .rotate()
    .resize({ width: ANCHO_CHICA, withoutEnlargement: true })
    .webp(OPCIONES_WEBP)
    .toBuffer();
  return salida;
}

/** Texto legible del ahorro, para enseñárselo al dueño al subir. */
export function textoAhorro(antes, despues) {
  const kb = (n) => `${Math.round(n / 1024)} KB`;
  if (despues >= antes) return `${kb(despues)}`;
  const pct = Math.round((1 - despues / antes) * 100);
  return `${kb(antes)} → ${kb(despues)} (${pct}% menos)`;
}
