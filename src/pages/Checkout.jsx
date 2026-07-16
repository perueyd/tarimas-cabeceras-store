import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { currencyFormatter } from '../data/catalog.js';

const CULQI_PUBLIC_KEY = import.meta.env.VITE_CULQI_PUBLIC_KEY;

export default function Checkout() {
  const { items, totalAmount, clearCart } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', direccion: '', distrito: '' });
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
  }, [form, totalAmount]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function isFormValid() {
    return form.nombre && form.email && form.telefono && form.direccion && form.distrito;
  }

  function abrirCulqi() {
    if (!isFormValid()) {
      setErrorMsg('Completa todos los campos antes de pagar.');
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
      title: 'Tarimas & Cabeceras Perú',
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
      const res = await fetch('/api/create-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          amount: Math.round(totalAmount * 100),
          email: form.email,
          nombre: form.nombre,
          telefono: form.telefono,
          direccion: `${form.direccion}, ${form.distrito}`,
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.user_message || data?.merchant_message || 'El pago no pudo procesarse.');
      }
      clearCart();
      navigate('/gracias', { state: { chargeId: data.id, monto: totalAmount } });
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Datos de envío y pago</h1>

      <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
        <Field label="Nombre completo" name="nombre" value={form.nombre} onChange={handleChange} full />
        <Field label="Correo electrónico" name="email" type="email" value={form.email} onChange={handleChange} />
        <Field label="Teléfono" name="telefono" value={form.telefono} onChange={handleChange} />
        <Field label="Dirección" name="direccion" value={form.direccion} onChange={handleChange} full />
        <Field label="Distrito / Ciudad" name="distrito" value={form.distrito} onChange={handleChange} full />
      </form>

      <div className="mt-6 flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3">
        <span className="text-sm text-neutral-500">Total a pagar</span>
        <span className="text-lg font-semibold">{currencyFormatter.format(totalAmount)}</span>
      </div>

      {errorMsg && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{errorMsg}</p>
      )}

      <button
        onClick={abrirCulqi}
        disabled={status === 'paying'}
        className="mt-6 w-full rounded-lg bg-ink px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
      >
        {status === 'paying' ? 'Procesando pago...' : 'Pagar con Culqi'}
      </button>

      <p className="mt-3 text-center text-xs text-neutral-400">
        Pago seguro procesado por Culqi. No almacenamos los datos de tu tarjeta.
      </p>
    </main>
  );
}

function Field({ label, name, value, onChange, type = 'text', full = false }) {
  return (
    <label className={`text-sm ${full ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1 block text-neutral-700">{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink"
      />
    </label>
  );
}
