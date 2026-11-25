import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { rutaDeConstancia } from '../lib/constancia.js';
import { NOMBRE_TIENDA, SITIO_URL } from '../data/sitio.js';
import { useCatalog } from '../context/CatalogContext.jsx';
import { currencyFormatter } from '../data/catalog.js';
import RecommendedProducts from '../components/RecommendedProducts.jsx';
import PostPurchaseSurvey from '../components/PostPurchaseSurvey.jsx';
import { useMeta } from '../lib/meta.js';

// Evento de calendario pre-llenado para el cliente (día completo de la entrega).
function buildCalendarUrl(state) {
  const inicio = state.entregaFecha.replace(/-/g, '');
  const sig = new Date(`${state.entregaFecha}T12:00:00`);
  sig.setDate(sig.getDate() + 1);
  const fin = sig.toISOString().slice(0, 10).replace(/-/g, '');
  const text = encodeURIComponent(`🚚 Entrega de mi pedido — ${NOMBRE_TIENDA}`);
  const details = encodeURIComponent(
    `Pedido: ${state.orderCode || ''}\nHorario: ${state.entregaHorario || 'por confirmar'}\nMonto: ${state.monto != null ? currencyFormatter.format(state.monto) : ''}`
  );
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${inicio}/${fin}&details=${details}`;
}

export default function ThankYou() {
  useMeta({ titulo: '¡Gracias por tu compra!', descripcion: 'Tu pedido quedó registrado. Guarda tu código para seguirlo.' });

  const { state } = useLocation();
  const porVerificar = state?.porVerificar;

  return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {porVerificar ? '¡Pedido registrado! 📝' : '¡Gracias por tu compra!'}
      </h1>
      <p className="mt-3 text-neutral-500">
        {porVerificar
          ? state?.pagoCulqi
            ? 'Recibimos tu pedido. Quedará confirmado automáticamente apenas Culqi nos avise que pagaste. No necesitas enviarnos el comprobante.'
            : `Recibimos tu pedido. Quedará confirmado apenas verifiquemos tu pago por ${state?.metodo || 'el método elegido'}. Si aún no nos enviaste tu comprobante por WhatsApp, hazlo para agilizar la confirmación.`
          : 'Tu pago se procesó correctamente. Te enviaremos la confirmación por correo.'}
      </p>
      {/* Cuotéalo BCP: el pago se termina en la página del BCP. Culqi la abre
          en otra pestaña, pero el iPhone la bloqueaba (25/11/2026): este botón
          la abre con el toque del cliente, que el navegador sí permite. */}
      {state?.cuotealo && (
        <div className="mx-auto mt-6 max-w-md rounded-xl border-2 border-sky-300 bg-sky-50 p-4">
          <p className="text-sm font-semibold text-sky-900">Falta un paso: termina tu pago en Cuotéalo BCP</p>
          <p className="mt-2 text-xs text-sky-900">
            Ahí pones tus datos y el BCP te dice al instante si te aprueba las cuotas. Cuando aceptes, tu pedido se
            confirma solo.
          </p>
          <a
            href={state.cuotealo}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-lg bg-[#0033a0] px-4 py-2 text-sm font-medium text-white"
          >
            Continuar en Cuotéalo BCP
          </a>
        </div>
      )}
      {/* PagoEfectivo: el código CIP con el que se paga en banca móvil, agentes o bodegas. */}
      {state?.cip && !state?.cuotealo && (
        <div className="mx-auto mt-6 max-w-md rounded-xl border-2 border-sky-300 bg-sky-50 p-4">
          <p className="text-sm font-semibold text-sky-900">Tu código de pago (CIP)</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-sky-900">{state.cip}</p>
          <p className="mt-2 text-xs text-sky-900">
            Págalo en tu banca móvil o por internet, o en un agente o bodega, buscando «PagoEfectivo».
            {state.venceCip ? ` Vence el ${new Date(state.venceCip * 1000).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'long', timeStyle: 'short' }).replace(/\.$/, '')}.` : ''}
          </p>
          <BotonCopiar texto={String(state.cip)} />
        </div>
      )}
      {/* El cobro salió bien pero el pedido no llegó a guardarse. Se avisa de
          forma destacada: si no, el cliente se va con un código que no
          funciona y acaba pagando dos veces. */}
      {state?.aviso && (
        <div className="mx-auto mt-6 max-w-md rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-left">
          <p className="text-sm font-semibold text-amber-900">⚠️ Importante</p>
          <p className="mt-1 text-sm text-amber-900">{state.aviso}</p>
          {state.chargeId && (
            <p className="mt-2 text-xs text-amber-800">
              Comprobante de pago:{' '}
              <span className="rounded bg-white px-1.5 py-0.5 font-mono">{state.chargeId}</span>
            </p>
          )}
          <a
            href={`https://wa.me/51951278010?text=${encodeURIComponent(
              `Hola, pagué en la web pero el pedido no se registró. Mi comprobante es: ${state.chargeId || ''}`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block rounded-lg bg-[#25D366] px-4 py-2 text-sm font-medium text-white"
          >
            Escribirnos por WhatsApp
          </a>
        </div>
      )}

      {state?.orderCode && !state?.aviso && (
        <>
          <p className="mt-4 text-sm font-medium">
            N° de pedido: <span className="rounded bg-neutral-100 px-2 py-1 font-mono">{state.orderCode}</span>
            <BotonCopiar texto={state.orderCode} />
          </p>
          <EnviarPorWhatsApp state={state} />
          <Link
            to={`/seguimiento?codigo=${encodeURIComponent(state.orderCode)}`}
            className="mt-2 inline-block text-sm text-sky-700 underline"
          >
            Ver el estado de mi pedido
          </Link>
          {/* La constancia es de la tienda; la boleta o factura llega aparte,
              del facturador. Se dice aquí para que el cliente no la espere en
              este enlace. */}
          <Link to={rutaDeConstancia(state.orderCode)} className="ml-4 mt-2 inline-block text-sm text-sky-700 underline">
            Ver la constancia de mi pedido
          </Link>
          <p className="mt-1 text-xs text-neutral-400">
            Tu boleta o factura electrónica te la enviamos aparte.
          </p>
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
        to="/tienda"
        className="mt-8 inline-block rounded-lg bg-ink px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
      >
        Volver al catálogo
      </Link>

      <PostPurchaseSurvey orderCode={state?.orderCode} />

      <div className="text-left">
        <RecommendedProducts title="¿Y si completas tu dormitorio?" />
      </div>
    </main>
  );
}

// Copia el número de pedido (pedido del dueño, 23/11/2026): el cliente lo
// necesita para rastrear o escribir por WhatsApp, y en el celular seleccionar
// un texto pequeño a mano es incómodo.
function BotonCopiar({ texto }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sin permiso para el portapapeles: el número sigue a la vista.
    }
  }
  return (
    <button
      type="button"
      onClick={copiar}
      className="ml-2 rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100"
    >
      {copiado ? '✓ Copiado' : 'Copiar'}
    </button>
  );
}

/**
 * Manda el pedido por WhatsApp a la tienda, con el enlace a la constancia
 * (pedido del dueño, 23/11/2026). El cliente se queda con el pedido en su
 * chat y el dueño lo recibe al instante. No es un envío automático: el
 * cliente toca «Enviar» en su WhatsApp (el envío automático exige la API
 * de WhatsApp Business, que es de pago).
 */
function EnviarPorWhatsApp({ state }) {
  const { storeConfig } = useCatalog();
  const numero = String(storeConfig.contacto?.whatsapp || storeConfig.whatsapp || '').replace(/\D/g, '');
  if (!numero) return null;
  const lineas = [
    `Hola, acabo de hacer mi pedido en ${NOMBRE_TIENDA}.`,
    `Pedido: ${state.orderCode}`,
    state.monto != null && `Monto: ${currencyFormatter.format(state.monto)}`,
    state.entregaFecha && `Entrega: desde el ${state.entregaFecha}${state.entregaHorario ? ` · ${state.entregaHorario}` : ''}`,
    `Constancia: ${SITIO_URL}${rutaDeConstancia(state.orderCode)}`,
  ].filter(Boolean);
  return (
    <a
      href={`https://wa.me/${numero}?text=${encodeURIComponent(lineas.join('\n'))}`}
      target="_blank"
      rel="noreferrer"
      className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-lg bg-[#25D366] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
    >
      📲 Enviar mi pedido por WhatsApp
    </a>
  );
}
