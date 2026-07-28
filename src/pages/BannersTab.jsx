import { useState } from 'react';

export default function BannersTab({ catalog, api, flash }) {
  const cfg = catalog.storeConfig || {};
  const banners = cfg.banners || [];
  const [data, setData] = useState(banners);
  const [saving, setSaving] = useState(false);

  function updateBanner(i, field, value) {
    setData(data.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)));
  }

  function addBanner() {
    setData([...data, { id: `banner-${Date.now()}`, seccion: 'hero', titulo: '', texto: '', icono: '✨', color: '#3b5a70', activo: true }]);
  }

  function removeBanner(i) {
    setData(data.filter((_, idx) => idx !== i));
  }

  async function guardar() {
    setSaving(true);
    try {
      const res = await fetch('/api/catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('key') || ''}` },
        body: JSON.stringify({ ...cfg, banners: data }),
      });
      if (res.ok) flash('Banners actualizados.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
        Los banners aparecen en secciones específicas de la página. Cada uno tiene un título, texto, icono y color.
      </div>

      <div className="space-y-4">
        {data.map((banner, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">Banner {i + 1}</span>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={banner.activo !== false}
                  onChange={(e) => updateBanner(i, 'activo', e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-xs">Activo</span>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="text-neutral-600">Sección</span>
                <select
                  value={banner.seccion || 'hero'}
                  onChange={(e) => updateBanner(i, 'seccion', e.target.value)}
                  className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                >
                  <option value="hero">Hero</option>
                  <option value="categorias">Categorías</option>
                  <option value="comoFunciona">Cómo Funciona</option>
                  <option value="footer">Footer</option>
                </select>
              </label>
              <label className="block text-xs">
                <span className="text-neutral-600">Icono (emoji)</span>
                <input
                  type="text"
                  maxLength="3"
                  value={banner.icono || '✨'}
                  onChange={(e) => updateBanner(i, 'icono', e.target.value)}
                  className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                />
              </label>
            </div>

            <label className="mt-2 block text-xs">
              <span className="text-neutral-600">Título</span>
              <input
                type="text"
                value={banner.titulo || ''}
                onChange={(e) => updateBanner(i, 'titulo', e.target.value)}
                placeholder="Ej: ¡Nuevo modelo disponible!"
                className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
              />
            </label>

            <label className="mt-2 block text-xs">
              <span className="text-neutral-600">Texto</span>
              <textarea
                value={banner.texto || ''}
                onChange={(e) => updateBanner(i, 'texto', e.target.value)}
                placeholder="Descripción del banner"
                rows={2}
                className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
              />
            </label>

            <label className="mt-2 block text-xs">
              <span className="text-neutral-600">Color (hex)</span>
              <input
                type="text"
                value={banner.color || '#3b5a70'}
                onChange={(e) => updateBanner(i, 'color', e.target.value)}
                placeholder="#3b5a70"
                className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm font-mono"
              />
            </label>

            <button
              type="button"
              onClick={() => removeBanner(i)}
              className="mt-3 rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addBanner}
        className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium hover:border-neutral-500"
      >
        + Agregar banner
      </button>

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
