// Versión liviana de una foto, para las listas donde se cargan muchas a la vez.
//
// POR QUÉ: en /tienda se muestran las 34 cabeceras de golpe. Con las fotos
// grandes (hasta 316 KB cada una) eso son varios megas en datos móviles antes
// de que se vea nada, y la gente se va antes de que cargue. En una tarjeta de
// 300 px no se nota ninguna diferencia con la grande.
//
// Las fotos del proyecto se guardan junto a su gemela "-sm" (ver
// scripts/elegir-fotos.mjs). Las de otros sitios se devuelven tal cual, porque
// no tenemos una versión chica de ellas.
export function fotoChica(url) {
  if (typeof url !== 'string') return url;
  if (!url.startsWith('/productos/') || !url.endsWith('.webp')) return url;
  if (url.endsWith('-sm.webp')) return url;
  return url.replace(/\.webp$/, '-sm.webp');
}
