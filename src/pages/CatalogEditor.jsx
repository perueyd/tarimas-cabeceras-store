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
        `/api/upload?key=${encodeURIComponent(adminKey)}&filename=${encodeURIComponent(file.name)}`,
        { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file }
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
    const res = await fetch(`/api/catalog?key=${encodeURIComponent(adminKey)}&resource=${resource}${extraQuery}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
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
          { id: 'config', label: 'Datos de la tienda' },
          { id: 'portada', label: 'Página principal' },
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
      {sub === 'config' && <ConfigTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'portada' && <PortadaTab catalog={catalog} api={api} flash={flash} />}
    </div>
  );
}

// ============================================================
// PÁGINA PRINCIPAL (textos, vínculos y palabra de la animación)
// ============================================================
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
    ...(catalog.storeConfig.landing || {}),
  });
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setLanding((prev) => ({ ...prev, [field]: value }));
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

      <button onClick={guardar} disabled={saving} className="mt-6 rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
        {saving ? 'Guardando...' : 'Guardar página principal'}
      </button>
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

  async function handleSave() {
    if (!p.id.trim() || !p.name.trim() || !p.category) {
      alert('Completa al menos: id, nombre y categoría.');
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

  return (
    <div>
      <div className="space-y-2">
        {catalog.categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-3">
            <div>
              <p className="text-sm font-medium">{c.label}</p>
              <p className="text-xs text-neutral-400">{c.id}</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={c.active} onChange={() => toggleActive(c)} />
                Activa
              </label>
              <button onClick={() => eliminar(c)} className="text-red-600 hover:underline">Eliminar</button>
            </div>
          </div>
        ))}
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
  function setSlot(i, field, value) {
    setCfg((prev) => ({ ...prev, deliverySlots: prev.deliverySlots.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)) }));
  }
  function addSlot() {
    setCfg((prev) => ({ ...prev, deliverySlots: [...(prev.deliverySlots || []), { id: '', label: '' }] }));
  }
  function removeSlot(i) {
    setCfg((prev) => ({ ...prev, deliverySlots: prev.deliverySlots.filter((_, idx) => idx !== i) }));
  }

  async function guardar() {
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

      <button onClick={guardar} disabled={saving} className="mt-6 rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
        {saving ? 'Guardando...' : 'Guardar datos de la tienda'}
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
