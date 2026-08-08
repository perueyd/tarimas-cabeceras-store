// Lo primero que ve el dueño al abrir el panel: qué requiere su atención HOY.
//
// Antes el panel abría con dos gráficas de ventas. Bonitas, pero no dicen qué
// hacer: para enterarse de que había un pedido sin verificar o un reclamo a
// punto de vencer, había que ir entrando pestaña por pestaña. Y los reclamos
// tienen plazo legal de 30 días — pasarse es sanción.
//
// Cada línea lleva de un toque a donde se resuelve. Si no hay nada urgente, no
// se muestra nada: un panel lleno de avisos verdes enseña a ignorarlos.

const dias = (desde) => Math.floor((Date.now() - new Date(desde).getTime()) / 86400000);

function Aviso({ color, icono, titulo, detalle, accion, onIr }) {
  const estilos = {
    rojo: 'border-red-200 bg-red-50 hover:border-red-400',
    ambar: 'border-amber-200 bg-amber-50 hover:border-amber-400',
    azul: 'border-sky-200 bg-sky-50 hover:border-sky-400',
  }[color];
  const texto = { rojo: 'text-red-900', ambar: 'text-amber-900', azul: 'text-sky-900' }[color];

  return (
    <button
      onClick={onIr}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${estilos}`}
    >
      <span className="text-xl" aria-hidden>{icono}</span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-medium ${texto}`}>{titulo}</span>
        {detalle && <span className="block text-xs text-neutral-600">{detalle}</span>}
      </span>
      <span className={`shrink-0 text-xs font-medium ${texto}`}>{accion} →</span>
    </button>
  );
}

export default function QueHacerHoy({
  orders = [],
  reviews = [],
  reclamos = [],
  carritos = [],
  arco = [],
  currencyFormatter,
  onIr,
}) {
  const avisos = [];

  // 1. Pedidos esperando que confirmes el pago. Es dinero ya enviado por el
  //    cliente que sigue sin convertirse en venta.
  const porVerificar = orders.filter((o) => o.estado === 'Pago por verificar');
  if (porVerificar.length) {
    const masViejo = Math.max(...porVerificar.map((o) => dias(o.fecha)));
    avisos.push({
      orden: masViejo >= 1 ? 0 : 2,
      color: masViejo >= 1 ? 'rojo' : 'ambar',
      icono: '💰',
      titulo: `${porVerificar.length} pedido${porVerificar.length > 1 ? 's' : ''} por verificar`,
      detalle:
        masViejo >= 1
          ? `El más antiguo lleva ${masViejo} día${masViejo > 1 ? 's' : ''} esperando`
          : 'Llegaron hoy',
      accion: 'Revisar',
      tab: 'pedidos',
    });
  }

  // 2. Reclamos: 30 días calendario por ley (DS 006-2017-JUS). Pasarse es
  //    sanción de INDECOPI, así que manda sobre cualquier otra cosa.
  const reclamosPend = reclamos.filter((r) => r.estado === 'Pendiente');
  if (reclamosPend.length) {
    const quedan = Math.min(...reclamosPend.map((r) => 30 - dias(r.fecha)));
    const urgente = quedan <= 7;
    avisos.push({
      orden: urgente ? -1 : 3, // lo legal por delante de todo
      color: urgente ? 'rojo' : 'ambar',
      icono: '📋',
      titulo: `${reclamosPend.length} reclamo${reclamosPend.length > 1 ? 's' : ''} sin responder`,
      detalle:
        quedan < 0
          ? `⚠️ Uno venció hace ${Math.abs(quedan)} día${Math.abs(quedan) > 1 ? 's' : ''} — plazo legal incumplido`
          : `El más urgente vence en ${quedan} día${quedan !== 1 ? 's' : ''} (plazo legal: 30)`,
      accion: 'Responder',
      tab: 'reclamos',
    });
  }

  // 3. Solicitudes ARCO: 10 o 20 días hábiles según el derecho (Ley 29733).
  const arcoPend = arco.filter((s) => s.estado === 'Pendiente');
  if (arcoPend.length) {
    const quedan = Math.min(...arcoPend.map((s) => s.diasRestantes ?? 99));
    avisos.push({
      orden: quedan <= 3 ? -2 : 4,
      color: quedan <= 3 ? 'rojo' : 'ambar',
      icono: '⚖️',
      titulo: `${arcoPend.length} solicitud${arcoPend.length > 1 ? 'es' : ''} sobre datos personales`,
      detalle:
        quedan < 0
          ? '⚠️ Plazo legal vencido'
          : `Vence en ${quedan} día${quedan !== 1 ? 's' : ''} — es obligatorio responder`,
      accion: 'Atender',
      tab: 'reclamos',
    });
  }

  // 4. Reseñas con foto esperando aprobación: no salen en la tienda hasta que
  //    el dueño las mire, así que una buena opinión se queda oculta.
  const porAprobar = reviews.filter((r) => r.aprobada === false);
  if (porAprobar.length) {
    avisos.push({
      orden: 5,
      color: 'azul',
      icono: '⭐',
      titulo: `${porAprobar.length} reseña${porAprobar.length > 1 ? 's' : ''} sin publicar`,
      detalle: 'No se ven en la tienda hasta que las apruebes',
      accion: 'Ver',
      tab: 'resenas',
    });
  }

  // 5. Carritos abandonados: clientes que llegaron hasta el final y no pagaron.
  //    Un WhatsApp a tiempo recupera una parte.
  if (carritos.length) {
    avisos.push({
      orden: 6,
      color: 'azul',
      icono: '🛒',
      titulo: `${carritos.length} carrito${carritos.length > 1 ? 's' : ''} abandonado${carritos.length > 1 ? 's' : ''}`,
      detalle: 'Tienes su teléfono: un mensaje puede cerrar la venta',
      accion: 'Escribir',
      tab: 'carritos',
    });
  }

  if (!avisos.length) {
    return (
      <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <p className="text-sm font-medium text-green-900">
          ✅ Todo al día — no hay nada pendiente de tu parte
        </p>
      </div>
    );
  }

  avisos.sort((a, b) => a.orden - b.orden);

  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold text-neutral-500">Qué hacer hoy</h2>
      <div className="space-y-2">
        {avisos.map((a, i) => (
          <Aviso key={i} {...a} onIr={() => onIr(a.tab)} />
        ))}
      </div>
    </section>
  );
}
