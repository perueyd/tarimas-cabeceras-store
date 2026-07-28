import { useEffect, useState } from 'react';
import { useCatalog } from '../context/CatalogContext.jsx';

const TIPOS_OFERTAS = [
  { value: 'codigo', label: '🏷️ Código promocional', desc: 'Cliente ingresa código en checkout' },
  { value: 'flash-sale', label: '🎉 Flash Sale', desc: 'Descuento global (ON/OFF rápido)' },
  { value: 'cantidad', label: '📦 Por cantidad', desc: 'Automático: 2+ items = descuento' },
  { value: 'categoria', label: '🏷️ Por categoría', desc: 'Descuento solo en cierta categoría' },
  { value: 'regalo', label: '🎁 Sistema de regalo', desc: 'Compra $X, recibe $Y gratis' },
  { value: 'referido', label: '👥 Referidos', desc: 'Invita amigos, ambos obtienen desc' },
  { value: 'email', label: '📧 Cupones email', desc: 'Códigos únicos para suscriptores' },
  { value: 'mostrador', label: '🎪 Mostrador tienda', desc: 'Banner visible en la tienda' },
];

export default function MegaOfertasEditor({ adminKey }) {
  const { currencyFormatter, getCategories } = useCatalog();
  const [ofertas, setOfertas] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);

  async function cargar() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ofertas', { headers: { Authorization: `Bearer ${adminKey}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar.');
      setOfertas(data.ofertas || []);
    } catch (err) {
      setError(err.message);
      setOfertas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function guardar(oferta) {
    const res = await fetch('/api/ofertas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
      body: JSON.stringify(oferta),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error || 'No se pudo guardar.');
      return false;
    }
    setOfertas(data.ofertas);
    setEditando(null);
    setError('');
    return true;
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar esta oferta? Esta acción no se puede deshacer.')) return;
    const res = await fetch(`/api/ofertas?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminKey}` },
    });
    const data = await res.json();
    if (res.ok) setOfertas(data.ofertas);
  }

  async function toggleActivo(oferta) {
    await guardar({ ...oferta, activo: !oferta.activo });
  }

  if (loading) return <p className="text-sm text-neutral-400">Cargando ofertas...</p>;

  if (editando) {
    return <OfertaForm inicial={editando} onCancel={() => setEditando(null)} onSave={guardar} error={error} />;
  }

  const filtradas = filtroTipo ? ofertas.filter((o) => o.tipo === filtroTipo) : ofertas;

  return (
    <div>
      <div className="mb-4">
        <p className="mb-3 text-sm text-neutral-600">
          <strong>Control total de todas tus ofertas y descuentos.</strong> Desde códigos promocionales hasta referidos y regalos. Todo en un solo lugar.
        </p>
        <button
          onClick={() => setEditando({ tipo: 'codigo', valor: 10, tipoDesc: 'porcentaje', activo: true })}
          className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
        >
          + Nueva oferta
        </button>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {/* Filtros por tipo */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setFiltroTipo('')}
          className={`rounded-lg px-3 py-1.5 text-xs transition ${
            !filtroTipo
              ? 'border-ink bg-ink text-white'
              : 'border border-neutral-300 text-neutral-600 hover:border-neutral-500'
          }`}
        >
          Todas ({ofertas.length})
        </button>
        {TIPOS_OFERTAS.map((t) => {
          const count = ofertas.filter((o) => o.tipo === t.value).length;
          return (
            <button
              key={t.value}
              onClick={() => setFiltroTipo(t.value)}
              className={`rounded-lg px-3 py-1.5 text-xs transition ${
                filtroTipo === t.value
                  ? 'border-ink bg-ink text-white'
                  : 'border border-neutral-300 text-neutral-600 hover:border-neutral-500'
              }`}
              title={t.desc}
            >
              {t.label} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {filtradas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-400">
          {filtroTipo ? 'No hay ofertas en este tipo.' : 'Aún no tienes ofertas configuradas. Crea una para empezar.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtradas.map((o) => (
            <OfertaCard
              key={o.id}
              oferta={o}
              currencyFormatter={currencyFormatter}
              onToggle={() => toggleActivo(o)}
              onEdit={() => setEditando(o)}
              onDelete={() => eliminar(o.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OfertaCard({ oferta, currencyFormatter, onToggle, onEdit, onDelete }) {
  const tipoLabel = TIPOS_OFERTAS.find((t) => t.value === oferta.tipo)?.label || oferta.tipo;
  const vencido = oferta.vence && new Date(oferta.vence + 'T23:59:59') < new Date();
  const estado = !oferta.activo ? 'Desactivado' : vencido ? 'Vencido' : 'Activo';

  let resumen = '';
  if (oferta.tipo === 'codigo') {
    resumen = `${oferta.codigo || 'SIN CÓDIGO'} · ${oferta.tipoDesc === 'porcentaje' ? `${oferta.valor}%` : currencyFormatter.format(oferta.valor)}`;
  } else if (oferta.tipo === 'flash-sale') {
    resumen = `${oferta.valor}% descuento global`;
  } else if (oferta.tipo === 'cantidad') {
    resumen = `${oferta.cantidadMinima || 2}+ items = ${oferta.valor}% desc`;
  } else if (oferta.tipo === 'categoria') {
    resumen = `${oferta.categoria} = ${oferta.valor}% desc`;
  } else if (oferta.tipo === 'regalo') {
    resumen = `Compra ${currencyFormatter.format(oferta.montoMinimo || 0)}, recibe ${currencyFormatter.format(oferta.montoRegalo || 0)} gratis`;
  } else if (oferta.tipo === 'referido') {
    resumen = `${oferta.cantidadReferidos || 3} referidos = ${oferta.valor}% desc`;
  } else if (oferta.tipo === 'email') {
    resumen = `Códigos únicos para suscriptores`;
  } else if (oferta.tipo === 'mostrador') {
    resumen = `Banner: "${oferta.textoMostrador || 'Oferta especial'}"`;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold">{tipoLabel}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              !oferta.activo
                ? 'bg-neutral-100 text-neutral-500'
                : vencido
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-green-100 text-green-700'
            }`}
          >
            {estado}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-neutral-500">{resumen}</p>
        {oferta.usados !== undefined && <p className="text-xs text-neutral-400">Usado {oferta.usados || 0} veces</p>}
      </div>
      <div className="flex gap-2 text-xs">
        <button onClick={onToggle} className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:border-ink">
          {oferta.activo ? 'Desactivar' : 'Activar'}
        </button>
        <button onClick={onEdit} className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:border-ink">
          Editar
        </button>
        <button onClick={onDelete} className="rounded-lg border border-red-200 px-3 py-1.5 text-red-600 hover:bg-red-50">
          Eliminar
        </button>
      </div>
    </div>
  );
}

function OfertaForm({ inicial, onCancel, onSave, error }) {
  const { getCategories } = useCatalog();
  const [o, setO] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setO((prev) => ({ ...prev, [k]: v }));
  const categorias = getCategories?.() || [];

  async function handleSave() {
    if (o.tipo === 'codigo' && !o.codigo) {
      alert('Ingresa un código.');
      return;
    }
    if (o.tipo === 'categoria' && !o.categoria) {
      alert('Selecciona una categoría.');
      return;
    }
    setGuardando(true);
    await onSave(o);
    setGuardando(false);
  }

  const tipoInfo = TIPOS_OFERTAS.find((t) => t.value === o.tipo);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{o.id ? 'Editar oferta' : 'Nueva oferta'}</h3>
        <button onClick={onCancel} className="text-sm text-neutral-500 hover:text-ink">✕ Cerrar</button>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      <label className="text-sm">
        <span className="mb-1 block font-medium text-neutral-700">Tipo de oferta</span>
        <select
          value={o.tipo}
          onChange={(e) => setO({ tipo: e.target.value, activo: true })}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-ink"
        >
          {TIPOS_OFERTAS.map((t) => (
            <option key={t.value} value={t.value}>{t.label} - {t.desc}</option>
          ))}
        </select>
      </label>

      {tipoInfo && (
        <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
          {tipoInfo.desc}
        </p>
      )}

      {/* CÓDIGO PROMOCIONAL */}
      {o.tipo === 'codigo' && (
        <>
          <label className="mt-4 text-sm">
            <span className="mb-1 block font-medium text-neutral-700">Código</span>
            <input
              value={o.codigo || ''}
              onChange={(e) => set('codigo', e.target.value.toUpperCase())}
              placeholder="VERANO2026"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono uppercase outline-none focus:border-ink"
            />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-neutral-700">Tipo</span>
              <select
                value={o.tipoDesc}
                onChange={(e) => set('tipoDesc', e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-ink"
              >
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="monto">Monto fijo (S/)</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-neutral-700">Valor</span>
              <input
                type="number"
                min="1"
                value={o.valor || 10}
                onChange={(e) => set('valor', e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink"
              />
            </label>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-neutral-700">Límite de usos (opcional)</span>
              <input type="number" min="1" value={o.maxUsos || ''} onChange={(e) => set('maxUsos', e.target.value)} placeholder="Sin límite" className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-neutral-700">Vence el (opcional)</span>
              <input type="date" value={o.vence || ''} onChange={(e) => set('vence', e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink" />
            </label>
          </div>
        </>
      )}

      {/* CANTIDAD */}
      {o.tipo === 'cantidad' && (
        <>
          <label className="mt-4 text-sm">
            <span className="mb-1 block font-medium text-neutral-700">Cantidad mínima de items</span>
            <input type="number" min="1" value={o.cantidadMinima || 2} onChange={(e) => set('cantidadMinima', parseInt(e.target.value))} className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink" />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-neutral-700">Tipo</span>
              <select value={o.tipoDesc || 'porcentaje'} onChange={(e) => set('tipoDesc', e.target.value)} className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-ink">
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="monto">Monto fijo (S/)</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-neutral-700">Valor</span>
              <input type="number" min="1" value={o.valor || 10} onChange={(e) => set('valor', e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink" />
            </label>
          </div>
        </>
      )}

      {/* CATEGORÍA */}
      {o.tipo === 'categoria' && (
        <>
          <label className="mt-4 text-sm">
            <span className="mb-1 block font-medium text-neutral-700">Categoría</span>
            <select value={o.categoria || ''} onChange={(e) => set('categoria', e.target.value)} className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-ink">
              <option value="">— Selecciona una categoría —</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-neutral-700">Tipo</span>
              <select value={o.tipoDesc || 'porcentaje'} onChange={(e) => set('tipoDesc', e.target.value)} className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-ink">
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="monto">Monto fijo (S/)</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-neutral-700">Valor</span>
              <input type="number" min="1" value={o.valor || 10} onChange={(e) => set('valor', e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink" />
            </label>
          </div>
        </>
      )}

      {/* FLASH SALE */}
      {o.tipo === 'flash-sale' && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-neutral-700">Descuento (%)</span>
              <input type="number" min="1" max="100" value={o.valor || 50} onChange={(e) => set('valor', e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-neutral-700">Vence el</span>
              <input type="date" value={o.vence || ''} onChange={(e) => set('vence', e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink" />
            </label>
          </div>
        </>
      )}

      {/* REGALO */}
      {o.tipo === 'regalo' && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-neutral-700">Compra mínimo (S/)</span>
              <input type="number" min="1" value={o.montoMinimo || 100} onChange={(e) => set('montoMinimo', parseFloat(e.target.value))} className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-neutral-700">Monto del regalo (S/)</span>
              <input type="number" min="1" value={o.montoRegalo || 50} onChange={(e) => set('montoRegalo', parseFloat(e.target.value))} className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink" />
            </label>
          </div>
        </>
      )}

      {/* REFERIDOS */}
      {o.tipo === 'referido' && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-neutral-700">Cantidad de referidos</span>
              <input type="number" min="1" value={o.cantidadReferidos || 3} onChange={(e) => set('cantidadReferidos', parseInt(e.target.value))} className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-neutral-700">Descuento (%)</span>
              <input type="number" min="1" max="100" value={o.valor || 20} onChange={(e) => set('valor', e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink" />
            </label>
          </div>
        </>
      )}

      {/* MOSTRADOR */}
      {o.tipo === 'mostrador' && (
        <>
          <label className="mt-4 text-sm">
            <span className="mb-1 block font-medium text-neutral-700">Texto del banner</span>
            <input
              value={o.textoMostrador || ''}
              onChange={(e) => set('textoMostrador', e.target.value)}
              placeholder="Ej: Lleva 2 = 15% desc en la segunda"
              maxLength="60"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink"
            />
            <span className="mt-1 block text-xs text-neutral-400">{(o.textoMostrador || '').length}/60 caracteres</span>
          </label>
        </>
      )}

      {/* ACTIVO */}
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={o.activo} onChange={(e) => set('activo', e.target.checked)} />
        Activo ahora
      </label>

      <div className="mt-5 flex gap-2">
        <button
          onClick={handleSave}
          disabled={guardando}
          className="rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar oferta'}
        </button>
        <button onClick={onCancel} className="rounded-lg border border-neutral-300 px-5 py-2 text-sm">
          Cancelar
        </button>
      </div>
    </div>
  );
}
