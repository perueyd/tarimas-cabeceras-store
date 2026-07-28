import { useEffect, useRef, useState } from 'react';
import { useCatalog } from '../context/CatalogContext.jsx';
import { PALETAS } from '../data/paletas.js';
import BrandingTab from './BrandingTab.jsx';
import PagosTab from './PagosTab.jsx';
import EntregaTab from './EntregaTab.jsx';
import BannersTab from './BannersTab.jsx';
import DesignTab from './DesignTab.jsx';
import BlogTab from './BlogTab.jsx';

// Botón "Subir foto": abre el selector de archivos, sube la imagen al almacén
// (Vercel Blob) y entrega la URL lista para usar. Máximo ~4 MB por foto.
function UploadButton({ adminKey, onUploaded, label = '📷 Subir', multiple = false, onBatch }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progreso, setProgreso] = useState(''); // "2 / 5" al subir varias
  // Vista previa del último archivo elegido: miniatura + nombre original, para
  // que el dueño confirme QUÉ está subiendo antes de que termine.
  const [preview, setPreview] = useState(null); // { url, name }

  // Libera la miniatura local (objeto en memoria) al cambiarla o desmontar.
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview]);

  async function subirUno(file) {
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
    return data.url;
  }

  async function onFile(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const grande = files.find((f) => f.size > 4 * 1024 * 1024);
    if (grande) {
      alert(`"${grande.name}" pesa más de 4 MB. Redúcela (1200 px de ancho es suficiente) e intenta de nuevo.`);
      return;
    }
    setBusy(true);
    try {
      if (multiple && onBatch) {
        // Varias a la vez: se suben una por una y se entregan juntas.
        const subidos = [];
        for (let i = 0; i < files.length; i++) {
          setProgreso(`${i + 1} / ${files.length}`);
          const url = await subirUno(files[i]);
          subidos.push({ url, name: files[i].name });
        }
        await onBatch(subidos);
        setProgreso('');
      } else {
        const file = files[0];
        setPreview({ url: URL.createObjectURL(file), name: file.name });
        const url = await subirUno(file);
        onUploaded(url);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
      setProgreso('');
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        className="hidden"
        onChange={onFile}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium transition hover:border-ink disabled:opacity-60"
      >
        {busy ? (progreso ? `Subiendo ${progreso}...` : 'Subiendo...') : label}
      </button>
      {/* Miniatura + nombre del archivo que se está subiendo (solo modo simple). */}
      {!multiple && preview && (
        <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
          <span
            className="h-8 w-8 shrink-0 rounded border border-neutral-200 bg-cover bg-center"
            style={{ backgroundImage: `url(${preview.url})` }}
          />
          <span className="max-w-[9rem] truncate" title={preview.name}>{preview.name}</span>
        </span>
      )}
    </span>
  );
}

// Sección plegable (acordeón). Sirve para que el formulario de producto no sea
// un scroll larguísimo: cada bloque se abre/cierra con un clic. `resumen` es un
// texto corto opcional que se ve en la cabecera aunque esté cerrada.
function Seccion({ titulo, resumen, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 bg-neutral-50 px-4 py-3 text-left hover:bg-neutral-100"
      >
        <span className="text-sm font-medium text-neutral-700">
          {titulo}
          {resumen && <span className="ml-2 font-normal text-neutral-400">{resumen}</span>}
        </span>
        <span className={`shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && <div className="border-t border-neutral-200 p-4">{children}</div>}
    </div>
  );
}

// Reordenar arrastrando (drag & drop nativo, sin librerías). Recibe el orden
// actual de ids y una función que guarda el nuevo orden. Devuelve el estado
// visual (qué se arrastra, sobre qué está) y los manejadores para cada tarjeta.
// El arrastre no existe en móvil; por eso cada lista mantiene además flechas ▲▼.
function useReordenar(ids, guardar) {
  const [arrastrando, setArrastrando] = useState(null); // índice que se arrastra
  const [encima, setEncima] = useState(null); // índice sobre el que se suelta

  function onDragStart(i) { setArrastrando(i); }
  function onDragOver(e, i) {
    e.preventDefault();
    if (i !== encima) setEncima(i);
  }
  function limpiar() { setArrastrando(null); setEncima(null); }
  function onDrop(i) {
    if (arrastrando === null || arrastrando === i) return limpiar();
    const nuevo = [...ids];
    const [movido] = nuevo.splice(arrastrando, 1);
    nuevo.splice(i, 0, movido);
    limpiar();
    guardar(nuevo);
    return undefined;
  }
  // Props listos para poner en cada tarjeta arrastrable en la posición i.
  function props(i) {
    return {
      draggable: true,
      onDragStart: () => onDragStart(i),
      onDragOver: (e) => onDragOver(e, i),
      onDrop: () => onDrop(i),
      onDragEnd: limpiar,
    };
  }
  return { arrastrando, encima, props };
}

// Como useReordenar, pero para VARIAS listas independientes a la vez, cada una
// identificada por un "scope" (ej. una por cada grupo de opciones del
// producto). Hace falta porque no se puede llamar useReordenar una vez POR
// grupo dentro de un .map() — el número de grupos cambia, y eso rompe las
// reglas de los Hooks. Con este, un solo par de useState sirve para todas las
// listas arrastrables del formulario, sin importar cuántas haya.
function useReordenarScopes() {
  const [arrastre, setArrastre] = useState(null); // { scope, from }
  const [encima, setEncima] = useState(null); // { scope, index }

  function limpiar() {
    setArrastre(null);
    setEncima(null);
  }
  function zoneProps(scope, index, onReorder) {
    return {
      onDragOver: (e) => {
        e.preventDefault();
        if (!encima || encima.scope !== scope || encima.index !== index) setEncima({ scope, index });
      },
      onDrop: (e) => {
        e.preventDefault();
        if (arrastre && arrastre.scope === scope && arrastre.from !== index) onReorder(arrastre.from, index);
        limpiar();
      },
    };
  }
  function handleProps(scope, index) {
    return {
      draggable: true,
      onDragStart: (e) => {
        e.stopPropagation();
        setArrastre({ scope, from: index });
      },
      onDragEnd: limpiar,
    };
  }
  // onReorder(desde, hasta) hace el splice y guarda — cada lista decide cómo.
  // Combina zoneProps + handleProps: sirve para tarjetas SIN campos de texto
  // adentro (ej. las fotos de la galería), donde arrastrar desde cualquier
  // parte de la tarjeta es cómodo y no estorba nada.
  function props(scope, index, onReorder) {
    return { ...handleProps(scope, index), ...zoneProps(scope, index, onReorder) };
  }
  function estado(scope, index) {
    const arrastrando = arrastre?.scope === scope && arrastre.from === index;
    const destino = !arrastrando && encima?.scope === scope && encima.index === index;
    return { arrastrando, destino };
  }
  return { props, handleProps, zoneProps, estado };
}

// Panel "Editar página": agrega/edita/elimina productos, categorías, colores
// y los datos de la tienda (WhatsApp, cuentas bancarias, horarios de entrega)
// directamente desde el navegador. Todo se guarda en la base de datos y se
// refleja al instante en la tienda — sin tocar código ni hacer deploy.
export default function CatalogEditor({ adminKey }) {
  const catalog = useCatalog();
  const [sub, setSub] = useState('productos');
  const [msg, setMsg] = useState(null); // { text, undo? }

  // flash(texto) muestra un aviso 2.5 s. flash(texto, fn) agrega un botón
  // "Deshacer" que corre fn (para recuperar algo recién borrado) durante 8 s.
  function flash(text, undo) {
    setMsg({ text, undo });
    setTimeout(() => setMsg((m) => (m && m.text === text ? null : m)), undo ? 8000 : 2500);
  }
  async function deshacer() {
    if (!msg?.undo) return;
    const fn = msg.undo;
    setMsg(null);
    try { await fn(); } catch (err) { alert(err.message); }
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

      {msg && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">
          <span>{msg.text}</span>
          {msg.undo && (
            <button
              onClick={deshacer}
              className="shrink-0 rounded-lg border border-green-300 bg-white px-3 py-1 text-xs font-medium text-green-800 hover:bg-green-100"
            >
              ↩ Deshacer
            </button>
          )}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        {[
          { id: 'branding', label: '🎨 Branding' },
          { id: 'productos', label: `Productos (${catalog.products.length})` },
          { id: 'categorias', label: 'Categorías' },
          { id: 'colores', label: 'Colores' },
          { id: 'tamanos', label: 'Tamaños' },
          { id: 'config', label: 'Datos de la tienda' },
          { id: 'pagos', label: '💳 Pagos' },
          { id: 'entrega', label: '🚚 Entrega' },
          { id: 'banners', label: '📢 Banners' },
          { id: 'design', label: '🎨 Diseño' },
          { id: 'blog', label: '📝 Blog' },
          { id: 'portada', label: 'Página principal' },
          { id: 'vitrina', label: 'Vitrina animada' },
          { id: 'faq', label: 'Preguntas' },
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

      {sub === 'branding' && <BrandingTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'productos' && <ProductosTab catalog={catalog} api={api} flash={flash} adminKey={adminKey} />}
      {sub === 'categorias' && <CategoriasTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'colores' && <ColoresTab catalog={catalog} api={api} flash={flash} adminKey={adminKey} />}
      {sub === 'tamanos' && <TamanosTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'config' && <ConfigTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'pagos' && <PagosTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'entrega' && <EntregaTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'banners' && <BannersTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'design' && <DesignTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'blog' && <BlogTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'portada' && <PortadaTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'faq' && <FaqTab catalog={catalog} api={api} flash={flash} />}
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

  // Arrastrar para reordenar los paneles (afecta también la forma del blob y
  // el balanceo, que se asignan automáticamente según la posición).
  const orden = useReordenarScopes();
  function moverPanel(desde, hasta) {
    setLista((prev) => {
      const nuevo = [...prev];
      const [movido] = nuevo.splice(desde, 1);
      nuevo.splice(hasta, 0, movido);
      api('POST', 'showcase', { ids: nuevo.map((x) => x.id) }, '&action=reorder').catch(() => {});
      return nuevo;
    });
  }

  return (
    <div>
      <p className="mb-3 text-xs text-neutral-500">
        Los paneles del carrusel animado de la portada (el que se arrastra, con el nombre grande
        de fondo). Puedes cambiar la imagen, el color de fondo, el nombre y a qué categoría lleva
        cada uno, o quitar y agregar paneles — y arrastrarlos (por el ⠿) para reordenarlos. La forma
        del blob y el balanceo son automáticos según la posición — no necesitas configurarlos.
      </p>
      <div className="space-y-3">
        {lista.map((p, i) => {
          const { arrastrando, destino } = orden.estado('vitrina', i);
          return (
          <div
            key={p.id}
            {...orden.zoneProps('vitrina', i, moverPanel)}
            className={`rounded-lg border bg-white p-3 transition ${arrastrando ? 'opacity-40' : ''} ${
              destino ? 'ring-2 ring-sky-400' : 'border-neutral-200'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                {...orden.handleProps('vitrina', i)}
                className="cursor-move select-none text-neutral-300 hover:text-neutral-500"
                title="Arrastra para reordenar"
              >
                ⠿
              </span>
              <span className="w-5 shrink-0 text-center text-[11px] font-medium text-neutral-400">{i + 1}</span>
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
          );
        })}
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
  sizeDims: {},
  colorsBySize: {},
  opciones: [],
  oculto: false,
  gallery: [],
};

function ProductosTab({ catalog, api, flash, adminKey }) {
  const [editando, setEditando] = useState(null); // producto en edición, o null
  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState(() => new Set());
  const [ultimoIdx, setUltimoIdx] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [vista, setVista] = useState('lista'); // 'lista' | 'mosaico'
  const [catFiltro, setCatFiltro] = useState('todos'); // filtrar por categoría

  // Filtro por nombre o categoría (sin tildes/mayúsculas).
  const normaliza = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const q = normaliza(busqueda.trim());
  const visibles = catalog.products.filter((p) => {
    if (catFiltro !== 'todos' && p.category !== catFiltro) return false;
    if (!q) return true;
    const catLabel = catalog.categories.find((c) => c.id === p.category)?.label || p.category;
    return normaliza(`${p.name} ${catLabel}`).includes(q);
  });
  const todosSeleccionados = visibles.length > 0 && visibles.every((p) => seleccion.has(p.id));
  // Arrastra (o usa ▲▼) dentro de lo que ves (filtrado o buscado): reordena
  // SOLO esos productos entre sí, sin mover a los demás. Toma el nuevo orden
  // de los visibles y lo reinserta en los mismos "huecos" que esos productos
  // ya ocupaban en la lista completa — así "Cabeceras" se ordena entre
  // cabeceras y "Tarimas" entre tarimas, cada una por su lado.
  function aplicarNuevoOrdenVisible(nuevoOrdenVisibles) {
    const idsCompletos = catalog.products.map((p) => p.id);
    const visibleSet = new Set(nuevoOrdenVisibles);
    const huecos = [];
    idsCompletos.forEach((id, i) => { if (visibleSet.has(id)) huecos.push(i); });
    const nuevoCompleto = [...idsCompletos];
    huecos.forEach((posicion, i) => { nuevoCompleto[posicion] = nuevoOrdenVisibles[i]; });
    api('POST', 'product', { ids: nuevoCompleto }, '&action=reorder');
  }
  const orden = useReordenar(visibles.map((p) => p.id), aplicarNuevoOrdenVisible);

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
    flash(`Producto "${p.name}" eliminado.`, () => api('POST', 'product', p));
  }

  // Mueve un producto (▲ sube, ▼ baja) contra su vecino DENTRO de lo que ves
  // — si filtraste "Cabeceras", sube/baja entre cabeceras, no contra una
  // tarima que esté al lado en la lista completa.
  function mover(id, dir) {
    const ids = visibles.map((x) => x.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    aplicarNuevoOrdenVisible(ids);
  }

  // Muestra u oculta un producto de la tienda sin borrarlo (borrador).
  async function toggleOculto(p) {
    await api('POST', 'product', { ...p, oculto: !p.oculto });
    flash(!p.oculto ? `"${p.name}" ocultado (borrador).` : `"${p.name}" visible en la tienda.`);
  }

  // Duplica un producto como punto de partida (id nuevo único, entra oculto
  // para revisarlo antes de publicarlo).
  function duplicar(p) {
    let base = `${p.id}-copia`;
    let id = base;
    let n = 2;
    while (catalog.products.some((x) => x.id === id)) { id = `${base}-${n}`; n += 1; }
    setEditando({
      ...p,
      id,
      name: `${p.name} (copia)`,
      oculto: true,
      specs: Object.entries(p.specs || {}).map(([label, value]) => ({ label, value })),
    });
  }

  // --- Selección múltiple (igual que en Colores) ---
  function toggleSel(id) {
    setSeleccion((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }
  function seleccionarRango(hastaIdx) {
    if (ultimoIdx === null) return toggleSel(visibles[hastaIdx].id);
    const a = Math.min(ultimoIdx, hastaIdx);
    const b = Math.max(ultimoIdx, hastaIdx);
    setSeleccion((prev) => {
      const s = new Set(prev);
      for (let i = a; i <= b; i += 1) s.add(visibles[i].id);
      return s;
    });
    return undefined;
  }
  function seleccionarTodo() {
    setSeleccion(todosSeleccionados ? new Set() : new Set(visibles.map((p) => p.id)));
  }
  async function eliminarSeleccionados() {
    const borrados = visibles.filter((p) => seleccion.has(p.id));
    if (!borrados.length) return;
    if (!window.confirm(`¿Eliminar ${borrados.length} producto(s)?`)) return;
    setOcupado(true);
    try {
      for (const p of borrados) await api('DELETE', 'product', null, `&id=${encodeURIComponent(p.id)}`);
      flash(`${borrados.length} producto(s) eliminado(s).`, async () => {
        for (const p of borrados) await api('POST', 'product', p);
      });
      setSeleccion(new Set());
      setUltimoIdx(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setOcupado(false);
    }
  }

  // Un producto "incompleto" no debería publicarse: sin precio, sin color o sin foto.
  function estaIncompleto(p) {
    return Object.keys(p.sizePricing || {}).length === 0
      || (p.availableColors || []).length === 0
      || !p.baseImage;
  }

  if (editando) {
    return (
      <ProductForm
        catalog={catalog}
        initial={editando}
        onCancel={() => setEditando(null)}
        onSave={guardar}
        adminKey={adminKey}
        api={api}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setEditando({ ...PRODUCTO_VACIO, specs: [], availableColors: [] })}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + Agregar producto
        </button>
        <div className="relative min-w-[12rem] flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">🔎</span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-ink"
          />
        </div>
      </div>

      {/* Filtro por categoría: mostrar solo cabeceras, solo tarimas, etc. */}
      {catalog.categories.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {[{ id: 'todos', label: 'Todos' }, ...catalog.categories.map((c) => ({ id: c.id, label: c.label }))].map((t) => (
            <button
              key={t.id}
              onClick={() => setCatFiltro(t.id)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                catFiltro === t.id ? 'border-ink bg-ink text-white' : 'border-neutral-300 text-neutral-600 hover:border-neutral-500'
              }`}
            >
              {t.label}
              {t.id !== 'todos' && (
                <span className={catFiltro === t.id ? 'ml-1 text-white/70' : 'ml-1 text-neutral-400'}>
                  {catalog.products.filter((p) => p.category === t.id).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {catalog.products.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-neutral-50 px-3 py-2">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <input type="checkbox" checked={todosSeleccionados} onChange={seleccionarTodo} />
            Seleccionar todo
          </label>
          <span className="text-xs text-neutral-400">
            {seleccion.size > 0
              ? `${seleccion.size} seleccionado(s)`
              : `Marca las casillas (Shift = rango) para borrar. Arrastra ${vista === 'mosaico' ? 'una tarjeta' : 'una fila'} para reordenar dentro de lo que ves.`}
          </span>
          {seleccion.size > 0 && (
            <button
              onClick={eliminarSeleccionados}
              disabled={ocupado}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
            >
              {ocupado ? 'Eliminando...' : `🗑 Eliminar ${seleccion.size} seleccionado(s)`}
            </button>
          )}
          {/* Vista: lista o mosaico (como se ve en la tienda). */}
          <div className="ml-auto flex overflow-hidden rounded-lg border border-neutral-300 text-xs">
            <button
              onClick={() => setVista('lista')}
              className={`px-3 py-1.5 ${vista === 'lista' ? 'bg-ink text-white' : 'bg-white hover:bg-neutral-100'}`}
            >
              ☰ Lista
            </button>
            <button
              onClick={() => setVista('mosaico')}
              className={`px-3 py-1.5 ${vista === 'mosaico' ? 'bg-ink text-white' : 'bg-white hover:bg-neutral-100'}`}
            >
              ▦ Mosaico
            </button>
          </div>
        </div>
      )}

      {visibles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-400">
          {catalog.products.length === 0 ? 'Aún no hay productos.' : `Sin resultados para «${busqueda.trim()}».`}
        </p>
      ) : vista === 'lista' ? (
        <div className="space-y-3">
        {visibles.map((p, i) => {
          const precios = Object.values(p.sizePricing || {});
          const min = precios.length ? Math.min(...precios) : 0;
          const sel = seleccion.has(p.id);
          const incompleto = estaIncompleto(p);
          return (
            <div
              key={p.id}
              {...orden.props(i)}
              className={`flex cursor-move select-none items-center justify-between gap-3 rounded-lg border p-4 transition ${
                orden.arrastrando === i ? 'opacity-40' : ''
              } ${orden.encima === i && orden.arrastrando !== i ? 'ring-2 ring-sky-400' : ''} ${
                sel ? 'border-ink bg-neutral-100 ring-2 ring-ink' : 'border-neutral-200 bg-white'
              }`}
              title="Arrastra para reordenar dentro de lo que ves"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-6 shrink-0 text-center text-xs font-medium text-neutral-400">{i + 1}</span>
                <input
                  type="checkbox"
                  checked={sel}
                  onChange={() => {}}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (e.shiftKey) { e.preventDefault(); seleccionarRango(i); }
                    else { toggleSel(p.id); }
                    setUltimoIdx(i);
                  }}
                  className="shrink-0 cursor-pointer"
                  title="Seleccionar (Shift = rango)"
                />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    <span className="truncate">{p.name}</span>
                    {p.oculto && <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-600">Oculto</span>}
                    {incompleto && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">Incompleto</span>}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {catalog.categories.find((c) => c.id === p.category)?.label || p.category} · Desde {catalog.currencyFormatter.format(min)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-xs">
                <span className="flex flex-col">
                  <button
                    onClick={(e) => { e.stopPropagation(); mover(p.id, -1); }}
                    className="leading-none text-neutral-400 hover:text-ink"
                    title="Subir"
                  >▲</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); mover(p.id, 1); }}
                    className="leading-none text-neutral-400 hover:text-ink"
                    title="Bajar"
                  >▼</button>
                </span>
                <a
                  href={`/producto/${p.id}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:border-ink"
                >
                  Ver
                </a>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditando({
                      ...p,
                      specs: Object.entries(p.specs || {}).map(([label, value]) => ({ label, value })),
                    });
                  }}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:border-ink"
                >
                  Editar
                </button>
                <button onClick={(e) => { e.stopPropagation(); duplicar(p); }} className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:border-ink">
                  Duplicar
                </button>
                <button onClick={(e) => { e.stopPropagation(); toggleOculto(p); }} className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:border-ink">
                  {p.oculto ? 'Mostrar' : 'Ocultar'}
                </button>
                <button onClick={(e) => { e.stopPropagation(); eliminar(p); }} className="rounded-lg border border-red-200 px-3 py-1.5 text-red-600 hover:bg-red-50">
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visibles.map((p, i) => {
            const precios = Object.values(p.sizePricing || {});
            const min = precios.length ? Math.min(...precios) : 0;
            const sel = seleccion.has(p.id);
            const incompleto = estaIncompleto(p);
            return (
              <div
                key={p.id}
                {...orden.props(i)}
                className={`cursor-move overflow-hidden rounded-xl border bg-white transition ${
                  orden.arrastrando === i ? 'opacity-40' : ''
                } ${orden.encima === i && orden.arrastrando !== i ? 'ring-2 ring-sky-400' : ''} ${
                  sel ? 'border-ink ring-2 ring-ink' : 'border-neutral-200'
                }`}
                title="Arrastra para reordenar dentro de lo que ves"
              >
                <div className="relative aspect-square w-full bg-neutral-100">
                  {p.baseImage ? (
                    <img src={p.baseImage} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl text-neutral-300">🖼️</div>
                  )}
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">{i + 1}</span>
                  <input
                    type="checkbox"
                    checked={sel}
                    onChange={() => {}}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (e.shiftKey) { e.preventDefault(); seleccionarRango(i); }
                      else { toggleSel(p.id); }
                      setUltimoIdx(i);
                    }}
                    className="absolute right-1.5 top-1.5 h-4 w-4 cursor-pointer"
                    title="Seleccionar (Shift = rango)"
                  />
                  {(p.oculto || incompleto) && (
                    <div className="absolute bottom-1.5 left-1.5 flex flex-wrap gap-1">
                      {p.oculto && <span className="rounded-full bg-neutral-800/80 px-2 py-0.5 text-[10px] font-medium text-white">Oculto</span>}
                      {incompleto && <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-medium text-white">Incompleto</span>}
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-sm font-medium" title={p.name}>{p.name}</p>
                  <p className="truncate text-xs text-neutral-500">Desde {catalog.currencyFormatter.format(min)}</p>
                  <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditando({ ...p, specs: Object.entries(p.specs || {}).map(([label, value]) => ({ label, value })) }); }}
                      className="rounded border border-neutral-300 px-2 py-1 hover:border-ink"
                    >
                      Editar
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); toggleOculto(p); }} className="rounded border border-neutral-300 px-2 py-1 hover:border-ink">
                      {p.oculto ? 'Mostrar' : 'Ocultar'}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); duplicar(p); }} className="rounded border border-neutral-300 px-2 py-1 hover:border-ink">
                      Duplicar
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); eliminar(p); }} className="rounded border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50">
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProductForm({ catalog, initial, onCancel, onSave, adminKey, api }) {
  const [p, setP] = useState(initial);
  const [saving, setSaving] = useState(false);
  const isNew = !catalog.products.some((x) => x.id === initial.id);
  // Opciones reutilizables guardadas (ej. "Laterales", "Tipo de botón"): se
  // guardan en la config de la tienda para no reescribirlas en cada producto.
  const presets = catalog.storeConfig.opcionPresets || [];
  // Arrastrar para reordenar: fotos de la galería, grupos de opciones y los
  // valores dentro de cada grupo — mismo mecanismo en todo el panel.
  const orden = useReordenarScopes();

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
  // Galería: fotos adicionales del producto (ángulos, detalle, ambientado).
  // Cada foto puede además marcarse como "también cambia de color" — útil
  // cuando son otros ángulos del mismo mueble tapizado, no solo detalles.
  // Compatibilidad: productos guardados antes tenían la galería como lista de
  // URLs simples (sin repintar); se normalizan al leer.
  function normalizarGaleria(gallery) {
    return (gallery || []).map((f) => (typeof f === 'string' ? { url: f, tintable: false } : f));
  }
  function agregarFotos(subidos) {
    setP((prev) => ({
      ...prev,
      gallery: [...normalizarGaleria(prev.gallery), ...subidos.map((s) => ({ url: s.url, tintable: false }))],
    }));
  }
  function quitarFoto(url) {
    setP((prev) => ({ ...prev, gallery: normalizarGaleria(prev.gallery).filter((f) => f.url !== url) }));
  }
  function toggleFotoTintable(url) {
    setP((prev) => ({
      ...prev,
      gallery: normalizarGaleria(prev.gallery).map((f) => (f.url === url ? { ...f, tintable: !f.tintable } : f)),
    }));
  }
  // Mueve una foto de la galería al soltarla en otra posición.
  function moverFoto(desde, hasta) {
    setP((prev) => {
      const lista = normalizarGaleria(prev.gallery);
      const [movida] = lista.splice(desde, 1);
      lista.splice(hasta, 0, movida);
      return { ...prev, gallery: lista };
    });
  }
  // Medida propia de ESTE mueble para un tamaño. Una cabecera "2 plazas" mide
  // distinto que una tarima "2 plazas", así que cada producto puede fijar su
  // propia medida; si se deja vacío, usa la medida general del tamaño.
  function setSizeDim(sizeId, value) {
    setP((prev) => {
      const sd = { ...(prev.sizeDims || {}) };
      if (value.trim() === '') delete sd[sizeId];
      else sd[sizeId] = value;
      return { ...prev, sizeDims: sd };
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
  // --- Opciones del producto (brazos, tipo de patas, tipo de botón...) ---
  function setGrupos(fn) {
    setP((prev) => ({ ...prev, opciones: fn(prev.opciones || []) }));
  }
  function addGrupo() {
    setGrupos((gs) => [...gs, { id: `g${Date.now().toString(36)}`, label: '', valores: [] }]);
  }
  function setGrupo(gi, field, value) {
    setGrupos((gs) => gs.map((g, i) => (i === gi ? { ...g, [field]: value } : g)));
  }
  function removeGrupo(gi) {
    setGrupos((gs) => gs.filter((_, i) => i !== gi));
  }
  // Mueve un grupo completo (ej. "Laterales" antes que "Tipo de botón").
  function moverGrupo(desde, hasta) {
    setGrupos((gs) => {
      const nuevo = [...gs];
      const [movido] = nuevo.splice(desde, 1);
      nuevo.splice(hasta, 0, movido);
      return nuevo;
    });
  }
  function addValor(gi) {
    setGrupos((gs) =>
      gs.map((g, i) =>
        i === gi
          ? { ...g, valores: [...(g.valores || []), { id: `v${Date.now().toString(36)}`, label: '', precioExtra: 0 }] }
          : g
      )
    );
  }
  function setValor(gi, vi, field, value) {
    setGrupos((gs) =>
      gs.map((g, i) =>
        i === gi ? { ...g, valores: g.valores.map((v, j) => (j === vi ? { ...v, [field]: value } : v)) } : g
      )
    );
  }
  function removeValor(gi, vi) {
    setGrupos((gs) => gs.map((g, i) => (i === gi ? { ...g, valores: g.valores.filter((_, j) => j !== vi) } : g)));
  }
  // Mueve una opción dentro de SU grupo (ej. "Con brazos" antes que "Sin brazos").
  function moverValor(gi, desde, hasta) {
    setGrupos((gs) =>
      gs.map((g, i) => {
        if (i !== gi) return g;
        const nuevo = [...g.valores];
        const [movido] = nuevo.splice(desde, 1);
        nuevo.splice(hasta, 0, movido);
        return { ...g, valores: nuevo };
      })
    );
  }
  // Inserta una opción guardada como grupo nuevo (con ids nuevos, para que
  // editarla en este producto no toque la plantilla guardada).
  function aplicarPreset(preset) {
    const copia = {
      id: `g${Date.now().toString(36)}`,
      label: preset.label,
      valores: (preset.valores || []).map((v, i) => ({ ...v, id: `v${Date.now().toString(36)}${i}` })),
    };
    setGrupos((gs) => [...gs, copia]);
  }
  // Guarda un grupo del producto como opción reutilizable. Si ya existe una con
  // el mismo nombre, la reemplaza (así "editar" es volver a guardarla).
  async function guardarPreset(grupo) {
    const label = grupo.label.trim();
    if (!label) { alert('Ponle nombre al grupo (ej. "Laterales") antes de guardarlo.'); return; }
    const valores = (grupo.valores || []).filter((v) => v.label.trim());
    if (!valores.length) { alert('Agrega al menos una opción con nombre.'); return; }
    const otros = presets.filter((pr) => pr.label.toLowerCase() !== label.toLowerCase());
    const nuevo = { id: `op${Date.now().toString(36)}`, label, valores };
    await api('POST', 'config', { opcionPresets: [...otros, nuevo] });
  }
  async function eliminarPreset(id) {
    if (!window.confirm('¿Eliminar esta opción guardada? (No afecta a los productos que ya la usan.)')) return;
    await api('POST', 'config', { opcionPresets: presets.filter((pr) => pr.id !== id) });
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
    // Los grupos de opciones sin nombre o sin opciones con nombre no sirven de
    // nada y se verían rotos en la tienda — se descartan al guardar.
    const opciones = (p.opciones || [])
      .map((g) => ({ ...g, valores: (g.valores || []).filter((v) => v.label.trim()) }))
      .filter((g) => g.label.trim() && g.valores.length > 0);

    setSaving(true);
    try {
      await onSave({ ...p, offerPricing, opciones });
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

      <div className="mt-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={p.tintable} onChange={(e) => set('tintable', e.target.checked)} />
          Repintar esta foto con el color que elija el cliente
        </label>
        <p className="mt-1 pl-6 text-xs text-neutral-500">
          Puedes subir la foto <strong>a color</strong> — la web la desatura sola y le aplica el
          color elegido conservando la textura y los pliegues. Desmárcalo solo si quieres que la
          foto se vea siempre tal cual la subiste (ej. un acabado de madera real).
        </p>
      </div>

      {/* Galería: fotos adicionales del producto (varias a la vez). El modelo
          puede tener más de una foto — cada una puede además marcarse para que
          también cambie de color, no solo la principal. */}
      <div className="mt-4">
        <p className="mb-1 text-sm font-medium text-neutral-700">Fotos adicionales (galería)</p>
        <p className="mb-2 text-xs text-neutral-500">
          Fotos extra del mueble (otros ángulos, detalle de la tela, ambientado). Se muestran en la
          página del producto, y el cliente puede pasar entre ellas. Puedes subir{' '}
          <strong>varias a la vez</strong>, arrastrarlas para ordenarlas, y marcar con{' '}
          <strong>🎨</strong> las que también deban repintarse con el color elegido (ej. otro ángulo
          del mismo tapizado).
        </p>
        {normalizarGaleria(p.gallery).length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {normalizarGaleria(p.gallery).map((f, i) => {
              const { arrastrando, destino } = orden.estado('galeria', i);
              return (
                <div
                  key={f.url}
                  {...orden.props('galeria', i, moverFoto)}
                  className={`relative cursor-move transition ${arrastrando ? 'opacity-40' : ''} ${
                    destino ? 'ring-2 ring-sky-400' : ''
                  }`}
                  title="Arrastra para reordenar"
                >
                  <span className="absolute left-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {i + 1}
                  </span>
                  <img src={f.url} alt="" className="h-16 w-16 rounded-lg border border-neutral-200 object-cover" />
                  <button
                    type="button"
                    onClick={() => toggleFotoTintable(f.url)}
                    className={`absolute bottom-1 left-1 rounded-full px-1 text-[10px] ${
                      f.tintable ? 'bg-ink text-white' : 'bg-white/90 text-neutral-500'
                    }`}
                    title={f.tintable ? 'Esta foto cambia de color — toca para quitarlo' : 'Toca para que también cambie de color'}
                  >
                    🎨
                  </button>
                  <button
                    onClick={() => quitarFoto(f.url)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] text-white"
                    title="Quitar foto"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <UploadButton adminKey={adminKey} multiple onBatch={agregarFotos} label="📷 Subir fotos" />
      </div>

      <label className="mt-4 block text-sm">
        <span className="mb-1 block font-medium text-neutral-700">Descripción corta</span>
        <textarea
          value={p.shortDescription}
          onChange={(e) => set('shortDescription', e.target.value)}
          rows={2}
          className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink"
        />
      </label>

      <Seccion titulo="Especificaciones (material, altura, garantía…)">
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
      </Seccion>

      <Seccion titulo="Precios y medidas por tamaño" defaultOpen>
      {/* Precios por tamaño: regular y de oferta */}
      <div className="mt-5">
        <p className="mb-1 text-sm font-medium text-neutral-700">Precios por tamaño (S/)</p>
        <p className="mb-2 text-xs text-neutral-500">
          Precio de oferta es opcional e independiente para cada tamaño. Si lo llenas, la tienda
          muestra ese precio con el precio regular tachado al lado y el descuento calculado. Debe
          ser menor al precio regular — si no, se ignora y se vende al precio regular.
        </p>
        <p className="mb-3 text-xs text-neutral-400">
          ¿Cada tamaño tiene su propia foto o sus propios colores? Más abajo, en
          «Colores por tamaño» y «Foto propia por tamaño».
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.sizes
            .filter((s) => !s.categoria || s.categoria === p.category || p.sizePricing?.[s.id] != null)
            .map((s) => {
            const regular = p.sizePricing[s.id] ?? '';
            const oferta = p.offerPricing?.[s.id] ?? '';
            const ofertaInvalida = oferta !== '' && regular !== '' && Number(oferta) >= Number(regular);
            // Descuento real de ESTE tamaño (el mismo que verá el cliente).
            const ofertaValida = oferta !== '' && regular !== '' && !ofertaInvalida && Number(oferta) > 0;
            const dctoPct = ofertaValida
              ? Math.round(((Number(regular) - Number(oferta)) / Number(regular)) * 1000) / 10
              : null;
            const ahorro = ofertaValida ? Number(regular) - Number(oferta) : null;
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
                {dctoPct !== null && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                    <span className="rounded-full bg-red-50 px-1.5 py-0.5 font-semibold text-red-600">-{dctoPct}%</span>
                    <span className="text-neutral-500">
                      ahorra {catalog.currencyFormatter.format(ahorro)}
                    </span>
                  </p>
                )}
                <label className="mt-2 block text-xs">
                  <span className="mb-1 block text-neutral-500">Medida de este mueble (opcional)</span>
                  <input
                    value={p.sizeDims?.[s.id] ?? ''}
                    onChange={(e) => setSizeDim(s.id, e.target.value)}
                    placeholder={s.dims || 'ej. 160 x 60 cm'}
                    className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 outline-none focus:border-ink"
                  />
                </label>
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
      </Seccion>

      <Seccion titulo="Colores">
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
      </Seccion>

      <Seccion titulo="Opciones (laterales, botones, patas…)">
      {/* Opciones del producto (brazos, tipo de patas, tipo de botón...) */}
      <div className="mt-5 rounded-lg bg-neutral-50 p-3">
        <p className="text-sm font-medium text-neutral-700">Opciones del producto (opcional)</p>
        <p className="mb-3 mt-1 text-xs text-neutral-500">
          Para elegir cosas además del tamaño y el color: «Brazos: con / sin», «Tipo de patas»,
          «Tipo de botón»… El cliente elige una opción de cada grupo. Si una opción cuesta más,
          ponle un recargo (déjalo en 0 si no cambia el precio). El recargo se suma al precio del
          tamaño y se vuelve a calcular en el servidor al pagar, así nadie puede alterarlo.
        </p>

        {/* Opciones guardadas: se insertan con un clic para no reescribirlas. */}
        {presets.length > 0 && (
          <div className="mb-3 rounded-lg border border-dashed border-neutral-300 bg-white p-3">
            <p className="mb-2 text-xs font-medium text-neutral-600">Opciones guardadas (toca para agregar)</p>
            <div className="flex flex-wrap gap-2">
              {presets.map((pr) => (
                <span key={pr.id} className="inline-flex items-center overflow-hidden rounded-full border border-neutral-300 text-xs">
                  <button
                    type="button"
                    onClick={() => aplicarPreset(pr)}
                    className="py-1 pl-3 pr-2 hover:bg-neutral-100"
                    title={`Agregar «${pr.label}» (${(pr.valores || []).length} opciones)`}
                  >
                    + {pr.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarPreset(pr.id)}
                    className="border-l border-neutral-300 px-2 py-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                    title="Borrar esta opción guardada"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="mb-2 text-xs text-neutral-400">Arrastra un grupo o una opción para reordenarlo.</p>
        <div className="space-y-3">
          {(p.opciones || []).map((g, gi) => {
            const { arrastrando, destino } = orden.estado('grupos', gi);
            return (
            <div
              key={g.id}
              {...orden.zoneProps('grupos', gi, moverGrupo)}
              className={`rounded-lg border bg-white p-3 transition ${
                arrastrando ? 'opacity-40' : ''
              } ${destino ? 'ring-2 ring-sky-400' : 'border-neutral-200'}`}
            >
              <div className="flex items-center gap-2">
                <span
                  {...orden.handleProps('grupos', gi)}
                  className="cursor-move select-none px-0.5 text-neutral-300 hover:text-neutral-500"
                  title="Arrastra para reordenar"
                >
                  ⠿
                </span>
                <span className="w-5 shrink-0 text-center text-[11px] font-medium text-neutral-400">{gi + 1}</span>
                <input
                  value={g.label}
                  onChange={(e) => setGrupo(gi, 'label', e.target.value)}
                  placeholder="Nombre del grupo (ej. Brazos, Tipo de patas)"
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
                />
                <button
                  onClick={() => guardarPreset(g)}
                  className="shrink-0 text-xs text-sky-700 hover:underline"
                  title="Guardar este grupo para reutilizarlo en otros productos"
                >
                  💾 Guardar
                </button>
                <button onClick={() => removeGrupo(gi)} className="text-xs text-red-600 hover:underline">
                  Eliminar grupo
                </button>
              </div>

              <div className="mt-2 space-y-2 pl-3">
                {(g.valores || []).map((v, vi) => {
                  const estVal = orden.estado(`valores:${gi}`, vi);
                  return (
                  <div
                    key={v.id}
                    {...orden.zoneProps(`valores:${gi}`, vi, (desde, hasta) => moverValor(gi, desde, hasta))}
                    className={`rounded-lg border bg-neutral-50 p-2 transition ${
                      estVal.arrastrando ? 'opacity-40' : ''
                    } ${estVal.destino ? 'ring-2 ring-sky-400' : 'border-neutral-100'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        {...orden.handleProps(`valores:${gi}`, vi)}
                        className="cursor-move select-none px-0.5 text-neutral-300 hover:text-neutral-500"
                        title="Arrastra para reordenar"
                      >
                        ⠿
                      </span>
                      <span className="w-4 shrink-0 text-center text-[10px] font-medium text-neutral-400">{vi + 1}</span>
                      <input
                        value={v.label}
                        onChange={(e) => setValor(gi, vi, 'label', e.target.value)}
                        placeholder="Opción (ej. Con brazos)"
                        className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
                      />
                      <label className="flex items-center gap-1 text-xs text-neutral-500">
                        +S/
                        <input
                          type="number"
                          min="0"
                          value={v.precioExtra ?? 0}
                          onChange={(e) => setValor(gi, vi, 'precioExtra', Math.max(Number(e.target.value) || 0, 0))}
                          className="w-20 rounded-lg border border-neutral-300 px-2 py-1.5 outline-none focus:border-ink"
                        />
                      </label>
                      <button onClick={() => removeValor(gi, vi)} className="text-xs text-red-600">✕</button>
                    </div>
                    {/* Foto OPCIONAL de la opción: para mostrar el tipo de botón
                        (capitoneado) o el modelo de pata. En "con/sin brazo" se
                        puede dejar sin foto y funciona igual. */}
                    <div className="mt-2 flex items-center gap-2 pl-1">
                      {v.img && (
                        <span
                          className="h-10 w-10 shrink-0 rounded border border-neutral-200 bg-cover bg-center"
                          style={{ backgroundImage: `url(${v.img})` }}
                          title="Foto de esta opción"
                        />
                      )}
                      <UploadButton
                        adminKey={adminKey}
                        onUploaded={(url) => setValor(gi, vi, 'img', url)}
                        label={v.img ? '📷 Cambiar foto' : '📷 Foto (opcional)'}
                      />
                      {v.img && (
                        <button
                          onClick={() => setValor(gi, vi, 'img', '')}
                          className="text-xs text-neutral-400 hover:text-neutral-600"
                        >
                          quitar
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
              <button onClick={() => addValor(gi)} className="mt-2 pl-3 text-xs text-sky-700 hover:underline">
                + Agregar opción a «{g.label || 'este grupo'}»
              </button>
            </div>
            );
          })}
        </div>

        <button onClick={addGrupo} className="mt-2 text-xs text-sky-700 hover:underline">
          + Agregar grupo de opciones
        </button>
      </div>
      </Seccion>

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
  const orden = useReordenarScopes();

  function moverCategoria(desde, hasta) {
    const ids = catalog.categories.map((c) => c.id);
    const [movida] = ids.splice(desde, 1);
    ids.splice(hasta, 0, movida);
    api('POST', 'category', { ids }, '&action=reorder');
  }

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
      <p className="mb-2 text-xs text-neutral-400">Arrastra una categoría (por el ⠿) para reordenarla.</p>
      <div className="space-y-2">
        {catalog.categories.map((c, i) => {
          const labelActual = labels[c.id] ?? c.label;
          const descActual = descriptions[c.id] ?? (c.description || '');
          const cambiado = (labelActual.trim() && labelActual !== c.label) || descActual !== (c.description || '');
          const descPorDefecto = c.active
            ? 'Disponible ahora — elige tamaño y color.'
            : 'Estamos preparando esta línea. Vuelve pronto.';
          const { arrastrando, destino } = orden.estado('categorias', i);
          return (
            <div
              key={c.id}
              {...orden.zoneProps('categorias', i, moverCategoria)}
              className={`rounded-lg border bg-white p-3 transition ${arrastrando ? 'opacity-40' : ''} ${
                destino ? 'ring-2 ring-sky-400' : 'border-neutral-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-[220px] flex-1 items-center gap-2">
                  <span
                    {...orden.handleProps('categorias', i)}
                    className="cursor-move select-none px-0.5 text-neutral-300 hover:text-neutral-500"
                    title="Arrastra para reordenar"
                  >
                    ⠿
                  </span>
                  <span className="w-5 shrink-0 text-center text-[11px] font-medium text-neutral-400">{i + 1}</span>
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
function ColoresTab({ catalog, api, flash, adminKey }) {
  const [nuevo, setNuevo] = useState({ id: '', label: '', hex: '#8b8d91' });
  const [cargando, setCargando] = useState('');
  // Selección múltiple para borrar varios colores de golpe (limpiar pruebas).
  const [seleccion, setSeleccion] = useState(() => new Set());
  const [ultimoIdx, setUltimoIdx] = useState(null); // para el rango con Shift
  const todosSeleccionados = catalog.colors.length > 0 && seleccion.size === catalog.colors.length;
  const orden = useReordenar(
    catalog.colors.map((c) => c.id),
    (ids) => api('POST', 'color', { ids }, '&action=reorder')
  );

  function toggleSel(id) {
    setSeleccion((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function seleccionarRango(hastaIdx) {
    if (ultimoIdx === null) return toggleSel(catalog.colors[hastaIdx].id);
    const a = Math.min(ultimoIdx, hastaIdx);
    const b = Math.max(ultimoIdx, hastaIdx);
    setSeleccion((prev) => {
      const n = new Set(prev);
      for (let i = a; i <= b; i += 1) n.add(catalog.colors[i].id);
      return n;
    });
    return undefined;
  }
  function seleccionarTodo() {
    setSeleccion(todosSeleccionados ? new Set() : new Set(catalog.colors.map((c) => c.id)));
  }
  async function eliminarSeleccionados() {
    const borrados = catalog.colors.filter((c) => seleccion.has(c.id));
    if (!borrados.length) return;
    if (!window.confirm(`¿Eliminar ${borrados.length} color(es) seleccionado(s)?`)) return;
    setCargando('bulk');
    try {
      for (const c of borrados) {
        await api('DELETE', 'color', null, `&id=${encodeURIComponent(c.id)}`);
      }
      flash(`${borrados.length} color(es) eliminado(s).`, async () => {
        for (const c of borrados) await api('POST', 'color', c);
      });
      setSeleccion(new Set());
      setUltimoIdx(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setCargando('');
    }
  }

  async function eliminar(c) {
    if (!window.confirm(`¿Eliminar el color "${c.label}"?`)) return;
    await api('DELETE', 'color', null, `&id=${encodeURIComponent(c.id)}`);
    flash('Color eliminado.', () => api('POST', 'color', c));
  }

  // Mueve un color en el orden (afecta el orden de los círculos en la tienda).
  async function mover(id, dir) {
    const ids = catalog.colors.map((x) => x.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await api('POST', 'color', { ids }, '&action=reorder');
  }
  async function agregar() {
    if (!nuevo.id.trim() || !nuevo.label.trim()) return;
    await api('POST', 'color', { id: nuevo.id.trim().toLowerCase().replace(/\s+/g, '-'), label: nuevo.label.trim(), hex: nuevo.hex });
    setNuevo({ id: '', label: '', hex: '#8b8d91' });
    flash('Color agregado.');
  }
  // Guarda el tono ajustado de un color que ya existe (mismo id = se actualiza).
  async function cambiarTono(c, hex) {
    await api('POST', 'color', { ...c, hex });
  }
  // Guarda (o quita) la foto de muestra de la tela real de un color.
  async function cambiarMuestra(c, url) {
    const actualizado = { ...c };
    if (url) actualizado.img = url;
    else delete actualizado.img;
    await api('POST', 'color', actualizado);
    flash(url ? `Muestra de "${c.label}" guardada.` : `Muestra de "${c.label}" quitada.`);
  }
  // Sube VARIAS fotos de tela de golpe y crea un color por cada una. El nombre
  // sale del archivo (ej. "velvet-azul.jpg" -> "Velvet azul") y se puede editar
  // después. Ideal para cargar una carta entera de fotos propias sin ir una
  // por una.
  async function subirVariasTelas(subidos) {
    const usados = new Set(catalog.colors.map((c) => c.id));
    let creados = 0;
    for (const { url, name } of subidos) {
      const base = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
      const label = base ? base.charAt(0).toUpperCase() + base.slice(1) : 'Tela';
      let id = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (!id) id = `tela-${Date.now().toString(36)}`;
      while (usados.has(id)) id = `${id}-2`;
      usados.add(id);
      await api('POST', 'color', { id, label, hex: '#8b8d91', img: url });
      creados += 1;
    }
    flash(`${creados} tela(s) subida(s) como color. Revisa los nombres y ajusta lo que quieras.`);
  }

  // Carga una carta de tela completa. Solo agrega los que falten: si ya tienes
  // un color con ese id, no se toca (para no pisar tonos que ya ajustaste).
  async function cargarPaleta(paleta) {
    const existentes = new Set(catalog.colors.map((c) => c.id));
    const faltantes = paleta.colores.filter((c) => !existentes.has(c.id));
    if (faltantes.length === 0) {
      alert(`Ya tienes cargada la carta "${paleta.nombre}".`);
      return;
    }
    if (!window.confirm(`Se agregarán ${faltantes.length} colores de «${paleta.nombre}». Los que ya tengas no se modifican. ¿Continuar?`)) return;
    setCargando(paleta.id);
    try {
      for (const c of faltantes) {
        await api('POST', 'color', c);
      }
      flash(`${faltantes.length} colores agregados. Ajusta los tonos que no coincidan con tu tela real.`);
    } catch (err) {
      alert(err.message);
    } finally {
      setCargando('');
    }
  }

  return (
    <div>
      <p className="mb-3 text-xs text-neutral-500">
        Toca el cuadrito de color para ajustar su tono. Y con <strong>«📷 Muestra»</strong> puedes
        subir una foto real de la tela: así el círculo de color en la tienda muestra la textura y
        el tono verdadero en vez de un color plano (mucho más fiel para el cliente).
      </p>

      {/* Barra de selección múltiple: marcar todos / rango con Shift / borrar juntos. */}
      {catalog.colors.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-neutral-50 px-3 py-2">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <input type="checkbox" checked={todosSeleccionados} onChange={seleccionarTodo} />
            Seleccionar todo
          </label>
          <span className="text-xs text-neutral-400">
            {seleccion.size > 0
              ? `${seleccion.size} seleccionado(s)`
              : 'Marca las casillas (Shift = rango) para borrar varios. Arrastra una tarjeta para reordenar.'}
          </span>
          {seleccion.size > 0 && (
            <button
              onClick={eliminarSeleccionados}
              disabled={cargando === 'bulk'}
              className="ml-auto rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
            >
              {cargando === 'bulk' ? 'Eliminando...' : `🗑 Eliminar ${seleccion.size} seleccionado(s)`}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {catalog.colors.map((c, i) => {
          const sel = seleccion.has(c.id);
          return (
          <div
            key={c.id}
            {...orden.props(i)}
            className={`flex cursor-move select-none items-center gap-2 rounded-lg border p-2 transition ${
              orden.arrastrando === i ? 'opacity-40' : ''
            } ${orden.encima === i && orden.arrastrando !== i ? 'ring-2 ring-sky-400' : ''} ${
              sel ? 'border-ink bg-neutral-100 ring-2 ring-ink' : 'border-neutral-200 bg-white'
            }`}
            title="Arrastra para reordenar"
          >
            <span className="w-5 shrink-0 text-center text-[11px] font-medium text-neutral-400">{i + 1}</span>
            <input
              type="checkbox"
              checked={sel}
              onChange={() => {}}
              onClick={(e) => {
                e.stopPropagation();
                if (e.shiftKey) { e.preventDefault(); seleccionarRango(i); }
                else { toggleSel(c.id); }
                setUltimoIdx(i);
              }}
              title="Seleccionar (Shift = rango)"
              className="shrink-0 cursor-pointer"
            />
            {c.img ? (
              <span
                className="h-8 w-8 shrink-0 rounded-full border border-black/10 bg-cover bg-center"
                style={{ backgroundImage: `url(${c.img})` }}
                title="Muestra de tela"
              />
            ) : (
              <input
                type="color"
                value={c.hex}
                onChange={(e) => cambiarTono(c, e.target.value)}
                title={`Ajustar el tono de ${c.label}`}
                className="h-8 w-8 shrink-0 cursor-pointer rounded-full border border-black/10 bg-transparent p-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{c.label}</p>
              <div className="flex items-center gap-2 text-[11px]">
                <UploadButton adminKey={adminKey} onUploaded={(url) => cambiarMuestra(c, url)} label="📷 Muestra" />
                {c.img && (
                  <button onClick={() => cambiarMuestra(c, '')} className="text-neutral-400 hover:text-neutral-600">
                    quitar
                  </button>
                )}
              </div>
            </div>
            <span className="flex shrink-0 flex-col leading-none">
              <button onClick={(e) => { e.stopPropagation(); mover(c.id, -1); }} className="text-neutral-400 hover:text-ink" title="Subir">▲</button>
              <button onClick={(e) => { e.stopPropagation(); mover(c.id, 1); }} className="text-neutral-400 hover:text-ink" title="Bajar">▼</button>
            </span>
            <button onClick={(e) => { e.stopPropagation(); eliminar(c); }} className="shrink-0 text-xs text-red-600 hover:underline">✕</button>
          </div>
          );
        })}
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

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-neutral-300 p-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-neutral-700">Subir varias telas de golpe</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            Elige varias fotos a la vez y se crea un color por cada una. El nombre sale del archivo
            (ej. «velvet-azul.jpg» → «Velvet azul»); luego lo puedes editar.
          </p>
        </div>
        <UploadButton
          adminKey={adminKey}
          multiple
          onBatch={subirVariasTelas}
          label="📷 Subir varias telas"
        />
      </div>

      <div className="mt-5 rounded-lg bg-neutral-50 p-3">
        <p className="text-sm font-medium text-neutral-700">Cargar una carta de telas</p>
        <p className="mb-3 mt-1 text-xs text-neutral-500">
          Agrega de golpe todos los colores de una carta. Los tonos son una aproximación tomada de
          la foto de la carta — después ajústalos con el cuadrito de color hasta que coincidan con
          tu tela real. Los colores que ya tengas no se modifican.
        </p>
        <div className="space-y-2">
          {PALETAS.map((pal) => (
            <div key={pal.id} className="rounded-lg border border-neutral-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">{pal.nombre}</span>
                <button
                  onClick={() => cargarPaleta(pal)}
                  disabled={cargando === pal.id}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:border-ink disabled:opacity-60"
                >
                  {cargando === pal.id ? 'Cargando...' : `+ Cargar ${pal.colores.length} colores`}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {pal.colores.map((c) => (
                  <span
                    key={c.id}
                    title={c.label}
                    className="h-5 w-5 rounded-full border border-black/10"
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAMAÑOS (medidas)
// ============================================================
function TamanosTab({ catalog, api, flash }) {
  const [lista, setLista] = useState(catalog.sizes);
  const [nuevo, setNuevo] = useState({ id: '', label: '', dims: '', categoria: '' });
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState('todas'); // ver los tamaños de una categoría

  // Edición por id (no por índice) para que el filtro por categoría no desajuste.
  function setById(id, field, value) {
    setLista((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  // Un tamaño sin categoría ('') aplica a TODAS (ej. "Tamaño único"). Con
  // categoría, solo aparece al editar productos de esa categoría.
  const mostrados = lista.filter((s) => filtro === 'todas' || (s.categoria || '') === filtro);

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
    const item = { id, label: nuevo.label.trim(), dims: nuevo.dims.trim(), categoria: nuevo.categoria || '' };
    await api('POST', 'size', item);
    setLista((prev) => [...prev, item]);
    setNuevo({ id: '', label: '', dims: '', categoria: '' });
    flash('Tamaño agregado.');
  }

  // Duplica un tamaño con id único, para partir de uno parecido.
  async function duplicar(s) {
    let base = `${s.id}-copia`;
    let id = base;
    let n = 2;
    while (lista.some((x) => x.id === id)) { id = `${base}-${n}`; n += 1; }
    const copia = { ...s, id, label: `${s.label} (copia)` };
    await api('POST', 'size', copia);
    setLista((prev) => [...prev, copia]);
    flash('Tamaño duplicado. Cámbiale el nombre y las medidas.');
  }

  // Reordenar solo tiene sentido viendo TODAS las categorías (si no, los
  // índices del filtro no coinciden con el orden real de la lista completa).
  const orden = useReordenarScopes();
  const arrastrable = filtro === 'todas';
  function moverTamano(desde, hasta) {
    setLista((prev) => {
      const nuevo = [...prev];
      const [movido] = nuevo.splice(desde, 1);
      nuevo.splice(hasta, 0, movido);
      api('POST', 'size', { ids: nuevo.map((x) => x.id) }, '&action=reorder').catch(() => {});
      return nuevo;
    });
  }

  return (
    <div>
      <p className="mb-3 text-xs text-neutral-500">
        Estos son los tamaños que eliges en "Precios por tamaño" al editar un producto. Asigna una
        <strong> categoría</strong> a cada tamaño (Tarimas, Cabeceras, Personalizado…): así al editar
        una tarima solo verás los tamaños de tarima, y al editar una cabecera los de cabecera. Un
        tamaño en «Todas» aparece siempre (ej. «Tamaño único»). Cambiar el nombre o las medidas aquí
        no afecta los precios que ya guardaste.
      </p>

      <div className="mb-3 flex items-center gap-2 text-sm">
        <span className="text-neutral-500">Ver:</span>
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 outline-none focus:border-ink"
        >
          <option value="todas">Todas las categorías</option>
          {catalog.categories.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>

      {arrastrable && mostrados.length > 1 && (
        <p className="mb-2 text-xs text-neutral-400">Arrastra un tamaño (por el ⠿) para reordenarlo.</p>
      )}
      <div className="space-y-2">
        {mostrados.map((s, i) => {
          const { arrastrando, destino } = arrastrable ? orden.estado('tamanos', i) : {};
          return (
          <div
            key={s.id}
            {...(arrastrable ? orden.zoneProps('tamanos', i, moverTamano) : {})}
            className={`flex flex-wrap items-center gap-2 rounded-lg border bg-white p-3 transition ${
              arrastrando ? 'opacity-40' : ''
            } ${destino ? 'ring-2 ring-sky-400' : 'border-neutral-200'}`}
          >
            {arrastrable && (
              <span
                {...orden.handleProps('tamanos', i)}
                className="cursor-move select-none text-neutral-300 hover:text-neutral-500"
                title="Arrastra para reordenar"
              >
                ⠿
              </span>
            )}
            <span className="w-24 shrink-0 font-mono text-xs text-neutral-400">{s.id}</span>
            <input
              value={s.label}
              onChange={(e) => setById(s.id, 'label', e.target.value)}
              placeholder="Nombre visible"
              className="min-w-[8rem] flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
            />
            <input
              value={s.dims}
              onChange={(e) => setById(s.id, 'dims', e.target.value)}
              placeholder="Medidas (ej. 135 x 190 cm)"
              className="min-w-[8rem] flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
            />
            <select
              value={s.categoria || ''}
              onChange={(e) => setById(s.id, 'categoria', e.target.value)}
              title="Categoría en la que aparece este tamaño"
              className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-ink"
            >
              <option value="">Todas</option>
              {catalog.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <button onClick={() => duplicar(s)} className="text-xs text-sky-700 hover:underline">Duplicar</button>
            <button onClick={() => eliminar(s)} className="text-xs text-red-600 hover:underline">Eliminar</button>
          </div>
          );
        })}
        {mostrados.length === 0 && (
          <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-400">
            No hay tamaños en esta categoría. Agrégalos abajo o duplica uno existente.
          </p>
        )}
      </div>

      <button onClick={guardarTodos} disabled={saving} className="mt-4 rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>

      <div className="mt-6 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-neutral-300 p-3">
        <Field small label="ID" value={nuevo.id} onChange={(v) => setNuevo({ ...nuevo, id: v })} placeholder="ej. cal-king" />
        <Field small label="Nombre visible" value={nuevo.label} onChange={(v) => setNuevo({ ...nuevo, label: v })} placeholder="ej. Cal King" />
        <Field small label="Medidas" value={nuevo.dims} onChange={(v) => setNuevo({ ...nuevo, dims: v })} placeholder="ej. 180 x 200 cm" />
        <label className="text-xs">
          <span className="mb-1 block text-neutral-500">Categoría</span>
          <select
            value={nuevo.categoria}
            onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value })}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm outline-none focus:border-ink"
          >
            <option value="">Todas</option>
            {catalog.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>
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
// ============================================================
// PREGUNTAS FRECUENTES (se muestran en la portada)
// ============================================================
function FaqTab({ catalog, api, flash }) {
  const [faq, setFaq] = useState(() => (Array.isArray(catalog.storeConfig.faq) ? catalog.storeConfig.faq : []));
  const [saving, setSaving] = useState(false);

  function setItem(i, campo, valor) {
    setFaq((prev) => prev.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it)));
  }
  function agregar() {
    setFaq((prev) => [...prev, { q: '', a: '' }]);
  }
  function quitar(i) {
    setFaq((prev) => prev.filter((_, idx) => idx !== i));
  }
  // Reordenar (arrastrando o con las flechas) guarda al instante, igual que
  // en el resto del panel — no hace falta tocar "Guardar preguntas" solo para
  // cambiar el orden.
  function moverFaq(desde, hasta) {
    setFaq((prev) => {
      const nuevo = [...prev];
      const [movida] = nuevo.splice(desde, 1);
      nuevo.splice(hasta, 0, movida);
      api('POST', 'config', { faq: nuevo }).catch(() => {});
      return nuevo;
    });
  }
  function mover(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= faq.length) return;
    moverFaq(i, j);
  }
  const orden = useReordenarScopes();
  async function guardar() {
    setSaving(true);
    try {
      // Descarta preguntas vacías al guardar.
      const limpio = faq.map((it) => ({ q: (it.q || '').trim(), a: (it.a || '').trim() })).filter((it) => it.q && it.a);
      await api('POST', 'config', { faq: limpio });
      setFaq(limpio);
      flash('Preguntas frecuentes guardadas.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="mb-3 text-xs text-neutral-500">
        Se muestran en la portada, al final. El cliente toca una pregunta y se despliega la
        respuesta. Deja la lista vacía si no quieres mostrarlas.
      </p>
      <div className="space-y-3">
        {faq.map((it, i) => {
          const { arrastrando, destino } = orden.estado('faq', i);
          return (
          <div
            key={i}
            {...orden.zoneProps('faq', i, moverFaq)}
            className={`rounded-lg border bg-white p-3 transition ${arrastrando ? 'opacity-40' : ''} ${
              destino ? 'ring-2 ring-sky-400' : 'border-neutral-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                {...orden.handleProps('faq', i)}
                className="cursor-move select-none px-0.5 text-neutral-300 hover:text-neutral-500"
                title="Arrastra para reordenar"
              >
                ⠿
              </span>
              <span className="w-4 shrink-0 text-center text-[11px] font-medium text-neutral-400">{i + 1}</span>
              <input
                value={it.q}
                onChange={(e) => setItem(i, 'q', e.target.value)}
                placeholder="Pregunta (ej. ¿Cuánto demora la entrega?)"
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium outline-none focus:border-ink"
              />
              <button onClick={() => mover(i, -1)} disabled={i === 0} className="text-xs text-neutral-400 disabled:opacity-30" title="Subir">▲</button>
              <button onClick={() => mover(i, 1)} disabled={i === faq.length - 1} className="text-xs text-neutral-400 disabled:opacity-30" title="Bajar">▼</button>
              <button onClick={() => quitar(i)} className="text-xs text-red-600" title="Eliminar">✕</button>
            </div>
            <textarea
              value={it.a}
              onChange={(e) => setItem(i, 'a', e.target.value)}
              placeholder="Respuesta"
              rows={2}
              className="mt-2 w-full resize-none rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
            />
          </div>
          );
        })}
      </div>
      <button onClick={agregar} className="mt-3 text-xs text-sky-700 hover:underline">+ Agregar pregunta</button>
      <div className="mt-4">
        <button onClick={guardar} disabled={saving} className="rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
          {saving ? 'Guardando...' : 'Guardar preguntas'}
        </button>
      </div>
    </div>
  );
}

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
        <Field label="Tu correo (aviso de pedido nuevo)" value={cfg.ownerEmail ?? ''} onChange={(v) => set('ownerEmail', v)} placeholder="tucorreo@gmail.com" />
        <Field label="Número de Yape/Plin (como se muestra)" value={cfg.yape} onChange={(v) => set('yape', v)} placeholder="987 654 321" />
        <Field label="Titular de Yape/Plin" value={cfg.yapeTitular} onChange={(v) => set('yapeTitular', v)} />
        <Field label="Tiempo de fabricación/entrega" value={cfg.leadTime} onChange={(v) => set('leadTime', v)} placeholder="3 a 4 días hábiles" />
        <Field
          label="Días mínimos para entrega"
          value={cfg.deliveryMinDays}
          onChange={(v) => set('deliveryMinDays', Number(v) || 0)}
          type="number"
        />
        <Field
          label="Cuotas a mostrar (0 = no mostrar)"
          value={cfg.cuotasNumero ?? 0}
          onChange={(v) => set('cuotasNumero', Math.max(Number(v) || 0, 0))}
          type="number"
        />
        <Field
          label="Texto junto a las cuotas"
          value={cfg.cuotasTexto ?? ''}
          onChange={(v) => set('cuotasTexto', v)}
          placeholder="sin intereses con tu tarjeta"
        />
      </div>
      <p className="mt-1 text-xs text-neutral-400">
        Las cuotas son solo informativas para animar la compra («o 3 cuotas de S/ X»); no cobran en
        cuotas de verdad. Ponlo en 0 si no quieres mostrarlo.
      </p>

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

      <div className="mt-5 rounded-lg bg-neutral-50 p-3">
        <p className="mb-1 text-sm font-medium text-neutral-700">Aviso de color en la página del producto</p>
        <p className="mb-2 text-xs text-neutral-500">
          Aparece en letra pequeña debajo del selector de color. Sirve para avisar que el tono
          puede variar. Déjalo vacío para no mostrar nada.
        </p>
        <textarea
          value={cfg.avisoColor ?? ''}
          onChange={(e) => set('avisoColor', e.target.value)}
          rows={2}
          placeholder="El color de la foto es referencial. El tono real puede variar según tu pantalla..."
          className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
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
