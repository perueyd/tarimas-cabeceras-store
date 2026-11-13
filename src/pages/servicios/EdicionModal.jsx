// Las ventanas del modo edición: el formulario completo de un plan, el de un
// proyecto y el cambio de la foto de portada.
//
// Lo que se cambia a menudo (nombres, textos, precios) se escribe sobre la
// propia página. Aquí va lo que no cabe encima de una tarjeta: las fotos, el
// área, la forma de contratar y el profesional a cargo. Son los MISMOS
// formularios del panel, no una copia: un cambio en uno vale para los dos.
//
// Este archivo se descarga solo cuando el dueño abre una de estas ventanas,
// así que un cliente nunca carga el código de los formularios.

import { useEffect, useState } from 'react';
import {
  CampoFoto,
  FormularioPlan,
  FormularioProyecto,
  PLAN_VACIO,
  PROYECTO_VACIO,
  idNuevo,
} from '../editor/ServiciosTab.jsx';
import { fotoValida } from '../../lib/servicios.js';

function FotoDePortada({ inicial, clave, onGuardar, onCancelar }) {
  const [foto, setFoto] = useState(inicial || '');
  return (
    <div className="rounded-xl border-2 border-ink bg-white p-4 sm:p-5">
      <p className="text-sm font-semibold">Foto de portada</p>
      <div className="mt-4">
        <CampoFoto
          label="La foto que va de fondo, detrás del título"
          value={foto}
          onChange={setFoto}
          adminKey={clave}
          ayuda="Si la dejas vacía se usa la primera foto de tu portafolio."
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onGuardar(fotoValida(foto))}
          disabled={Boolean(foto) && !fotoValida(foto)}
          className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          Guardar foto
        </button>
        <button type="button" onClick={onCancelar} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm hover:border-ink">
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function EdicionModal({ ed, catalog, clave }) {
  const { modal } = ed;

  // Con la ventana abierta la página de detrás no se mueve, y Esc la cierra.
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const alTeclear = (e) => {
      if (e.key === 'Escape') ed.cerrar();
    };
    window.addEventListener('keydown', alTeclear);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener('keydown', alTeclear);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si el guardado falla, la ventana NO se cierra: el formulario enseña el
  // motivo y lo escrito no se pierde.
  async function guardarPlan(plan) {
    const id = modal.plan ? modal.plan.id : idNuevo(plan.nombre, catalog.services.map((x) => x.id), 'plan');
    await ed.api('POST', 'service', { ...plan, id });
    ed.cerrar();
  }
  async function guardarProyecto(proyecto) {
    const id = modal.proyecto
      ? modal.proyecto.id
      : idNuevo(proyecto.titulo, catalog.projects.map((x) => x.id), 'proyecto');
    await ed.api('POST', 'project', { ...proyecto, id });
    ed.cerrar();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] overflow-y-auto bg-black/60 p-3 sm:p-6"
      onMouseDown={(e) => {
        // Cerrar al tocar fuera, pero no al soltar un arrastre que empezó dentro.
        if (e.target === e.currentTarget) ed.cerrar();
      }}
    >
      <div className="mx-auto max-w-3xl">
        {modal.tipo === 'plan' && (
          <FormularioPlan
            inicial={
              modal.plan
                ? { ...PLAN_VACIO, ...modal.plan, incluye: (modal.plan.incluye || []).join('\n'), precio: modal.plan.precio ?? '' }
                : { ...PLAN_VACIO, area: modal.area || '' }
            }
            esNuevo={!modal.plan}
            catalog={catalog}
            adminKey={clave}
            onGuardar={guardarPlan}
            onCancelar={ed.cerrar}
          />
        )}
        {modal.tipo === 'proyecto' && (
          <FormularioProyecto
            inicial={modal.proyecto ? { ...PROYECTO_VACIO, ...modal.proyecto, fotos: modal.proyecto.fotos || [] } : PROYECTO_VACIO}
            esNuevo={!modal.proyecto}
            catalog={catalog}
            adminKey={clave}
            onGuardar={guardarProyecto}
            onCancelar={ed.cerrar}
          />
        )}
        {modal.tipo === 'portada' && (
          <FotoDePortada
            inicial={modal.foto}
            clave={clave}
            onGuardar={async (foto) => {
              await ed.guardarTextos({ fotoPortada: foto });
              ed.cerrar();
            }}
            onCancelar={ed.cerrar}
          />
        )}
      </div>
    </div>
  );
}
