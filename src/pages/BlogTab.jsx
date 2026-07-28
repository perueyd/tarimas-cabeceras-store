import { useState } from 'react';

export default function BlogTab({ catalog, api, flash }) {
  const cfg = catalog.storeConfig || {};
  const articulos = cfg.blog || [];
  const [data, setData] = useState(articulos);
  const [saving, setSaving] = useState(false);

  function updateArticulo(i, field, value) {
    setData(data.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)));
  }

  function addArticulo() {
    setData([
      ...data,
      {
        id: `blog-${Date.now()}`,
        titulo: '',
        descripcion: '',
        contenido: '',
        fecha: new Date().toISOString().split('T')[0],
        autor: '',
        activo: true,
      },
    ]);
  }

  function removeArticulo(i) {
    setData(data.filter((_, idx) => idx !== i));
  }

  async function guardar() {
    setSaving(true);
    try {
      const res = await fetch('/api/catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('key') || ''}` },
        body: JSON.stringify({ ...cfg, blog: data }),
      });
      if (res.ok) flash('Blog actualizado.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
        Crea y edita artículos de blog. Solo se muestran los artículos activos en tu sitio.
      </div>

      <div className="space-y-4">
        {data.map((articulo, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">Artículo {i + 1}</span>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={articulo.activo !== false}
                  onChange={(e) => updateArticulo(i, 'activo', e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-xs">Activo</span>
              </label>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="text-neutral-600">Título</span>
                <input
                  type="text"
                  value={articulo.titulo || ''}
                  onChange={(e) => updateArticulo(i, 'titulo', e.target.value)}
                  placeholder="Título del artículo"
                  className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                />
              </label>
              <label className="block text-xs">
                <span className="text-neutral-600">Fecha</span>
                <input
                  type="date"
                  value={articulo.fecha || ''}
                  onChange={(e) => updateArticulo(i, 'fecha', e.target.value)}
                  className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                />
              </label>
            </div>

            <label className="mt-2 block text-xs">
              <span className="text-neutral-600">Autor</span>
              <input
                type="text"
                value={articulo.autor || ''}
                onChange={(e) => updateArticulo(i, 'autor', e.target.value)}
                placeholder="Tu nombre"
                className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
              />
            </label>

            <label className="mt-2 block text-xs">
              <span className="text-neutral-600">Descripción corta</span>
              <textarea
                value={articulo.descripcion || ''}
                onChange={(e) => updateArticulo(i, 'descripcion', e.target.value)}
                placeholder="Resumen que aparece en listado"
                rows={2}
                className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
              />
            </label>

            <label className="mt-2 block text-xs">
              <span className="text-neutral-600">Contenido completo</span>
              <textarea
                value={articulo.contenido || ''}
                onChange={(e) => updateArticulo(i, 'contenido', e.target.value)}
                placeholder="Contenido del artículo (puedes usar markdown simple)"
                rows={5}
                className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
              />
            </label>

            <button
              type="button"
              onClick={() => removeArticulo(i)}
              className="mt-3 rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              Eliminar artículo
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addArticulo}
        className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium hover:border-neutral-500"
      >
        + Nuevo artículo
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
