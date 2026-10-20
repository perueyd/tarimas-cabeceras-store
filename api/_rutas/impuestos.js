// Lo que hay que pagarle a la SUNAT y lo que queda de margen, mes a mes.
//
// Todo esto se podía sacar a mano de la pestaña de Pedidos con una
// calculadora. El problema es que había que hacerlo cada mes, y que el error
// más fácil —sacar el 18% del total en vez de separarlo de un precio que ya lo
// incluye— infla el IGV un 18% entero sin que se note.
//
// Las cuentas viven en api/_impuestos.js, con sus pruebas. Esto solo junta los
// pedidos con los costos del catálogo y responde.
//
// GET admin -> resumen de los últimos meses
//
// ESTO NO ES ASESORÍA TRIBUTARIA: es una estimación para saber a qué atenerse
// antes de ir al contador. Así se lo dice el panel al dueño, con todas las
// letras.

import { listOrders } from '../_store.js';
import { getCatalog } from '../_catalog.js';
import { checkAdminAuth } from '../_auth.js';
import { avisoLimiteRenta, resumenPorMes, TASA_IGV, UIT } from '../_impuestos.js';
import { anioLima } from '../../src/lib/lima.js';

export default async function handler(req, res) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const [pedidos, catalog] = await Promise.all([listOrders(500), getCatalog()]);

    // Lo que al dueño le cuesta fabricar cada cosa. Puede ponerlo por producto
    // ("una MILÁN me cuesta X") o afinarlo por medida, que es lo normal: una
    // King lleva más tela que una de plaza y media.
    const costos = {};
    for (const p of catalog.products || []) {
      if (p.costo != null && p.costo !== '') costos[p.id] = Number(p.costo);
      for (const [sizeId, costo] of Object.entries(p.costoPorMedida || {})) {
        if (costo != null && costo !== '') costos[`${p.id}:${sizeId}`] = Number(costo);
      }
    }

    const meses = resumenPorMes(pedidos, costos);

    // Lo acumulado del año corriente, que es lo que decide si el pago a cuenta
    // sigue siendo el 1%.
    const anio = anioLima();
    const baseDelAnio = meses
      .filter((m) => m.mes.startsWith(anio))
      .reduce((suma, m) => suma + m.base, 0);

    return res.status(200).json({
      ok: true,
      meses: meses.slice(0, 13), // el mes actual y los doce anteriores
      anio,
      baseDelAnio: Math.round(baseDelAnio * 100) / 100,
      aviso: avisoLimiteRenta(baseDelAnio),
      // Para que el panel pueda decir con qué números está calculando, en vez
      // de enseñar cifras que salen de ninguna parte.
      tasas: { igv: TASA_IGV, uit: UIT, rentaMensual: 0.01 },
      // Cuántos productos tienen costo puesto: sin esto el dueño no sabe por
      // qué el margen sale vacío. Cuenta tanto el costo general del producto
      // como el que tenga puesto en cualquiera de sus medidas — si solo se
      // miraba el general, el panel decía "0 de 4 productos" mientras ya
      // estaba calculando el margen con los costos por medida.
      productosConCosto: (catalog.products || []).filter(
        (p) =>
          (p.costo != null && p.costo !== '') ||
          Object.values(p.costoPorMedida || {}).some((c) => c != null && c !== '')
      ).length,
      productosTotales: (catalog.products || []).length,
    });
  } catch (err) {
    console.error('impuestos:', err?.message);
    return res.status(503).json({ error: 'No se pudo calcular. Intenta de nuevo.' });
  }
}
