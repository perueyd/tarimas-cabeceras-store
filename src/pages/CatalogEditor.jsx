import { useRef, useState } from 'react';
import { useCatalog } from '../context/CatalogContext.jsx';

// Botón "Subir foto": abre el selector de archivos, sube la imagen al almacén
// (Vercel Blob) y entrega la URL lista para usar. Máximo ~4 MB por foto.
function UploadButton({ adminKey, onUploaded, label = '📷 Subir' }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert('La foto pesa más de 4 MB. Redúcela un poco (1200 px de ancho es suficiente) e intenta de nuevo.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/upload?filename=${encodeURIComponent(file.name)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream', Authorization: `Bearer ${adminKey}` },
          body: file,
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo subir la foto.');
      onUploaded(data.url);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium transition hover:border-ink disabled:opacity-60"
      >
        {busy ? 'Subiendo...' : label}
      </button>
    </>
  );
}

// Panel "Editar página": agrega/edita/elimina productos, categorías, colores
// y los datos de la tienda (WhatsApp, cuentas bancarias, horarios de entrega)
// directamente desde el navegador. Todo se guarda en la base de datos y se
// refleja al instante en la tienda — sin tocar código ni hacer deploy.
export default function CatalogEditor({ adminKey }) {
  const catalog = useCatalog();
  const [sub, setSub] = useState('productos');
  const [msg, setMsg] = useState('');

  function flash(text) {
    setMsg(text);
    setTimeout(() => setMsg(''), 2500);
  }

  async function api(method, resource, body, extraQuery = '') {
    const res = await fetch(`/api/catalog?resource=${resource}${extraQuery}`, {
      method,
      headers: {
        Authorization: `Bearer ${adminKey}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'No se pudo guardar.');
    await catalog.refetch();
    return data;
  }

  return (
    <div>
      <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
        Los cambios aquí se aplican al instante en toda la tienda (productos, precios, colores y
        datos de contacto) — no necesitas editar código ni esperar un deploy.
      </div>

      {msg && <p className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">{msg}</p>}

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        {[
          { id: 'productos', label: `Productos (${catalog.products.length})` },
          { id: 'categorias', label: 'Categorías' },
          { id: 'colores', label: 'Colores' },
          { id: 'tamanos', label: 'Tamaños' },
          { id: 'config', label: 'Datos de la tienda' },
          { id: 'portada', label: 'Página principal' },
          { id: 'vitrina', label: 'Vitrina animada' },
          { id: 'legal', label: 'Legal' },
          { id: 'encuesta', label: 'Encuesta' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`rounded-lg border px-3 py-1.5 transition ${
              sub === t.id ? 'border-ink bg-neutral-100 font-medium' : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === 'productos' && <ProductosTab catalog={catalog} api={api} flash={flash} adminKey={adminKey} />}
      {sub === 'categorias' && <CategoriasTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'colores' && <ColoresTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'tamanos' && <TamanosTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'config' && <ConfigTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'portada' && <PortadaTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'vitrina' && <VitrinaTab catalog={catalog} api={api} flash={flash} adminKey={adminKey} />}
      {sub === 'legal' && <LegalTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'encuesta' && <EncuestaTab catalog={catalog} api={api} flash={flash} />}
    </div>
  );
}

// ============================================================
// PÁGINA PRINCIPAL (textos, vínculos y palabra de la animación)
// ============================================================
const COMO_FUNCIONA_VACIO = {
  titulo: 'Comprar es simple',
  pasos: [
    { titulo: '', texto: '' },
    { titulo: '', texto: '' },
    { titulo: '', texto: '' },
  ],
};

function PortadaTab({ catalog, api, flash }) {
  const [landing, setLanding] = useState({
    eyebrow: '',
    titulo1: '',
    titulo2: '',
    descripcion: '',
    marqueeWord: '',
    cta1Label: '',
    cta1Url: '',
    cta2Label: '',
    cta2Url: '',
    categoriasTitulo: '',
    categoriasDescripcion: '',
    comoFunciona: COMO_FUNCIONA_VACIO,
    confianza: [],
    ...(catalog.storeConfig.landing || {}),
  });
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setLanding((prev) => ({ ...prev, [field]: value }));
  }
  function setConfianza(i, field, value) {
    setLanding((prev) => ({
      ...prev,
      confianza: prev.confianza.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)),
    }));
  }
  function addConfianza() {
    setLanding((prev) => ({ ...prev, confianza: [...prev.confianza, { icono: '✅', texto: '' }] }));
  }
  function removeConfianza(i) {
    setLanding((prev) => ({ ...prev, confianza: prev.confianza.filter((_, idx) => idx !== i) }));
  }
  function setPaso(i, field, value) {
    setLanding((prev) => ({
      ...prev,
      comoFunciona: {
        ...prev.comoFunciona,
        pasos: prev.comoFunciona.pasos.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)),
      },
    }));
  }
  function addPaso() {
    setLanding((prev) => ({
      ...prev,
      comoFunciona: { ...prev.comoFunciona, pasos: [...prev.comoFunciona.pasos, { titulo: '', texto: '' }] },
    }));
  }
  function removePaso(i) {
    setLanding((prev) => ({
      ...prev,
      comoFunciona: { ...prev.comoFunciona, pasos: prev.comoFunciona.pasos.filter((_, idx) => idx !== i) },
    }));
  }

  async function guardar() {
    setSaving(true);
    try {
      await api('POST', 'config', { landing });
      flash('Página principal actualizada — refresca tu web para verla.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <p className="mb-1 text-sm font-medium">Textos del inicio (hero)</p>
      <p className="mb-4 text-xs text-neutral-400">
        Lo primero que ve el cliente al entrar a tu web.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Etiqueta superior (pastilla)" value={landing.eyebrow} onChange={(v) => set('eyebrow', v)} placeholder="Hecho en Perú · Envíos a todo el país" />
        <Field label="Título — línea 1 (en negro)" value={landing.titulo1} onChange={(v) => set('titulo1', v)} placeholder="Tu dormitorio," />
        <Field label="Título — línea 2 (en gris)" value={landing.titulo2} onChange={(v) => set('titulo2', v)} placeholder="en el color que imaginas." />
        <Field label="Palabra gigante de la animación" value={landing.marqueeWord} onChange={(v) => set('marqueeWord', v)} placeholder="Espacios" />
      </div>
      <label className="mt-4 block text-sm">
        <span className="mb-1 block font-medium text-neutral-700">Descripción</span>
        <textarea
          value={landing.descripcion}
          onChange={(e) => set('descripcion', e.target.value)}
          rows={2}
          className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink"
        />
      </label>

      <p className="mb-1 mt-6 text-sm font-medium">Botones (vínculos)</p>
      <p className="mb-4 text-xs text-neutral-400">
        Los vínculos pueden ser internos (ej. /tienda, /tienda?categoria=tarimas, /seguimiento) o
        externos (ej. https://wa.me/51951278010).
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Botón 1 — texto (fondo negro)" value={landing.cta1Label} onChange={(v) => set('cta1Label', v)} placeholder="Explorar la tienda" />
        <Field label="Botón 1 — vínculo" value={landing.cta1Url} onChange={(v) => set('cta1Url', v)} placeholder="/tienda" />
        <Field label="Botón 2 — texto (con borde)" value={landing.cta2Label} onChange={(v) => set('cta2Label', v)} placeholder="Ver cabeceras" />
        <Field label="Botón 2 — vínculo" value={landing.cta2Url} onChange={(v) => set('cta2Url', v)} placeholder="/tienda?categoria=cabeceras" />
      </div>

      <p className="mb-1 mt-6 text-sm font-medium">Sección "Todo para tu hogar"</p>
      <p className="mb-4 text-xs text-neutral-400">
        El título y la descripción arriba de la grilla de categorías.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Título" value={landing.categoriasTitulo} onChange={(v) => set('categoriasTitulo', v)} placeholder="Todo para tu hogar" />
        <Field
          label="Descripción"
          value={landing.categoriasDescripcion}
          onChange={(v) => set('categoriasDescripcion', v)}
          placeholder="Empezamos con tarimas y cabeceras..."
        />
      </div>

      <p className="mb-1 mt-6 text-sm font-medium">Sección de pasos ("Comprar es simple")</p>
      <p className="mb-4 text-xs text-neutral-400">
        Los pasos que ve el cliente antes de comprar. Puedes agregar o quitar pasos — si los
        quitas todos, la sección de pasos no se muestra (el botón "Ir a la tienda" sigue igual).
      </p>
      <Field label="Título de la sección" value={landing.comoFunciona.titulo} onChange={(v) => set('comoFunciona', { ...landing.comoFunciona, titulo: v })} placeholder="Comprar es simple" />
      <div className="mt-3 space-y-3">
        {landing.comoFunciona.pasos.map((paso, i) => (
          <div key={i} className="rounded-lg bg-neutral-50 p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-400">{i + 1}</span>
              <input
                value={paso.titulo}
                onChange={(e) => setPaso(i, 'titulo', e.target.value)}
                placeholder="Título del paso"
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
              />
              <button onClick={() => removePaso(i)} className="text-xs text-red-600 hover:underline">Eliminar</button>
            </div>
            <textarea
              value={paso.texto}
              onChange={(e) => setPaso(i, 'texto', e.target.value)}
              rows={2}
              placeholder="Texto del paso"
              className="mt-2 w-full resize-none rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
            />
          </div>
        ))}
      </div>
      <button onClick={addPaso} className="mt-2 text-xs text-sky-700 hover:underline">+ Agregar paso</button>

      <p className="mb-1 mt-6 text-sm font-medium">Fila de confianza en el checkout</p>
      <p className="mb-4 text-xs text-neutral-400">
        Iconos cortos que ve el cliente justo antes de pagar (ej. "🚚 Entrega a tu casa"). Si
        quitas todos, esa fila no se muestra.
      </p>
      <div className="space-y-2">
        {landing.confianza.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={c.icono}
              onChange={(e) => setConfianza(i, 'icono', e.target.value)}
              placeholder="🚚"
              className="w-14 rounded-lg border border-neutral-300 px-2 py-1.5 text-center text-sm outline-none focus:border-ink"
            />
            <input
              value={c.texto}
              onChange={(e) => setConfianza(i, 'texto', e.target.value)}
              placeholder="Entrega a tu casa"
              className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
            />
            <button onClick={() => removeConfianza(i)} className="text-xs text-red-600 hover:underline">Eliminar</button>
          </div>
        ))}
      </div>
      <button onClick={addConfianza} className="mt-2 text-xs text-sky-700 hover:underline">+ Agregar ítem</button>

      <button onClick={guardar} disabled={saving} className="mt-6 block rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
        {saving ? 'Guardando...' : 'Guardar página principal'}
      </button>
    </div>
  );
}

// ============================================================
// VITRINA ANIMADA (carrusel 3D "arrastra o toca un panel")
// ============================================================
function VitrinaTab({ catalog, api, flash, adminKey }) {
  const [lista, setLista] = useState(catalog.showcase);
  const [nuevo, setNuevo] = useState({ id: '', label: '', img: '', color: '#8b8d91', cat: '' });
  const [saving, setSaving] = useState(false);

  function set(i, field, value) {
    setLista((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  }

  async function guardarTodos() {
    setSaving(true);
    try {
      for (const p of lista) {
        await api('POST', 'showcase', p);
      }
      flash('Vitrina animada guardada — refresca tu web para verla.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(p) {
    if (!window.confirm(`¿Eliminar el panel "${p.label}" de la vitrina animada?`)) return;
    await api('DELETE', 'showcase', null, `&id=${encodeURIComponent(p.id)}`);
    setLista((prev) => prev.filter((x) => x.id !== p.id));
    flash('Panel eliminado.');
  }

  async function agregar() {
    if (!nuevo.id.trim() || !nuevo.label.trim()) return;
    const id = nuevo.id.trim().toLowerCase().replace(/\s+/g, '-');
    const item = { ...nuevo, id };
    await api('POST', 'showcase', item);
    setLista((prev) => [...prev, item]);
    setNuevo({ id: '', label: '', img: '', color: '#8b8d91', cat: '' });
    flash('Panel agregado.');
  }

  return (
    <div>
      <p className="mb-3 text-xs text-neutral-500">
        Los paneles del carrusel animado de la portada (el que se arrastra, con el nombre grande
        de fondo). Puedes cambiar la imagen, el color de fondo, el nombre y a qué categoría lleva
        cada uno, o quitar y agregar paneles. La forma del blob y el balanceo son automáticos —
        no necesitas configurarlos.
      </p>
      <div className="space-y-3">
        {lista.map((p, i) => (
          <div key={p.id} className="rounded-lg border border-neutral-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="h-8 w-8 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: p.color }} />
              <input
                value={p.label}
                onChange={(e) => set(i, 'label', e.target.value)}
                placeholder="Nombre visible"
                className="w-40 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
              />
              <select
                value={p.cat || ''}
                onChange={(e) => set(i, 'cat', e.target.value)}
                className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-ink"
              >
                <option value="">Sin categoría (va a la tienda)</option>
                {catalog.categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <input
                type="color"
                value={p.color}
                onChange={(e) => set(i, 'color', e.target.value)}
                className="h-9 w-10 cursor-pointer rounded border border-neutral-300"
              />
              <button onClick={() => eliminar(p)} className="ml-auto text-xs text-red-600 hover:underline">
                Eliminar
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={p.img}
                onChange={(e) => set(i, 'img', e.target.value)}
                placeholder="URL de la imagen"
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
              />
              <UploadButton adminKey={adminKey} onUploaded={(url) => set(i, 'img', url)} />
            </div>
          </div>
        ))}
        {lista.length === 0 && (
          <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-400">
            Sin paneles — la vitrina animada no se mostrará en la portada hasta que agregues al menos uno.
          </p>
        )}
      </div>

      <button onClick={guardarTodos} disabled={saving} className="mt-4 rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>

      <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-3">
        <p className="mb-2 text-xs font-medium text-neutral-600">+ Agregar panel nuevo</p>
        <div className="flex flex-wrap items-end gap-2">
          <Field small label="ID" value={nuevo.id} onChange={(v) => setNuevo({ ...nuevo, id: v })} placeholder="ej. escritorios" />
          <Field small label="Nombre visible" value={nuevo.label} onChange={(v) => setNuevo({ ...nuevo, label: v })} placeholder="ej. Escritorios" />
          <label className="text-xs">
            <span className="mb-1 block text-neutral-500">Categoría</span>
            <select
              value={nuevo.cat}
              onChange={(e) => setNuevo({ ...nuevo, cat: e.target.value })}
              className="rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm outline-none focus:border-ink"
            >
              <option value="">Sin categoría</option>
              {catalog.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-neutral-500">Color</span>
            <input
              type="color"
              value={nuevo.color}
              onChange={(e) => setNuevo({ ...nuevo, color: e.target.value })}
              className="h-9 w-14 cursor-pointer rounded border border-neutral-300"
            />
          </label>
          <div className="flex items-center gap-2">
            <input
              value={nuevo.img}
              onChange={(e) => setNuevo({ ...nuevo, img: e.target.value })}
              placeholder="URL de la imagen"
              className="w-48 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
            />
            <UploadButton adminKey={adminKey} onUploaded={(url) => setNuevo((prev) => ({ ...prev, img: url }))} />
          </div>
          <button onClick={agregar} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            + Agregar panel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PRODUCTOS
// ============================================================
const PRODUCTO_VACIO = {
  id: '',
  category: '',
  name: '',
  baseImage: '',
  tintable: true,
  shortDescription: '',
  specs: [],
  sizePricing: {},
  offerPricing: {},
  discountPercent: 0,
  availableColors: [],
  colorImages: {},
  sizeImages: {},
  colorsBySize: {},
};

function ProductosTab({ catalog, api, flash, adminKey }) {
  const [editando, setEditando] = useState(null); // producto en edición, o null

  async function guardar(producto) {
    const specsObj = {};
    for (const { label, value } of producto.specs) {
      if (label.trim()) specsObj[label.trim()] = value;
    }
    const payload = { ...producto, specs: specsObj };
    await api('POST', 'product', payload);
    flash(`Producto "${producto.name}" guardado.`);
    setEditando(null);
  }

  async function eliminar(p) {
    if (!window.confirm(`¿Eliminar "${p.name}"? Ya no aparecerá en la tienda.`)) return;
    await api('DELETE', 'product', null, `&id=${encodeURIComponent(p.id)}`);
    flash(`Producto "${p.name}" eliminado.`);
  }

  if (editando) {
    return (
      <ProductForm
        catalog={catalog}
        initial={editando}
        onCancel={() => setEditando(null)}
        onSave={guardar}
        adminKey={adminKey}
      />
    );
  }

  return (
    <div>
      <button
        onClick={() => setEditando({ ...PRODUCTO_VACIO, specs: [], availableColors: [] })}
        className="mb-4 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        + Agregar producto
      </button>
      <div className="space-y-3">
        {catalog.products.map((p) => {
          const precios = Object.values(p.sizePricing || {});
          const min = precios.length ? Math.min(...precios) : 0;
          return (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4">
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-neutral-500">
                  {catalog.categories.find((c) => c.id === p.category)?.label || p.category} · Desde {catalog.currencyFormatter.format(min)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2 text-xs">
                <button
                  onClick={() =>
                    setEditando({
                      ...p,
                      specs: Object.entries(p.specs || {}).map(([label, value]) => ({ label, value })),
                    })
                  }
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:border-ink"
                >
                  Editar
                </button>
                <button onClick={() => eliminar(p)} className="rounded-lg border border-red-200 px-3 py-1.5 text-red-600 hover:bg-red-50">
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
        {catalog.products.length === 0 && (
          <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-400">
            Aún no hay productos.
          </p>
        )}
      </div>
    </div>
  );
}

function ProductForm({ catalog, initial, onCancel, onSave, adminKey }) {
  const [p, setP] = useState(initial);
  const [saving, setSaving] = useState(false);
  const isNew = !catalog.products.some((x) => x.id === initial.id);

  function set(field, value) {
    setP((prev) => ({ ...prev, [field]: value }));
  }
  function setSpec(i, field, value) {
    setP((prev) => ({ ...prev, specs: prev.specs.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)) }));
  }
  function addSpec() {
    setP((prev) => ({ ...prev, specs: [...prev.specs, { label: '', value: '' }] }));
  }
  function removeSpec(i) {
    setP((prev) => ({ ...prev, specs: prev.specs.filter((_, idx) => idx !== i) }));
  }
  function setPrice(sizeId, value) {
    setP((prev) => {
      const sp = { ...prev.sizePricing };
      if (value === '') delete sp[sizeId];
      else sp[sizeId] = Number(value);
      return { ...prev, sizePricing: sp };
    });
  }
  function setOfferPrice(sizeId, value) {
    setP((prev) => {
      const op = { ...(prev.offerPricing || {}) };
      if (value === '') delete op[sizeId];
      else op[sizeId] = Number(value);
      return { ...prev, offerPricing: op };
    });
  }
  function toggleColor(colorId) {
    setP((prev) => ({
      ...prev,
      availableColors: prev.availableColors.includes(colorId)
        ? prev.availableColors.filter((c) => c !== colorId)
        : [...prev.availableColors, colorId],
    }));
  }
  function setColorImage(colorId, url) {
    setP((prev) => {
      const ci = { ...(prev.colorImages || {}) };
      if (url.trim() === '') delete ci[colorId];
      else ci[colorId] = url.trim();
      return { ...prev, colorImages: ci };
    });
  }
  function setSizeImage(sizeId, url) {
    setP((prev) => {
      const si = { ...(prev.sizeImages || {}) };
      if (url.trim() === '') delete si[sizeId];
      else si[sizeId] = url.trim();
      return { ...prev, sizeImages: si };
    });
  }
  function setColoresPersonalizados(sizeId, activar) {
    setP((prev) => {
      const cbs = { ...(prev.colorsBySize || {}) };
      if (activar) cbs[sizeId] = [...prev.availableColors];
      else delete cbs[sizeId];
      return { ...prev, colorsBySize: cbs };
    });
  }
  function toggleColorForSize(sizeId, colorId) {
    setP((prev) => {
      const cbs = { ...(prev.colorsBySize || {}) };
      const actual = cbs[sizeId] || prev.availableColors;
      cbs[sizeId] = actual.includes(colorId) ? actual.filter((c) => c !== colorId) : [...actual, colorId];
      return { ...prev, colorsBySize: cbs };
    });
  }

  async function handleSave() {
    if (!p.id.trim() || !p.name.trim() || !p.category) {
      alert('Completa al menos: id, nombre y categoría.');
      return;
    }
    // Un producto sin ningún precio por tamaño, o sin ningún color, rompe la
    // tienda (la tarjeta y la página del producto no tienen qué mostrar) —
    // se bloquea el guardado aquí para no dejarlo a medias.
    if (Object.keys(p.sizePricing || {}).length === 0) {
      alert('Agrega el precio de al menos un tamaño en "Precios por tamaño" antes de guardar.');
      return;
    }
    if ((p.availableColors || []).length === 0) {
      alert('Marca al menos un color en "Colores disponibles" antes de guardar.');
      return;
    }
    // Un precio de oferta solo cuenta si es menor al precio regular de ese
    // mismo tamaño — cualquier otro caso se descarta antes de guardar.
    const offerPricing = {};
    for (const [sizeId, valor] of Object.entries(p.offerPricing || {})) {
      const regular = p.sizePricing[sizeId];
      if (regular != null && valor > 0 && valor < regular) offerPricing[sizeId] = valor;
    }
    setSaving(true);
    try {
      await onSave({ ...p, offerPricing });
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <p className="mb-4 text-sm font-medium">{isNew ? 'Nuevo producto' : `Editando: ${initial.name}`}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="ID único (sin espacios, para la URL)" value={p.id} disabled={!isNew} onChange={(v) => set('id', v.trim().toLowerCase().replace(/\s+/g, '-'))} />
        <Field label="Nombre" value={p.name} onChange={(v) => set('name', v)} />
        <label className="text-sm">
          <span className="mb-1 block font-medium text-neutral-700">Categoría</span>
          <select
            value={p.category}
            onChange={(e) => set('category', e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-ink"
          >
            <option value="">Selecciona...</option>
            {catalog.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-neutral-700">Imagen del producto</span>
          <div className="flex gap-2">
            <input
              value={p.baseImage}
              onChange={(e) => set('baseImage', e.target.value)}
              placeholder="Sube una foto o pega una URL"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink"
            />
            <UploadButton adminKey={adminKey} onUploaded={(url) => set('baseImage', url)} />
          </div>
        </label>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={p.tintable} onChange={(e) => set('tintable', e.target.checked)} />
        La foto está en tonos grises y se debe teñir con el color elegido (desmarca si la foto ya tiene su color real)
      </label>

      <label className="mt-4 block text-sm">
        <span className="mb-1 block font-medium text-neutral-700">Descripción corta</span>
        <textarea
          value={p.shortDescription}
          onChange={(e) => set('shortDescription', e.target.value)}
          rows={2}
          className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink"
        />
      </label>

      {/* Especificaciones */}
      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-neutral-700">Especificaciones (Material, Altura, Garantía, etc.)</p>
        <div className="space-y-2">
          {p.specs.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={s.label}
                onChange={(e) => setSpec(i, 'label', e.target.value)}
                placeholder="Etiqueta (ej. Material)"
                className="w-1/3 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
              />
              <input
                value={s.value}
                onChange={(e) => setSpec(i, 'value', e.target.value)}
                placeholder="Valor"
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
              />
              <button onClick={() => removeSpec(i)} className="text-sm text-red-600">✕</button>
            </div>
          ))}
        </div>
        <button onClick={addSpec} className="mt-2 text-xs text-sky-700 hover:underline">+ Agregar especificación</button>
      </div>

      {/* Precios por tamaño: regular y de oferta */}
      <div className="mt-5">
        <p className="mb-1 text-sm font-medium text-neutral-700">Precios por tamaño (S/)</p>
        <p className="mb-3 text-xs text-neutral-500">
          Precio de oferta es opcional e independiente para cada tamaño. Si lo llenas, la tienda
          muestra ese precio con el precio regular tachado al lado. Debe ser menor al precio
          regular — si no, se ignora y se vende al precio regular.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.sizes.map((s) => {
            const regular = p.sizePricing[s.id] ?? '';
            const oferta = p.offerPricing?.[s.id] ?? '';
            const ofertaInvalida = oferta !== '' && regular !== '' && Number(oferta) >= Number(regular);
            return (
              <div key={s.id} className="rounded-lg border border-neutral-200 p-3">
                <p className="mb-2 text-xs font-medium text-neutral-600">{s.label}</p>
                <label className="mb-2 block text-xs">
                  <span className="mb-1 block text-neutral-500">Precio regular</span>
                  <input
                    type="number"
                    min="0"
                    value={regular}
                    onChange={(e) => setPrice(s.id, e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 outline-none focus:border-ink"
                  />
                </label>
                <label className="block text-xs">
                  <span className="mb-1 block text-neutral-500">Precio de oferta (opcional)</span>
                  <input
                    type="number"
                    min="0"
                    value={oferta}
                    onChange={(e) => setOfferPrice(s.id, e.target.value)}
                    placeholder="Sin oferta"
                    className={`w-full rounded-lg border px-2 py-1.5 outline-none focus:border-ink ${
                      ofertaInvalida ? 'border-red-300' : 'border-neutral-300'
                    }`}
                  />
                </label>
                {ofertaInvalida && (
                  <p className="mt-1 text-[11px] text-red-600">Debe ser menor al precio regular; si no, se ignora al guardar.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Descuento por porcentaje (alternativa opcional al precio de oferta directo) */}
      <div className="mt-5 rounded-lg bg-neutral-50 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
          <input
            type="checkbox"
            checked={Boolean(p.discountPercent)}
            onChange={(e) => set('discountPercent', e.target.checked ? p.discountPercent || 10 : 0)}
          />
          O, en vez de precio de oferta, usar un descuento por porcentaje (opcional)
        </label>
        {Boolean(p.discountPercent) && (
          <div className="mt-3 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-neutral-500">Descuento:</span>
              <input
                type="number"
                min="1"
                max="90"
                value={p.discountPercent}
                onChange={(e) => set('discountPercent', Math.min(Math.max(parseInt(e.target.value, 10) || 0, 0), 90))}
                className="w-20 rounded-lg border border-neutral-300 px-2 py-1.5 outline-none focus:border-ink"
              />
              <span className="text-neutral-500">%</span>
            </label>
            <p className="text-xs text-neutral-500">
              Se aplica solo a los tamaños que dejes SIN precio de oferta arriba (si un tamaño
              tiene su propio precio de oferta, ese manda sobre el porcentaje).
            </p>
          </div>
        )}
      </div>

      {/* Colores disponibles */}
      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-neutral-700">Colores disponibles para este producto</p>
        <div className="flex flex-wrap gap-2">
          {catalog.colors.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleColor(c.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                p.availableColors.includes(c.id) ? 'border-ink bg-neutral-100 font-medium' : 'border-neutral-200 text-neutral-500'
              }`}
            >
              <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Colores por tamaño (opcional) */}
      {Object.keys(p.sizePricing || {}).length > 0 && p.availableColors.length > 0 && (
        <div className="mt-5 rounded-lg bg-neutral-50 p-3">
          <p className="text-sm font-medium text-neutral-700">Colores por tamaño (opcional)</p>
          <p className="mb-3 mt-1 text-xs text-neutral-500">
            A veces un tamaño viene en menos colores que el resto (ej. King solo en 2 colores).
            El tamaño que no personalices usa la lista general de "Colores disponibles" de arriba.
          </p>
          <div className="space-y-2">
            {catalog.sizes
              .filter((s) => p.sizePricing[s.id] != null)
              .map((s) => {
                const personalizado = Boolean(p.colorsBySize?.[s.id]);
                const seleccionados = p.colorsBySize?.[s.id] || p.availableColors;
                return (
                  <div key={s.id} className="rounded-lg border border-neutral-200 bg-white p-3">
                    <label className="flex items-center gap-2 text-xs font-medium text-neutral-700">
                      <input
                        type="checkbox"
                        checked={personalizado}
                        onChange={(e) => setColoresPersonalizados(s.id, e.target.checked)}
                      />
                      {s.label} — personalizar colores
                    </label>
                    {personalizado && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {p.availableColors.map((colorId) => {
                          const c = catalog.colors.find((x) => x.id === colorId);
                          const activo = seleccionados.includes(colorId);
                          return (
                            <button
                              key={colorId}
                              type="button"
                              onClick={() => toggleColorForSize(s.id, colorId)}
                              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                                activo ? 'border-ink bg-neutral-100 font-medium' : 'border-neutral-200 text-neutral-400'
                              }`}
                            >
                              <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: c?.hex }} />
                              {c?.label || colorId}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Foto propia por color (opcional) */}
      {p.availableColors.length > 0 && (
        <div className="mt-5 rounded-lg bg-neutral-50 p-3">
          <p className="text-sm font-medium text-neutral-700">Foto propia por color (opcional)</p>
          <p className="mb-3 mt-1 text-xs text-neutral-500">
            Para diseños que vienen en colores específicos con su propia foto real (ej. un modelo
            que solo existe en roble y en blanco). Si un color tiene foto aquí, el selector mostrará
            ESA foto tal cual, sin teñirla. Los colores sin foto usan la imagen base
            {p.tintable ? ' teñida automáticamente' : ' tal cual'}.
          </p>
          <div className="space-y-2">
            {p.availableColors.map((colorId) => {
              const c = catalog.colors.find((x) => x.id === colorId);
              return (
                <div key={colorId} className="flex items-center gap-2">
                  <span className="flex w-32 shrink-0 items-center gap-1.5 text-xs">
                    <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: c?.hex }} />
                    {c?.label || colorId}
                  </span>
                  <input
                    value={p.colorImages?.[colorId] || ''}
                    onChange={(e) => setColorImage(colorId, e.target.value)}
                    placeholder="(vacío = usar imagen base) Sube o pega la URL"
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
                  />
                  <UploadButton adminKey={adminKey} onUploaded={(url) => setColorImage(colorId, url)} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Foto propia por tamaño (opcional) */}
      {Object.keys(p.sizePricing || {}).length > 0 && (
        <div className="mt-5 rounded-lg bg-neutral-50 p-3">
          <p className="text-sm font-medium text-neutral-700">Foto propia por tamaño (opcional)</p>
          <p className="mb-3 mt-1 text-xs text-neutral-500">
            Útil cuando el mueble se ve realmente distinto según el tamaño (ej. una cabecera
            King se ve mucho más ancha que una de 1.5 plaza). Puedes subirlas de a poco — el
            tamaño que aún no tenga foto propia usa la imagen base; si tampoco hay imagen base,
            se muestra un aviso de "Foto próximamente" en vez de romperse.
          </p>
          <div className="space-y-2">
            {catalog.sizes
              .filter((s) => p.sizePricing[s.id] != null)
              .map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="w-32 shrink-0 text-xs font-medium text-neutral-600">{s.label}</span>
                  <input
                    value={p.sizeImages?.[s.id] || ''}
                    onChange={(e) => setSizeImage(s.id, e.target.value)}
                    placeholder="(vacío = usar imagen base) Sube o pega la URL"
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
                  />
                  <UploadButton adminKey={adminKey} onUploaded={(url) => setSizeImage(s.id, url)} />
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <button onClick={handleSave} disabled={saving} className="rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
          {saving ? 'Guardando...' : 'Guardar producto'}
        </button>
        <button onClick={onCancel} className="rounded-lg border border-neutral-300 px-5 py-2 text-sm hover:border-ink">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ============================================================
// CATEGORÍAS
// ============================================================
function CategoriasTab({ catalog, api, flash }) {
  const [nuevo, setNuevo] = useState({ id: '', label: '' });
  const [labels, setLabels] = useState(() => Object.fromEntries(catalog.categories.map((c) => [c.id, c.label])));
  const [descriptions, setDescriptions] = useState(() => Object.fromEntries(catalog.categories.map((c) => [c.id, c.description || ''])));

  async function toggleActive(cat) {
    await api('POST', 'category', { ...cat, active: !cat.active });
    flash(`"${cat.label}" ${!cat.active ? 'activada' : 'desactivada'}.`);
  }
  async function eliminar(cat) {
    if (!window.confirm(`¿Eliminar la categoría "${cat.label}"? Los productos con esta categoría no se mostrarán.`)) return;
    await api('DELETE', 'category', null, `&id=${encodeURIComponent(cat.id)}`);
    flash('Categoría eliminada.');
  }
  async function agregar() {
    if (!nuevo.id.trim() || !nuevo.label.trim()) return;
    await api('POST', 'category', { id: nuevo.id.trim().toLowerCase().replace(/\s+/g, '-'), label: nuevo.label.trim(), active: true });
    setNuevo({ id: '', label: '' });
    flash('Categoría agregada.');
  }
  async function guardarCambios(cat) {
    const nuevoLabel = (labels[cat.id] ?? cat.label).trim();
    const nuevaDesc = (descriptions[cat.id] ?? cat.description ?? '').trim();
    if (!nuevoLabel) return;
    await api('POST', 'category', { ...cat, label: nuevoLabel, description: nuevaDesc });
    flash(`Categoría "${nuevoLabel}" actualizada.`);
  }

  return (
    <div>
      <div className="space-y-2">
        {catalog.categories.map((c) => {
          const labelActual = labels[c.id] ?? c.label;
          const descActual = descriptions[c.id] ?? (c.description || '');
          const cambiado = (labelActual.trim() && labelActual !== c.label) || descActual !== (c.description || '');
          const descPorDefecto = c.active
            ? 'Disponible ahora — elige tamaño y color.'
            : 'Estamos preparando esta línea. Vuelve pronto.';
          return (
            <div key={c.id} className="rounded-lg border border-neutral-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-[220px] flex-1 items-center gap-2">
                  <input
                    value={labelActual}
                    onChange={(e) => setLabels((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
                  />
                  <span className="shrink-0 text-xs text-neutral-400">{c.id}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={c.active} onChange={() => toggleActive(c)} />
                    Activa
                  </label>
                  <button onClick={() => eliminar(c)} className="text-red-600 hover:underline">Eliminar</button>
                </div>
              </div>
              <label className="mt-2 block text-xs">
                <span className="mb-1 block text-neutral-500">Descripción en la portada (opcional)</span>
                <input
                  value={descActual}
                  onChange={(e) => setDescriptions((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  placeholder={descPorDefecto}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
                />
              </label>
              {cambiado && (
                <button
                  onClick={() => guardarCambios(c)}
                  className="mt-2 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
                >
                  Guardar cambios
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-neutral-300 p-3">
        <Field small label="ID" value={nuevo.id} onChange={(v) => setNuevo({ ...nuevo, id: v })} placeholder="ej. escritorios" />
        <Field small label="Nombre visible" value={nuevo.label} onChange={(v) => setNuevo({ ...nuevo, label: v })} placeholder="ej. Escritorios" />
        <button onClick={agregar} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          + Agregar categoría
        </button>
      </div>
    </div>
  );
}

// ============================================================
// COLORES
// ============================================================
function ColoresTab({ catalog, api, flash }) {
  const [nuevo, setNuevo] = useState({ id: '', label: '', hex: '#8b8d91' });

  async function eliminar(c) {
    if (!window.confirm(`¿Eliminar el color "${c.label}"?`)) return;
    await api('DELETE', 'color', null, `&id=${encodeURIComponent(c.id)}`);
    flash('Color eliminado.');
  }
  async function agregar() {
    if (!nuevo.id.trim() || !nuevo.label.trim()) return;
    await api('POST', 'color', { id: nuevo.id.trim().toLowerCase().replace(/\s+/g, '-'), label: nuevo.label.trim(), hex: nuevo.hex });
    setNuevo({ id: '', label: '', hex: '#8b8d91' });
    flash('Color agregado.');
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {catalog.colors.map((c) => (
          <div key={c.id} className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2">
            <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />
            <span className="text-sm">{c.label}</span>
            <button onClick={() => eliminar(c)} className="text-xs text-red-600 hover:underline">✕</button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-neutral-300 p-3">
        <Field small label="ID" value={nuevo.id} onChange={(v) => setNuevo({ ...nuevo, id: v })} placeholder="ej. verde-oliva" />
        <Field small label="Nombre visible" value={nuevo.label} onChange={(v) => setNuevo({ ...nuevo, label: v })} placeholder="ej. Verde Oliva" />
        <label className="text-xs">
          <span className="mb-1 block text-neutral-500">Color</span>
          <input
            type="color"
            value={nuevo.hex}
            onChange={(e) => setNuevo({ ...nuevo, hex: e.target.value })}
            className="h-9 w-14 cursor-pointer rounded border border-neutral-300"
          />
        </label>
        <button onClick={agregar} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          + Agregar color
        </button>
      </div>
    </div>
  );
}

// ============================================================
// TAMAÑOS (medidas)
// ============================================================
function TamanosTab({ catalog, api, flash }) {
  const [lista, setLista] = useState(catalog.sizes);
  const [nuevo, setNuevo] = useState({ id: '', label: '', dims: '' });
  const [saving, setSaving] = useState(false);

  function set(i, field, value) {
    setLista((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  async function guardarTodos() {
    setSaving(true);
    try {
      for (const s of lista) {
        await api('POST', 'size', s);
      }
      flash('Tamaños guardados.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(s) {
    if (!window.confirm(`¿Eliminar el tamaño "${s.label}"? Los productos que ya tengan precio en ese tamaño no se podrán comprar en ese tamaño hasta que lo agregues de nuevo con el mismo ID (${s.id}).`)) return;
    await api('DELETE', 'size', null, `&id=${encodeURIComponent(s.id)}`);
    setLista((prev) => prev.filter((x) => x.id !== s.id));
    flash('Tamaño eliminado.');
  }

  async function agregar() {
    if (!nuevo.id.trim() || !nuevo.label.trim()) return;
    const id = nuevo.id.trim().toLowerCase().replace(/\s+/g, '-');
    const item = { id, label: nuevo.label.trim(), dims: nuevo.dims.trim() };
    await api('POST', 'size', item);
    setLista((prev) => [...prev, item]);
    setNuevo({ id: '', label: '', dims: '' });
    flash('Tamaño agregado.');
  }

  return (
    <div>
      <p className="mb-3 text-xs text-neutral-500">
        Estos son los tamaños que eliges en "Precios por tamaño" al editar un producto. Cambiar el
        nombre o las medidas aquí no afecta los precios que ya guardaste. Eliminar un tamaño hace
        que los productos con precio en ese tamaño dejen de poder comprarse en él (el precio queda
        guardado y vuelve a aparecer si agregas de nuevo un tamaño con el mismo ID).
      </p>
      <div className="space-y-2">
        {lista.map((s, i) => (
          <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white p-3">
            <span className="w-24 shrink-0 font-mono text-xs text-neutral-400">{s.id}</span>
            <input
              value={s.label}
              onChange={(e) => set(i, 'label', e.target.value)}
              placeholder="Nombre visible"
              className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
            />
            <input
              value={s.dims}
              onChange={(e) => set(i, 'dims', e.target.value)}
              placeholder="Medidas (ej. 135 x 190 cm)"
              className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
            />
            <button onClick={() => eliminar(s)} className="text-xs text-red-600 hover:underline">Eliminar</button>
          </div>
        ))}
      </div>

      <button onClick={guardarTodos} disabled={saving} className="mt-4 rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>

      <div className="mt-6 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-neutral-300 p-3">
        <Field small label="ID" value={nuevo.id} onChange={(v) => setNuevo({ ...nuevo, id: v })} placeholder="ej. cal-king" />
        <Field small label="Nombre visible" value={nuevo.label} onChange={(v) => setNuevo({ ...nuevo, label: v })} placeholder="ej. Cal King" />
        <Field small label="Medidas" value={nuevo.dims} onChange={(v) => setNuevo({ ...nuevo, dims: v })} placeholder="ej. 180 x 200 cm" />
        <button onClick={agregar} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          + Agregar tamaño
        </button>
      </div>
    </div>
  );
}

// ============================================================
// CONFIGURACIÓN DE LA TIENDA
// ============================================================
function ConfigTab({ catalog, api, flash }) {
  const [cfg, setCfg] = useState(catalog.storeConfig);
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setCfg((prev) => ({ ...prev, [field]: value }));
  }
  function setBank(i, field, value) {
    setCfg((prev) => ({ ...prev, banks: prev.banks.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)) }));
  }
  function addBank() {
    setCfg((prev) => ({ ...prev, banks: [...(prev.banks || []), { banco: '', titular: '', cuenta: '', cci: '' }] }));
  }
  function removeBank(i) {
    setCfg((prev) => ({ ...prev, banks: prev.banks.filter((_, idx) => idx !== i) }));
  }
  function togglePaymentMethod(key) {
    setCfg((prev) => ({
      ...prev,
      paymentMethods: { ...(prev.paymentMethods || {}), [key]: !(prev.paymentMethods?.[key] ?? true) },
    }));
  }
  function setSlot(i, field, value) {
    setCfg((prev) => ({ ...prev, deliverySlots: prev.deliverySlots.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)) }));
  }
  function addSlot() {
    setCfg((prev) => ({ ...prev, deliverySlots: [...(prev.deliverySlots || []), { id: '', label: '' }] }));
  }
  function removeSlot(i) {
    setCfg((prev) => ({ ...prev, deliverySlots: prev.deliverySlots.filter((_, idx) => idx !== i) }));
  }
  function setSocial(red, value) {
    setCfg((prev) => ({ ...prev, social: { ...(prev.social || {}), [red]: value } }));
  }
  function setNewsletter(field, value) {
    setCfg((prev) => ({ ...prev, newsletter: { ...(prev.newsletter || {}), [field]: value } }));
  }

  async function guardar() {
    const pm = cfg.paymentMethods || {};
    if (!pm.culqi && !pm.yapePlin && !pm.transferencia) {
      alert('Deja al menos un método de pago activo — si apagas los tres, nadie podrá pagar.');
      return;
    }
    setSaving(true);
    try {
      await api('POST', 'config', cfg);
      flash('Datos de la tienda guardados.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="mb-5 rounded-lg bg-neutral-50 p-3">
        <p className="mb-1 text-sm font-medium text-neutral-700">
          Datos legales del negocio <span className="font-normal text-neutral-400">(para el Libro de Reclamaciones)</span>
        </p>
        <p className="mb-3 text-xs text-neutral-500">
          Se muestran en la página pública del Libro de Reclamaciones para identificar al proveedor.
          Déjalos vacíos si aún no los tienes — la página igual funciona.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Razón social" value={cfg.razonSocial} onChange={(v) => set('razonSocial', v)} placeholder="Ej. E|D Espacios y Diseño S.A.C." />
          <Field label="RUC" value={cfg.ruc} onChange={(v) => set('ruc', v)} placeholder="20xxxxxxxxx" />
          <div className="sm:col-span-2">
            <Field label="Domicilio fiscal" value={cfg.direccionFiscal} onChange={(v) => set('direccionFiscal', v)} placeholder="Dirección registrada del negocio" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="WhatsApp (con 51, sin espacios)" value={cfg.whatsapp} onChange={(v) => set('whatsapp', v)} placeholder="51987654321" />
        <Field label="Número de Yape/Plin (como se muestra)" value={cfg.yape} onChange={(v) => set('yape', v)} placeholder="987 654 321" />
        <Field label="Titular de Yape/Plin" value={cfg.yapeTitular} onChange={(v) => set('yapeTitular', v)} />
        <Field label="Tiempo de fabricación/entrega" value={cfg.leadTime} onChange={(v) => set('leadTime', v)} placeholder="3 a 4 días hábiles" />
        <Field
          label="Días mínimos para entrega"
          value={cfg.deliveryMinDays}
          onChange={(v) => set('deliveryMinDays', Number(v) || 0)}
          type="number"
        />
      </div>

      <div className="mt-5 rounded-lg bg-neutral-50 p-3">
        <p className="mb-1 text-sm font-medium text-neutral-700">Métodos de pago en el checkout</p>
        <p className="mb-3 text-xs text-neutral-500">
          Apaga el que no uses — el cliente solo verá los que dejes activos. Debes dejar al
          menos uno activo.
        </p>
        <div className="space-y-2">
          {[
            { key: 'culqi', label: 'Tarjeta o Yape (Culqi)', sub: 'Confirmación automática al pagar' },
            { key: 'yapePlin', label: 'Yape / Plin directo', sub: 'El cliente envía y manda su comprobante' },
            { key: 'transferencia', label: 'Transferencia bancaria', sub: 'El cliente transfiere y manda su constancia' },
          ].map((m) => (
            <label key={m.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={cfg.paymentMethods?.[m.key] ?? true}
                onChange={() => togglePaymentMethod(m.key)}
              />
              <span className="font-medium">{m.label}</span>
              <span className="text-xs text-neutral-400">— {m.sub}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-neutral-700">Horarios de entrega</p>
        <div className="space-y-2">
          {(cfg.deliverySlots || []).map((s, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={s.id}
                onChange={(e) => setSlot(i, 'id', e.target.value)}
                placeholder="id (ej. manana)"
                className="w-1/3 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
              />
              <input
                value={s.label}
                onChange={(e) => setSlot(i, 'label', e.target.value)}
                placeholder="Mañana (9:00 a.m. – 1:00 p.m.)"
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
              />
              <button onClick={() => removeSlot(i)} className="text-sm text-red-600">✕</button>
            </div>
          ))}
        </div>
        <button onClick={addSlot} className="mt-2 text-xs text-sky-700 hover:underline">+ Agregar horario</button>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-neutral-700">Cuentas bancarias (para transferencia)</p>
        <div className="space-y-3">
          {(cfg.banks || []).map((b, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-lg bg-neutral-50 p-3 sm:grid-cols-4">
              <input value={b.banco} onChange={(e) => setBank(i, 'banco', e.target.value)} placeholder="Banco" className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-ink" />
              <input value={b.titular} onChange={(e) => setBank(i, 'titular', e.target.value)} placeholder="Titular" className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-ink" />
              <input value={b.cuenta} onChange={(e) => setBank(i, 'cuenta', e.target.value)} placeholder="N° de cuenta" className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-ink" />
              <div className="flex gap-2">
                <input value={b.cci} onChange={(e) => setBank(i, 'cci', e.target.value)} placeholder="CCI" className="flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-ink" />
                <button onClick={() => removeBank(i)} className="text-sm text-red-600">✕</button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addBank} className="mt-2 text-xs text-sky-700 hover:underline">+ Agregar cuenta bancaria</button>
      </div>

      <div className="mt-5 rounded-lg bg-neutral-50 p-3">
        <p className="mb-1 text-sm font-medium text-neutral-700">Redes sociales (pie de página)</p>
        <p className="mb-3 text-xs text-neutral-500">
          Pega el enlace completo de cada red. Solo se muestra el ícono de las que llenes.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Instagram" value={cfg.social?.instagram || ''} onChange={(v) => setSocial('instagram', v)} placeholder="https://instagram.com/tu-tienda" />
          <Field label="Facebook" value={cfg.social?.facebook || ''} onChange={(v) => setSocial('facebook', v)} placeholder="https://facebook.com/tu-tienda" />
          <Field label="TikTok" value={cfg.social?.tiktok || ''} onChange={(v) => setSocial('tiktok', v)} placeholder="https://tiktok.com/@tu-tienda" />
          <Field label="YouTube" value={cfg.social?.youtube || ''} onChange={(v) => setSocial('youtube', v)} placeholder="https://youtube.com/@tu-tienda" />
          <Field label="X (Twitter)" value={cfg.social?.x || ''} onChange={(v) => setSocial('x', v)} placeholder="https://x.com/tu-tienda" />
        </div>
      </div>

      <div className="mt-5 rounded-lg bg-neutral-50 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
          <input
            type="checkbox"
            checked={cfg.newsletter?.activo ?? true}
            onChange={(e) => setNewsletter('activo', e.target.checked)}
          />
          Mostrar el formulario de suscripción (newsletter) en el pie de página
        </label>
        {(cfg.newsletter?.activo ?? true) && (
          <div className="mt-3 space-y-3">
            <Field label="Título" value={cfg.newsletter?.titulo || ''} onChange={(v) => setNewsletter('titulo', v)} placeholder="Recibe nuestras ofertas y novedades" />
            <Field label="Descripción" value={cfg.newsletter?.descripcion || ''} onChange={(v) => setNewsletter('descripcion', v)} placeholder="Suscríbete y entérate primero de descuentos..." />
            <p className="text-xs text-neutral-400">
              Los correos suscritos los ves en el panel → pestaña <strong>📧 Suscriptores</strong>.
            </p>
          </div>
        )}
      </div>

      <button onClick={guardar} disabled={saving} className="mt-6 rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
        {saving ? 'Guardando...' : 'Guardar datos de la tienda'}
      </button>
    </div>
  );
}

// ============================================================
// LEGAL (Política de Privacidad y Términos y Condiciones)
// ============================================================
function LegalTab({ catalog, api, flash }) {
  const [legal, setLegal] = useState({
    privacidadActiva: true,
    privacidadTitulo: 'Política de Privacidad',
    privacidadTexto: '',
    terminosActivo: true,
    terminosTitulo: 'Términos y Condiciones',
    terminosTexto: '',
    ...(catalog.storeConfig.legal || {}),
  });
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setLegal((prev) => ({ ...prev, [field]: value }));
  }
  async function guardar() {
    setSaving(true);
    try {
      await api('POST', 'config', { legal });
      flash('Páginas legales guardadas.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="mb-5 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
        ⚠️ Estos textos son plantillas orientativas. Antes de confiar en ellas, haz que un
        abogado en Perú las revise. Los datos <strong>{'{{proveedor}}'}</strong> y{' '}
        <strong>{'{{whatsapp}}'}</strong> se reemplazan solos con tu razón social/RUC/domicilio y tu
        número de WhatsApp (edítalos en «Datos de la tienda»).
      </div>

      {/* Política de Privacidad */}
      <div className="rounded-lg border border-neutral-200 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
          <input type="checkbox" checked={legal.privacidadActiva} onChange={(e) => set('privacidadActiva', e.target.checked)} />
          Mostrar la Política de Privacidad (enlace en el pie de página)
        </label>
        {legal.privacidadActiva && (
          <div className="mt-3 space-y-2">
            <Field label="Título" value={legal.privacidadTitulo} onChange={(v) => set('privacidadTitulo', v)} />
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-neutral-700">Texto</span>
              <textarea
                value={legal.privacidadTexto}
                onChange={(e) => set('privacidadTexto', e.target.value)}
                rows={12}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
              />
              <span className="mt-1 block text-xs text-neutral-400">Separa los párrafos con una línea en blanco.</span>
            </label>
          </div>
        )}
      </div>

      {/* Términos y Condiciones */}
      <div className="mt-4 rounded-lg border border-neutral-200 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
          <input type="checkbox" checked={legal.terminosActivo} onChange={(e) => set('terminosActivo', e.target.checked)} />
          Mostrar los Términos y Condiciones (enlace en el pie de página)
        </label>
        {legal.terminosActivo && (
          <div className="mt-3 space-y-2">
            <Field label="Título" value={legal.terminosTitulo} onChange={(v) => set('terminosTitulo', v)} />
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-neutral-700">Texto</span>
              <textarea
                value={legal.terminosTexto}
                onChange={(e) => set('terminosTexto', e.target.value)}
                rows={12}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
              />
              <span className="mt-1 block text-xs text-neutral-400">Separa los párrafos con una línea en blanco.</span>
            </label>
          </div>
        )}
      </div>

      <button onClick={guardar} disabled={saving} className="mt-6 rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
        {saving ? 'Guardando...' : 'Guardar páginas legales'}
      </button>
    </div>
  );
}

// ============================================================
// ENCUESTA POST-COMPRA
// ============================================================
function EncuestaTab({ catalog, api, flash }) {
  const [encuesta, setEncuesta] = useState({
    activa: true,
    titulo: '¿Nos ayudas con una encuesta rápida?',
    descripcion: '',
    preguntas: [],
    ...(catalog.storeConfig.encuesta || {}),
  });
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setEncuesta((prev) => ({ ...prev, [field]: value }));
  }
  function setPregunta(i, field, value) {
    setEncuesta((prev) => ({
      ...prev,
      preguntas: prev.preguntas.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)),
    }));
  }
  function setOpciones(i, value) {
    // Las opciones se editan como texto separado por comas.
    const opciones = value.split(',').map((o) => o.trim()).filter(Boolean);
    setPregunta(i, 'opciones', opciones);
  }
  function addPregunta(tipo) {
    const id = `p${Date.now().toString(36)}`;
    const nueva = tipo === 'opciones'
      ? { id, label: '', tipo: 'opciones', opciones: [] }
      : { id, label: '', tipo: 'texto' };
    setEncuesta((prev) => ({ ...prev, preguntas: [...prev.preguntas, nueva] }));
  }
  function removePregunta(i) {
    setEncuesta((prev) => ({ ...prev, preguntas: prev.preguntas.filter((_, idx) => idx !== i) }));
  }
  async function guardar() {
    setSaving(true);
    try {
      await api('POST', 'config', { encuesta });
      flash('Encuesta guardada.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <p className="mb-3 text-xs text-neutral-500">
        La encuesta aparece en la página de gracias, después de comprar. Es opcional para el
        cliente (puede tocar «Ahora no»). Las respuestas las ves en el panel → pestaña{' '}
        <strong>📊 Encuestas</strong>.
      </p>

      <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
        <input type="checkbox" checked={encuesta.activa} onChange={(e) => set('activa', e.target.checked)} />
        Mostrar la encuesta después de la compra
      </label>

      {encuesta.activa && (
        <>
          <div className="mt-4 space-y-3">
            <Field label="Título" value={encuesta.titulo} onChange={(v) => set('titulo', v)} placeholder="¿Nos ayudas con una encuesta rápida?" />
            <Field label="Descripción" value={encuesta.descripcion} onChange={(v) => set('descripcion', v)} placeholder="Es opcional y nos ayuda a mejorar." />
          </div>

          <p className="mb-2 mt-6 text-sm font-medium text-neutral-700">Preguntas</p>
          <div className="space-y-3">
            {encuesta.preguntas.map((p, i) => (
              <div key={p.id} className="rounded-lg bg-neutral-50 p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                    {p.tipo === 'opciones' ? 'Opciones' : 'Texto libre'}
                  </span>
                  <input
                    value={p.label}
                    onChange={(e) => setPregunta(i, 'label', e.target.value)}
                    placeholder="Escribe la pregunta"
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
                  />
                  <button onClick={() => removePregunta(i)} className="text-xs text-red-600 hover:underline">Eliminar</button>
                </div>
                {p.tipo === 'opciones' && (
                  <input
                    value={(p.opciones || []).join(', ')}
                    onChange={(e) => setOpciones(i, e.target.value)}
                    placeholder="Opciones separadas por coma: Google, Instagram, Recomendación"
                    className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-3">
            <button onClick={() => addPregunta('opciones')} className="text-xs text-sky-700 hover:underline">+ Pregunta de opciones</button>
            <button onClick={() => addPregunta('texto')} className="text-xs text-sky-700 hover:underline">+ Pregunta de texto libre</button>
          </div>
        </>
      )}

      <button onClick={guardar} disabled={saving} className="mt-6 block rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
        {saving ? 'Guardando...' : 'Guardar encuesta'}
      </button>
    </div>
  );
}

// ============================================================
// Campo de texto reutilizable
// ============================================================
function Field({ label, value, onChange, placeholder, type = 'text', disabled = false, small = false }) {
  return (
    <label className={small ? 'text-xs' : 'text-sm'}>
      <span className={`mb-1 block font-medium text-neutral-700 ${small ? '' : ''}`}>{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`rounded-lg border border-neutral-300 px-3 outline-none focus:border-ink disabled:bg-neutral-100 disabled:text-neutral-400 ${small ? 'w-40 py-1.5' : 'w-full py-2'}`}
      />
    </label>
  );
}
