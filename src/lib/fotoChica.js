// Versión liviana de una foto, para las listas donde se cargan muchas a la vez.
//
// POR QUÉ: en /tienda se muestran las 34 cabeceras de golpe. Con las fotos
// grandes (hasta 316 KB cada una) eso son varios megas en datos móviles antes
// de que se vea nada, y la gente se va antes de que cargue. En una tarjeta de
// 300 px no se nota ninguna diferencia con la grande.
//
// Las fotos del proyecto se guardan junto a su gemela "-sm": las del
// repositorio las hace scripts/elegir-fotos.mjs, y las que se suben desde el
// panel las hace el servidor al recibirlas (ver api/_comprimir.js).
//
// Antes aquí solo se miraban las del repositorio, así que TODA foto subida
// desde el panel se cargaba entera en la rejilla del catálogo — 343 KB en vez
// de 29. No se notó durante meses porque el botón de subir estuvo bloqueado
// por la cuota del almacén y no entró ninguna foto por ese camino.
//
// Las fotos de OTROS sitios sí se devuelven tal cual: de esas no tenemos
// versión chica y pedir una daría un error.
function esNuestra(url) {
  return url.startsWith('/productos/') || /blob\.vercel-storage\.com\/productos\//.test(url);
}

export function fotoChica(url) {
  if (typeof url !== 'string') return url;
  if (!url.endsWith('.webp') || !esNuestra(url)) return url;
  if (url.endsWith('-sm.webp')) return url;
  // Si una foto antigua del almacén no tiene su versión chica, el <img> de
  // ProductImage lo detecta y vuelve sola a la grande: se pierde el ahorro en
  // esa foto, pero nunca se ve un icono roto.
  return url.replace(/\.webp$/, '-sm.webp');
}
