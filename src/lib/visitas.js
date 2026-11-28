// Avisa al servidor de que alguien está viendo una página.
//
// Es la mitad del contador de visitas; la otra está en api/_rutas/visitas.js.
//
// TRES REGLAS que se respetan aquí:
//
// 1. Nunca puede romper ni frenar la tienda. Si el aviso falla, se ignora en
//    silencio: un contador caído no es motivo para que un cliente vea un error.
//
// 2. No manda NADA de la persona. Solo la ruta que está mirando y el dominio
//    desde el que llegó. Ni IP, ni identificador, ni cookie — por eso no hace
//    falta pedirle permiso, y por eso tampoco se pueden contar visitantes
//    únicos, solo visitas.
//
// 3. No cuenta al dueño. Cuando está dentro del panel, sus propias vueltas por
//    la tienda ensuciarían los números justo cuando más los mira.
//    Antes solo se le reconocía en la MISMA pestaña del panel: desde otra
//    pestaña o desde su celular sí contaba, y en noviembre de 2026 sus pruebas
//    inflaron la gráfica (lo preguntó él, 28/11/2026). Ahora el aparato donde
//    entró al panel queda marcado para siempre (NO_CONTAR, en localStorage).
//    La marca es solo un «1»: no es la clave ni sirve para entrar.
//
// 4. No cuenta navegadores automáticos (navigator.webdriver): las revisiones
//    automáticas de la tienda recorren decenas de páginas cada vez.

/** Marca de «este aparato es del dueño». La pone src/pages/panel/sesion.js. */
export const NO_CONTAR = 'ed-no-contar';

const ULTIMA = new Map(); // ruta -> cuándo se avisó por última vez
const ESPERA_MS = 30_000; // la misma ruta no se cuenta dos veces en 30 segundos

export function contarVisita(ruta) {
  try {
    // El panel es del dueño. Si tiene la sesión abierta, no cuenta.
    // La clave tiene que ser EXACTAMENTE la que usa src/pages/Orders.jsx
    // (CLAVE_STORAGE): con un nombre que no existiera, esta guarda no haría
    // nada y el dueño se contaría a sí mismo cada vez que revisa su tienda.
    if (sessionStorage.getItem('ed-orders-key')) {
      // Ya tenía el panel abierto antes de existir la marca: se pone ahora.
      localStorage.setItem(NO_CONTAR, '1');
      return;
    }
    if (localStorage.getItem(NO_CONTAR)) return;
    if (navigator.webdriver) return;
    if (ruta.startsWith('/panel')) return;

    const ahora = Date.now();
    if (ahora - (ULTIMA.get(ruta) || 0) < ESPERA_MS) return;
    ULTIMA.set(ruta, ahora);

    // ?origen=instagram en la dirección compartida dice de qué red vino (las
    // apps no lo dicen solas). Solo es una palabra; el servidor la valida.
    let origen = '';
    try {
      origen = new URLSearchParams(location.search).get('origen') || '';
    } catch {
      origen = '';
    }
    const cuerpo = JSON.stringify({ ruta, desde: document.referrer || '', origen });

    // sendBeacon sigue funcionando aunque la persona cierre la pestaña justo
    // después, y no retrasa nada de lo que está cargando. Si el navegador no
    // lo tiene, se usa fetch con keepalive, que hace lo mismo.
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/visitas', new Blob([cuerpo], { type: 'application/json' }));
    } else {
      fetch('/api/visitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: cuerpo,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Modo incógnito, almacenamiento bloqueado, lo que sea: da igual.
  }
}
