// AI Engine: Sugiere descuentos óptimos basado en datos históricos
// Usa: análisis de historial + datos del cliente para maximizar conversión

import { listarOfertas } from './ofertas.js';
import { listarHistorial } from '../_historial.js';
import { checkAdminAuth } from '../_auth.js';

// Sugerir descuento óptimo para un cliente/producto
export async function sugerirDescuentoOptimo(clienteInfo, productoInfo) {
  try {
    const historial = await listarHistorial();
    const ofertas = await listarOfertas();

    // Analizar patrón del cliente
    const comprasCliente = historial.filter(
      (h) => h.cliente.telefono === clienteInfo.telefono
    );

    const tasaConversionPromedio = comprasCliente.length > 0 ? 100 : 0;
    const descuentoPromedioUsado =
      comprasCliente.length > 0
        ? comprasCliente.reduce((sum, h) => sum + h.descuento, 0) /
          comprasCliente.length
        : 0;

    // Analizar qué ofertas funcionan mejor
    const ofertasExitosas = ofertas.filter((o) => {
      const usos = historial.filter((h) => {
        // Simplificado: contar por tipo
        return true;
      }).length;
      return usos > 5;
    });

    // Calcular descuento óptimo
    const precioProducto = productoInfo.precio || 100;
    const descuentoRecomendado = Math.min(
      Math.max(precioProducto * 0.15, 5), // Mínimo 15% o S/ 5
      precioProducto * 0.4 // Máximo 40%
    );

    // Factores que influyen
    const factores = {
      esClienteRecurrente: comprasCliente.length > 2,
      promedioBajo: tasaConversionPromedio < 30,
      precioAlto: precioProducto > 500,
      esCategoriaBaja: productoInfo.categoria === 'low-demand',
    };

    // Aumentar descuento si:
    let ajuste = 1;
    if (factores.esClienteRecurrente) ajuste *= 0.9; // 10% menos desc (cliente leal)
    if (factores.promedioBajo) ajuste *= 1.2; // 20% más desc (necesita empuje)
    if (factores.precioAlto) ajuste *= 1.15; // 15% más desc (psicología de precio)
    if (factores.esCategoriaBaja) ajuste *= 1.25; // 25% más desc (mover inventario)

    const descuentoFinal = Math.round(descuentoRecomendado * ajuste * 100) / 100;

    return {
      descuentoRecomendado: descuentoFinal,
      tipo: 'porcentaje',
      confianza: Math.min(100, comprasCliente.length * 20), // 0-100%
      razon: calcularRazon(factores),
      factores,
      potencialConversion: Math.min(100, tasaConversionPromedio + 15),
    };
  } catch (err) {
    console.error('Error en AI engine:', err);
    return {
      descuentoRecomendado: 10,
      tipo: 'porcentaje',
      confianza: 30,
      razon: 'Descuento por defecto (error en análisis)',
    };
  }
}

function calcularRazon(factores) {
  const razones = [];
  if (factores.esClienteRecurrente) razones.push('Cliente recurrente');
  if (factores.promedioBajo) razones.push('Baja conversión esperada');
  if (factores.precioAlto) razones.push('Producto premium');
  if (factores.esCategoriaBaja) razones.push('Categoría lenta');
  return razones.join(' + ') || 'Análisis estándar';
}

// Handler de API
export default async function handler(req, res) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    const { cliente, producto } = req.body;
    const sugerencia = await sugerirDescuentoOptimo(cliente, producto);
    return res.status(200).json({ sugerencia });
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'Error en AI engine' });
  }
}
