// Editar la página de servicios SOBRE la propia página.
//
// El dueño pidió poder cambiar las cosas viendo exactamente lo que ve el
// cliente. Hasta ahora editaba en un formulario del panel y luego iba a mirar
// cómo quedaba: dos pantallas, y nunca la certeza de que eran lo mismo.
//
// Aquí la página es una sola. Si quien la abre tiene abierta la sesión del
// panel (la clave vive en la memoria de la pestaña, ver panel/sesion.js),
// aparece el modo edición: los textos se tocan y se escriben ahí mismo, con su
// letra y su tamaño de verdad, y cada tarjeta trae sus botones.
//
// Un cliente nunca ve nada de esto: sin la clave, `useEdicionDeServicios()`
// devuelve null y la página se pinta como siempre. Y aunque alguien forzara el
// modo edición en su navegador, guardar exige la clave en el servidor.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCatalog } from '../../context/CatalogContext.jsx';
import { leerClaveGuardada } from '../panel/sesion.js';

const EdicionContext = createContext(null);
export const ProveedorDeEdicion = EdicionContext.Provider;
export const useEdicion = () => useContext(EdicionContext);

export function useEdicionDeServicios() {
  const catalog = useCatalog();
  const [clave] = useState(leerClaveGuardada);
  const [parametros] = useSearchParams();
  // Desde el panel se llega con "?editar=1" y se entra directo a editar.
  const [activa, setActiva] = useState(() => Boolean(clave) && parametros.get('editar') === '1');
  const [estado, setEstado] = useState({ tipo: '', texto: '' });
  const [modal, setModal] = useState(null);
  // La tienda pública recibe a los aliados sin sus datos privados, y del que
  // no se nombra, solo el código. Los formularios necesitan verlos completos
  // (para elegir al profesional a cargo), así que el dueño los pide con su clave.
  const [aliados, setAliados] = useState(null);
  useEffect(() => {
    if (!clave) return undefined;
    let cancelado = false;
    fetch('/api/catalog', { headers: { Authorization: `Bearer ${clave}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelado && Array.isArray(d?.partners)) setAliados(d.partners);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [clave]);

  const { refetch } = catalog;
  const api = useCallback(
    async (method, resource, body, extra = '') => {
      setEstado({ tipo: 'guardando', texto: 'Guardando…' });
      try {
        const res = await fetch(`/api/catalog?resource=${resource}${extra}`, {
          method,
          headers: { Authorization: `Bearer ${clave}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
          body: body ? JSON.stringify(body) : undefined,
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          throw new Error('Tu sesión del panel caducó. Entra otra vez al panel y vuelve a esta página.');
        }
        if (!res.ok) throw new Error(data?.error || 'No se pudo guardar.');
        await refetch();
        setEstado({ tipo: 'ok', texto: '✓ Guardado' });
        return data;
      } catch (err) {
        setEstado({ tipo: 'error', texto: err.message });
        throw err;
      }
    },
    [clave, refetch]
  );

  if (!clave) return null;

  // Los errores ya se enseñan en la franja de arriba; aquí solo se evita que
  // un guardado fallido deje una promesa rechazada sin atender.
  const sinRuido = (promesa) => promesa.catch(() => {});

  // Intercambia un elemento con su vecino dentro de la lista COMPLETA. Los
  // planes se ven agrupados por área, así que "subir" es cambiarse con el
  // anterior de su misma área, que en la lista entera puede no ser el de al lado.
  function intercambiar(recurso, lista, id, vecinoId) {
    const ids = lista.map((x) => x.id);
    const a = ids.indexOf(id);
    const b = ids.indexOf(vecinoId);
    if (a < 0 || b < 0) return;
    [ids[a], ids[b]] = [ids[b], ids[a]];
    sinRuido(api('POST', recurso, { ids }, '&action=reorder'));
  }

  return {
    clave,
    // El catálogo tal como lo necesitan los formularios.
    catalogo: { ...catalog, partners: aliados || catalog.partners },
    activa,
    setActiva,
    estado,
    modal,
    abrir: setModal,
    cerrar: () => setModal(null),
    api,
    // Los textos de la página se guardan juntos: se parte de lo que ya había
    // para no borrar los campos que no se están tocando.
    guardarTextos: (cambios) =>
      sinRuido(api('POST', 'config', { servicios: { ...(catalog.storeConfig.servicios || {}), ...cambios } })),
    guardarPlan: (plan) => sinRuido(api('POST', 'service', plan)),
    guardarProyecto: (proyecto) => sinRuido(api('POST', 'project', proyecto)),
    borrar(recurso, id, nombre) {
      if (!window.confirm(`¿Eliminar «${nombre}»? Dejará de verse en la página.`)) return;
      sinRuido(api('DELETE', recurso, null, `&id=${encodeURIComponent(id)}`));
    },
    moverPlan: (id, vecinoId) => intercambiar('service', catalog.services, id, vecinoId),
    moverProyecto: (id, vecinoId) => intercambiar('project', catalog.projects, id, vecinoId),
  };
}

// Un texto de la página. Para el cliente es el texto de siempre; en modo
// edición se escribe encima, con la misma letra y el mismo sitio.
export function Texto({
  as: Tag = 'p',
  valor,
  onGuardar,
  className = '',
  placeholder = 'Escribe aquí…',
  multilinea = false,
  max = 600,
  // Un hueco para AÑADIR algo (otra línea, otro paso): al guardar se queda
  // vacío y listo para el siguiente, porque lo escrito pasa a la lista.
  nuevo = false,
}) {
  const ed = useEdicion();
  const [texto, setTexto] = useState(valor || '');
  const enfocado = useRef(false);
  const cancelado = useRef(false);

  // Lo guardado manda… salvo mientras se está escribiendo: si el catálogo se
  // refresca en ese momento, no se le borra de las manos lo que teclea.
  useEffect(() => {
    if (!enfocado.current) setTexto(valor || '');
  }, [valor]);

  if (!ed?.activa || !onGuardar) return valor ? <Tag className={className}>{valor}</Tag> : null;

  function terminar() {
    enfocado.current = false;
    if (cancelado.current) {
      cancelado.current = false;
      setTexto(valor || '');
      return;
    }
    const limpio = multilinea ? texto.trim() : texto.replace(/\s+/g, ' ').trim();
    if (limpio !== (valor || '')) onGuardar(limpio);
    if (nuevo || limpio === (valor || '')) setTexto(valor || '');
  }

  return (
    <Tag className={className}>
      <span className="texto-editable" data-valor={texto || placeholder}>
        <textarea
          rows={1}
          value={texto}
          maxLength={max}
          placeholder={placeholder}
          aria-label={placeholder}
          onFocus={() => {
            enfocado.current = true;
          }}
          onChange={(e) => setTexto(multilinea ? e.target.value : e.target.value.replace(/\n/g, ' '))}
          onBlur={terminar}
          onKeyDown={(e) => {
            // Enter confirma en los textos de una línea; Esc deshace.
            if (e.key === 'Enter' && !multilinea) {
              e.preventDefault();
              e.currentTarget.blur();
            }
            if (e.key === 'Escape') {
              cancelado.current = true;
              e.currentTarget.blur();
            }
          }}
        />
      </span>
    </Tag>
  );
}

// Los botones de una tarjeta en modo edición.
export function BotonesDeTarjeta({ oculto, onEditar, onOcultar, onSubir, onBajar, onBorrar, oscuro = false }) {
  const base = `rounded-md px-2 py-1 text-xs font-medium transition disabled:opacity-30 ${
    oscuro ? 'bg-black/70 text-white hover:bg-black' : 'bg-white text-neutral-800 hover:bg-neutral-100'
  }`;
  return (
    <div
      className={`flex flex-wrap items-center gap-1 rounded-lg border p-1 shadow-sm ${
        oscuro ? 'border-white/20 bg-black/40 backdrop-blur' : 'border-sky-200 bg-sky-50'
      }`}
    >
      <button type="button" onClick={onEditar} className={base}>
        ✎ Editar todo
      </button>
      <button type="button" onClick={onOcultar} className={base} title={oculto ? 'Los clientes no lo ven' : 'Los clientes lo ven'}>
        {oculto ? '🚫 Oculto' : '👁 Publicado'}
      </button>
      <button type="button" onClick={onSubir} disabled={!onSubir} aria-label="Mover antes" className={base}>
        ▲
      </button>
      <button type="button" onClick={onBajar} disabled={!onBajar} aria-label="Mover después" className={base}>
        ▼
      </button>
      <button type="button" onClick={onBorrar} className={`${base} ${oscuro ? '' : 'text-red-600'}`} aria-label="Eliminar">
        🗑
      </button>
    </div>
  );
}

// El hueco punteado de "agregar otro", con la misma forma que las tarjetas.
export function TarjetaAgregar({ texto, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[9rem] w-full items-center justify-center rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/50 p-6 text-sm font-semibold text-sky-800 transition hover:border-sky-500 hover:bg-sky-50 ${className}`}
    >
      {texto}
    </button>
  );
}

// La franja que le dice al dueño que está editando, y cómo va el guardado.
export function BarraDeEdicion({ ed }) {
  if (!ed.activa) {
    return (
      <div className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full border border-neutral-200 bg-white p-1.5 pl-4 text-sm shadow-lg">
        <span className="text-neutral-500">Sesión del panel abierta</span>
        <button
          type="button"
          onClick={() => ed.setActiva(true)}
          className="rounded-full bg-neutral-900 px-4 py-2 font-semibold text-white transition hover:bg-black"
        >
          ✏️ Editar esta página
        </button>
      </div>
    );
  }
  const color =
    ed.estado.tipo === 'error' ? 'text-red-200' : ed.estado.tipo === 'ok' ? 'text-green-200' : 'text-white/80';
  return (
    <div className="sticky top-[68px] z-10 bg-sky-700 text-white shadow">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-2.5 text-sm sm:px-6">
        <p>
          <strong>✏️ Estás editando.</strong> Toca cualquier texto con borde punteado y escribe; cada tarjeta trae sus
          botones. Se guarda solo al salir del texto.
        </p>
        <div className="flex items-center gap-3">
          {ed.estado.texto && (
            <span role="status" className={`text-xs font-medium ${color}`}>
              {ed.estado.texto}
            </span>
          )}
          <button
            type="button"
            onClick={() => ed.setActiva(false)}
            className="rounded-lg bg-white px-4 py-1.5 font-semibold text-sky-800 transition hover:bg-sky-50"
          >
            ✓ Ver como cliente
          </button>
          <Link to="/pedidos" className="rounded-lg border border-white/40 px-3 py-1.5 transition hover:bg-white/10">
            Panel
          </Link>
        </div>
      </div>
    </div>
  );
}
