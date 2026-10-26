// Portada y vitrina animada: los textos y las fotos que ve quien llega.
//
// Dos pestañas que trabajan sobre lo mismo (la primera pantalla de la
// tienda), así que viajan juntas.
//
// Salió de CatalogEditor.jsx, que tenía 3.360 líneas — el 16% de todo el
// código del proyecto en un solo archivo. Cada cambio pequeño obligaba a
// abrirlo entero.

import { useEffect, useRef, useState } from 'react';
import { Field, Seccion, UploadButton, useReordenar, useReordenarScopes } from './comunes.jsx';

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

export function PortadaTab({ catalog, api, flash }) {
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
export function VitrinaTab({ catalog, api, flash, adminKey }) {
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


