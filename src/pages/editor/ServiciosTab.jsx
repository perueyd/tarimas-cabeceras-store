// Servicios y portafolio: lo que el negocio hace además de vender muebles.
//
// Dos pestañas del editor viven aquí porque comparten casi todo (el campo de
// fotos, el desplegable de áreas, la forma de ordenar):
//
//   · ServiciosTab  -> los planes y los textos de la página /servicios.
//   · PortafolioTab -> los proyectos realizados, con sus fotos.
//
// REGLA DE ESTA PANTALLA: todo lo que aquí se escribe sale publicado tal cual.
// Por eso no trae planes ni proyectos de ejemplo — lo que se muestra al
// cliente tiene que ser trabajo real (hubo testimonios de ejemplo publicados
// como reales y tuvieron que quitarse).

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BorrarFoto, Field, Seccion, UploadButton } from './comunes.jsx';
import {
  TEXTOS_SERVICIOS,
  aIdentificador,
  areaRegulada,
  cobroDePlan,
  fotoValida,
  hayServicios,
  precioDePlanValido,
  textosDeServicios,
} from '../../lib/servicios.js';

// Áreas que salen de sugerencia al escribir. Son las que cubre el objeto
// social de la empresa (escritura de constitución, artículo 2). Solo ayudan a
// teclear: el cliente ve únicamente las áreas que tengan algo publicado.
const AREAS_SUGERIDAS = [
  'Diseño de interiores',
  'Tapicería y restauración',
  'Reparación y mantenimiento',
  'Instalación',
  'Transporte de carga',
  'Asesoría de tiendas virtuales',
  // Estas dos no figuran en el objeto social y son profesiones reguladas: se
  // ofrecen a través de un profesional aliado (pestaña Aliados).
  'Arquitectura',
  'Ingeniería civil',
];

const CLASE_CAMPO =
  'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink';

function areasConocidas(catalog) {
  const usadas = [...(catalog.services || []), ...(catalog.projects || [])].map((x) => x.area).filter(Boolean);
  return [...new Set([...usadas, ...AREAS_SUGERIDAS])];
}

function CampoArea({ value, onChange, catalog }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium text-neutral-700">Área</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list="areas-de-servicio"
        placeholder="ej. Diseño de interiores"
        className={CLASE_CAMPO}
      />
      <datalist id="areas-de-servicio">
        {areasConocidas(catalog).map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      <span className="mt-1 block text-xs text-neutral-500">
        Agrupa los planes y sirve de filtro en el portafolio. Escribe la misma área igual en todos.
      </span>
      {/transport/i.test(value) && (
        <span className="mt-2 block rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
          El transporte de carga está en el objeto social de la empresa. Si vas a llevar mercadería de terceros,
          pregunta a tu contador por el permiso del MTC y por la detracción que se aplica a este servicio.
        </span>
      )}
    </label>
  );
}

// Quién ejecuta el plan o hizo el proyecto, si es un profesional de fuera.
function CampoAliado({ value, onChange, catalog, area }) {
  const aliados = catalog.partners || [];
  const elegido = aliados.find((a) => a.id === value);
  // Arquitectura e ingeniería son profesiones reguladas (Leyes 28966 y 28858)
  // y no figuran en el objeto social de la empresa. No se bloquea, pero el
  // aviso sale hasta que haya un profesional con colegiatura a cargo.
  const faltaColegiado = areaRegulada(area) && !(elegido && elegido.colegiatura);
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-neutral-700">Profesional a cargo (opcional)</span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)} className={CLASE_CAMPO}>
        <option value="">— Lo hace mi empresa —</option>
        {aliados.map((a) => (
          <option key={a.id} value={a.id}>
            {[a.titulo, a.nombre].filter(Boolean).join(' ') || a.id}
            {a.colegiatura ? ` · ${a.colegiatura}` : ''}
            {a.activo === false ? ' (inactivo)' : ''}
          </option>
        ))}
        {value && !elegido && <option value={value}>{value} (ya no existe)</option>}
      </select>
      <span className="mt-1 block text-xs text-neutral-500">
        Los profesionales externos se dan de alta en la pestaña Aliados.
      </span>
      {faltaColegiado && (
        <span className="mt-2 block rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          ⚠️ En arquitectura e ingeniería, los planos y expedientes los firma un profesional colegiado y habilitado.
          Asigna aquí al arquitecto o ingeniero que lo hará, con su número de colegiatura. Consulta además con tu
          notario si conviene añadir esta actividad al objeto social de la empresa.
        </span>
      )}
    </label>
  );
}

function AreaTexto({ label, value, onChange, placeholder, filas = 3, ayuda }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-neutral-700">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={filas}
        className={CLASE_CAMPO}
      />
      {ayuda && <span className="mt-1 block text-xs text-neutral-500">{ayuda}</span>}
    </label>
  );
}

// Una foto: subirla desde el equipo o pegar su dirección, con la vista previa
// al lado para confirmar que es la correcta antes de guardar.
export function CampoFoto({ label, value, onChange, adminKey, ayuda }) {
  return (
    <div className="text-sm">
      <span className="mb-1 block font-medium text-neutral-700">{label}</span>
      <div className="flex flex-wrap items-center gap-3">
        {fotoValida(value) ? (
          <img src={value} alt="" className="h-20 w-28 rounded-lg border border-neutral-200 object-cover" />
        ) : (
          <span className="flex h-20 w-28 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-400">
            Sin foto
          </span>
        )}
        <div className="flex min-w-[220px] flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <UploadButton adminKey={adminKey} onUploaded={onChange} label="📷 Subir foto" />
            {value && (
              <>
                <BorrarFoto url={value} adminKey={adminKey} onBorrada={() => onChange('')} />
                <button type="button" onClick={() => onChange('')} className="text-xs text-red-600 hover:underline">
                  Quitar
                </button>
              </>
            )}
          </div>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="o pega la dirección de la foto (https://… o /productos/…)"
            className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-ink"
          />
        </div>
      </div>
      {value && !fotoValida(value) && (
        <span className="mt-1 block text-xs text-red-600">
          Esa dirección no sirve: tiene que empezar por https:// o por / (una foto de tu propia web).
        </span>
      )}
      {ayuda && <span className="mt-1 block text-xs text-neutral-500">{ayuda}</span>}
    </div>
  );
}

// Un identificador nuevo que no choque con los que ya existen.
export function idNuevo(nombre, existentes, respaldo) {
  const base = aIdentificador(nombre) || respaldo;
  let id = base;
  let n = 2;
  while (existentes.includes(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

function BotonesOrden({ indice, total, onMover }) {
  return (
    <span className="flex flex-col">
      <button
        type="button"
        disabled={indice === 0}
        onClick={() => onMover(indice, -1)}
        aria-label="Subir"
        className="px-1 text-xs leading-none text-neutral-400 hover:text-ink disabled:opacity-25"
      >
        ▲
      </button>
      <button
        type="button"
        disabled={indice === total - 1}
        onClick={() => onMover(indice, 1)}
        aria-label="Bajar"
        className="px-1 text-xs leading-none text-neutral-400 hover:text-ink disabled:opacity-25"
      >
        ▼
      </button>
    </span>
  );
}

function AvisoPagina({ catalog }) {
  // La misma pregunta que se hace la tienda para pintar el enlace del menú:
  // si aquí se respondiera por otro camino, el panel podría decir "publicada"
  // con la página vacía.
  const publicada = hayServicios(catalog);
  return (
    <div
      className={`mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-xs ${
        publicada ? 'border-green-200 bg-green-50 text-green-900' : 'border-amber-200 bg-amber-50 text-amber-900'
      }`}
    >
      <span>
        {publicada
          ? '✓ La página de servicios está publicada y aparece en el menú de la tienda.'
          : 'La página de servicios todavía no aparece en la tienda: saldrá sola en cuanto publiques un plan o un proyecto con foto.'}
      </span>
      <span className="flex shrink-0 flex-wrap gap-2">
        {/* En la MISMA pestaña a propósito: la sesión del panel vive en la
            memoria de esta pestaña, y es lo que enciende el modo edición. */}
        <Link
          to="/servicios?editar=1"
          className="rounded-lg bg-ink px-3 py-1.5 font-medium text-white hover:bg-neutral-800"
        >
          ✏️ Editar sobre la página
        </Link>
        <a
          href="/servicios"
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-current px-3 py-1.5 font-medium hover:bg-white/60"
        >
          Ver como cliente ↗
        </a>
      </span>
    </div>
  );
}

// ============================================================
// TEXTOS DE LA PÁGINA
// ============================================================
function TextosDePagina({ catalog, api, flash, adminKey }) {
  const [t, setT] = useState(() => {
    const actuales = textosDeServicios(catalog.storeConfig);
    return { ...actuales, pasos: actuales.pasos.map((p) => ({ titulo: p.titulo || '', texto: p.texto || '' })) };
  });
  const [guardando, setGuardando] = useState(false);
  const poner = (campo) => (valor) => setT((prev) => ({ ...prev, [campo]: valor }));

  function cambiarPaso(i, campo, valor) {
    setT((prev) => ({ ...prev, pasos: prev.pasos.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)) }));
  }
  function moverPaso(i, delta) {
    setT((prev) => {
      const j = i + delta;
      if (j < 0 || j >= prev.pasos.length) return prev;
      const pasos = [...prev.pasos];
      [pasos[i], pasos[j]] = [pasos[j], pasos[i]];
      return { ...prev, pasos };
    });
  }

  async function guardar() {
    setGuardando(true);
    try {
      const servicios = {
        ...t,
        fotoPortada: fotoValida(t.fotoPortada),
        // Un paso sin título ni texto dejaría un recuadro numerado vacío.
        pasos: t.pasos
          .map((p) => ({ titulo: p.titulo.trim(), texto: p.texto.trim() }))
          .filter((p) => p.titulo || p.texto)
          .slice(0, 8),
      };
      await api('POST', 'config', { servicios });
      flash('Textos de la página de servicios guardados.');
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Seccion titulo="Textos y foto de portada de la página" resumen="título, descripción, pasos y botón final">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre en el menú" value={t.menu} onChange={poner('menu')} placeholder={TEXTOS_SERVICIOS.menu} />
        <Field label="Título de la página" value={t.titulo} onChange={poner('titulo')} placeholder={TEXTOS_SERVICIOS.titulo} />
        <div className="sm:col-span-2">
          <AreaTexto
            label="Descripción (debajo del título)"
            value={t.descripcion}
            onChange={poner('descripcion')}
            placeholder="Cuenta en dos o tres líneas qué servicios ofreces y para quién."
            ayuda="Escribe solo lo que de verdad cumples: lo publicado aquí es una promesa al cliente."
          />
        </div>
        <div className="sm:col-span-2">
          <CampoFoto
            label="Foto de portada"
            value={t.fotoPortada}
            onChange={poner('fotoPortada')}
            adminKey={adminKey}
            ayuda="Va de fondo, detrás del título. Si la dejas vacía se usa la primera foto de tu portafolio."
          />
        </div>

        <Field label="Título de los planes" value={t.planesTitulo} onChange={poner('planesTitulo')} placeholder={TEXTOS_SERVICIOS.planesTitulo} />
        <Field label="Texto bajo ese título (opcional)" value={t.planesDescripcion} onChange={poner('planesDescripcion')} />
        <Field label="Título del portafolio" value={t.portafolioTitulo} onChange={poner('portafolioTitulo')} placeholder={TEXTOS_SERVICIOS.portafolioTitulo} />
        <Field label="Texto bajo ese título (opcional)" value={t.portafolioDescripcion} onChange={poner('portafolioDescripcion')} />
      </div>

      <div className="mt-6 rounded-lg border border-neutral-200 p-4">
        <p className="text-sm font-medium text-neutral-700">Pasos de «cómo trabajamos» (opcional)</p>
        <p className="mt-1 text-xs text-neutral-500">
          Por ejemplo: visita, propuesta, fabricación, instalación. Sin pasos, esta parte no se muestra.
        </p>
        <div className="mt-3 max-w-md">
          <Field label="Título de esta parte" value={t.pasosTitulo} onChange={poner('pasosTitulo')} placeholder={TEXTOS_SERVICIOS.pasosTitulo} />
        </div>
        <div className="mt-3 space-y-2">
          {t.pasos.map((paso, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
                {i + 1}
              </span>
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <input
                  value={paso.titulo}
                  onChange={(e) => cambiarPaso(i, 'titulo', e.target.value)}
                  placeholder="Título del paso"
                  className={CLASE_CAMPO}
                />
                <input
                  value={paso.texto}
                  onChange={(e) => cambiarPaso(i, 'texto', e.target.value)}
                  placeholder="Qué pasa en este paso"
                  className={CLASE_CAMPO}
                />
              </div>
              <BotonesOrden indice={i} total={t.pasos.length} onMover={moverPaso} />
              <button
                type="button"
                onClick={() => setT((prev) => ({ ...prev, pasos: prev.pasos.filter((_, j) => j !== i) }))}
                className="mt-1 text-xs text-red-600 hover:underline"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
        {t.pasos.length < 8 && (
          <button
            type="button"
            onClick={() => setT((prev) => ({ ...prev, pasos: [...prev.pasos, { titulo: '', texto: '' }] }))}
            className="mt-3 rounded-lg border border-dashed border-neutral-300 px-3 py-1.5 text-xs font-medium hover:border-ink"
          >
            + Agregar paso
          </button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Franja final: título" value={t.ctaTitulo} onChange={poner('ctaTitulo')} placeholder={TEXTOS_SERVICIOS.ctaTitulo} />
        <Field label="Franja final: texto del botón" value={t.ctaBoton} onChange={poner('ctaBoton')} placeholder={TEXTOS_SERVICIOS.ctaBoton} />
        <div className="sm:col-span-2">
          <Field label="Franja final: texto" value={t.ctaTexto} onChange={poner('ctaTexto')} placeholder={TEXTOS_SERVICIOS.ctaTexto} />
        </div>
      </div>

      <button
        type="button"
        onClick={guardar}
        disabled={guardando}
        className="mt-5 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {guardando ? 'Guardando…' : 'Guardar textos'}
      </button>
    </Seccion>
  );
}

// ============================================================
// PLANES
// ============================================================
export const PLAN_VACIO = {
  id: '',
  area: '',
  nombre: '',
  descripcion: '',
  incluye: '',
  foto: '',
  modo: 'cotizar',
  precio: '',
  precioTexto: '',
  aliado: '',
  activo: true,
};

export function FormularioPlan({ inicial, esNuevo, catalog, adminKey, onGuardar, onCancelar }) {
  const [p, setP] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const poner = (campo) => (valor) => setP((prev) => ({ ...prev, [campo]: valor }));

  const precio = precioDePlanValido(p.precio);
  const falta =
    (!p.nombre.trim() && 'Escribe el nombre del plan.') ||
    (p.modo === 'pagar' && precio == null && 'Escribe el precio en soles (mayor a 0).') ||
    (p.foto && !fotoValida(p.foto) && 'La dirección de la foto no sirve.') ||
    '';

  async function guardar() {
    if (falta) return;
    setGuardando(true);
    try {
      await onGuardar({ ...p, incluye: p.incluye.split('\n') });
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardando(false);
    }
  }

  const opcionModo = (id, titulo, texto) => (
    <label
      className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm transition ${
        p.modo === id ? 'border-ink bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'
      }`}
    >
      <input type="radio" name="modo-plan" checked={p.modo === id} onChange={() => poner('modo')(id)} className="mt-1" />
      <span>
        <span className="block font-medium text-neutral-800">{titulo}</span>
        <span className="block text-xs text-neutral-500">{texto}</span>
      </span>
    </label>
  );

  return (
    <div className="rounded-xl border-2 border-ink bg-white p-4 sm:p-5">
      <p className="text-sm font-semibold">{esNuevo ? 'Nuevo plan' : `Editar «${inicial.nombre}»`}</p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre del plan" value={p.nombre} onChange={poner('nombre')} placeholder="ej. Diseño de dormitorio" />
        <CampoArea value={p.area} onChange={poner('area')} catalog={catalog} />
        <div className="sm:col-span-2">
          <CampoAliado value={p.aliado} onChange={poner('aliado')} catalog={catalog} area={p.area} />
        </div>
        <div className="sm:col-span-2">
          <AreaTexto
            label="Descripción"
            value={p.descripcion}
            onChange={poner('descripcion')}
            placeholder="Para quién es y qué resuelve, en dos o tres líneas."
          />
        </div>
        <div className="sm:col-span-2">
          <AreaTexto
            label="Qué incluye (una línea por cada cosa)"
            value={p.incluye}
            onChange={poner('incluye')}
            filas={5}
            placeholder={'Visita para tomar medidas\nPropuesta con vistas en 3D\nLista de materiales'}
            ayuda="Sale como lista con vistos. Pon solo lo que de verdad entregas: es lo que el cliente te puede exigir."
          />
        </div>
        <div className="sm:col-span-2">
          <CampoFoto label="Foto del plan (opcional)" value={p.foto} onChange={poner('foto')} adminKey={adminKey} />
        </div>
      </div>

      <p className="mt-5 text-sm font-medium text-neutral-700">¿Cómo se contrata?</p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {opcionModo('cotizar', 'Se cotiza por WhatsApp', 'El cliente te escribe y el precio lo conversan.')}
        {opcionModo('pagar', 'Precio fijo, se paga en la web', 'El cliente lo paga como una compra más de la tienda.')}
      </div>

      <div className="mt-3 max-w-sm">
        {p.modo === 'pagar' ? (
          <label className="text-sm">
            <span className="mb-1 block font-medium text-neutral-700">Precio en soles, con IGV incluido</span>
            <input
              type="number"
              min="1"
              step="0.01"
              inputMode="decimal"
              value={p.precio}
              onChange={(e) => poner('precio')(e.target.value)}
              placeholder="ej. 350"
              className={CLASE_CAMPO}
            />
            <span className="mt-1 block text-xs text-neutral-500">
              Es el precio final que paga el cliente. El pedido te llega al panel como cualquier otro.
            </span>
          </label>
        ) : (
          <label className="text-sm">
            <span className="mb-1 block font-medium text-neutral-700">Precio de referencia (opcional)</span>
            <input
              value={p.precioTexto}
              onChange={(e) => poner('precioTexto')(e.target.value)}
              placeholder="ej. Desde S/ 350 por ambiente"
              className={CLASE_CAMPO}
            />
            <span className="mt-1 block text-xs text-neutral-500">
              Si pones un monto, que sea con IGV incluido. Vacío, la tarjeta dice «Precio según tu proyecto».
            </span>
          </label>
        )}
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={p.activo} onChange={(e) => poner('activo')(e.target.checked)} />
        Publicado (visible para los clientes)
      </label>

      {falta && <p className="mt-3 text-xs text-red-600">{falta}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || Boolean(falta)}
          className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Guardar plan'}
        </button>
        <button type="button" onClick={onCancelar} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm hover:border-ink">
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function ServiciosTab({ catalog, api, flash, adminKey }) {
  const planes = catalog.services || [];
  const [editando, setEditando] = useState(null); // null | 'nuevo' | id

  async function guardar(plan) {
    const id = editando === 'nuevo' ? idNuevo(plan.nombre, planes.map((x) => x.id), 'plan') : plan.id;
    await api('POST', 'service', { ...plan, id });
    setEditando(null);
    flash(`Plan «${plan.nombre.trim()}» guardado.`);
  }

  async function eliminar(plan) {
    if (!window.confirm(`¿Eliminar el plan «${plan.nombre}»? Dejará de verse en la página de servicios.`)) return;
    await api('DELETE', 'service', null, `&id=${encodeURIComponent(plan.id)}`);
    flash('Plan eliminado.', () => api('POST', 'service', plan));
  }

  async function publicar(plan) {
    await api('POST', 'service', { ...plan, activo: plan.activo === false });
    flash(`«${plan.nombre}» ${plan.activo === false ? 'publicado' : 'oculto'}.`);
  }

  function mover(indice, delta) {
    const ids = planes.map((x) => x.id);
    const destino = indice + delta;
    if (destino < 0 || destino >= ids.length) return;
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    api('POST', 'service', { ids }, '&action=reorder').catch((err) => alert(err.message));
  }

  const enEdicion = editando && editando !== 'nuevo' ? planes.find((x) => x.id === editando) : null;

  return (
    <div>
      <AvisoPagina catalog={catalog} />

      <TextosDePagina catalog={catalog} api={api} flash={flash} adminKey={adminKey} />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Planes de servicio</p>
          <p className="text-xs text-neutral-500">Se muestran agrupados por área, en este orden (usa ▲▼ para moverlos).</p>
        </div>
        {editando !== 'nuevo' && (
          <button
            type="button"
            onClick={() => setEditando('nuevo')}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            + Nuevo plan
          </button>
        )}
      </div>

      {editando === 'nuevo' && (
        <div className="mt-3">
          <FormularioPlan
            inicial={PLAN_VACIO}
            esNuevo
            catalog={catalog}
            adminKey={adminKey}
            onGuardar={guardar}
            onCancelar={() => setEditando(null)}
          />
        </div>
      )}

      <div className="mt-3 space-y-2">
        {planes.length === 0 && editando !== 'nuevo' && (
          <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
            Aún no hay planes. Crea el primero con «+ Nuevo plan».
          </p>
        )}
        {planes.map((plan, i) => {
          if (enEdicion?.id === plan.id) {
            return (
              <FormularioPlan
                key={plan.id}
                inicial={{
                  ...PLAN_VACIO,
                  ...plan,
                  incluye: (plan.incluye || []).join('\n'),
                  precio: plan.precio ?? '',
                }}
                catalog={catalog}
                adminKey={adminKey}
                onGuardar={guardar}
                onCancelar={() => setEditando(null)}
              />
            );
          }
          const cobro = cobroDePlan(plan, catalog.products);
          return (
            <div
              key={plan.id}
              className={`flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3 ${
                plan.activo === false ? 'border-neutral-200 opacity-60' : 'border-neutral-200'
              }`}
            >
              <BotonesOrden indice={i} total={planes.length} onMover={mover} />
              {plan.foto ? (
                <img src={plan.foto} alt="" className="h-14 w-20 rounded-lg border border-neutral-200 object-cover" />
              ) : (
                <span className="flex h-14 w-20 items-center justify-center rounded-lg bg-neutral-100 text-[10px] text-neutral-400">
                  Sin foto
                </span>
              )}
              <div className="min-w-[160px] flex-1">
                <p className="text-sm font-medium">{plan.nombre}</p>
                <p className="text-xs text-neutral-500">
                  {plan.area || 'Sin área'} ·{' '}
                  {plan.modo === 'pagar'
                    ? cobro
                      ? `Se paga en la web: ${catalog.currencyFormatter.format(cobro.precio)}`
                      : plan.activo === false
                        ? `Se paga en la web: ${catalog.currencyFormatter.format(plan.precio || 0)} (oculto: ahora no se puede comprar)`
                        : 'Se paga en la web, pero no se pudo preparar su cobro: ábrelo y vuelve a guardarlo'
                    : plan.precioTexto || 'Se cotiza por WhatsApp'}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={plan.activo !== false} onChange={() => publicar(plan).catch((err) => alert(err.message))} />
                  Publicado
                </label>
                <button type="button" onClick={() => setEditando(plan.id)} className="font-medium hover:underline">
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => eliminar(plan).catch((err) => alert(err.message))}
                  className="text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// PORTAFOLIO
// ============================================================
export const PROYECTO_VACIO = { id: '', titulo: '', area: '', descripcion: '', lugar: '', anio: '', fotos: [], aliado: '', activo: true };
const MAX_FOTOS = 12;

export function FormularioProyecto({ inicial, esNuevo, catalog, adminKey, onGuardar, onCancelar }) {
  const [p, setP] = useState(inicial);
  const [direccion, setDireccion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const poner = (campo) => (valor) => setP((prev) => ({ ...prev, [campo]: valor }));

  const agregarFotos = (urls) =>
    setP((prev) => ({ ...prev, fotos: [...new Set([...prev.fotos, ...urls])].slice(0, MAX_FOTOS) }));

  function moverFoto(i, delta) {
    setP((prev) => {
      const j = i + delta;
      if (j < 0 || j >= prev.fotos.length) return prev;
      const fotos = [...prev.fotos];
      [fotos[i], fotos[j]] = [fotos[j], fotos[i]];
      return { ...prev, fotos };
    });
  }

  function agregarDireccion() {
    const url = fotoValida(direccion);
    if (!url) {
      alert('Esa dirección no sirve: tiene que empezar por https:// o por / (una foto de tu propia web).');
      return;
    }
    agregarFotos([url]);
    setDireccion('');
  }

  const falta = (!p.titulo.trim() && 'Escribe el título del proyecto.') || '';

  async function guardar() {
    if (falta) return;
    setGuardando(true);
    try {
      await onGuardar(p);
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-ink bg-white p-4 sm:p-5">
      <p className="text-sm font-semibold">{esNuevo ? 'Nuevo proyecto' : `Editar «${inicial.titulo}»`}</p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Título" value={p.titulo} onChange={poner('titulo')} placeholder="ej. Dormitorio principal en Surco" />
        <CampoArea value={p.area} onChange={poner('area')} catalog={catalog} />
        <div className="sm:col-span-2">
          <CampoAliado value={p.aliado} onChange={poner('aliado')} catalog={catalog} area={p.area} />
        </div>
        <Field label="Lugar (opcional)" value={p.lugar} onChange={poner('lugar')} placeholder="ej. Santiago de Surco, Lima" />
        <Field label="Año (opcional)" value={p.anio} onChange={(v) => poner('anio')(v.replace(/\D/g, '').slice(0, 4))} placeholder="ej. 2026" />
        <div className="sm:col-span-2">
          <AreaTexto
            label="Descripción (opcional)"
            value={p.descripcion}
            onChange={poner('descripcion')}
            placeholder="Qué pidió el cliente y qué hiciste."
          />
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium text-neutral-700">
          Fotos <span className="font-normal text-neutral-400">({p.fotos.length} de {MAX_FOTOS})</span>
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          La primera es la portada del proyecto. Sin fotos, el proyecto no se muestra.
        </p>

        {p.fotos.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {p.fotos.map((foto, i) => (
              <div key={foto} className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                <div className="relative">
                  <img src={foto} alt="" className="aspect-[4/3] w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-ink px-2 py-0.5 text-[10px] font-medium text-white">
                      Portada
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 px-2 py-1.5 text-xs">
                  <span className="flex gap-1">
                    <button type="button" disabled={i === 0} onClick={() => moverFoto(i, -1)} aria-label="Mover antes" className="rounded border border-neutral-200 px-1.5 hover:border-ink disabled:opacity-25">
                      ◀
                    </button>
                    <button type="button" disabled={i === p.fotos.length - 1} onClick={() => moverFoto(i, 1)} aria-label="Mover después" className="rounded border border-neutral-200 px-1.5 hover:border-ink disabled:opacity-25">
                      ▶
                    </button>
                  </span>
                  <button
                    type="button"
                    onClick={() => setP((prev) => ({ ...prev, fotos: prev.fotos.filter((f) => f !== foto) }))}
                    className="text-red-600 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {p.fotos.length < MAX_FOTOS && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <UploadButton
              adminKey={adminKey}
              multiple
              label="📷 Subir fotos"
              onBatch={(subidas) => agregarFotos(subidas.map((s) => s.url))}
            />
            <input
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  agregarDireccion();
                }
              }}
              placeholder="o pega la dirección de una foto"
              className="min-w-[200px] flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-ink"
            />
            <button type="button" onClick={agregarDireccion} disabled={!direccion.trim()} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:border-ink disabled:opacity-40">
              Agregar
            </button>
          </div>
        )}
      </div>

      {/* La casa de un cliente y su cara son datos personales (Ley 29733):
          publicarlos sin permiso es una infracción, además de un mal trago
          con ese cliente. */}
      <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
        Publica solo trabajos tuyos y reales. Si en la foto se reconoce la casa de un cliente o aparece una persona,
        pídele permiso antes.
      </p>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={p.activo} onChange={(e) => poner('activo')(e.target.checked)} />
        Publicado (visible para los clientes)
      </label>

      {falta && <p className="mt-3 text-xs text-red-600">{falta}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || Boolean(falta)}
          className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Guardar proyecto'}
        </button>
        <button type="button" onClick={onCancelar} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm hover:border-ink">
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function PortafolioTab({ catalog, api, flash, adminKey }) {
  const proyectos = catalog.projects || [];
  const [editando, setEditando] = useState(null); // null | 'nuevo' | id

  async function guardar(proyecto) {
    const id =
      editando === 'nuevo' ? idNuevo(proyecto.titulo, proyectos.map((x) => x.id), 'proyecto') : proyecto.id;
    await api('POST', 'project', { ...proyecto, id });
    setEditando(null);
    flash(
      proyecto.fotos.length
        ? `Proyecto «${proyecto.titulo.trim()}» guardado.`
        : `Proyecto «${proyecto.titulo.trim()}» guardado, pero no se mostrará hasta que tenga al menos una foto.`
    );
  }

  async function eliminar(proyecto) {
    if (!window.confirm(`¿Eliminar el proyecto «${proyecto.titulo}» del portafolio?`)) return;
    await api('DELETE', 'project', null, `&id=${encodeURIComponent(proyecto.id)}`);
    flash('Proyecto eliminado.', () => api('POST', 'project', proyecto));
  }

  async function publicar(proyecto) {
    await api('POST', 'project', { ...proyecto, activo: proyecto.activo === false });
    flash(`«${proyecto.titulo}» ${proyecto.activo === false ? 'publicado' : 'oculto'}.`);
  }

  function mover(indice, delta) {
    const ids = proyectos.map((x) => x.id);
    const destino = indice + delta;
    if (destino < 0 || destino >= ids.length) return;
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    api('POST', 'project', { ids }, '&action=reorder').catch((err) => alert(err.message));
  }

  return (
    <div>
      <AvisoPagina catalog={catalog} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Proyectos realizados</p>
          <p className="text-xs text-neutral-500">
            Se muestran en este orden (usa ▲▼). El primero presta su foto a la portada de la página si no elegiste otra.
          </p>
        </div>
        {editando !== 'nuevo' && (
          <button
            type="button"
            onClick={() => setEditando('nuevo')}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            + Nuevo proyecto
          </button>
        )}
      </div>

      {editando === 'nuevo' && (
        <div className="mt-3">
          <FormularioProyecto
            inicial={PROYECTO_VACIO}
            esNuevo
            catalog={catalog}
            adminKey={adminKey}
            onGuardar={guardar}
            onCancelar={() => setEditando(null)}
          />
        </div>
      )}

      <div className="mt-3 space-y-2">
        {proyectos.length === 0 && editando !== 'nuevo' && (
          <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
            Aún no hay proyectos. Sube el primero con «+ Nuevo proyecto».
          </p>
        )}
        {proyectos.map((proyecto, i) => {
          if (editando === proyecto.id) {
            return (
              <FormularioProyecto
                key={proyecto.id}
                inicial={{ ...PROYECTO_VACIO, ...proyecto, fotos: proyecto.fotos || [] }}
                catalog={catalog}
                adminKey={adminKey}
                onGuardar={guardar}
                onCancelar={() => setEditando(null)}
              />
            );
          }
          const nFotos = proyecto.fotos?.length || 0;
          return (
            <div
              key={proyecto.id}
              className={`flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 ${
                proyecto.activo === false ? 'opacity-60' : ''
              }`}
            >
              <BotonesOrden indice={i} total={proyectos.length} onMover={mover} />
              {nFotos > 0 ? (
                <img src={proyecto.fotos[0]} alt="" className="h-14 w-20 rounded-lg border border-neutral-200 object-cover" />
              ) : (
                <span className="flex h-14 w-20 items-center justify-center rounded-lg bg-amber-50 text-[10px] text-amber-700">
                  Sin fotos
                </span>
              )}
              <div className="min-w-[160px] flex-1">
                <p className="text-sm font-medium">{proyecto.titulo}</p>
                <p className="text-xs text-neutral-500">
                  {[proyecto.area || 'Sin área', proyecto.lugar, proyecto.anio].filter(Boolean).join(' · ')} ·{' '}
                  {nFotos === 0 ? (
                    <span className="text-amber-700">no se muestra: le faltan fotos</span>
                  ) : (
                    `${nFotos} ${nFotos === 1 ? 'foto' : 'fotos'}`
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={proyecto.activo !== false} onChange={() => publicar(proyecto).catch((err) => alert(err.message))} />
                  Publicado
                </label>
                <button type="button" onClick={() => setEditando(proyecto.id)} className="font-medium hover:underline">
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => eliminar(proyecto).catch((err) => alert(err.message))}
                  className="text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
