// Categorías, colores y tamaños: los tres cimientos del catálogo.
//
// Un producto no existe sin ellos, y las tres pantallas funcionan igual:
// una lista que se reordena arrastrando y un formulario corto.
//
// Salió de CatalogEditor.jsx, que tenía 3.360 líneas — el 16% de todo el
// código del proyecto en un solo archivo. Cada cambio pequeño obligaba a
// abrirlo entero.

import { useEffect, useRef, useState } from 'react';
import { PALETAS } from '../../data/paletas.js';
import { Field, Seccion, UploadButton, useReordenar, useReordenarScopes } from './comunes.jsx';

export function CategoriasTab({ catalog, api, flash }) {
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
export function ColoresTab({ catalog, api, flash, adminKey }) {
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
export function TamanosTab({ catalog, api, flash }) {
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
