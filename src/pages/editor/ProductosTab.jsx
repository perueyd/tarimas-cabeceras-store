// Productos: la lista y el formulario de cada mueble.
//
// La pieza más grande del editor con diferencia: el formulario de un
// producto tiene medidas, precios por medida, colores por medida, fotos,
// galería, opciones y zonas de color.
//
// Salió de CatalogEditor.jsx, que tenía 3.360 líneas — el 16% de todo el
// código del proyecto en un solo archivo. Cada cambio pequeño obligaba a
// abrirlo entero.

import { useEffect, useMemo, useRef, useState } from 'react';
import EditorZonasColor from '../../components/EditorZonasColor.jsx';
import { Field, Seccion, UploadButton, useReordenar, useReordenarScopes } from './comunes.jsx';
import { separarIGV } from '../../lib/igv.js';

export function ProductosTab({ catalog, api, flash, adminKey }) {
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
    // Se normaliza antes de convertir: si llega una ficha guardada a mano en
    // otro formato, aquí queda arreglada en vez de guardarse peor todavía.
    const specsObj = {};
    for (const { label, value } of normalizarSpecsForm(producto.specs)) {
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

// La ficha técnica se GUARDA como objeto { Etiqueta: valor } pero el
// formulario trabaja con una lista [{ label, value }]. Como además hubo
// productos guardados a mano como lista, hay que saber leer las tres formas:
//   { Material: 'Madera' } · [{label,value}] · { 0:{label,value}, 1:{...} }
// Sin esto, `p.specs.map` revienta y el panel entero se queda en blanco al
// abrir ese producto.
// Al escribir un costo, enseña en el acto qué margen deja ese precio — ya
// descontado el IGV, que nunca fue del negocio. Sin esto, el dueño teclea un
// número y no sabe si está ganando o perdiendo.
function costoAviso(precio, costo) {
  if (costo == null || costo === '' || !precio) return null;
  // Se usa la MISMA cuenta que la pestaña de impuestos. Antes aquí había un
  // "/ 1.18" escrito a mano: si la tasa cambiara, el panel enseñaría un margen
  // y la declaración otro, y nadie sabría cuál creer.
  const { base } = separarIGV(precio);
  const margen = base - Number(costo);
  const pct = Math.round((margen / base) * 1000) / 10;
  const malo = margen <= 0;
  return (
    <span className={`mt-1 block text-[11px] ${malo ? 'text-red-600' : 'text-neutral-500'}`}>
      {malo ? '⚠ Pierdes ' : 'Margen '}
      S/ {Math.abs(Math.round(margen * 100) / 100)} ({pct}%) · sin IGV
    </span>
  );
}

function normalizarSpecsForm(specs) {
  const bruto = Array.isArray(specs) ? specs : specs && typeof specs === 'object' ? Object.entries(specs) : [];
  return bruto
    .map((item) => {
      if (!Array.isArray(item)) return { label: item?.label ?? '', value: item?.value ?? '' };
      const [clave, valor] = item;
      if (valor && typeof valor === 'object') return { label: valor.label ?? '', value: valor.value ?? '' };
      return { label: clave, value: valor ?? '' };
    })
    .map((f) => ({ label: String(f.label ?? ''), value: String(f.value ?? '') }));
}

function ProductForm({ catalog, initial, onCancel, onSave, adminKey, api }) {
  const [p, setP] = useState(() => ({ ...initial, specs: normalizarSpecsForm(initial?.specs) }));
  const [saving, setSaving] = useState(false);
  // Foto cuya "zona que cambia de color" se está editando (null = cerrado).
  const [zonaEditando, setZonaEditando] = useState(null);
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
  // Lo que al dueño le cuesta FABRICAR esta medida (tela, madera, mano de
  // obra). No se le muestra nunca al cliente: solo alimenta el margen de la
  // pestaña "Impuestos y margen".
  function setCosto(sizeId, value) {
    setP((prev) => {
      const c = { ...(prev.costoPorMedida || {}) };
      if (value === '') delete c[sizeId];
      else c[sizeId] = Number(value);
      return { ...prev, costoPorMedida: c };
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
  // Lista aparte de colores para la SEGUNDA tela (el detalle). Vacía = usa los
  // mismos de la tela principal.
  function toggleColor2(colorId) {
    setP((prev) => {
      const actual = prev.availableColors2 || [];
      return {
        ...prev,
        availableColors2: actual.includes(colorId)
          ? actual.filter((c) => c !== colorId)
          : [...actual, colorId],
      };
    });
  }
  // Qué parte de CADA foto cambia de color (corrección manual del dueño).
  // Se guarda por dirección de foto: así la principal, cada foto de la galería
  // y las fotos por tamaño tienen su propia selección, y si se cambia la foto
  // la corrección vieja simplemente deja de aplicarse (no queda pegada a otra).
  function setZonasFoto(url, zonas) {
    setP((prev) => {
      const zf = { ...(prev.zonasFoto || {}) };
      if (!zonas || !zonas.length) delete zf[url]; // volver a la detección automática
      else zf[url] = zonas;
      return { ...prev, zonasFoto: zf };
    });
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
    // Los colores solo hacen falta si la foto se repinta. Un colchón (o
    // cualquier producto con foto real) se vende tal cual y no tiene colores
    // que elegir: antes esta validación impedía guardarlo desde el panel.
    if (p.tintable && (p.availableColors || []).length === 0) {
      alert('Marca al menos un color en "Colores disponibles", o desmarca "Repintar esta foto" si el producto se vende tal cual.');
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

        {/* Corregir a mano qué parte se repinta. La web lo adivina sola mirando
            el brillo de la foto y acierta casi siempre, pero cuando se equivoca
            (pinta las patas de madera, parte una tela en dos) antes no había
            forma de arreglarlo: solo apagar el repintado entero. */}
        {p.tintable && p.baseImage && (
          <div className="mt-2 pl-6">
            <button
              type="button"
              onClick={() => setZonaEditando(p.baseImage)}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
            >
              🖌️ Elegir qué parte cambia de color
            </button>
            <span className="ml-2 text-xs text-neutral-500">
              {p.zonasFoto?.[p.baseImage]
                ? `✓ Corregido a mano (${p.zonasFoto[p.baseImage].length === 2 ? 'dos telas' : 'una tela'})`
                : 'Ahora lo decide la web sola'}
            </span>

            {/* La web separa las dos telas por su BRILLO, no por cuál es más
                importante. En un modelo con el cuerpo claro y el diseño oscuro
                encima, lo que el dueño llama "color principal" terminaba
                asignado al detalle. Esta casilla lo da vuelta. */}
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(p.invertirTelas)}
                onChange={(e) => set('invertirTelas', e.target.checked)}
              />
              Intercambiar las dos telas (el «color principal» está al revés)
            </label>
            <p className="mt-1 pl-6 text-xs text-neutral-500">
              Solo para muebles de dos telas. Márcalo si al elegir el color principal se pinta el
              detalle en vez del cuerpo del mueble.
            </p>
          </div>
        )}
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
                  {/* Si esta foto también se repinta, también se puede corregir
                      qué parte suya cambia de color. */}
                  {f.tintable && (
                    <button
                      type="button"
                      onClick={() => setZonaEditando(f.url)}
                      className={`absolute bottom-1 right-1 rounded-full px-1 text-[10px] ${
                        p.zonasFoto?.[f.url] ? 'bg-emerald-600 text-white' : 'bg-white/90 text-neutral-500'
                      }`}
                      title="Elegir qué parte de esta foto cambia de color"
                    >
                      🖌️
                    </button>
                  )}
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
                  <span className="mb-1 block text-neutral-500">
                    Lo que te cuesta hacerla (opcional)
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={p.costoPorMedida?.[s.id] ?? ''}
                    onChange={(e) => setCosto(s.id, e.target.value)}
                    placeholder="Solo tú lo ves"
                    className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 outline-none focus:border-ink"
                  />
                  {costoAviso(regular, p.costoPorMedida?.[s.id])}
                </label>
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
        <p className="mt-2 text-xs text-neutral-500">
          Estos son los círculos de color que el cliente ve en la página del producto. Si no marcas
          ninguno, el producto sale sin selector de color.
        </p>
      </div>

      {/* Colores de la segunda tela (opcional). Solo tiene sentido en muebles
          con dos telas: por defecto el detalle se ofrece en los mismos colores
          que el cuerpo, pero muchas veces viene en menos. */}
      <div className="mt-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={(p.availableColors2 || []).length > 0}
            onChange={(e) => set('availableColors2', e.target.checked ? [...p.availableColors] : [])}
          />
          El <strong>detalle</strong> (segunda tela) se ofrece en otros colores
        </label>
        <p className="mt-1 pl-6 text-xs text-neutral-500">
          Solo para muebles con dos telas. Sin marcar, el detalle usa los mismos colores de arriba.
        </p>
        {(p.availableColors2 || []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 pl-6">
            {catalog.colors.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleColor2(c.id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                  (p.availableColors2 || []).includes(c.id)
                    ? 'border-ink bg-neutral-100 font-medium'
                    : 'border-neutral-200 text-neutral-500'
                }`}
              >
                <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />
                {c.label}
              </button>
            ))}
          </div>
        )}
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
                  {/* Estas fotos también se repintan, así que también hay que
                      poder corregir qué parte cambia de color. Sin este botón
                      solo se podía corregir la foto principal y la galería: si
                      cambiabas la foto de un tamaño, esa se quedaba con lo que
                      adivinara la web y no había forma de arreglarla. */}
                  {p.tintable && p.sizeImages?.[s.id] && (
                    <button
                      type="button"
                      onClick={() => setZonaEditando(p.sizeImages[s.id])}
                      title={
                        p.zonasFoto?.[p.sizeImages[s.id]]
                          ? 'Corregido a mano — toca para cambiarlo'
                          : 'Elegir qué parte de esta foto cambia de color'
                      }
                      className={`shrink-0 rounded-lg border px-2 py-1.5 text-xs ${
                        p.zonasFoto?.[p.sizeImages[s.id]]
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-neutral-300 hover:bg-white'
                      }`}
                    >
                      🖌️
                    </button>
                  )}
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

      {/* Editor de "qué parte cambia de color" (varita, pincel y borrador). */}
      <EditorZonasColor
        abierto={Boolean(zonaEditando)}
        foto={zonaEditando}
        zonas={zonaEditando ? p.zonasFoto?.[zonaEditando] : null}
        colores={catalog.colors.filter((c) => p.availableColors.includes(c.id))}
        onGuardar={(zonas) => {
          setZonasFoto(zonaEditando, zonas);
          setZonaEditando(null);
        }}
        onCerrar={() => setZonaEditando(null)}
      />
    </div>
  );
}

// ============================================================
// CATEGORÍAS
// ============================================================
