import { useState } from 'react';

export default function SEOTab({ catalog, api, flash }) {
  const cfg = catalog.storeConfig || {};
  const seo = cfg.seo || {};
  const [data, setData] = useState({
    siteName: seo.siteName || 'E|D Espacios y Diseño',
    siteDesc: seo.siteDesc || 'Tienda online de muebles y diseño',
    keywords: seo.keywords || 'muebles, diseño, tienda online',
    ogTitle: seo.ogTitle || 'E|D Espacios y Diseño',
    ogDesc: seo.ogDesc || 'Encuentra muebles y diseño único',
    ogImage: seo.ogImage || 'https://...',
    schemaOrg: seo.schemaOrg || true,
    sitemapActivo: seo.sitemapActivo !== false,
    robotsTxt: seo.robotsTxt || 'User-agent: *\nDisallow: /admin\nAllow: /',
    cacheStrategy: seo.cacheStrategy || 'agresivo',
    abTestingActivo: seo.abTestingActivo || false,
    varianteTituloA: seo.varianteTituloA || 'Muebles premium',
    varianteTituloB: seo.varianteTituloB || 'Diseño único y exclusivo',
    metaTagsCustomas: seo.metaTagsCustomas || [],
    trackingPixeles: seo.trackingPixeles || [],
  });
  const [saving, setSaving] = useState(false);
  const [newMetaTag, setNewMetaTag] = useState({ name: '', content: '' });
  const [newPixel, setNewPixel] = useState('');

  async function guardar() {
    setSaving(true);
    try {
      const res = await fetch('/api/catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('key') || ''}` },
        body: JSON.stringify({ ...cfg, seo: data }),
      });
      if (res.ok) flash('SEO actualizado.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  function agregarMetaTag() {
    if (newMetaTag.name && newMetaTag.content) {
      setData({
        ...data,
        metaTagsCustomas: [...data.metaTagsCustomas, { ...newMetaTag, id: Date.now() }],
      });
      setNewMetaTag({ name: '', content: '' });
    }
  }

  function eliminarMetaTag(id) {
    setData({
      ...data,
      metaTagsCustomas: data.metaTagsCustomas.filter((tag) => tag.id !== id),
    });
  }

  function agregarPixel() {
    if (newPixel.trim()) {
      setData({
        ...data,
        trackingPixeles: [...data.trackingPixeles, { id: Date.now(), code: newPixel }],
      });
      setNewPixel('');
    }
  }

  function eliminarPixel(id) {
    setData({
      ...data,
      trackingPixeles: data.trackingPixeles.filter((p) => p.id !== id),
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
        📈 SEO avanzado: meta tags, Open Graph, Schema.org, y tracking de conversiones.
      </div>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Información Básica (Meta Tags)</h3>
        <div className="space-y-3">
          <label className="block text-xs">
            <span className="text-neutral-600">Nombre del sitio</span>
            <input
              type="text"
              value={data.siteName}
              onChange={(e) => setData({ ...data, siteName: e.target.value })}
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="block text-xs">
            <span className="text-neutral-600">Descripción (meta description)</span>
            <textarea
              value={data.siteDesc}
              onChange={(e) => setData({ ...data, siteDesc: e.target.value })}
              maxLength="160"
              rows={2}
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
            />
            <span className="mt-1 block text-[10px] text-neutral-400">{data.siteDesc.length}/160 caracteres</span>
          </label>
          <label className="block text-xs">
            <span className="text-neutral-600">Keywords (separados por coma)</span>
            <input
              type="text"
              value={data.keywords}
              onChange={(e) => setData({ ...data, keywords: e.target.value })}
              placeholder="muebles, diseño, tienda"
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Open Graph (Redes Sociales)</h3>
        <div className="space-y-3">
          <label className="block text-xs">
            <span className="text-neutral-600">Título (Facebook, WhatsApp)</span>
            <input
              type="text"
              value={data.ogTitle}
              onChange={(e) => setData({ ...data, ogTitle: e.target.value })}
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="block text-xs">
            <span className="text-neutral-600">Descripción (preview en redes)</span>
            <textarea
              value={data.ogDesc}
              onChange={(e) => setData({ ...data, ogDesc: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="block text-xs">
            <span className="text-neutral-600">Imagen (URL)</span>
            <input
              type="text"
              value={data.ogImage}
              onChange={(e) => setData({ ...data, ogImage: e.target.value })}
              placeholder="https://..."
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm font-mono text-[10px]"
            />
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Estructura de Datos (Schema.org)</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.schemaOrg}
              onChange={(e) => setData({ ...data, schemaOrg: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm">📊 Agregar Schema.org JSON-LD (para Google Rich Snippets)</span>
          </label>
          <p className="text-xs text-neutral-600">
            Ayuda a Google a entender tu contenido. Muestra estrellas, precios, y disponibilidad en resultados.
          </p>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Indexación (Sitemap y Robots)</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.sitemapActivo}
              onChange={(e) => setData({ ...data, sitemapActivo: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm">🗺️ Generar sitemap.xml dinámico</span>
          </label>
          <label className="block text-xs">
            <span className="text-neutral-600">robots.txt personalizado</span>
            <textarea
              value={data.robotsTxt}
              onChange={(e) => setData({ ...data, robotsTxt: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm font-mono text-[10px]"
            />
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Caché y Performance</h3>
        <label className="block text-xs">
          <span className="text-neutral-600">Estrategia de caché</span>
          <select
            value={data.cacheStrategy}
            onChange={(e) => setData({ ...data, cacheStrategy: e.target.value })}
            className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
          >
            <option value="agresivo">Agresivo (1 día)</option>
            <option value="normal">Normal (1 hora)</option>
            <option value="nocache">Sin caché (siempre fresco)</option>
          </select>
          <span className="mt-1 block text-[10px] text-neutral-400">
            Más caché = más rápido pero menos actualizado. Vercel CDN global.
          </span>
        </label>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">A/B Testing de Títulos</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.abTestingActivo}
              onChange={(e) => setData({ ...data, abTestingActivo: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm">🧪 A/B testing (título A vs B)</span>
          </label>
          {data.abTestingActivo && (
            <div className="space-y-2 rounded-lg bg-neutral-50 p-3">
              <label className="block text-xs">
                <span className="text-neutral-600">Variante A</span>
                <input
                  type="text"
                  value={data.varianteTituloA}
                  onChange={(e) => setData({ ...data, varianteTituloA: e.target.value })}
                  className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                />
              </label>
              <label className="block text-xs">
                <span className="text-neutral-600">Variante B</span>
                <input
                  type="text"
                  value={data.varianteTituloB}
                  onChange={(e) => setData({ ...data, varianteTituloB: e.target.value })}
                  className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                />
              </label>
              <p className="text-[10px] text-neutral-500">50% de visitantes ven cada variante. Google mide cuál gana.</p>
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Meta Tags Personalizados</h3>
        <div className="space-y-3">
          {data.metaTagsCustomas.map((tag) => (
            <div key={tag.id} className="flex gap-2 rounded-lg bg-neutral-50 p-2">
              <div className="flex-1">
                <p className="text-xs font-mono text-neutral-600">{tag.name}</p>
                <p className="text-[10px] text-neutral-500">{tag.content}</p>
              </div>
              <button
                onClick={() => eliminarMetaTag(tag.id)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          ))}
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="mb-2 text-xs font-medium text-blue-900">Agregar Meta Tag</p>
            <div className="space-y-2">
              <input
                type="text"
                value={newMetaTag.name}
                onChange={(e) => setNewMetaTag({ ...newMetaTag, name: e.target.value })}
                placeholder="name (ej: author)"
                className="w-full rounded border border-blue-200 px-2 py-1 text-xs"
              />
              <input
                type="text"
                value={newMetaTag.content}
                onChange={(e) => setNewMetaTag({ ...newMetaTag, content: e.target.value })}
                placeholder="content"
                className="w-full rounded border border-blue-200 px-2 py-1 text-xs"
              />
              <button
                onClick={agregarMetaTag}
                className="w-full rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
              >
                + Agregar
              </button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Tracking de Conversiones (Píxeles)</h3>
        <div className="space-y-3">
          {data.trackingPixeles.map((pixel) => (
            <div key={pixel.id} className="flex gap-2 rounded-lg bg-neutral-50 p-2">
              <p className="flex-1 text-xs font-mono text-neutral-500">{pixel.code.substring(0, 50)}...</p>
              <button
                onClick={() => eliminarPixel(pixel.id)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          ))}
          <div className="rounded-lg bg-green-50 p-3">
            <p className="mb-2 text-xs font-medium text-green-900">Agregar Píxel (Facebook, Google Analytics, etc)</p>
            <textarea
              value={newPixel}
              onChange={(e) => setNewPixel(e.target.value)}
              placeholder="<script>...</script> o código de píxel"
              rows={2}
              className="mb-2 w-full rounded border border-green-200 px-2 py-1 text-xs font-mono"
            />
            <button
              onClick={agregarPixel}
              className="w-full rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
            >
              + Agregar Píxel
            </button>
          </div>
        </div>
      </section>

      <button onClick={guardar} disabled={saving} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
        {saving ? 'Guardando...' : 'Guardar configuración SEO'}
      </button>
    </div>
  );
}
