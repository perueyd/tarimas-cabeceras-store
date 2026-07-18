import { Link, useLocation } from 'react-router-dom';
import { currencyFormatter } from '../data/catalog.js';

export default function ThankYou() {
  const { state } = useLocation();

  return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">¡Gracias por tu compra!</h1>
      <p className="mt-3 text-neutral-500">
        Tu pago se procesó correctamente. Te enviaremos la confirmación por correo.
      </p>
      {state?.chargeId && (
        <p className="mt-4 text-sm text-neutral-400">N° de operación: {state.chargeId}</p>
      )}
      {state?.monto != null && (
        <p className="mt-1 text-sm text-neutral-400">Monto pagado: {currencyFormatter.format(state.monto)}</p>
      )}
      {state?.entregaFecha && (
        <p className="mx-auto mt-6 max-w-md rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
          Entrega programada a partir del <span className="font-medium">{state.entregaFecha}</span>
          {state.entregaHorario ? <> en el horario de <span className="font-medium">{state.entregaHorario}</span></> : null}.
          Te contactaremos para confirmar el día exacto.
        </p>
      )}
      <Link
        to="/"
        className="mt-8 inline-block rounded-lg bg-ink px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
      >
        Volver al catálogo
      </Link>
    </main>
  );
}
