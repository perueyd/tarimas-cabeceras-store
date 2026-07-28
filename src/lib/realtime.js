// Real-time Sync: WebSockets para sincronización en vivo
// Panel y tienda se actualizan sin recargar

let ws = null;
const listeners = new Map();

export function iniciarRealtime(url = `ws://localhost:5173`) {
  try {
    ws = new WebSocket(url);

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        const { tipo, payload } = data;

        // Notificar listeners
        if (listeners.has(tipo)) {
          listeners.get(tipo).forEach((cb) => cb(payload));
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    });

    ws.addEventListener('open', () => {
      console.log('✅ Real-time conectado');
      notificar('conexion', { estado: 'conectado' });
    });

    ws.addEventListener('close', () => {
      console.log('❌ Real-time desconectado');
      notificar('conexion', { estado: 'desconectado' });
      // Reconectar en 3 segundos
      setTimeout(() => iniciarRealtime(url), 3000);
    });

    return ws;
  } catch (err) {
    console.error('Error al iniciar real-time:', err);
  }
}

export function enviar(tipo, datos) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        tipo,
        datos,
        timestamp: new Date().toISOString(),
      })
    );
  }
}

export function escuchar(tipo, callback) {
  if (!listeners.has(tipo)) {
    listeners.set(tipo, []);
  }
  listeners.get(tipo).push(callback);

  // Retornar función para dejar de escuchar
  return () => {
    const cbs = listeners.get(tipo);
    const idx = cbs.indexOf(callback);
    if (idx > -1) cbs.splice(idx, 1);
  };
}

export function notificar(tipo, datos) {
  enviar(tipo, datos);
}

// Broadcasting de eventos
export const EVENTOS = {
  OFERTA_CREADA: 'oferta:creada',
  OFERTA_ACTUALIZADA: 'oferta:actualizada',
  OFERTA_ELIMINADA: 'oferta:eliminada',
  CODIGO_USADO: 'codigo:usado',
  CLIENTE_NUEVO: 'cliente:nuevo',
  ESTADISTICA_ACTUALIZADA: 'estadistica:actualizada',
  PUNTOS_AGREGADOS: 'puntos:agregados',
  NOTIFICACION: 'notificacion',
};

// Helpers
export function onOfertaCreada(callback) {
  return escuchar(EVENTOS.OFERTA_CREADA, callback);
}

export function onCodigoUsado(callback) {
  return escuchar(EVENTOS.CODIGO_USADO, callback);
}

export function onClienteNuevo(callback) {
  return escuchar(EVENTOS.CLIENTE_NUEVO, callback);
}

export function notificarOfertaCreada(oferta) {
  notificar(EVENTOS.OFERTA_CREADA, oferta);
}

export function notificarCodigoUsado(codigo, cliente) {
  notificar(EVENTOS.CODIGO_USADO, { codigo, cliente });
}

export function notificarClienteNuevo(cliente) {
  notificar(EVENTOS.CLIENTE_NUEVO, cliente);
}
