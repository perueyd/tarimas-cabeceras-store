import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapPicker from '../components/MapPicker.jsx';
import { useCart } from '../context/CartContext.jsx';
import { currencyFormatter, getColorById, getSizeById, storeConfig } from '../data/catalog.js';

const CULQI_PUBLIC_KEY = import.meta.env.VITE_CULQI_PUBLIC_KEY;

// Fecha mínima de entrega: hoy + días de fabricación.
function minDeliveryDate() {
  const d = new Date(Date.now() + storeConfig.deliveryMinDays * 86400000);
  return d.toISOString().split('T')[0];
}

export default function Checkout() {
  const { items, totalAmount, clearCart } = useCart();
  const navigate = useNavigate();
  const [zona, setZona] = useState('lima'); // 'lima' | 'provincia'
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    distrito: '',
    referencia: '',
    departamento: '',
    provincia: '',
    entregaFecha: '',
    entregaHorario: '',
  });
  const [ubicacion, setUbicacion] = useState(null); // {lat, lng} del mapa
  const [metodoPago, setMetodoPago] = useState('culqi'); // 'culqi' | 'yape-plin' | 'transferencia'
  const [status, setStatus] = useState('idle'); // idle | paying | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (items.length === 0) navigate('/carrito');
  }, [items, navigate]);

  useEffect(() => {
    // Callback global que Culqi invoca tras cerrar su modal con un token.
    window.culqi = function culqiCallback() {
      if (window.Culqi.token) {
        procesarPago(window.Culqi.token.id);
      } else if (window.Culqi.order) {
        procesarPago(null, window.Culqi.order.id);
      } else {
        setStatus('error');
        setErrorMsg('No se pudo generar el token de pago. Intenta nuevamente.');
      }
    };
    return () => {
      window.culqi = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, totalAmount, ubicacion]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function isFormValid() {
    return (
      form.nombre &&
      form.email &&
      form.telefono &&
      form.direccion &&
      form.distrito &&
      form.entregaFecha &&
      form.entregaHorario
    );
  }

  function abrirCulqi() {
    if (!isFormValid()) {
      setErrorMsg('Completa todos los campos (incluida la fecha y el horario de entrega) antes de pagar.');
      return;
    }
    if (!CULQI_PUBLIC_KEY) {
      setErrorMsg('Falta configurar VITE_CULQI_PUBLIC_KEY en las variables de entorno.');
      return;
    }
    setErrorMsg('');
    setStatus('idle');

    window.Culqi.publicKey = CULQI_PUBLIC_KEY;
    window.Culqi.settings({
      title: 'Espacios y Diseño',
      currency: 'PEN',
      amount: Math.round(totalAmount * 100), // Culqi trabaja en céntimos
    });
    window.Culqi.options({
      lang: 'es',
      installments: false,
      paymentMethods: { tarjeta: true, yape: true, billetera: false, bancaMovil: false, agente: false, cuotealo: false },
    });
    window.Culqi.open();
  }

  async function procesarPago(token) {
    setStatus('paying');
    try {
      const slot = storeConfig.deliverySlots.find((s) => s.id === form.entregaHorario);
      const res = await fetch('/api/create-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          amount: Math.round(totalAmount * 100),
          email: form.email,
          nombre: form.nombre,
          telefono: form.telefono,
          zona: 'Lima Metropolitana',
          direccion: `${form.direccion}, ${form.distrito}${form.referencia ? ` (Ref: ${form.referencia})` : ''}`,
          ubicacion: ubicacion ? `https://www.google.com/maps?q=${ubicacion.lat},${ubicacion.lng}` : '',
          entrega: `${form.entregaFecha} · ${slot ? slot.label : form.entregaHorario}`,
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.user_message || data?.merchant_message || 'El pago no pudo procesarse.');
      }
      clearCart();
      navigate('/gracias', {
        state: {
          chargeId: data.id,
          orderCode: data.orderCode,
          monto: totalAmount,
          entregaFecha: form.entregaFecha,
          entregaHorario: slot ? slot.label : '',
        },
      });
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  }

  // Registra un pedido con pago manual (Yape/Plin directo o transferencia):
  // queda como "Pago por verificar" y se abre WhatsApp para enviar el comprobante.
  async function registrarPedidoManual(metodoLabel) {
    if (!isFormValid()) {
      setErrorMsg('Completa todos los campos (incluida la fecha y el horario de entrega) antes de continuar.');
      return;
    }
    setErrorMsg('');
    setStatus('paying');
    const slot = storeConfig.deliverySlots.find((s) => s.id === form.entregaHorario);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metodo: metodoLabel,
          monto: totalAmount,
          nombre: form.nombre,
          email: form.email,
          telefono: form.telefono,
          zona: 'Lima Metropolitana',
          direccion: `${form.direccion}, ${form.distrito}${form.referencia ? ` (Ref: ${form.referencia})` : ''}`,
          ubicacion: ubicacion ? `https://www.google.com/maps?q=${ubicacion.lat},${ubicacion.lng}` : '',
          entrega: `${form.entregaFecha} · ${slot ? slot.label : form.entregaHorario}`,
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.code) throw new Error(data?.error || 'No se pudo registrar el pedido.');

      if (storeConfig.whatsapp) {
        const msg = encodeURIComponent(
          `Hola, soy ${form.nombre}. Acabo de pagar por ${metodoLabel} mi pedido *${data.code}* por ${currencyFormatter.format(totalAmount)}. Aquí envío mi comprobante:`
        );
        window.open(`https://wa.me/${storeConfig.whatsapp}?text=${msg}`, '_blank');
      }
      clearCart();
      navigate('/gracias', {
        state: {
          orderCode: data.code,
          metodo: metodoLabel,
          porVerificar: true,
          monto: totalAmount,
          entregaFecha: form.entregaFecha,
          entregaHorario: slot ? slot.label : '',
        },
      });
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message + ' También puedes escribirnos por WhatsApp para confirmar tu pedido.');
    }
  }

  // Mensaje de WhatsApp para cotizar envío a provincia, con el resumen del pedido.
  function mensajeCotizacion() {
    const lineas = items.map((i) => {
      const size = getSizeById(i.sizeId);
      const color = getColorById(i.colorId);
      return `• ${i.productName} x${i.qty} (${size?.label || i.sizeId}, ${color?.label || i.colorId}) — ${currencyFormatter.format(i.unitPrice * i.qty)}`;
    });
    const destino = [form.distrito, form.provincia, form.departamento].filter(Boolean).join(', ');
    return encodeURIComponent(
      `Hola, quiero cotizar el envío de este pedido a provincia:\n\n${lineas.join('\n')}\n\nTotal productos: ${currencyFormatter.format(totalAmount)} (envío por cotizar)\nDestino: ${destino || '(por indicar)'}\nMi nombre: ${form.nombre || '(por indicar)'}`
    );
  }

  const zonaBtn = (id, label) => (
    <button
      type="button"
      onClick={() => setZona(id)}
      className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition ${
        zona === id ? 'border-ink bg-ink text-white' : 'border-neutral-300 hover:border-neutral-500'
      }`}
    >
      {label}
    </button>
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Datos de envío y pago</h1>

      <p className="mb-2 text-sm font-medium text-neutral-700">¿Dónde entregamos?</p>
      <div className="mb-6 flex gap-3">
        {zonaBtn('lima', 'Lima Metropolitana')}
        {zonaBtn('provincia', 'Provincia')}
      </div>

      {zona === 'provincia' ? (
        <ProvinciaFlow form={form} handleChange={handleChange} mensajeCotizacion={mensajeCotizacion} totalAmount={totalAmount} />
      ) : (
        <>
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
            <Field label="Nombre completo" name="nombre" value={form.nombre} onChange={handleChange} full />
            <Field label="Correo electrónico" name="email" type="email" value={form.email} onChange={handleChange} />
            <Field label="Teléfono / WhatsApp" name="telefono" value={form.telefono} onChange={handleChange} />
            <Field label="Dirección" name="direccion" value={form.direccion} onChange={handleChange} full />
            <Field label="Distrito" name="distrito" value={form.distrito} onChange={handleChange} />
            <Field
              label="Referencia (opcional)"
              name="referencia"
              value={form.referencia}
              onChange={handleChange}
              required={false}
              placeholder="Ej. portón negro, frente al parque"
            />

            <div className="sm:col-span-2">
              <MapPicker onChange={setUbicacion} />
              <p className="mt-2 text-xs text-neutral-500">
                💡 Si estás en el lugar de entrega, usa «Usar mi ubicación actual» y el pin se colocará solo.
              </p>
            </div>

            <div className="sm:col-span-2 mt-2 rounded-lg border border-neutral-200 bg-white p-4">
              <p className="text-sm font-medium">Entrega</p>
              <p className="mt-1 text-xs text-neutral-500">
                Cada mueble se fabrica a pedido: el tiempo de fabricación y entrega es de{' '}
                <span className="font-medium text-neutral-700">{storeConfig.leadTime}</span>.
                Elige desde cuándo podemos entregarte y en qué horario estarás en casa.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Fecha de entrega preferida"
                  name="entregaFecha"
                  type="date"
                  value={form.entregaFecha}
                  onChange={handleChange}
                  min={minDeliveryDate()}
                />
                <label className="text-sm">
                  <span className="mb-1 block text-neutral-700">Rango de horario</span>
                  <select
                    name="entregaHorario"
                    value={form.entregaHorario}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-ink"
                  >
                    <option value="">Selecciona un horario</option>
                    {storeConfig.deliverySlots.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </form>

          <div className="mt-6 flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3">
            <span className="text-sm text-neutral-500">Total a pagar</span>
            <span className="text-lg font-semibold">{currencyFormatter.format(totalAmount)}</span>
          </div>

          {/* ===== Método de pago ===== */}
          <p className="mb-2 mt-6 text-sm font-medium text-neutral-700">¿Cómo quieres pagar?</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetodoBtn
              active={metodoPago === 'culqi'}
              onClick={() => setMetodoPago('culqi')}
              title="Tarjeta o Yape"
              subtitle="Confirmación automática (Culqi)"
            />
            <MetodoBtn
              active={metodoPago === 'yape-plin'}
              onClick={() => setMetodoPago('yape-plin')}
              title="Yape / Plin directo"
              subtitle="Envía tu comprobante"
            />
            <MetodoBtn
              active={metodoPago === 'transferencia'}
              onClick={() => setMetodoPago('transferencia')}
              title="Transferencia"
              subtitle="Cuenta bancaria"
            />
          </div>

          {metodoPago === 'yape-plin' && (
            <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-purple-950">
              <p className="font-medium">Paga con Yape o Plin al número:</p>
              <p className="mt-2 text-2xl font-bold tracking-wide">{storeConfig.yape}</p>
              <p className="text-xs text-purple-800">{storeConfig.yapeTitular}</p>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs">
                <li>Abre tu app de Yape o Plin y envía {currencyFormatter.format(totalAmount)} a ese número.</li>
                <li>Guarda la captura de tu pago.</li>
                <li>Toca el botón de abajo: registramos tu pedido y se abre WhatsApp para que nos envíes tu comprobante.</li>
              </ol>
              <p className="mt-2 text-xs text-purple-800">
                Tu pedido queda «por verificar» y lo confirmamos apenas revisemos el pago.
              </p>
            </div>
          )}

          {metodoPago === 'transferencia' && (
            <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
              <p className="font-medium">Transferencia bancaria</p>
              {storeConfig.banks.length > 0 ? (
                <div className="mt-2 space-y-3">
                  {storeConfig.banks.map((b) => (
                    <div key={b.cci || b.cuenta} className="rounded-md bg-white/70 p-3 text-xs">
                      <p className="font-semibold">{b.banco} — {b.titular}</p>
                      <p className="mt-1">Cuenta: <span className="font-mono">{b.cuenta}</span></p>
                      <p>CCI: <span className="font-mono">{b.cci}</span></p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs">
                  Escríbenos por WhatsApp y te enviamos los datos de la cuenta al instante.
                </p>
              )}
              <p className="mt-3 text-xs text-sky-800">
                Después de transferir {currencyFormatter.format(totalAmount)}, toca el botón de abajo:
                registramos tu pedido y nos envías tu constancia por WhatsApp.
              </p>
            </div>
          )}

          {errorMsg && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{errorMsg}</p>
          )}

          {metodoPago === 'culqi' ? (
            <>
              <button
                onClick={abrirCulqi}
                disabled={status === 'paying'}
                className="mt-6 w-full rounded-lg bg-ink px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
              >
                {status === 'paying' ? 'Procesando pago...' : 'Pagar con tarjeta o Yape'}
              </button>
              <p className="mt-3 text-center text-xs text-neutral-400">
                Pago seguro procesado por Culqi. No almacenamos los datos de tu tarjeta.
              </p>
            </>
          ) : (
            <button
              onClick={() => registrarPedidoManual(metodoPago === 'yape-plin' ? 'Yape/Plin' : 'Transferencia bancaria')}
              disabled={status === 'paying'}
              className="mt-6 w-full rounded-lg bg-ink px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
            >
              {status === 'paying' ? 'Registrando pedido...' : 'Ya pagué — registrar pedido y enviar comprobante'}
            </button>
          )}
        </>
      )}
    </main>
  );
}

function MetodoBtn({ active, onClick, title, subtitle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-3 text-left transition ${
        active ? 'border-ink bg-ink text-white' : 'border-neutral-300 hover:border-neutral-500'
      }`}
    >
      <span className="block text-sm font-medium">{title}</span>
      <span className={`block text-xs ${active ? 'text-white/70' : 'text-neutral-500'}`}>{subtitle}</span>
    </button>
  );
}

// Flujo para provincia: el envío corre por cuenta del cliente y se cotiza antes de pagar.
function ProvinciaFlow({ form, handleChange, mensajeCotizacion, totalAmount }) {
  return (
    <div>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Envíos a provincia</p>
        <p className="mt-1">
          El costo del envío corre por cuenta del cliente y se cotiza antes del pago
          (depende del destino y la agencia de transporte). Déjanos tu destino y te
          respondemos con el costo total para completar tu compra.
        </p>
      </div>

      <form className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
        <Field label="Nombre completo" name="nombre" value={form.nombre} onChange={handleChange} full />
        <Field label="Departamento" name="departamento" value={form.departamento} onChange={handleChange} placeholder="Ej. Cusco" />
        <Field label="Provincia" name="provincia" value={form.provincia} onChange={handleChange} placeholder="Ej. Cusco" />
        <Field label="Distrito" name="distrito" value={form.distrito} onChange={handleChange} full placeholder="Ej. Wanchaq" />
      </form>

      <div className="mt-6 flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3">
        <span className="text-sm text-neutral-500">Total productos (sin envío)</span>
        <span className="text-lg font-semibold">{currencyFormatter.format(totalAmount)}</span>
      </div>

      {storeConfig.whatsapp ? (
        <a
          href={`https://wa.me/${storeConfig.whatsapp}?text=${mensajeCotizacion()}`}
          target="_blank"
          rel="noreferrer"
          className="mt-6 block w-full rounded-lg bg-[#25D366] px-6 py-3 text-center text-sm font-medium text-white transition hover:opacity-90"
        >
          Cotizar envío por WhatsApp
        </a>
      ) : (
        <p className="mt-6 rounded-lg bg-neutral-100 px-4 py-3 text-center text-sm text-neutral-600">
          Escríbenos para cotizar tu envío a provincia y completar la compra.
        </p>
      )}
      <p className="mt-3 text-center text-xs text-neutral-400">
        Tu carrito queda guardado: cuando tengas la cotización podrás completar el pago.
      </p>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', full = false, required = true, placeholder, min }) {
  return (
    <label className={`text-sm ${full ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1 block text-neutral-700">{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        min={min}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink"
      />
    </label>
  );
}
