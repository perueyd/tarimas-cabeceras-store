import { lazy } from 'react';

// Partes de la tienda que se descargan solo cuando hacen falta (el chat, «Ver
// en mi pared», las páginas del live, servicios, el panel…), con una salida
// para cuando se acaba de publicar una versión nueva.
//
// El fallo que evita: cada pieza lleva una huella en el nombre
// (VerEnMiPared-Ab12Cd.js) y al publicar cambian todas; las viejas dejan de
// existir. Quien tenía la tienda abierta desde antes —en el celular una
// pestaña dura días— pedía la pieza vieja, recibía un 404 y la página entera
// se caía con «Importing a module script failed» (así lo dice Safari; Chrome:
// «Failed to fetch dynamically imported module»). Llegó dos veces a la lista
// de errores del panel: el 13/11/2026 en /tienda y el 17/11/2026 en
// /producto/tarima-clasica.
//
// Reintentar la descarga no sirve: el navegador recuerda que esa pieza falló.
// Lo que sirve es recargar la página, que trae los nombres nuevos. Se recarga
// UNA vez: si vuelve a fallar en el minuto siguiente, el problema es otro y
// tiene que verse (y avisarse) en vez de recargar sin fin.
const CLAVE = 'ed-recarga-por-version';
const UN_MINUTO = 60_000;

// Devuelve true si va a recargar. Los parámetros son para las pruebas.
export function recargarUnaVez({
  almacen = globalThis.sessionStorage,
  recargar = () => window.location.reload(),
  ahora = Date.now(),
} = {}) {
  try {
    if (ahora - Number(almacen.getItem(CLAVE) || 0) < UN_MINUTO) return false;
    almacen.setItem(CLAVE, String(ahora));
  } catch {
    // Sin dónde apuntar que ya se recargó, no hay forma de evitar un bucle.
    return false;
  }
  recargar();
  return true;
}

// Envuelve la descarga de una pieza: si falla, recarga la página una vez.
// Mientras recarga devuelve una promesa que nunca termina, para que siga
// viéndose el «cargando…» en vez del mensaje de error.
export function conRecarga(cargar, recargar = recargarUnaVez) {
  return () =>
    cargar().catch((error) => {
      if (recargar()) return new Promise(() => {});
      throw error;
    });
}

// Igual que lazy() de React, con la salida de arriba. Úsalo en vez de lazy():
// una prueba (pruebas/piezas.test.js) avisa si queda alguna pieza sin ella.
export const lazyConRecarga = (cargar) => lazy(conRecarga(cargar));
