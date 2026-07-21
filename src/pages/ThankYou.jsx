import { Link, useLocation } from 'react-router-dom';
import { currencyFormatter } from '../data/catalog.js';
import RecommendedProducts from '../components/RecommendedProducts.jsx';

// Evento de calendario pre-llenado para el cliente (día completo de la entrega).
function buildCalendarUrl(state) {
  const inicio = state.entregaFecha.replace(/-/g, '');
  const sig = new Date(`${state.entregaFecha}T12:00:00`);
  sig.setDate(sig.getDate() + 1);
  const fin = sig.toISOString().slice(0, 10).replace(/-/g, '');
  const text = encodeURIComponent('🚚 Entrega de mi pedido — E|D Espacios y Diseño');
  const details = encodeURIComponent(
    `Pedido: ${state.orderCode || ''}\nHorario: ${state.entregaHorario || 'por confirmar'}\nMonto: ${state.monto != null ? currencyFormatter.format(state.monto) : ''}`
  );
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${inicio}/${fin}&details=${details}`;
}

export default function ThankYou() {
  const { state } = useLocation();
  const porVerificar = state?.porVerificar;

  return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {porVerificar ? '¡Pedido registrado! 📝' : '¡Gracias por tu compra!'}
      </h1>
      <p className="mt-3 text-neutral-500">
        {porVerificar
          ? `Recibimos tu pedido. Quedará confirmado apenas verifiquemos tu pago por ${state?.metodo || 'el método elegido'}. Si aún no nos enviaste tu comprobante por WhatsApp, hazlo para agilizar la confirmación.`
          : 'Tu pago se procesó correctamente. Te enviaremos la confirmación por correo.'}
      </p>
      {state?.orderCode && (
        <>
          <p className="mt-4 text-sm font-medium">
            N° de pedido: <span className="rounded bg-neutral-100 px-2 py-1 font-mono">{state.orderCode}</span>
          </p>
          <Link
            to={`/seguimiento?codigo=${encodeURIComponent(state.orderCode)}`}
            className="mt-2 inline-block text-sm text-sky-700 underline"
          >
            Ver el estado de mi pedido
          </Link>
        </>
      )}
      {state?.chargeId && (
        <p className="mt-2 text-sm text-neutral-400">N° de operación: {state.chargeId}</p>
      )}
      {state?.monto != null && (
        <p className="mt-1 text-sm text-neutral-400">
          {porVerificar ? 'Monto a verificar' : 'Monto pagado'}: {currencyFormatter.format(state.monto)}
        </p>
      )}
      {state?.entregaFecha && (
        <>
          <p className="mx-auto mt-6 max-w-md rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
            Entrega programada a partir del <span className="font-medium">{state.entregaFecha}</span>
            {state.entregaHorario ? <> en el horario de <span className="font-medium">{state.entregaHorario}</span></> : null}.
            Te contactaremos para confirmar el día exacto.
          </p>
          <a
            href={buildCalendarUrl(state)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-medium transition hover:border-ink"
          >
            📅 Agregar la entrega a mi Google Calendar
          </a>
        </>
      )}
      <Link
        to="/"
        className="mt-8 inline-block rounded-lg bg-ink px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
      >
        Volver al catálogo
      </Link>

      <div className="text-left">
        <RecommendedProducts title="¿Y si completas tu dormitorio?" />
      </div>
    </main>
  );
}
