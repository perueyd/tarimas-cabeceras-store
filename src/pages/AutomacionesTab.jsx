import { useEffect, useState } from 'react';

const TIPOS_AUTOMACION = [
  { value: 'notificacion', label: '🔔 Notificación admin', desc: 'Avisar al dueño cuando se use' },
  { value: 'whatsapp', label: '💬 Mensaje WhatsApp', desc: 'Enviar mensaje automático al cliente' },
  { value: 'descuento-extra', label: '🎁 Desc. extra', desc: 'Otorgar descuento adicional si condición' },
  { value: 'email', label: '📧 Email automático', desc: 'Enviar email con seguimiento' },
];

export default function AutomacionesTab({ adminKey }) {
  const [automaciones, setAutomaciones] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState('');

  async function cargar() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/automaciones', { headers: { Authorization: `Bearer ${adminKey}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar.');
      setAutomaciones(data.automaciones || []);
    } catch (err) {
      setError(err.message);
      setAutomaciones([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function guardar(auto) {
    const res = await fetch('/api/automaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
      body: JSON.stringify(auto),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error || 'No se pudo guardar.');
      return false;
    }
    setAutomaciones(data.automaciones);
    setEditando(null);
    setError('');
    return true;
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar esta automación?')) return;
    const res = await fetch(`/api/automaciones?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminKey}` },
    });
    const data = await res.json();
    if (res.ok) setAutomaciones(data.automaciones);
  }

  async function toggleActiva(auto) {
    await guardar({ ...auto, activa: !auto.activa });
  }

  if (loading) return <p className="text-sm text-neutral-400">Cargando automaciones...</p>;

  if (editando) {
    return <AutomacionForm inicial={editando} onCancel={() => setEditando(null)} onSave={guardar} error={error} />;
  }

  return (
    <div>
      <div className="mb-4">
        <p className="mb-3 text-sm text-neutral-600">
          <strong>Acciones automáticas cuando se usan códigos.</strong> Notificaciones, mensajes, descuentos extras.
        </p>
        <button
          onClick={() => setEditando({ tipo: 'notificacion', activa: true })}
          className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
        >
          + Nueva automación
        </button>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {!automaciones || automaciones.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-400">
          Sin automaciones configuradas. Crea una para empezar.
        </p>
      ) : (
        <div className="space-y-2">
          {automaciones.map((a) => {
            const tipoLabel = TIPOS_AUTOMACION.find((t) => t.value === a.tipo)?.label || a.tipo;
            return (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{tipoLabel}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      !a.activa ? 'bg-neutral-100 text-neutral-500' : 'bg-green-100 text-green-700'
                    }`}>
                      {a.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {a.condicion || 'Sin condición específica'}
                  </p>
                </div>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => toggleActiva(a)} className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:border-ink">
                    {a.activa ? 'Desactivar' : 'Activar'}
                  </button>
                  <button onClick={() => setEditando(a)} className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:border-ink">
                    Editar
                  </button>
                  <button onClick={() => eliminar(a.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-red-600 hover:bg-red-50">
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

function AutomacionForm({ inicial, onCancel, onSave, error }) {
  const [a, setA] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setA((prev) => ({ ...prev, [k]: v }));

  async function handleSave() {
    setGuardando(true);
    await onSave(a);
    setGuardando(false);
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Nueva automación</h3>
        <button onClick={onCancel} className="text-sm text-neutral-500 hover:text-ink">✕</button>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      <label className="text-sm">
        <span className="mb-1 block font-medium text-neutral-700">Tipo de automación</span>
        <select
          value={a.tipo}
          onChange={(e) => setA({ tipo: e.target.value, activa: true })}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-ink"
        >
          {TIPOS_AUTOMACION.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </label>

      {a.tipo === 'notificacion' && (
        <>
          <label className="mt-4 text-sm">
            <span className="mb-1 block font-medium text-neutral-700">Mensaje de notificación</span>
            <input
              value={a.mensaje || ''}
              onChange={(e) => set('mensaje', e.target.value)}
              placeholder="Ej: Se usó el código {codigo}"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink"
            />
          </label>
        </>
      )}

      {a.tipo === 'whatsapp' && (
        <>
          <label className="mt-4 text-sm">
            <span className="mb-1 block font-medium text-neutral-700">Mensaje WhatsApp</span>
            <textarea
              value={a.mensajeWhatsapp || ''}
              onChange={(e) => set('mensajeWhatsapp', e.target.value)}
              placeholder="Ej: ¡Gracias por usar nuestro código! Tu descuento fue aplicado."
              rows={4}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink"
            />
          </label>
        </>
      )}

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={a.activa} onChange={(e) => set('activa', e.target.checked)} />
        Automación activa
      </label>

      <div className="mt-5 flex gap-2">
        <button
          onClick={handleSave}
          disabled={guardando}
          className="rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
        <button onClick={onCancel} className="rounded-lg border border-neutral-300 px-5 py-2 text-sm">
          Cancelar
        </button>
      </div>
    </div>
  );
}
