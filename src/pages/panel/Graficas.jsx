// Las dos gráficas del resumen: ventas por día y ventas por producto.
//
// Dibujadas a mano con divs, sin librería de gráficos. Son dos barras
// horizontales y una columna por día: traer una librería entera para esto
// costaría más de descarga que todo el resto del panel junto.

import { esVenta } from '../../lib/pedidos.js';

import { useMemo } from 'react';

// Gráfica de barras: ventas confirmadas por día (últimos 14 días).
export function GraficaVentasPorDia({ orders, currencyFormatter }) {
  const data = useMemo(() => {
    return [...Array(14)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 13 + i);
      const clave = d.toDateString();
      const monto = orders
        .filter((o) => esVenta(o) && new Date(o.fecha).toDateString() === clave)
        .reduce((s, o) => s + (o.monto || 0), 0);
      return { dia: d.getDate(), monto };
    });
  }, [orders]);
  const max = Math.max(...data.map((x) => x.monto), 1);
  const maxIdx = data.findIndex((x) => x.monto === max);
  const vacia = data.every((x) => x.monto === 0);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <p className="text-sm font-medium">Ventas confirmadas — últimos 14 días</p>
      <p className="text-xs text-neutral-400">Soles (S/) por día</p>
      {vacia ? (
        <p className="mt-8 pb-8 text-center text-sm text-neutral-400">Aún no hay ventas confirmadas en este periodo.</p>
      ) : (
        <div className="mt-4 flex h-40 items-end gap-1.5" role="img" aria-label="Gráfica de ventas por día">
          {data.map((d, i) => (
            <div key={i} className="group relative flex flex-1 flex-col items-center justify-end self-stretch" title={`Día ${d.dia}: ${currencyFormatter.format(d.monto)}`}>
              {i === maxIdx && d.monto > 0 && (
                <span className="mb-1 text-[10px] font-medium text-neutral-600 tabular-nums">
                  {Math.round(d.monto)}
                </span>
              )}
              <div
                className="w-full rounded-t transition-opacity group-hover:opacity-80"
                style={{ height: `${Math.max((d.monto / max) * 100, d.monto > 0 ? 4 : 1)}%`, backgroundColor: d.monto > 0 ? AZUL : '#e5e5e5' }}
              />
              <span className="mt-1 text-[10px] text-neutral-400 tabular-nums">{d.dia}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Gráfica de barras horizontales: ingresos por producto (ventas confirmadas).
export function GraficaVentasPorProducto({ orders, currencyFormatter }) {
  const rows = useMemo(() => {
    const agg = {};
    for (const o of orders) {
      if (!esVenta(o)) continue;
      for (const i of o.items || []) {
        if (!agg[i.productName]) agg[i.productName] = { monto: 0, unidades: 0 };
        agg[i.productName].monto += i.unitPrice * i.qty;
        agg[i.productName].unidades += i.qty;
      }
    }
    return Object.entries(agg)
      .sort((a, b) => b[1].monto - a[1].monto)
      .slice(0, 6);
  }, [orders]);
  const max = Math.max(...rows.map(([, v]) => v.monto), 1);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <p className="text-sm font-medium">Ventas por producto</p>
      <p className="text-xs text-neutral-400">Ingresos confirmados (S/) y unidades</p>
      {rows.length === 0 ? (
        <p className="mt-8 pb-8 text-center text-sm text-neutral-400">Aún no hay ventas confirmadas.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map(([nombre, v]) => (
            <div key={nombre} title={`${nombre}: ${currencyFormatter.format(v.monto)} · ${v.unidades} und.`}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate text-neutral-700">{nombre}</span>
                <span className="shrink-0 font-medium tabular-nums text-neutral-600">
                  {currencyFormatter.format(v.monto)} · {v.unidades} und.
                </span>
              </div>
              <div className="mt-1 h-3 w-full rounded-full bg-neutral-100">
                <div
                  className="h-3 rounded-full transition-opacity hover:opacity-80"
                  style={{ width: `${Math.max((v.monto / max) * 100, 3)}%`, backgroundColor: AZUL }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
