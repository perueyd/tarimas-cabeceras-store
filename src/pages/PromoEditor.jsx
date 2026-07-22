import { useEffect, useState } from 'react';
import { useCatalog } from '../context/CatalogContext.jsx';

const CODIGO_VACIO = { code: '', tipo: 'porcentaje', valor: 10, activo: true, maxUsos: '', vence: '' };

// Genera un código legible al azar, ej. "VERANO-K7X2".
function generarCodigo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin O/0/I/1 para evitar confusiones
  let sufijo = '';
  for (let i = 0; i < 5; i++) sufijo += letras[Math.floor(Math.random() * letras.length)];
  return `PROMO-${sufijo}`;
}

export default function PromoEditor({ adminKey }) {
  const { currencyFormatter } = useCatalog();
  const [codes, setCodes] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);

  async function cargar() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/promo', { headers: { Authorization: `Bearer ${adminKey}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar.');
      setCodes(data.codes || []);
    } catch (err) {
      setError(err.message);
      setCodes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function guardar(codigo) {
    const res = await fetch('/api/promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
      body: JSON.stringify(codigo),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error || 'No se pudo guardar.');
      return false;
    }
    setCodes(data.codes);
    setEditando(null);
    setError('');
    return true;
  }

  async function toggleActivo(codigo) {
    await guardar({ ...codigo, activo: !codigo.activo });
  }

  async function eliminar(codigo) {
    if (!window.confirm(`¿Eliminar el código ${codigo.code}? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/promo?code=${encodeURIComponent(codigo.code)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminKey}` },
    });
    const data = await res.json();
    if (res.ok) setCodes(data.codes);
  }

  if (loading) return <p className="text-sm text-neutral-400">Cargando códigos...</p>;

  if (editando) {
    return <PromoForm inicial={editando} onCancel={() => setEditando(null)} onSave={guardar} error={error} />;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-500">
          Crea códigos que tus clientes ingresan en el checkout para obtener un descuento.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setEditando({ ...CODIGO_VACIO, code: generarCodigo() })}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:border-ink"
          >
            🎲 Generar código
          </button>
          <button
            onClick={() => setEditando({ ...CODIGO_VACIO })}
            className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
          >
            + Código manual
          </button>
        </div>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {codes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-400">
          Aún no tienes códigos de descuento.
        </p>
      ) : (
        <div className="space-y-2">
          {codes.map((c) => {
            const vencido = c.vence && new Date(c.vence + 'T23:59:59') < new Date();
            const agotado = c.maxUsos && (c.usados || 0) >= c.maxUsos;
            return (
              <div key={c.code} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{c.code}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        !c.activo
                          ? 'bg-neutral-100 text-neutral-500'
                          : vencido || agotado
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {!c.activo ? 'Desactivado' : vencido ? 'Vencido' : agotado ? 'Agotado' : 'Activo'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {c.tipo === 'porcentaje' ? `${c.valor}% de descuento` : `${currencyFormatter.format(c.valor)} de descuento`}
                    {' · '}
                    {c.usados || 0} usado{c.usados === 1 ? '' : 's'}
                    {c.maxUsos ? ` / ${c.maxUsos} máx.` : ''}
                    {c.vence ? ` · vence ${c.vence}` : ''}
                  </p>
                </div>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => toggleActivo(c)} className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:border-ink">
                    {c.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button onClick={() => setEditando(c)} className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:border-ink">
                    Editar
                  </button>
                  <button onClick={() => eliminar(c)} className="rounded-lg border border-red-200 px-3 py-1.5 text-red-600 hover:bg-red-50">
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

function PromoForm({ inicial, onCancel, onSave, error }) {
  const [c, setC] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setC((prev) => ({ ...prev, [k]: v }));

  async function handleSave() {
    setGuardando(true);
    await onSave(c);
    setGuardando(false);
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{inicial.code && inicial.usados != null ? 'Editar código' : 'Nuevo código'}</h3>
        <button onClick={onCancel} className="text-sm text-neutral-500 hover:text-ink">✕ Cerrar</button>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      <label className="text-sm">
        <span className="mb-1 block font-medium text-neutral-700">Código</span>
        <input
          value={c.code}
          onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s+/g, ''))}
          placeholder="VERANO2026"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono uppercase outline-none focus:border-ink"
        />
        <span className="mt-1 block text-xs text-neutral-400">Solo letras, números y guiones. Así lo escribirá tu cliente.</span>
      </label>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-neutral-700">Tipo de descuento</span>
          <select
            value={c.tipo}
            onChange={(e) => set('tipo', e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-ink"
          >
            <option value="porcentaje">Porcentaje (%)</option>
            <option value="monto">Monto fijo (S/)</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-neutral-700">
            Valor {c.tipo === 'porcentaje' ? '(%)' : '(S/)'}
          </span>
          <input
            type="number"
            min="1"
            max={c.tipo === 'porcentaje' ? 100 : undefined}
            value={c.valor}
            onChange={(e) => set('valor', e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-neutral-700">Límite de usos (opcional)</span>
          <input
            type="number"
            min="1"
            value={c.maxUsos}
            onChange={(e) => set('maxUsos', e.target.value)}
            placeholder="Sin límite"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-neutral-700">Vence el (opcional)</span>
          <input
            type="date"
            value={c.vence}
            onChange={(e) => set('vence', e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink"
          />
        </label>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={c.activo} onChange={(e) => set('activo', e.target.checked)} />
        Activo (el cliente puede usarlo ya mismo)
      </label>

      <div className="mt-5 flex gap-2">
        <button
          onClick={handleSave}
          disabled={guardando || !c.code.trim() || !c.valor}
          className="rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar código'}
        </button>
        <button onClick={onCancel} className="rounded-lg border border-neutral-300 px-5 py-2 text-sm">
          Cancelar
        </button>
      </div>
    </div>
  );
}
