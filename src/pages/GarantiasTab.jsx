import { useState } from 'react';

// Edita las tarjetas de confianza de la portada (las que dicen "Hechos a
// medida", "Entrega en 3-4 días"...). Salen justo debajo de la vitrina.
//
// IMPORTANTE: lo que escribas aquí es una PROMESA al cliente y se puede usar
// como prueba en un reclamo ante INDECOPI. Pon solo lo que de verdad cumples.

const EMOJIS = ['📐', '⚡', '🛡️', '🚚', '💳', '🏭', '✅', '🎨', '📦', '🔧', '⭐', '🤝'];

const NUEVA = { icon: '✅', label: '', description: '' };

export default function GarantiasTab({ catalog, api, flash }) {
  const cfg = catalog.storeConfig || {};
  const [lista, setLista] = useState(
    Array.isArray(cfg.garantias) && cfg.garantias.length
      ? cfg.garantias
      : [
          { icon: '📐', label: 'Hechos a medida', description: 'La medida que necesites' },
          { icon: '⚡', label: 'Entrega en 3-4 días', description: 'Días hábiles, en Lima' },
        ]
  );
  const [saving, setSaving] = useState(false);

  function cambiar(i, campo, valor) {
    setLista((prev) => prev.map((g, j) => (j === i ? { ...g, [campo]: valor } : g)));
  }

  function mover(i, delta) {
    setLista((prev) => {
      const j = i + delta;
      if (j < 0 || j >= prev.length) return prev;
      const copia = [...prev];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  }

  async function guardar() {
    // Se descartan las tarjetas sin título: una tarjeta vacía en la portada
    // queda como un hueco raro.
    const limpias = lista
      .filter((g) => g.label.trim())
      .map((g) => ({
        icon: g.icon || '✅',
        label: g.label.trim().slice(0, 40),
        description: g.description.trim().slice(0, 60),
      }));
    setSaving(true);
    try {
      await api('POST', 'config', { garantias: limpias });
      setLista(limpias);
      flash('Garantías actualizadas. Ya se ven en la portada.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        ⚠️ Esto es una <strong>promesa al cliente</strong>. Escribe solo lo que cumples de verdad:
        una garantía que anuncias y no cumples puede costarte una sanción de INDECOPI.
      </div>

      <div>
        <h3 className="text-lg font-semibold">Tarjetas de confianza</h3>
        <p className="mt-1 text-sm text-neutral-500">
          Aparecen en la portada, debajo de la vitrina. Se recomienda de 2 a 4.
        </p>
      </div>

      <div className="space-y-3">
        {lista.map((g, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-start gap-3">
              <select
                value={g.icon}
                onChange={(e) => cambiar(i, 'icon', e.target.value)}
                className="rounded-lg border border-neutral-300 bg-white px-2 py-2 text-xl outline-none focus:border-ink"
                aria-label="Ícono"
              >
                {EMOJIS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>

              <div className="min-w-[180px] flex-1 space-y-2">
                <input
                  value={g.label}
                  onChange={(e) => cambiar(i, 'label', e.target.value)}
                  placeholder="Título (ej. Entrega en 3-4 días)"
                  maxLength={40}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium outline-none focus:border-ink"
                />
                <input
                  value={g.description}
                  onChange={(e) => cambiar(i, 'description', e.target.value)}
                  placeholder="Detalle (ej. Días hábiles, en Lima)"
                  maxLength={60}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
                />
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => mover(i, -1)}
                  disabled={i === 0}
                  className="rounded-lg border border-neutral-300 px-2 py-1.5 text-xs hover:border-ink disabled:opacity-30"
                  title="Subir"
                >
                  ↑
                </button>
                <button
                  onClick={() => mover(i, 1)}
                  disabled={i === lista.length - 1}
                  className="rounded-lg border border-neutral-300 px-2 py-1.5 text-xs hover:border-ink disabled:opacity-30"
                  title="Bajar"
                >
                  ↓
                </button>
                <button
                  onClick={() => setLista((prev) => prev.filter((_, j) => j !== i))}
                  className="rounded-lg border border-red-200 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50"
                  title="Eliminar"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}

        {lista.length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
            Sin tarjetas. La portada no mostrará esta franja.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setLista((prev) => [...prev, { ...NUEVA }])}
          disabled={lista.length >= 4}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:border-ink disabled:opacity-40"
        >
          + Agregar tarjeta
        </button>
        <button
          onClick={guardar}
          disabled={saving}
          className="rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
          Así se verá en la portada
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {lista.filter((g) => g.label.trim()).map((g, i) => (
            <div key={i} className="rounded-lg border border-neutral-200 bg-white p-4 text-center">
              <div className="mb-1 text-2xl">{g.icon}</div>
              <p className="text-sm font-semibold">{g.label}</p>
              <p className="mt-0.5 text-xs text-neutral-600">{g.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
        💬 Las <strong>opiniones de clientes</strong> de la portada salen solas de las reseñas
        reales que dejan tus compradores. No se pueden escribir a mano a propósito: así nadie puede
        acusarte de inventar testimonios. Si aún no hay ninguna, esa parte no se muestra.
      </div>
    </div>
  );
}
