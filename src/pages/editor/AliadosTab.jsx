// Aliados: profesionales de fuera que venden a través de la tienda.
//
// Un arquitecto, un ingeniero civil o un diseñador que no es de la empresa
// puede ofrecer sus servicios aquí. Cada uno recibe un ENLACE PROPIO para
// compartir en sus redes; quien entra por ese enlace ve sus servicios, y la
// consulta por WhatsApp o el pedido quedan anotados como traídos por él.
//
// La tienda vende con su marca y responde ante el cliente. Lo que esta
// pantalla cuida es que eso no se convierta en decir algo falso: ver el aviso
// de abajo sobre mostrar el nombre y la colegiatura.

import { useEffect, useState } from 'react';
import { Field } from './comunes.jsx';
import { SITIO_URL } from '../../data/sitio.js';
import { aIdentificador } from '../../lib/servicios.js';

const VACIO = {
  id: '',
  nombre: '',
  titulo: '',
  colegiatura: '',
  mostrar: true,
  activo: true,
  telefono: '',
  comision: '',
  notas: '',
};

const CLASE_CAMPO = 'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink';

const enlaceDe = (id) => `${SITIO_URL}/servicios?de=${id}`;

function Formulario({ inicial, esNuevo, existentes, onGuardar, onCancelar }) {
  const [a, setA] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  // El código sale del nombre mientras el dueño no lo toque a mano.
  const [codigoTocado, setCodigoTocado] = useState(!esNuevo);
  const poner = (campo) => (valor) => setA((prev) => ({ ...prev, [campo]: valor }));

  const codigo = aIdentificador(codigoTocado ? a.id : a.nombre);
  const repetido = esNuevo && existentes.includes(codigo);
  const falta =
    (!a.nombre.trim() && 'Escribe el nombre del profesional.') ||
    (!codigo && 'Escribe un código para su enlace.') ||
    (repetido && 'Ya hay otro aliado con ese código: cámbialo.') ||
    '';

  async function guardar() {
    if (falta) return;
    setGuardando(true);
    try {
      await onGuardar({ ...a, id: codigo });
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-ink bg-white p-4 sm:p-5">
      <p className="text-sm font-semibold">{esNuevo ? 'Nuevo aliado' : `Editar a ${inicial.nombre}`}</p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre y apellido" value={a.nombre} onChange={poner('nombre')} placeholder="ej. Ana Pérez Rojas" />
        <Field label="Profesión (como se mostrará)" value={a.titulo} onChange={poner('titulo')} placeholder="ej. Arquitecta · Ing. civil" />
        <Field label="N.° de colegiatura" value={a.colegiatura} onChange={poner('colegiatura')} placeholder="ej. CAP 12345 · CIP 98765" />
        <label className="text-sm">
          <span className="mb-1 block font-medium text-neutral-700">Código de su enlace</span>
          <input
            value={codigoTocado ? a.id : codigo}
            disabled={!esNuevo}
            onChange={(e) => {
              setCodigoTocado(true);
              poner('id')(e.target.value);
            }}
            placeholder="ej. arq-ana"
            className={`${CLASE_CAMPO} disabled:bg-neutral-100 disabled:text-neutral-400`}
          />
          <span className="mt-1 block text-xs text-neutral-500">
            {esNuevo
              ? `Su enlace será ${enlaceDe(codigo || 'codigo').replace(/^https?:\/\//, '')}. No se puede cambiar después.`
              : 'El código no se cambia: su enlace ya puede estar compartido.'}
          </span>
        </label>
      </div>

      <label className="mt-4 flex items-start gap-2 text-sm">
        <input type="checkbox" checked={a.mostrar} onChange={(e) => poner('mostrar')(e.target.checked)} className="mt-1" />
        <span>
          Mostrar su nombre y su colegiatura en la página
          <span className="block text-xs text-neutral-500">
            Sale como «A cargo de {[a.titulo, a.nombre].filter(Boolean).join(' ') || 'Arquitecta Ana Pérez'}
            {a.colegiatura ? ` · ${a.colegiatura}` : ''}» en sus planes y proyectos.
          </span>
        </span>
      </label>
      {!a.mostrar && (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          ⚠️ Puedes vender con tu marca sin nombrarlo, pero ten presente dos cosas. En arquitectura e ingeniería, los
          planos y expedientes los firma el profesional colegiado y habilitado, y el cliente lo va a ver. Y los
          proyectos del portafolio que sean obra suya no deben presentarse como experiencia propia de la empresa:
          Indecopi sanciona la publicidad que atribuye una experiencia que no se tiene.
        </p>
      )}

      <div className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <p className="text-xs font-medium text-neutral-700">Solo para ti (no se publica)</p>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Su teléfono" value={a.telefono} onChange={poner('telefono')} placeholder="ej. 987 654 321" />
          <Field label="Comisión acordada" value={a.comision} onChange={poner('comision')} placeholder="ej. 15 % de cada venta" />
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-neutral-700">Notas</span>
            <textarea value={a.notas} onChange={(e) => poner('notas')(e.target.value)} rows={2} className={CLASE_CAMPO} />
          </label>
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={a.activo} onChange={(e) => poner('activo')(e.target.checked)} />
        Activo (su enlace funciona y sus ventas se le anotan)
      </label>

      {falta && <p className="mt-3 text-xs text-red-600">{falta}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || Boolean(falta)}
          className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Guardar aliado'}
        </button>
        <button type="button" onClick={onCancelar} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm hover:border-ink">
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function AliadosTab({ catalog, api, flash, adminKey }) {
  const aliados = catalog.partners || [];
  const [editando, setEditando] = useState(null); // null | 'nuevo' | id
  const [pedidos, setPedidos] = useState(null);
  const [copiado, setCopiado] = useState('');

  // Los pedidos, para contar cuántos trajo cada aliado. Si no cargan, la
  // pantalla sigue sirviendo: solo no se enseñan las cuentas.
  useEffect(() => {
    let cancelado = false;
    fetch('/api/orders', { headers: { Authorization: `Bearer ${adminKey}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelado && d) setPedidos(Array.isArray(d.orders) ? d.orders : Array.isArray(d) ? d : []);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [adminKey]);

  async function guardar(aliado) {
    await api('POST', 'partner', aliado);
    setEditando(null);
    flash(`Aliado «${aliado.nombre.trim()}» guardado.`);
  }

  async function eliminar(aliado) {
    const usos = [...(catalog.services || []), ...(catalog.projects || [])].filter((x) => x.aliado === aliado.id).length;
    const aviso = usos
      ? `\n\nTiene ${usos} ${usos === 1 ? 'plan o proyecto asignado' : 'planes o proyectos asignados'}: seguirán publicados, pero sin su nombre.`
      : '';
    if (!window.confirm(`¿Eliminar a ${aliado.nombre}? Su enlace dejará de anotarle ventas.${aviso}`)) return;
    await api('DELETE', 'partner', null, `&id=${encodeURIComponent(aliado.id)}`);
    flash('Aliado eliminado.', () => api('POST', 'partner', aliado));
  }

  async function copiar(id) {
    try {
      await navigator.clipboard.writeText(enlaceDe(id));
      setCopiado(id);
      setTimeout(() => setCopiado((c) => (c === id ? '' : c)), 2500);
    } catch {
      // Sin permiso para el portapapeles: el enlace está escrito al lado.
    }
  }

  function cuentas(id) {
    if (!pedidos) return null;
    const suyos = pedidos.filter((o) => o.referido === id && o.estado !== 'Cancelado');
    const total = suyos.reduce((suma, o) => suma + (Number(o.monto) || 0), 0);
    return { cuantos: suyos.length, total };
  }

  return (
    <div>
      <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
        <p>
          <strong>Cómo funciona:</strong> das de alta al profesional, le asignas sus planes y proyectos (en las pestañas
          Servicios y Portafolio) y le pasas <strong>su enlace</strong>. Quien entra por ese enlace ve lo suyo, y lo
          que consulte o compre queda anotado a su nombre. La venta, el cobro y la boleta o factura son tuyos.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Profesionales aliados</p>
        {editando !== 'nuevo' && (
          <button
            type="button"
            onClick={() => setEditando('nuevo')}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            + Nuevo aliado
          </button>
        )}
      </div>

      {editando === 'nuevo' && (
        <div className="mt-3">
          <Formulario
            inicial={VACIO}
            esNuevo
            existentes={aliados.map((x) => x.id)}
            onGuardar={guardar}
            onCancelar={() => setEditando(null)}
          />
        </div>
      )}

      <div className="mt-3 space-y-2">
        {aliados.length === 0 && editando !== 'nuevo' && (
          <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
            Aún no hay aliados. Agrega el primero con «+ Nuevo aliado».
          </p>
        )}
        {aliados.map((aliado) => {
          if (editando === aliado.id) {
            return (
              <Formulario
                key={aliado.id}
                inicial={{ ...VACIO, ...aliado }}
                existentes={aliados.map((x) => x.id)}
                onGuardar={guardar}
                onCancelar={() => setEditando(null)}
              />
            );
          }
          const nPlanes = (catalog.services || []).filter((x) => x.aliado === aliado.id).length;
          const nProyectos = (catalog.projects || []).filter((x) => x.aliado === aliado.id).length;
          const c = cuentas(aliado.id);
          return (
            <div
              key={aliado.id}
              className={`rounded-lg border border-neutral-200 bg-white p-3 ${aliado.activo === false ? 'opacity-60' : ''}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-[200px] flex-1">
                  <p className="text-sm font-medium">
                    {[aliado.titulo, aliado.nombre].filter(Boolean).join(' ')}
                    {aliado.colegiatura && <span className="font-normal text-neutral-500"> · {aliado.colegiatura}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {nPlanes} {nPlanes === 1 ? 'plan' : 'planes'} · {nProyectos} {nProyectos === 1 ? 'proyecto' : 'proyectos'}
                    {c && ` · ${c.cuantos} ${c.cuantos === 1 ? 'pedido traído' : 'pedidos traídos'}`}
                    {c && c.cuantos > 0 && ` (${catalog.currencyFormatter.format(c.total)})`}
                    {aliado.mostrar === false && ' · su nombre no se muestra'}
                    {aliado.activo === false && ' · inactivo'}
                  </p>
                  {(aliado.comision || aliado.telefono) && (
                    <p className="mt-0.5 text-xs text-neutral-400">
                      {[aliado.comision && `Comisión: ${aliado.comision}`, aliado.telefono && `Tel.: ${aliado.telefono}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <button type="button" onClick={() => setEditando(aliado.id)} className="font-medium hover:underline">
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminar(aliado).catch((err) => alert(err.message))}
                    className="text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <code className="rounded bg-neutral-100 px-2 py-1 font-mono">{enlaceDe(aliado.id).replace(/^https?:\/\//, '')}</code>
                <button
                  type="button"
                  onClick={() => copiar(aliado.id)}
                  className="rounded-lg border border-neutral-300 px-3 py-1 font-medium hover:border-ink"
                >
                  {copiado === aliado.id ? '✓ Copiado' : 'Copiar su enlace'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-neutral-500">
        Las ventas se cuentan desde los pedidos del panel. Las consultas por WhatsApp llegan con «(Ref.: código)» al
        final del mensaje, para que sepas de parte de quién vienen.
      </p>
    </div>
  );
}
