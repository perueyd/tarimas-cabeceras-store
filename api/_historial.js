// Historial de códigos promocionales usados en pedidos
// Permite trazabilidad: qué cliente usó qué código, cuándo, etc.
import { hasDB, redisCmd } from './_store.js';

const KEY = 'historial:codigos';

export async function agregarAlHistorial(codigo, cliente, monto, descuento) {
  if (!hasDB) return;
  try {
    const registro = {
      codigo,
      cliente: {
        nombre: cliente.nombre || '',
        telefono: cliente.telefono || '',
        email: cliente.email || '',
      },
      monto,
      descuento,
      fecha: new Date().toISOString(),
    };

    const data = await redisCmd(['GET', KEY]);
    let historial = [];
    if (data.result) {
      try {
        historial = JSON.parse(data.result);
      } catch {
        historial = [];
      }
    }

    historial.push(registro);
    // Guardar solo los últimos 10,000 registros (limite de espacio)
    if (historial.length > 10000) {
      historial = historial.slice(-10000);
    }

    await redisCmd(['SET', KEY, JSON.stringify(historial)]);
  } catch {
    // Fallo silencioso - no afecta el pedido
  }
}

export async function listarHistorial() {
  if (!hasDB) return [];
  try {
    const data = await redisCmd(['GET', KEY]);
    if (!data.result) return [];
    const historial = JSON.parse(data.result);
    return Array.isArray(historial) ? historial.reverse() : []; // Más recientes primero
  } catch {
    return [];
  }
}

export async function buscarHistorialPorCodigo(codigo) {
  const historial = await listarHistorial();
  return historial.filter((r) => r.codigo === codigo);
}

export async function buscarHistorialPorCliente(telefono) {
  const historial = await listarHistorial();
  return historial.filter((r) => r.cliente.telefono === telefono);
}
