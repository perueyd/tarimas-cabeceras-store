// Navegación en dos niveles para el panel.
//
// POR QUÉ: el panel tenía 30 pestañas en filas planas que se envolvían en
// cuatro líneas de botones. Encontrar "Entrega" o "Copias de seguridad" era
// leer treinta etiquetas de izquierda a derecha cada vez. Con 30 opciones a la
// vista, ninguna destaca y todas cuestan lo mismo de encontrar.
//
// Ahora se eligen primero cuatro o cinco grupos, y solo se ven las pestañas del
// grupo abierto: entre seis y ocho etiquetas en vez de treinta.
//
// EL RIESGO Y CÓMO SE EVITA: agrupar esconde cosas, y aquí hay cosas que NO se
// pueden esconder — un pedido por verificar o un reclamo con plazo legal. Por
// eso cada grupo muestra en su propio botón el total de avisos de lo que
// contiene. Si hay algo urgente dentro, el grupo se ve urgente por fuera,
// aunque esté cerrado.

import { useEffect, useState } from 'react';

/**
 * grupos: [{ id, label, items: [{ id, label, aviso?, urgente? }] }]
 *   aviso   -> número que se muestra como globo (ej. pedidos nuevos)
 *   urgente -> pinta el globo en rojo (ej. reclamos con plazo)
 * activa: id de la pestaña abierta
 * onElegir: (idDePestaña) => void
 */
export default function PestanasAgrupadas({ grupos, activa, onElegir }) {
  const grupoDeLaActiva = grupos.find((g) => g.items.some((i) => i.id === activa))?.id;
  const [abierto, setAbierto] = useState(grupoDeLaActiva || grupos[0]?.id);

  // Si la pestaña cambia desde fuera (el panel "Qué hacer hoy" manda a
  // Reclamos, por ejemplo), el grupo correcto se abre solo. Sin esto, se
  // saltaba a una pestaña de un grupo cerrado y la fila de abajo seguía
  // enseñando otra cosa: parecía que el botón no había hecho nada.
  useEffect(() => {
    if (grupoDeLaActiva && grupoDeLaActiva !== abierto) setAbierto(grupoDeLaActiva);
  }, [grupoDeLaActiva]);

  const grupoAbierto = grupos.find((g) => g.id === abierto) || grupos[0];

  return (
    <div className="mb-6">
      {/* Nivel 1: los grupos */}
      <div className="flex flex-wrap gap-1 border-b border-neutral-200">
        {grupos.map((g) => {
          const avisos = g.items.reduce((n, i) => n + (i.aviso || 0), 0);
          const hayUrgente = g.items.some((i) => i.urgente && i.aviso > 0);
          const esteAbierto = g.id === grupoAbierto?.id;

          return (
            <button
              key={g.id}
              onClick={() => {
                setAbierto(g.id);
                // Abrir un grupo lleva a su primera pestaña: así un clic hace
                // algo visible, en vez de solo cambiar la fila de abajo.
                if (!g.items.some((i) => i.id === activa)) onElegir(g.items[0].id);
              }}
              className={`relative -mb-px rounded-t-lg border-b-2 px-4 py-2.5 text-sm transition ${
                esteAbierto
                  ? 'border-ink font-medium text-ink'
                  : 'border-transparent text-neutral-500 hover:text-ink'
              }`}
            >
              {g.label}
              {avisos > 0 && (
                <span
                  className={`ml-2 inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 py-0.5 text-[11px] font-medium leading-none ${
                    hayUrgente ? 'bg-red-600 text-white' : 'bg-neutral-200 text-neutral-700'
                  }`}
                >
                  {avisos}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Nivel 2: las pestañas del grupo abierto */}
      <div className="mt-3 flex flex-wrap gap-2">
        {grupoAbierto?.items.map((i) => (
          <button
            key={i.id}
            onClick={() => onElegir(i.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              activa === i.id
                ? 'border-ink bg-ink text-white'
                : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
            }`}
          >
            {i.label}
            {i.aviso > 0 && (
              <span
                className={`ml-2 inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 py-0.5 text-[11px] font-medium leading-none ${
                  i.urgente
                    ? 'bg-red-600 text-white'
                    : activa === i.id
                      ? 'bg-white/20 text-white'
                      : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {i.aviso}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
