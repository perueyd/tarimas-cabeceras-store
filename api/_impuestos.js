// Separar el IGV y estimar lo que toca pagarle a la SUNAT.
//
// POR QUÉ EXISTE: los precios de la tienda INCLUYEN IGV (así lo dicen los
// Términos y así lo exige la Ley 29571). Pero en los pedidos solo se guardaba
// el total cobrado, así que para saber cuánto de ese dinero es del Estado y
// cuánto es del negocio había que sacar la calculadora cada mes.
//
// OJO CON LA CUENTA: el IGV de un precio que YA lo incluye no es el 18% del
// total. Si la cabecera cuesta S/ 310 con IGV, el IGV no es S/ 55.80 — es
// S/ 47.29. La base es 310 / 1.18 = 262.71, y el IGV es la diferencia.
// Calcularlo mal infla el IGV un 18% y descuadra la declaración.
//
// ESTO NO ES ASESORÍA TRIBUTARIA. Son las mismas cuentas que haría cualquiera
// a mano, para tener una idea del mes antes de ir al contador. Las tasas y los
// tramos los fija la SUNAT y cambian: están todos arriba, en un solo sitio,
// para poder actualizarlos sin buscar por el código.

// ── Lo que hay que revisar cada año ────────────────────────────────────────
// La cuenta del IGV vive en src/lib/igv.js porque el panel también la
// necesita; se re-exporta para no romper a quien la importa desde aquí.
import { separarIGV } from '../src/lib/igv.js';
import { mesLima } from '../src/lib/lima.js';
export { agregarIGV, separarIGV, TASA_IGV } from '../src/lib/igv.js';

export const UIT = 5500; // UIT 2026 (D.S. 301-2025-EF)

// Régimen MYPE Tributario: el pago a cuenta mensual del impuesto a la renta es
// el 1% de los ingresos NETOS mientras los ingresos del año no pasen de
// 300 UIT. Por encima, se aplica el mayor entre 1.5% y el coeficiente — eso ya
// no se estima aquí porque depende del resultado del año anterior.
export const TASA_RENTA_MENSUAL = 0.01;
export const LIMITE_UIT_1_POR_CIENTO = 300;

// Un pedido solo cuenta como venta cuando el dinero entró de verdad. Los que
// están "por verificar" todavía pueden caerse, y los cancelados ya se cayeron:
// meterlos en la declaración sería pagar IGV por dinero que no se cobró.
// Estos son los estados que la tienda usa de verdad (ver ESTADOS_VALIDOS en
// api/orders.js). Si ahí se añade uno nuevo que signifique "el dinero entró",
// hay que añadirlo aquí también o esas ventas no se declararían.
const ESTADOS_QUE_CUENTAN = ['Pagado', 'Entregado'];

export function esVentaConfirmada(pedido) {
  return ESTADOS_QUE_CUENTAN.includes(pedido?.estado);
}

// El mes de un pedido EN HORA DE LIMA. Con la fecha en UTC, todo lo vendido
// después de las 7 de la tarde del último día del mes se iría al mes
// siguiente, y la declaración no cuadraría con las ventas reales.
// La cuenta vive en src/lib/lima.js, compartida con el resto del sitio.
export function mesDeLima(fechaISO) {
  return mesLima(fechaISO);
}

/**
 * Resumen de un mes: lo vendido, lo que es IGV, lo que costó producirlo y el
 * margen que queda.
 *
 * `costos` es un mapa { "productoId:medidaId": costoUnitario } con lo que al
 * dueño le cuesta fabricar cada cosa. Si un producto no tiene costo puesto, su
 * venta cuenta para los impuestos pero NO para el margen, y se avisa de
 * cuántas quedaron fuera: un margen calculado con la mitad de los costos
 * mentiría, y en esto mentir es peor que no decir nada.
 */
export function resumirMes(pedidos, costos = {}) {
  const confirmados = pedidos.filter(esVentaConfirmada);

  let total = 0;
  let costoTotal = 0;
  let ventasSinCosto = 0;
  let unidades = 0;

  for (const p of confirmados) {
    total += Number(p.monto) || 0;

    let costoDelPedido = 0;
    let completo = true;
    for (const item of p.items || []) {
      unidades += item.qty || 0;
      const costoUnidad = costos[`${item.productId}:${item.sizeId}`] ?? costos[item.productId];
      if (costoUnidad == null) completo = false;
      else costoDelPedido += Number(costoUnidad) * (item.qty || 0);
    }
    if (completo && (p.items || []).length) costoTotal += costoDelPedido;
    else ventasSinCosto++;
  }

  const { base, igv } = separarIGV(total);

  // El pago a cuenta de renta es sobre los ingresos NETOS, que son los de la
  // base imponible — no sobre el total cobrado, que lleva el IGV dentro.
  const renta = Math.round(base * TASA_RENTA_MENSUAL * 100) / 100;

  // El margen se compara contra la BASE, no contra el total: el IGV nunca fue
  // suyo, es dinero del Estado que pasó por su cuenta.
  const hayCostos = costoTotal > 0 && ventasSinCosto === 0;
  const margen = hayCostos ? Math.round((base - costoTotal) * 100) / 100 : null;

  return {
    pedidos: confirmados.length,
    unidades,
    total: Math.round(total * 100) / 100,
    base,
    igv,
    renta,
    aLaSunat: Math.round((igv + renta) * 100) / 100,
    costos: hayCostos ? Math.round(costoTotal * 100) / 100 : null,
    margen,
    margenPorcentaje: hayCostos && base > 0 ? Math.round((margen / base) * 1000) / 10 : null,
    ventasSinCosto,
  };
}

/** Agrupa los pedidos por mes de Lima y resume cada uno. */
export function resumenPorMes(pedidos, costos = {}) {
  const porMes = {};
  for (const p of pedidos) {
    const mes = mesDeLima(p.fecha);
    if (!mes) continue;
    (porMes[mes] ||= []).push(p);
  }
  return Object.entries(porMes)
    .sort((a, b) => b[0].localeCompare(a[0])) // el mes más reciente primero
    .map(([mes, lista]) => ({ mes, ...resumirMes(lista, costos) }));
}

/**
 * ¿Sigue siendo válido estimar la renta al 1%?
 * Deja de serlo al pasar las 300 UIT de ingresos en el año.
 */
export function avisoLimiteRenta(baseAcumuladaDelAnio) {
  const limite = LIMITE_UIT_1_POR_CIENTO * UIT;
  if (baseAcumuladaDelAnio < limite * 0.8) return null;
  return baseAcumuladaDelAnio >= limite
    ? `Pasaste las 300 UIT (S/ ${limite.toLocaleString('es-PE')}) este año: el pago a cuenta ya no es el 1%. Consulta a tu contador.`
    : `Vas por el ${Math.round((baseAcumuladaDelAnio / limite) * 100)}% de las 300 UIT (S/ ${limite.toLocaleString('es-PE')}). Al pasarlas, el pago a cuenta deja de ser el 1%.`;
}
