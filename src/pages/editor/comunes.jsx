// Piezas que usan todas las pestañas del editor.
//
// El botón de subir fotos, el acordeón de secciones, el campo de texto
// y los dos ganchos para reordenar listas arrastrando.
//
// Salió de CatalogEditor.jsx, que tenía 3.360 líneas — el 16% de todo el
// código del proyecto en un solo archivo. Cada cambio pequeño obligaba a
// abrirlo entero.

import { useEffect, useRef, useState } from 'react';
import { comprimirImagen, formatearPeso } from '../../lib/comprimirImagen.js';

export function UploadButton({ adminKey, onUploaded, label = '📷 Subir', multiple = false, onBatch }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progreso, setProgreso] = useState(''); // "2 / 5" al subir varias
  const [ahorro, setAhorro] = useState(null); // cuánto se redujo la última subida
  const ahorroRef = useRef({ original: 0, final: 0 });
  // Vista previa del último archivo elegido: miniatura + nombre original, para
  // que el dueño confirme QUÉ está subiendo antes de que termine.
  const [preview, setPreview] = useState(null); // { url, name }

  // Libera la miniatura local (objeto en memoria) al cambiarla o desmontar.
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview]);

  async function subirUno(file) {
    // Se encoge y comprime ANTES de subir. Una foto de celular pasa de ~4 MB a
    // ~200 KB sin verse peor. Antes se subían tal cual y cada visitante de la
    // tienda descargaba veinte veces más datos de los necesarios: así se
    // agotaron los 10 GB gratuitos de Vercel Blob.
    const listo = await comprimirImagen(file);
    ahorroRef.current.original += file.size;
    ahorroRef.current.final += listo.size;

    const res = await fetch(
      `/api/upload?filename=${encodeURIComponent(listo.name)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream', Authorization: `Bearer ${adminKey}` },
        body: listo,
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
    // El tope sube a 12 MB porque ya no se envía el original: se comprime aquí
    // y lo que viaja al servidor son unos cientos de KB. Antes había que
    // rechazar cualquier foto de celular moderna.
    const grande = files.find((f) => f.size > 12 * 1024 * 1024);
    if (grande) {
      alert(`"${grande.name}" pesa más de 12 MB, demasiado incluso para comprimirla. Redúcela e intenta de nuevo.`);
      return;
    }
    ahorroRef.current = { original: 0, final: 0 };
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
      const { original, final } = ahorroRef.current;
      if (original > final) setAhorro({ original, final });
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
      {ahorro && !busy && (
        <span className="text-[11px] text-green-700" title="Se comprimió en tu navegador antes de subirla">
          ✓ {formatearPeso(ahorro.original)} → {formatearPeso(ahorro.final)}
        </span>
      )}
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

export function Seccion({ titulo, resumen, defaultOpen = false, children }) {
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

export function useReordenar(ids, guardar) {
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

export function useReordenarScopes() {
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

export function Field({ label, value, onChange, placeholder, type = 'text', disabled = false, small = false }) {
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

// Quitar una foto del almacén, no solo del campo.
//
// POR QUÉ: borrar la dirección del formulario dejaba la foto publicada en
// internet para siempre — accesible para cualquiera que tuviera el enlace, y
// gastando cuota del plan gratuito. Eso es justo lo que agotó el almacén en
// agosto y dejó las subidas bloqueadas un mes.
//
// Solo aparece en las fotos que viven en NUESTRO almacén. Las del repositorio
// no se pueden borrar desde aquí (hay que quitarlas del proyecto) y las de
// otros sitios no son nuestras, así que en esos casos no se enseña nada en vez
// de ofrecer un botón que no haría lo que promete.
export function BorrarFoto({ url, adminKey, onBorrada }) {
  const [borrando, setBorrando] = useState(false);

  const esDelAlmacen = (() => {
    try {
      const u = new URL(url);
      return u.hostname.endsWith('.public.blob.vercel-storage.com') && u.pathname.startsWith('/productos/');
    } catch {
      return false;
    }
  })();

  if (!esDelAlmacen) return null;

  async function borrar() {
    if (!window.confirm('¿Borrar esta foto del almacén?\n\nDeja de estar publicada en internet y no se puede deshacer.')) return;
    setBorrando(true);
    try {
      const res = await fetch(`/api/upload?url=${encodeURIComponent(url)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo borrar.');
      onBorrada?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setBorrando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={borrar}
      disabled={borrando}
      title="Borrar del almacén"
      className="shrink-0 rounded-lg border border-neutral-300 px-2.5 py-2 text-sm text-neutral-500 transition hover:border-red-400 hover:text-red-600 disabled:opacity-50"
    >
      {borrando ? '…' : '🗑'}
    </button>
  );
}
