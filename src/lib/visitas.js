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

const ULTIMA = new Map(); // ruta -> cuándo se avisó por última vez
const ESPERA_MS = 30_000; // la misma ruta no se cuenta dos veces en 30 segundos

export function contarVisita(ruta) {
  try {
    // El panel es del dueño. Si tiene la sesión abierta, no cuenta.
    // La clave tiene que ser EXACTAMENTE la que usa src/pages/Orders.jsx
    // (CLAVE_STORAGE): con un nombre que no existiera, esta guarda no haría
    // nada y el dueño se contaría a sí mismo cada vez que revisa su tienda.
    if (sessionStorage.getItem('ed-orders-key')) return;
    if (ruta.startsWith('/pedidos')) return;

    const ahora = Date.now();
    if (ahora - (ULTIMA.get(ruta) || 0) < ESPERA_MS) return;
    ULTIMA.set(ruta, ahora);

    const cuerpo = JSON.stringify({ ruta, desde: document.referrer || '' });

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
