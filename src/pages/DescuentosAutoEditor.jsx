import { useEffect, useState } from 'react';
import { useCatalog } from '../context/CatalogContext.jsx';

export default function DescuentosAutoEditor({ adminKey }) {
  const { currencyFormatter, categories } = useCatalog();
  const [descuentos, setDescuentos] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);

  async function cargar() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/descuentos-auto', { headers: { Authorization: `Bearer ${adminKey}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar.');
      setDescuentos(data.descuentosAuto || []);
    } catch (err) {
      setError(err.message);
      setDescuentos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function guardar(desc) {
    const res = await fetch('/api/descuentos-auto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
      body: JSON.stringify(desc),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error || 'No se pudo guardar.');
      return false;
    }
    setDescuentos(data.descuentosAuto);
    setEditando(null);
    setError('');
    return true;
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este descuento? Esta acción no se puede deshacer.')) return;
    const res = await fetch(`/api/descuentos-auto?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminKey}` },
    });
    const data = await res.json();
    if (res.ok) setDescuentos(data.descuentosAuto);
  }

  async function toggleActivo(desc) {
    await guardar({ ...desc, activo: !desc.activo });
  }

  if (loading) return <p className="text-sm text-neutral-400">Cargando descuentos...</p>;

  if (editando) {
    return <DescuentoForm inicial={editando} onCancel={() => setEditando(null)} onSave={guardar} error={error} />;
  }

  const categorias = categories || [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-500">
          Descuentos automáticos que se aplican sin código. Flash sales, por cantidad, por categoría.
        </p>
        <button
          onClick={() => setEditando({ tipo: 'flashsale', valor: 10, tipoDesc: 'porcentaje', activo: true })}
          className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
        >
          + Nuevo descuento
        </button>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {descuentos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-400">
          Aún no tienes descuentos automáticos.
        </p>
      ) : (
        <div className="space-y-2">
          {descuentos.map((d) => {
            const vencido = d.vence && new Date(d.vence + 'T23:59:59') < new Date();
            const etiqueta = d.tipo === 'flashsale' ? '🎉 Flash Sale' : d.tipo === 'cantidad' ? `📦 ${d.cantidadMinima}+ items` : `🏷️ ${d.categoria}`;
            return (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{etiqueta}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        !d.activo
                          ? 'bg-neutral-100 text-neutral-500'
                          : vencido
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {!d.activo ? 'Desactivado' : vencido ? 'Vencido' : 'Activo'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {d.tipoDesc === 'porcentaje' ? `${d.valor}% de descuento` : `${currencyFormatter.format(d.valor)} de descuento`}
                    {d.vence ? ` · vence ${d.vence}` : ''}
                  </p>
                </div>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => toggleActivo(d)} className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:border-ink">
                    {d.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button onClick={() => setEditando(d)} className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:border-ink">
                    Editar
                  </button>
                  <button onClick={() => eliminar(d.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-red-600 hover:bg-red-50">
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DescuentoForm({ inicial, onCancel, onSave, error }) {
  const { categories } = useCatalog();
  const [d, setD] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setD((prev) => ({ ...prev, [k]: v }));
  const categorias = categories || [];

  async function handleSave() {
    if (d.tipo === 'categoria' && !d.categoria) {
      alert('Selecciona una categoría.');
      return;
    }
    setGuardando(true);
    await onSave(d);
    setGuardando(false);
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{d.id ? 'Editar descuento' : 'Nuevo descuento automático'}</h3>
        <button onClick={onCancel} className="text-sm text-neutral-500 hover:text-ink">✕ Cerrar</button>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      <label className="text-sm">
        <span className="mb-1 block font-medium text-neutral-700">Tipo de descuento</span>
        <select
          value={d.tipo}
          onChange={(e) => set('tipo', e.target.value)}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-ink"
        >
          <option value="flashsale">🎉 Flash Sale (global)</option>
          <option value="cantidad">📦 Por cantidad de items</option>
          <option value="categoria">🏷️ Por categoría</option>
        </select>
      </label>

      {d.tipo === 'cantidad' && (
        <label className="mt-4 text-sm">
          <span className="mb-1 block font-medium text-neutral-700">Cantidad mínima de items</span>
          <input
            type="number"
            min="1"
            value={d.cantidadMinima || 2}
            onChange={(e) => set('cantidadMinima', parseInt(e.target.value))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink"
          />
          <span className="mt-1 block text-xs text-neutral-400">Ej: 2 = descuento si llevas 2 o más productos</span>
        </label>
      )}

      {d.tipo === 'categoria' && (
        <label className="mt-4 text-sm">
          <span className="mb-1 block font-medium text-neutral-700">Categoría</span>
          <select
            value={d.categoria || ''}
            onChange={(e) => set('categoria', e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-ink"
          >
            <option value="">— Selecciona una categoría —</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-neutral-700">Tipo de descuento</span>
          <select
            value={d.tipoDesc}
            onChange={(e) => set('tipoDesc', e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-ink"
          >
            <option value="porcentaje">Porcentaje (%)</option>
            <option value="monto">Monto fijo (S/)</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-neutral-700">
            Valor {d.tipoDesc === 'porcentaje' ? '(%)' : '(S/)'}
          </span>
          <input
            type="number"
            min="1"
            max={d.tipoDesc === 'porcentaje' ? 100 : undefined}
            value={d.valor}
            onChange={(e) => set('valor', e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink"
          />
        </label>
      </div>

      <label className="mt-4 text-sm">
        <span className="mb-1 block font-medium text-neutral-700">Vence el (opcional)</span>
        <input
          type="date"
          value={d.vence || ''}
          onChange={(e) => set('vence', e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink"
        />
      </label>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={d.activo} onChange={(e) => set('activo', e.target.checked)} />
        Activo (aplica automáticamente)
      </label>

      <div className="mt-5 flex gap-2">
        <button
          onClick={handleSave}
          disabled={guardando || !d.valor}
          className="rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar descuento'}
        </button>
        <button onClick={onCancel} className="rounded-lg border border-neutral-300 px-5 py-2 text-sm">
          Cancelar
        </button>
      </div>
    </div>
  );
}
