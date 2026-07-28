import { useState } from 'react';

export default function DesignTab({ catalog, api, flash }) {
  const cfg = catalog.storeConfig || {};
  const design = cfg.design || {};
  const [data, setData] = useState({
    heroColors: design.heroColors || ['#3b5a70', '#6e2a35', '#8b8d91', '#d9c9a8', '#2b2b2b'],
    primaryColor: design.primaryColor || '#3b5a70',
    accentColor: design.accentColor || '#6e2a35',
    fontFamily: design.fontFamily || 'sans-serif',
  });
  const [saving, setSaving] = useState(false);

  function updateColorList(i, value) {
    const colors = [...data.heroColors];
    colors[i] = value;
    setData({ ...data, heroColors: colors });
  }

  function addColor() {
    setData({ ...data, heroColors: [...data.heroColors, '#000000'] });
  }

  function removeColor(i) {
    setData({ ...data, heroColors: data.heroColors.filter((_, idx) => idx !== i) });
  }

  async function guardar() {
    setSaving(true);
    try {
      const res = await fetch('/api/catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('key') || ''}` },
        body: JSON.stringify({ ...cfg, design: data }),
      });
      if (res.ok) {
        flash('Diseño actualizado. Recarga la página para ver los cambios.');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-4 text-lg font-semibold">Colores del Hero</h3>
        <p className="mb-3 text-sm text-neutral-600">
          Los colores aparecen como botones en el hero de la página principal. El cliente puede elegir entre ellos.
        </p>
        <div className="space-y-2">
          {data.heroColors.map((color, i) => (
            <div key={i} className="flex gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => updateColorList(i, e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded border border-neutral-300"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => updateColorList(i, e.target.value)}
                  className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm font-mono"
                  placeholder="#000000"
                />
              </div>
              <button
                type="button"
                onClick={() => removeColor(i)}
                className="rounded border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addColor}
            className="mt-2 rounded border border-neutral-300 px-3 py-2 text-xs font-medium hover:border-neutral-500"
          >
            + Agregar color
          </button>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Colores Principales</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Color primario</span>
            <div className="mt-2 flex gap-2">
              <input
                type="color"
                value={data.primaryColor}
                onChange={(e) => setData({ ...data, primaryColor: e.target.value })}
                className="h-10 w-16 cursor-pointer rounded border border-neutral-300"
              />
              <input
                type="text"
                value={data.primaryColor}
                onChange={(e) => setData({ ...data, primaryColor: e.target.value })}
                className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm font-mono"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Color de acento</span>
            <div className="mt-2 flex gap-2">
              <input
                type="color"
                value={data.accentColor}
                onChange={(e) => setData({ ...data, accentColor: e.target.value })}
                className="h-10 w-16 cursor-pointer rounded border border-neutral-300"
              />
              <input
                type="text"
                value={data.accentColor}
                onChange={(e) => setData({ ...data, accentColor: e.target.value })}
                className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm font-mono"
              />
            </div>
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Tipografía</h3>
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">Familia de fuente</span>
          <select
            value={data.fontFamily}
            onChange={(e) => setData({ ...data, fontFamily: e.target.value })}
            className="mt-2 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="sans-serif">Sans Serif (Moderno)</option>
            <option value="serif">Serif (Clásico)</option>
            <option value="monospace">Monospace (Técnico)</option>
          </select>
        </label>
      </section>

      <button
        onClick={guardar}
        disabled={saving}
        className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  );
}
