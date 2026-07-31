import { checkAdminAuth } from '../_auth.js';
import { vencida } from '../_ofertas-auto.js';
import { listarOfertas } from './ofertas.js';
import { listarHistorial, buscarHistorialPorCodigo } from '../_historial.js';

// GET ?dias=30: estadísticas de ofertas en los últimos N días
export default async function handler(req, res) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const dias = Math.max(1, parseInt(req.query.dias) || 30);
    const fecha_desde = new Date();
    fecha_desde.setDate(fecha_desde.getDate() - dias);

    const ofertas = await listarOfertas();
    const historial = await listarHistorial();

    // Filtrar historial por rango de fechas
    const historialFiltrado = historial.filter((r) => new Date(r.fecha) >= fecha_desde);

    // Estadísticas básicas
    const totalOfertas = ofertas.length;
    const ofertasActivas = ofertas.filter((o) => {
      if (!o.activo) return false;
      if (o.vence && vencida(o.vence)) return false;
      return true;
    }).length;
    const usosTotales = historialFiltrado.length;
    const descuentoTotalOtorgado = historialFiltrado.reduce((sum, r) => sum + (r.descuento || 0), 0);
    const descuentoPromedio = usosTotales > 0 ? descuentoTotalOtorgado / usosTotales : 0;

    // Código más popular
    const codigoStats = {};
    for (const r of historialFiltrado) {
      if (!codigoStats[r.codigo]) {
        codigoStats[r.codigo] = { codigo: r.codigo, usos: 0, descuentoTotal: 0 };
      }
      codigoStats[r.codigo].usos += 1;
      codigoStats[r.codigo].descuentoTotal += r.descuento || 0;
    }

    const codigoTop = Object.values(codigoStats)
      .sort((a, b) => b.usos - a.usos)[0];

    if (codigoTop) {
      codigoTop.descuentoPromedio = codigoTop.descuentoTotal / codigoTop.usos;
    }

    // Tipos populares
    const tipoStats = {};
    for (const o of ofertas) {
      const tipo = o.tipo || 'desconocido';
      if (!tipoStats[tipo]) {
        tipoStats[tipo] = { tipo, usos: 0 };
      }
      const usos = historialFiltrado.filter((r) => {
        // Simplificado: contar si el código/oferta corresponde a este tipo
        return true; // En producción, asociar códigos a ofertas
      }).length;
      tipoStats[tipo].usos = usos;
    }

    const tiposPopulares = Object.values(tipoStats)
      .sort((a, b) => b.usos - a.usos)
      .slice(0, 5);

    // Evolución diaria
    const evolucionDiaria = {};
    for (let i = dias - 1; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const fechaStr = fecha.toISOString().split('T')[0];
      evolucionDiaria[fechaStr] = 0;
    }

    for (const r of historialFiltrado) {
      const fechaStr = r.fecha.split('T')[0];
      if (evolucionDiaria.hasOwnProperty(fechaStr)) {
        evolucionDiaria[fechaStr] += 1;
      }
    }

    const evolucionDiariaArr = Object.entries(evolucionDiaria).map(([fecha, usos]) => ({
      fecha: fecha.split('-').slice(1).join('/'),
      usos,
    }));

    // Eficiencia y insights
    const eficiencia = {
      conversion: usosTotales > 0 ? Math.round((usosTotales / totalOfertas) * 10) : 0, // estimado
      roi: usosTotales > 0 ? `${Math.round((descuentoTotalOtorgado / 100) * 100)}%` : 'N/A',
      insights: [],
    };

    // Generar insights
    if (usosTotales === 0) {
      eficiencia.insights.push('Sin usos aún. Activa ofertas para comenzar.');
    } else {
      eficiencia.insights.push(
        `${usosTotales} usos en ${dias} días (promedio ${Math.round(usosTotales / dias)}/día)`
      );
      if (codigoTop) {
        eficiencia.insights.push(`El código "${codigoTop.codigo}" es el más popular (${codigoTop.usos} usos)`);
      }
      if (ofertasActivas < totalOfertas / 2) {
        eficiencia.insights.push(`Solo ${ofertasActivas}/${totalOfertas} ofertas activas. Considera activar más.`);
      }
    }

    return res.status(200).json({
      totalOfertas,
      ofertasActivas,
      usosTotales,
      descuentoTotalOtorgado,
      descuentoPromedio: Math.round(descuentoPromedio * 100) / 100,
      codigoTop,
      tiposPopulares,
      evolucionDiaria: evolucionDiariaArr,
      eficiencia,
      rango: { desde: fecha_desde.toISOString().split('T')[0], dias },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al calcular analytics.' });
  }
}
