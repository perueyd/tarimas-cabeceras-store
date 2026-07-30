import { useState } from 'react';

export default function BrandingTab({ catalog, api, flash }) {
  const cfg = catalog.storeConfig || {};
  const branding = cfg.branding || {};
  const contacto = cfg.contacto || {};
  const footer = cfg.footer || {};
  const seo = cfg.seo || {};

  const [data, setData] = useState({
    branding: branding,
    contacto: contacto,
    footer: footer,
    seo: seo,
  });

  async function guardar() {
    try {
      await api('POST', 'config', { ...data });
      // El helper `api` ya recarga el catálogo en toda la tienda, así que no
      // hace falta recargar el navegador entero.
      flash('Cambios guardados correctamente.');
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-4 text-lg font-semibold">Branding</h3>
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Logo (texto o emoji)</span>
            <input
              type="text"
              value={data.branding.logo || ''}
              onChange={(e) => setData({ ...data, branding: { ...data.branding, logo: e.target.value } })}
              placeholder="E|D"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Nombre de marca</span>
            <input
              type="text"
              value={data.branding.nombre || ''}
              onChange={(e) => setData({ ...data, branding: { ...data.branding, nombre: e.target.value } })}
              placeholder="ESPACIOS Y DISEÑO"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Subtítulo</span>
            <input
              type="text"
              value={data.branding.subtitulo || ''}
              onChange={(e) => setData({ ...data, branding: { ...data.branding, subtitulo: e.target.value } })}
              placeholder="PROYECTOS INMOBILIARIOS"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Contacto</h3>
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">WhatsApp (con código país, sin +)</span>
            <input
              type="text"
              value={data.contacto.whatsapp || ''}
              onChange={(e) => setData({ ...data, contacto: { ...data.contacto, whatsapp: e.target.value } })}
              placeholder="51951278010"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Teléfono (formato: 951 278 010)</span>
            <input
              type="text"
              value={data.contacto.telefonoFormato || ''}
              onChange={(e) => setData({ ...data, contacto: { ...data.contacto, telefonoFormato: e.target.value } })}
              placeholder="951 278 010"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Email de contacto</span>
            <input
              type="email"
              value={data.contacto.email || ''}
              onChange={(e) => setData({ ...data, contacto: { ...data.contacto, email: e.target.value } })}
              placeholder="info@ejemplo.com"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Footer</h3>
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Copyright</span>
            <input
              type="text"
              value={data.footer.copyright || ''}
              onChange={(e) => setData({ ...data, footer: { ...data.footer, copyright: e.target.value } })}
              placeholder="© 2026 E|D Espacios y Diseño — Todos los derechos reservados."
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Texto de pagos</span>
            <input
              type="text"
              value={data.footer.paymentText || ''}
              onChange={(e) => setData({ ...data, footer: { ...data.footer, paymentText: e.target.value } })}
              placeholder="Pagos procesados de forma segura con Culqi..."
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">SEO</h3>
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Nombre del sitio</span>
            <input
              type="text"
              value={data.seo.siteName || ''}
              onChange={(e) => setData({ ...data, seo: { ...data.seo, siteName: e.target.value } })}
              placeholder="E|D Espacios y Diseño"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Descripción</span>
            <textarea
              value={data.seo.siteDesc || ''}
              onChange={(e) => setData({ ...data, seo: { ...data.seo, siteDesc: e.target.value } })}
              placeholder="Tarimas, cabeceras y muebles a medida..."
              rows={2}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Palabras clave (separadas por coma)</span>
            <input
              type="text"
              value={data.seo.keywords || ''}
              onChange={(e) => setData({ ...data, seo: { ...data.seo, keywords: e.target.value } })}
              placeholder="tarimas, cabeceras, muebles, diseño"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      <button
        onClick={guardar}
        className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Guardar cambios
      </button>
    </div>
  );
}
