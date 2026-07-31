// ML Predictivo: Predice demanda, predice churn, sugiere acciones
// Usa análisis de series temporales simple (linear regression)

import { listarHistorial } from '../_historial.js';
import { checkAdminAuth } from '../_auth.js';

// Predice demanda para próximos N días
export async function predecirDemanda(diasAdelante = 7) {
  try {
    const historial = await listarHistorial();

    // Agrupar por día
    const ventasPorDia = {};
    for (const h of historial) {
      const dia = h.fecha.split('T')[0];
      ventasPorDia[dia] = (ventasPorDia[dia] || 0) + 1;
    }

    // Obtener últimos 30 días
    const hoy = new Date();
    const datos = [];
    for (let i = 30; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() - i);
      const fechaStr = fecha.toISOString().split('T')[0];
      datos.push({
        fecha: fechaStr,
        ventas: ventasPorDia[fechaStr] || 0,
      });
    }

    // Regresión lineal simple
    const n = datos.length;
    const x = datos.map((_, i) => i);
    const y = datos.map((d) => d.ventas);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercepto = (sumY - pendiente * sumX) / n;

    // Predecir siguientes N días
    const predicciones = [];
    for (let i = 1; i <= diasAdelante; i++) {
      const prediccion = intercepto + pendiente * (n + i);
      predicciones.push({
        dia: i,
        prediccionVentas: Math.max(0, Math.round(prediccion)),
        confianza: Math.min(100, 85 - i * 5), // Menos confianza en el futuro
      });
    }

    return {
      predicciones,
      tendencia: pendiente > 0 ? 'Creciente' : pendiente < 0 ? 'Decreciente' : 'Estable',
      promedioDiario: Math.round(sumY / n),
    };
  } catch (err) {
    console.error('Error en predicción:', err);
    return {
      predicciones: [],
      tendencia: 'Desconocida',
      promedioDiario: 0,
    };
  }
}

// Detectar clientes en riesgo de churn (no compraron en 60 días)
export async function detectarChurn() {
  try {
    const historial = await listarHistorial();

    // Agrupar por cliente
    const clientesPorTelefono = {};
    for (const h of historial) {
      if (!clientesPorTelefono[h.cliente.telefono]) {
        clientesPorTelefono[h.cliente.telefono] = [];
      }
      clientesPorTelefono[h.cliente.telefono].push(h);
    }

    // Detectar inactivos
    const ahora = new Date();
    const enRiesgo = [];

    for (const [telefono, compras] of Object.entries(clientesPorTelefono)) {
      if (compras.length < 2) continue; // Solo clientes recurrentes

      const ultimaCompra = new Date(
        Math.max(...compras.map((c) => new Date(c.fecha)))
      );
      const diasInactivo = Math.floor(
        (ahora - ultimaCompra) / (1000 * 60 * 60 * 24)
      );

      if (diasInactivo > 60) {
        enRiesgo.push({
          telefono,
          nombre: compras[0].cliente.nombre,
          diasInactivo,
          ultimaCompra: ultimaCompra.toISOString().split('T')[0],
          comprasTotales: compras.length,
          accionRecomendada: diasInactivo > 90 ? '❌ Oferta agresiva' : '⚠️ Recordatorio',
        });
      }
    }

    return enRiesgo.sort((a, b) => b.diasInactivo - a.diasInactivo);
  } catch (err) {
    console.error('Error en churn detection:', err);
    return [];
  }
}

// Recomendar producto/oferta por cliente
export async function recomendarProducto(telefonoCliente) {
  try {
    const historial = await listarHistorial();

    // Productos más comprados
    const productosComprados = {};
    const categorias = {};

    for (const h of historial) {
      if (h.cliente.telefono === telefonoCliente) {
        // Simulado: el historial tiene código, no producto
        // En producción: consultar base de datos de productos
      }
    }

    // Sugerir complementarios
    return {
      recomendaciones: [
        {
          producto: 'Cabecera Capitoné',
          razon: 'Complementa tu tarima',
          descuentoRecomendado: '15%',
        },
      ],
    };
  } catch (err) {
    console.error('Error en recomendación:', err);
    return { recomendaciones: [] };
  }
}

// Handler API
export default async function handler(req, res) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  if (req.method === 'GET') {
    // GET ?tipo=demanda|churn
    if (req.query.tipo === 'churn') {
      const enRiesgo = await detectarChurn();
      return res.status(200).json({ clientesEnRiesgo: enRiesgo });
    }

    const diasAdelante = Math.min(30, parseInt(req.query.dias) || 7);
    const prediccion = await predecirDemanda(diasAdelante);
    return res.status(200).json(prediccion);
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
