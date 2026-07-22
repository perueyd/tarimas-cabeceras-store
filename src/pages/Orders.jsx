import { useEffect, useMemo, useState } from 'react';
import { useCatalog } from '../context/CatalogContext.jsx';
import { Stars } from './ProductDetail.jsx';
import CatalogEditor from './CatalogEditor.jsx';
import PromoEditor from './PromoEditor.jsx';

const AZUL = '#3b5a70'; // color único de las gráficas (una sola serie por gráfica)

// Link "agregar a Google Calendar" para una entrega (sin API ni permisos:
// abre el evento pre-llenado y el dueño solo confirma con "Guardar").
export function calendarUrl(o, currencyFormatter) {
  const m = (o.entrega || '').match(/\d{4}-\d{2}-\d{2}/);
  if (!m) return null;
  const inicio = m[0].replace(/-/g, '');
  const sig = new Date(`${m[0]}T12:00:00`);
  sig.setDate(sig.getDate() + 1);
  const fin = sig.toISOString().slice(0, 10).replace(/-/g, '');
  const text = encodeURIComponent(`🚚 Entrega ${o.code} — ${o.nombre}`);
  const details = encodeURIComponent(
    `Pedido: ${o.code}\nCliente: ${o.nombre} (${o.telefono})\nMonto: ${currencyFormatter.format(o.monto || 0)}\nHorario: ${o.entrega}\nProductos: ${(o.items || []).map((i) => `${i.productName} x${i.qty}`).join(', ')}${o.ubicacion ? `\nMapa: ${o.ubicacion}` : ''}`
  );
  const location = encodeURIComponent(o.direccion || '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${inicio}/${fin}&details=${details}&location=${location}`;
}

const esVenta = (o) => o.estado === 'Pagado' || o.estado === 'Entregado';

// Descarga todos los pedidos como hoja de cálculo (CSV compatible con Excel y
// Google Sheets, con BOM UTF-8 y separador ";" para Excel en español).
function descargarHoja(orders) {
  const headers = ['Fecha', 'Código', 'Estado', 'Método', 'Monto', 'Nombre', 'Teléfono', 'Email', 'Zona', 'Dirección', 'Ubicación', 'Entrega', 'Productos'];
  const rows = orders.map((o) => [
    new Date(o.fecha).toLocaleString('es-PE'),
    o.code,
    o.estado,
    o.metodo,
    o.monto,
    o.nombre,
    o.telefono,
    o.email,
    o.zona,
    o.direccion,
    o.ubicacion,
    o.entrega,
    (o.items || []).map((i) => `${i.productName} x${i.qty}`).join(' | '),
  ]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + [headers, ...rows].map((r) => r.map(esc).join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pedidos-ED-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function Orders() {
  const { currencyFormatter, getColorById, getSizeById, getProductById } = useCatalog();
  const [key, setKey] = useState(() => localStorage.getItem('ed-orders-key') || '');
  const [input, setInput] = useState('');
  const [orders, setOrders] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reclamos, setReclamos] = useState([]);
  const [tab, setTab] = useState('resumen');
  const [filtro, setFiltro] = useState('todos');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState(null); // reseña en edición {id, estrellas, comentario}

  async function cargar(k) {
    setLoading(true);
    setError('');
    const authHeader = { Authorization: `Bearer ${k}` };
    try {
      const res = await fetch('/api/orders', { headers: authHeader });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar.');
      setOrders(data.orders);
      localStorage.setItem('ed-orders-key', k);
      setKey(k);
      fetch('/api/reviews?all=1', { headers: authHeader })
        .then((r) => r.json())
        .then((d) => setReviews(d.reviews || []))
        .catch(() => {});
      fetch('/api/reclamos', { headers: authHeader })
        .then((r) => r.json())
        .then((d) => setReclamos(d.reclamos || []))
        .catch(() => {});
    } catch (err) {
      setError(err.message);
      setOrders(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (key) cargar(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function actualizarPedido(o, cambios) {
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ code: o.code, ...cambios }),
      });
      if (res.ok) setOrders(orders.map((x) => (x.code === o.code ? { ...x, ...cambios } : x)));
    } catch { /* no-op */ }
  }

  async function eliminarPedido(o) {
    if (!window.confirm(`¿Eliminar el pedido ${o.code} de ${o.nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/orders?code=${encodeURIComponent(o.code)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) setOrders(orders.filter((x) => x.code !== o.code));
    } catch { /* no-op */ }
  }

  async function borrarResena(r) {
    if (!window.confirm(`¿Eliminar la reseña de ${r.nombre}?`)) return;
    try {
      const res = await fetch(
        `/api/reviews?product=${encodeURIComponent(r.productId)}&id=${encodeURIComponent(r.id)}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${key}` } }
      );
      if (res.ok) setReviews(reviews.filter((x) => x.id !== r.id));
    } catch { /* no-op */ }
  }

  async function guardarEdicion(r) {
    try {
      const res = await fetch('/api/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ productId: r.productId, id: r.id, estrellas: editando.estrellas, comentario: editando.comentario }),
      });
      const data = await res.json();
      if (res.ok) {
        setReviews(reviews.map((x) => (x.id === r.id ? data.review : x)));
        setEditando(null);
      }
    } catch { /* no-op */ }
  }

  async function responderReclamo(r, respuesta) {
    const res = await fetch('/api/reclamos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ folio: r.folio, respuesta }),
    });
    const data = await res.json();
    if (res.ok) setReclamos(reclamos.map((x) => (x.folio === r.folio ? data.reclamo : x)));
    else alert(data?.error || 'No se pudo guardar la respuesta.');
  }

  if (!orders) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Panel del negocio</h1>
        <p className="mt-2 text-sm text-neutral-500">Acceso privado. Ingresa tu clave de administrador.</p>
        <form
          className="mt-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (input) cargar(input);
          }}
        >
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Clave de administrador"
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
          />
          <button className="rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            {loading ? 'Cargando...' : 'Entrar'}
          </button>
        </form>
        {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </main>
    );
  }

  // ---- Métricas ----
  const ventas = orders.filter(esVenta);
  const porVerificar = orders.filter((o) => o.estado === 'Pago por verificar');
  const hoy = new Date().toDateString();
  const ventasHoy = ventas.filter((o) => new Date(o.fecha).toDateString() === hoy).reduce((s, o) => s + (o.monto || 0), 0);
  const totalVentas = ventas.reduce((s, o) => s + (o.monto || 0), 0);
  const totalPorVerificar = porVerificar.reduce((s, o) => s + (o.monto || 0), 0);
  const promedioEstrellas = reviews.length
    ? (reviews.reduce((s, r) => s + r.estrellas, 0) / reviews.length).toFixed(1)
    : '—';

  const reclamosPendientes = reclamos.filter((r) => r.estado === 'Pendiente');
  const cancelados = orders.filter((o) => o.estado === 'Cancelado');
  const visibles = orders.filter((o) => {
    if (filtro === 'pendientes') return o.estado === 'Pago por verificar';
    if (filtro === 'pagados') return o.estado === 'Pagado';
    if (filtro === 'entregados') return o.estado === 'Entregado';
    if (filtro === 'cancelados') return o.estado === 'Cancelado';
    return true;
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Panel del negocio</h1>
        <div className="flex gap-2">
          <button
            onClick={() => descargarHoja(orders)}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:border-ink"
            title="Descarga todos los pedidos como hoja de cálculo (se abre en Excel o Google Sheets)"
          >
            ⬇️ Descargar hoja de cálculo
          </button>
          <button onClick={() => cargar(key)} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:border-ink">
            {loading ? 'Actualizando...' : '↻ Actualizar'}
          </button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Ventas confirmadas" value={currencyFormatter.format(totalVentas)} sub={`${ventas.length} pedido${ventas.length !== 1 ? 's' : ''}`} />
        <StatCard label="Por verificar" value={currencyFormatter.format(totalPorVerificar)} sub={`${porVerificar.length} pedido${porVerificar.length !== 1 ? 's' : ''}`} accent />
        <StatCard label="Ventas de hoy" value={currencyFormatter.format(ventasHoy)} sub={new Date().toLocaleDateString('es-PE')} />
        <StatCard label="Calificación" value={`★ ${promedioEstrellas}`} sub={`${reviews.length} reseña${reviews.length !== 1 ? 's' : ''}`} />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { id: 'resumen', label: 'Resumen' },
          { id: 'pedidos', label: `Pedidos (${orders.length})` },
          { id: 'resenas', label: `Reseñas (${reviews.length})` },
          { id: 'reclamos', label: `📋 Reclamos${reclamosPendientes.length ? ` (${reclamosPendientes.length})` : ''}` },
          { id: 'promos', label: '🏷️ Promociones' },
          { id: 'editar', label: '✏️ Editar página' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              tab === t.id ? 'border-ink bg-ink text-white' : 'border-neutral-300 text-neutral-600 hover:border-neutral-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <GraficaVentasPorDia orders={orders} currencyFormatter={currencyFormatter} />
          <GraficaVentasPorProducto orders={orders} currencyFormatter={currencyFormatter} />
        </div>
      )}

      {tab === 'pedidos' && (
        <>
          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'pendientes', label: `Por verificar (${porVerificar.length})` },
              { id: 'pagados', label: 'Pagados' },
              { id: 'entregados', label: 'Entregados' },
              { id: 'cancelados', label: `Cancelados (${cancelados.length})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`rounded-lg border px-3 py-1.5 transition ${
                  filtro === f.id ? 'border-ink bg-neutral-100 font-medium' : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {visibles.length === 0 && (
              <p className="rounded-lg border border-neutral-200 bg-white px-4 py-8 text-center text-neutral-500">
                No hay pedidos en este filtro.
              </p>
            )}
            {visibles.map((o) => (
              <PedidoCard
                key={o.code}
                o={o}
                onUpdate={actualizarPedido}
                onDelete={eliminarPedido}
                currencyFormatter={currencyFormatter}
                getColorById={getColorById}
                getSizeById={getSizeById}
              />
            ))}
          </div>
        </>
      )}

      {tab === 'resenas' && (
        <div className="space-y-4">
          {reviews.length === 0 && (
            <p className="rounded-lg border border-neutral-200 bg-white px-4 py-8 text-center text-neutral-500">
              Aún no hay reseñas de clientes.
            </p>
          )}
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {r.nombre} {r.editado && <span className="text-xs font-normal text-neutral-400">(editada)</span>}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {getProductById(r.productId)?.name || r.productId} · {new Date(r.fecha).toLocaleDateString('es-PE')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Stars n={r.estrellas} size="text-sm" />
                  <button
                    onClick={() => setEditando(editando?.id === r.id ? null : { id: r.id, estrellas: r.estrellas, comentario: r.comentario })}
                    className="text-xs text-sky-700 hover:underline"
                  >
                    Editar
                  </button>
                  <button onClick={() => borrarResena(r)} className="text-xs text-red-600 hover:underline">
                    Eliminar
                  </button>
                </div>
              </div>

              {editando?.id === r.id ? (
                <div className="mt-3 rounded-lg bg-neutral-50 p-3">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setEditando({ ...editando, estrellas: i })}
                        className={`text-xl ${i <= editando.estrellas ? 'text-amber-500' : 'text-neutral-300'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={editando.comentario}
                    onChange={(e) => setEditando({ ...editando, comentario: e.target.value })}
                    maxLength={500}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
                  />
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => guardarEdicion(r)} className="rounded-lg bg-ink px-4 py-1.5 text-xs font-medium text-white">
                      Guardar cambios
                    </button>
                    <button onClick={() => setEditando(null)} className="rounded-lg border border-neutral-300 px-4 py-1.5 text-xs">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-neutral-600">{r.comentario}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'reclamos' && (
        <div className="space-y-4">
          <p className="rounded-lg bg-sky-50 px-4 py-2 text-xs text-sky-900">
            Por ley tienes hasta 30 días calendario desde la fecha del reclamo para responder.
            Los reclamos no se pueden eliminar — quedan como registro.
          </p>
          {reclamos.length === 0 && (
            <p className="rounded-lg border border-neutral-200 bg-white px-4 py-8 text-center text-neutral-500">
              Aún no hay reclamos ni quejas registrados.
            </p>
          )}
          {reclamos.map((r) => (
            <ReclamoCard key={r.folio} r={r} onResponder={responderReclamo} />
          ))}
        </div>
      )}

      {tab === 'promos' && <PromoEditor adminKey={key} />}

      {tab === 'editar' && <CatalogEditor adminKey={key} />}
    </main>
  );
}

function PedidoCard({ o, onUpdate, onDelete, currencyFormatter, getColorById, getSizeById }) {
  const cal = calendarUrl(o, currencyFormatter);
  const tel = (o.telefono || '').replace(/\D/g, '');
  const waMsg = encodeURIComponent(
    `Hola ${o.nombre}, te escribimos de E|D Espacios y Diseño sobre tu pedido *${o.code}*.\nEstado actual: ${o.estado}.\nPuedes rastrearlo aquí: https://tarimas-cabeceras-store.vercel.app/seguimiento?codigo=${o.code}`
  );
  const wa = tel ? `https://wa.me/${tel.startsWith('51') ? tel : '51' + tel}?text=${waMsg}` : null;
  const badge =
    o.estado === 'Pagado'
      ? 'bg-green-100 text-green-800'
      : o.estado === 'Entregado'
        ? 'bg-sky-100 text-sky-800'
        : o.estado === 'Cancelado'
          ? 'bg-red-100 text-red-700'
          : 'bg-amber-100 text-amber-800';
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-sm font-semibold">{o.code}</p>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge}`}>
          {o.estado} · {o.metodo}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <p><span className="text-neutral-500">Cliente:</span> {o.nombre} · {o.telefono}</p>
        <p><span className="text-neutral-500">Monto:</span> {currencyFormatter.format(o.monto)}</p>
        <p><span className="text-neutral-500">Entrega:</span> {o.entrega || '—'}</p>
        <p><span className="text-neutral-500">Fecha:</span> {new Date(o.fecha).toLocaleString('es-PE')}</p>
        <p className="sm:col-span-2"><span className="text-neutral-500">Dirección:</span> {o.direccion || '—'} ({o.zona})</p>
      </div>
      {o.items?.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-neutral-100 pt-3 text-xs text-neutral-600">
          {o.items.map((i, idx) => (
            <li key={idx}>
              • {i.productName} x{i.qty} — {getSizeById(i.sizeId)?.label || i.sizeId},{' '}
              {getColorById(i.colorId)?.label || i.colorId} — {currencyFormatter.format(i.unitPrice * i.qty)}
            </li>
          ))}
        </ul>
      )}
      {/* Acciones rápidas de productividad */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 text-xs">
        <label className="flex items-center gap-1.5">
          <span className="text-neutral-500">Estado:</span>
          <select
            value={o.estado}
            onChange={(e) => onUpdate(o, { estado: e.target.value })}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 outline-none focus:border-ink"
          >
            <option>Pago por verificar</option>
            <option>Pagado</option>
            <option>Entregado</option>
            <option>Cancelado</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-neutral-500">Método:</span>
          <select
            value={o.metodo}
            onChange={(e) => onUpdate(o, { metodo: e.target.value })}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 outline-none focus:border-ink"
          >
            <option>Yape/Plin</option>
            <option>Transferencia bancaria</option>
            <option>Tarjeta/Yape (Culqi)</option>
          </select>
        </label>
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="rounded-lg bg-[#25D366] px-3 py-1.5 font-medium text-white hover:opacity-90">
            WhatsApp al cliente
          </a>
        )}
        {cal && (
          <a href={cal} target="_blank" rel="noreferrer" className="rounded-lg border border-neutral-300 px-3 py-1.5 font-medium hover:border-ink">
            📅 Agendar en Google Calendar
          </a>
        )}
        {o.ubicacion && (
          <a href={o.ubicacion} target="_blank" rel="noreferrer" className="rounded-lg border border-neutral-300 px-3 py-1.5 font-medium hover:border-ink">
            📍 Mapa
          </a>
        )}
        <button
          onClick={() => onDelete(o)}
          className="ml-auto rounded-lg border border-red-200 px-3 py-1.5 font-medium text-red-600 hover:bg-red-50"
        >
          🗑️ Eliminar pedido
        </button>
      </div>
    </div>
  );
}

function ReclamoCard({ r, onResponder }) {
  const [respuesta, setRespuesta] = useState(r.respuesta || '');
  const [guardando, setGuardando] = useState(false);
  const diasRestantes = Math.ceil((new Date(r.fecha).getTime() + 30 * 86400000 - Date.now()) / 86400000);

  async function guardar() {
    if (!respuesta.trim()) return;
    setGuardando(true);
    try {
      await onResponder(r, respuesta.trim());
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-sm font-semibold">{r.folio}</p>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${r.tipo === 'Reclamo' ? 'bg-orange-100 text-orange-800' : 'bg-neutral-100 text-neutral-700'}`}>
            {r.tipo}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${r.estado === 'Respondido' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
            {r.estado}
          </span>
        </div>
      </div>

      {r.estado === 'Pendiente' && (
        <p className={`mt-1 text-xs ${diasRestantes < 0 ? 'font-medium text-red-600' : diasRestantes <= 5 ? 'font-medium text-amber-600' : 'text-neutral-400'}`}>
          {diasRestantes < 0 ? `⚠️ Vencido hace ${Math.abs(diasRestantes)} día(s)` : `Vence en ${diasRestantes} día(s)`}
        </p>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <p><span className="text-neutral-500">Nombre:</span> {r.consumidor?.nombre}</p>
        <p><span className="text-neutral-500">Documento:</span> {r.consumidor?.tipoDocumento} {r.consumidor?.numeroDocumento}</p>
        <p><span className="text-neutral-500">Teléfono:</span> {r.consumidor?.telefono}</p>
        <p><span className="text-neutral-500">Correo:</span> {r.consumidor?.email}</p>
        <p className="sm:col-span-2"><span className="text-neutral-500">Domicilio:</span> {r.consumidor?.domicilio}</p>
        <p className="sm:col-span-2"><span className="text-neutral-500">Sobre:</span> {r.bien?.tipo}{r.bien?.descripcion ? ` — ${r.bien.descripcion}` : ''}</p>
        <p className="sm:col-span-2"><span className="text-neutral-500">Fecha:</span> {new Date(r.fecha).toLocaleString('es-PE')}</p>
      </div>

      <div className="mt-3 space-y-2 border-t border-neutral-100 pt-3 text-sm">
        <p><span className="text-neutral-500">Detalle:</span> {r.detalle}</p>
        {r.pedido && <p><span className="text-neutral-500">Solicita:</span> {r.pedido}</p>}
      </div>

      <div className="mt-3 border-t border-neutral-100 pt-3">
        {r.estado === 'Respondido' ? (
          <div className="rounded-lg bg-green-50 p-3 text-sm">
            <p className="text-xs font-medium text-green-800">Tu respuesta ({new Date(r.fechaRespuesta).toLocaleDateString('es-PE')}):</p>
            <p className="mt-1 text-neutral-700">{r.respuesta}</p>
          </div>
        ) : (
          <>
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-neutral-700">Escribe tu respuesta</span>
              <textarea
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
                rows={2}
                maxLength={2000}
                className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
              />
            </label>
            <button
              onClick={guardar}
              disabled={guardando || !respuesta.trim()}
              className="mt-2 rounded-lg bg-ink px-4 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar respuesta'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Gráfica de barras: ventas confirmadas por día (últimos 14 días).
function GraficaVentasPorDia({ orders, currencyFormatter }) {
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
function GraficaVentasPorProducto({ orders, currencyFormatter }) {
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

function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'border-amber-200 bg-amber-50' : 'border-neutral-200 bg-white'}`}>
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-neutral-400">{sub}</p>
    </div>
  );
}
