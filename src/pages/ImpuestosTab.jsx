import { useEffect, useState } from 'react';

// Impuestos y margen, mes a mes.
//
// POR QUÉ EXISTE: el dueño sabía cuánto había vendido, pero no cuánto de ese
// dinero era suyo. El IGV que cobra no es ingreso — es dinero del Estado que
// pasa por su cuenta — y el margen comparado contra el total cobrado le hacía
// parecer un 18% más rico de lo que era.
//
// Las cuentas se hacen en el servidor (api/_impuestos.js) y tienen pruebas:
// un céntimo mal aquí es una declaración mal presentada.

const soles = (n) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n || 0);

function nombreDelMes(mes) {
  const [anio, m] = mes.split('-');
  const nombres = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${nombres[Number(m) - 1]} de ${anio}`;
}

function Dato({ etiqueta, valor, detalle, fuerte, alerta }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${alerta ? 'border-amber-200 bg-amber-50' : 'border-neutral-200'}`}>
      <p className="text-[11px] uppercase tracking-wide text-neutral-500">{etiqueta}</p>
      <p className={`mt-1 ${fuerte ? 'text-xl font-semibold' : 'text-lg'}`}>{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-neutral-500">{detalle}</p>}
    </div>
  );
}

export default function ImpuestosTab({ adminKey, onIr }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState(null); // mes desplegado

  useEffect(() => {
    fetch('/api/impuestos', { headers: { Authorization: `Bearer ${adminKey}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setDatos(d);
          setAbierto(d.meses?.[0]?.mes || null);
        }
      })
      .catch(() => setError('No se pudo cargar.'));
  }, [adminKey]);

  if (error) return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  if (!datos) return <p className="text-sm text-neutral-400">Calculando…</p>;

  const meses = datos.meses || [];
  const mesActual = meses.find((m) => m.mes === abierto) || meses[0];
  const faltanCostos = datos.productosConCosto < datos.productosTotales;

  // El título y la descripción los pone la cabecera del panel
  // (TITULOS en Orders.jsx): tenerlos aquí también los enseñaba dos veces.
  return (
    <section>

      {/* Esto no puede faltar: son estimaciones, no la declaración. */}
      <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-600">
        <strong>Esto no reemplaza a tu contador.</strong> Son las mismas cuentas que harías a mano
        para saber a qué atenerte. Calculado con IGV {Math.round(datos.tasas.igv * 100)}%, pago a
        cuenta de renta {Math.round(datos.tasas.rentaMensual * 100)}% sobre ingresos netos y UIT de{' '}
        {soles(datos.tasas.uit)}. Solo cuentan los pedidos ya cobrados: los que están «por
        verificar» y los cancelados quedan fuera.
      </div>

      {datos.aviso && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {datos.aviso}
        </p>
      )}

      {meses.length === 0 ? (
        <div className="mt-6 rounded-xl border border-neutral-200 px-6 py-10 text-center">
          <p className="text-sm font-medium">Todavía no hay ventas cobradas</p>
          <p className="mt-1 text-sm text-neutral-500">
            En cuanto marques un pedido como pagado, aparecerá aquí.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap gap-2">
            {meses.map((m) => (
              <button
                key={m.mes}
                onClick={() => setAbierto(m.mes)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                  abierto === m.mes
                    ? 'border-ink bg-ink text-white'
                    : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                }`}
              >
                {nombreDelMes(m.mes)}
              </button>
            ))}
          </div>

          {mesActual && (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Dato
                  etiqueta="Cobrado"
                  valor={soles(mesActual.total)}
                  detalle={`${mesActual.pedidos} pedido${mesActual.pedidos === 1 ? '' : 's'}`}
                />
                <Dato
                  etiqueta="Tu ingreso real"
                  valor={soles(mesActual.base)}
                  detalle="sin el IGV"
                />
                <Dato
                  etiqueta="IGV cobrado"
                  valor={soles(mesActual.igv)}
                  detalle="no es tuyo"
                  alerta
                />
                <Dato
                  etiqueta="Renta (1%)"
                  valor={soles(mesActual.renta)}
                  detalle="pago a cuenta"
                  alerta
                />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Dato
                  etiqueta="A pagar a la SUNAT"
                  valor={soles(mesActual.aLaSunat)}
                  detalle="IGV + pago a cuenta de renta"
                  fuerte
                  alerta
                />
                {mesActual.margen != null ? (
                  <Dato
                    etiqueta="Margen"
                    valor={`${soles(mesActual.margen)} · ${mesActual.margenPorcentaje}%`}
                    detalle={`Te costó ${soles(mesActual.costos)} producirlo`}
                    fuerte
                  />
                ) : (
                  <div className="rounded-lg border border-dashed border-neutral-300 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-neutral-500">Margen</p>
                    <p className="mt-1 text-sm text-neutral-500">
                      No se puede calcular todavía.
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      {mesActual.ventasSinCosto} venta
                      {mesActual.ventasSinCosto === 1 ? '' : 's'} de productos sin costo puesto.
                      Prefiero no enseñarte un margen a medias.
                    </p>
                  </div>
                )}
              </div>

              <p className="mt-3 text-xs text-neutral-500">
                De los {soles(mesActual.total)} que cobraste, {soles(mesActual.aLaSunat)} son del
                Estado. Te quedan {soles(mesActual.total - mesActual.aLaSunat)} antes de descontar
                lo que te costó producir.
              </p>
            </>
          )}

          {faltanCostos && (
            <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
              <p className="text-sm font-medium">Para ver tu margen, falta un dato</p>
              <p className="mt-1 text-sm text-neutral-600">
                {datos.productosConCosto} de {datos.productosTotales} productos tienen puesto lo
                que te cuesta fabricarlos. Se pone en cada producto, junto al precio de cada
                medida — solo lo ves tú.
              </p>
              {onIr && (
                <button
                  onClick={() => onIr('productos')}
                  className="mt-3 rounded-lg border border-ink px-4 py-2 text-sm font-medium transition hover:bg-neutral-100"
                >
                  Ir a Productos
                </button>
              )}
            </div>
          )}

          <div className="mt-8">
            <h3 className="mb-2 text-sm font-semibold text-neutral-600">Todos los meses</h3>
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Mes</th>
                    <th className="px-3 py-2 text-right font-medium">Cobrado</th>
                    <th className="px-3 py-2 text-right font-medium">IGV</th>
                    <th className="px-3 py-2 text-right font-medium">Renta</th>
                    <th className="px-3 py-2 text-right font-medium">A la SUNAT</th>
                    <th className="px-3 py-2 text-right font-medium">Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {meses.map((m) => (
                    <tr key={m.mes} className="border-t border-neutral-100">
                      <td className="px-3 py-2 capitalize">{nombreDelMes(m.mes)}</td>
                      <td className="px-3 py-2 text-right">{soles(m.total)}</td>
                      <td className="px-3 py-2 text-right text-neutral-500">{soles(m.igv)}</td>
                      <td className="px-3 py-2 text-right text-neutral-500">{soles(m.renta)}</td>
                      <td className="px-3 py-2 text-right font-medium">{soles(m.aLaSunat)}</td>
                      <td className="px-3 py-2 text-right">
                        {m.margen != null ? `${soles(m.margen)} · ${m.margenPorcentaje}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
