// Variantes de una foto de galería según lo que el cliente elige.
//
// Una ficha de medidas no siempre sirve para todo el producto: la cabecera
// aérea no lleva laterales ni falda y se cuelga en la pared, y la versión sin
// laterales conserva la falda pero tampoco se apoya. Son tres muebles con tres
// fichas, y el cliente tiene que ver la suya.
//
// Vive aquí y no en la página del producto porque el armador de dormitorio
// necesita exactamente lo mismo: si allá se muestra otra cosa, el cliente ve
// una versión en la ficha y otra en el armador.

// Qué regla de variante corresponde a lo elegido.
//
// Las reglas van en LISTA y gana la PRIMERA que calce, porque se solapan: una
// cabecera aérea es además una cabecera sin laterales (se lo impone la regla
// del catálogo), así que "aérea" va primero o se llevaría la ficha equivocada.
export function varianteDe(item, opciones) {
  const reglas = Array.isArray(item?.segunOpcion) ? item.segunOpcion : [];
  return reglas.find((r) => opciones?.[r.grupo] === r.valor) || null;
}

// La foto que toca: la de la variante elegida, si no la del tamaño, si no la
// de siempre.
export function fotoDeGaleria(item, sizeId, opciones) {
  if (typeof item === 'string') return { url: item, tintable: false };
  const fuente = varianteDe(item, opciones) || item;
  const delTamano = fuente.porTamano?.[sizeId];
  return {
    url: delTamano || fuente.url || item.url,
    tintable: Boolean(item.tintable),
    sigueAlTamano: Boolean(delTamano),
  };
}

// El aviso de la variante elegida, si la hay. El texto vive en el catálogo
// junto a la ficha: la tienda no tiene por qué saber qué es "aérea", y el día
// que cambie se cambia en los datos.
export function avisoDeVariante(product, opciones) {
  for (const f of Array.isArray(product?.gallery) ? product.gallery : []) {
    const aviso = varianteDe(f, opciones)?.aviso;
    if (aviso) return aviso;
  }
  return null;
}

// La ficha de medidas de la variante elegida, para poder enseñarla al lado de
// la foto. Devuelve null cuando lo elegido es la versión de siempre: ahí la
// foto ya muestra el mueble y no hace falta aclarar nada.
export function fichaDeVariante(product, opciones, sizeId) {
  for (const f of Array.isArray(product?.gallery) ? product.gallery : []) {
    const v = varianteDe(f, opciones);
    if (!v) continue;
    const url = v.porTamano?.[sizeId] || v.url;
    if (url) return { url, aviso: v.aviso || null };
  }
  return null;
}
