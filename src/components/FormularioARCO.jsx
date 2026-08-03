import { useState } from 'react';

// Formulario para ejercer los derechos ARCO de la Ley 29733.
//
// La política de privacidad ya los mencionaba, pero no había ninguna forma de
// ejercerlos: exactamente lo que la Autoridad Nacional de Protección de Datos
// sanciona. Ahora la solicitud queda registrada con folio y con la fecha
// límite de respuesta calculada, para que no se pase el plazo.

const DERECHOS = [
  { id: 'acceso', label: 'Acceso', ayuda: 'Quiero saber qué datos míos tienen.' },
  { id: 'rectificacion', label: 'Rectificación', ayuda: 'Quiero corregir un dato mío que está mal.' },
  { id: 'cancelacion', label: 'Cancelación', ayuda: 'Quiero que borren mis datos.' },
  { id: 'oposicion', label: 'Oposición', ayuda: 'Quiero que dejen de usarlos para algo concreto.' },
  { id: 'revocacion', label: 'Revocar consentimiento', ayuda: 'Retiro el permiso que di antes.' },
];

export default function FormularioARCO() {
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState({
    tipo: 'acceso', nombre: '', documento: '', email: '', telefono: '', detalle: '',
  });
  const [enviando, setEnviando] = useState(false);
  const [folio, setFolio] = useState('');
  const [error, setError] = useState('');

  const completo = form.nombre.trim() && form.documento.trim() && form.email.trim();

  async function enviar(e) {
    e.preventDefault();
    if (!completo) return;
    setEnviando(true);
    setError('');
    try {
      const res = await fetch('/api/derechos-arco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo registrar la solicitud.');
      setFolio(data.folio);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (folio) {
    return (
      <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-5">
        <p className="text-sm font-semibold text-green-900">✓ Solicitud registrada</p>
        <p className="mt-2 text-sm text-green-900">
          Tu número de folio es <span className="rounded bg-white px-2 py-0.5 font-mono">{folio}</span>.
          Guárdalo. Te responderemos al correo que nos diste dentro del plazo legal
          {form.tipo === 'acceso' ? ' de 20 días hábiles' : ' de 10 días hábiles'}.
        </p>
      </div>
    );
  }

  if (!abierto) {
    return (
      <div className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
        <p className="text-sm font-medium">¿Quieres ejercer tus derechos sobre tus datos?</p>
        <p className="mt-1 text-sm text-neutral-600">
          Puedes pedirnos ver, corregir o borrar la información que tenemos sobre ti.
        </p>
        <button
          onClick={() => setAbierto(true)}
          className="mt-3 rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          Ejercer mis derechos
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-8 space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
      <div>
        <p className="text-sm font-semibold">Ejercer mis derechos sobre mis datos</p>
        <p className="mt-1 text-xs text-neutral-500">
          Pedimos tu documento solo para comprobar que eres quien dices ser, como exige la ley
          antes de entregar o borrar datos personales.
        </p>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-neutral-700">¿Qué quieres hacer?</span>
        <div className="space-y-1.5">
          {DERECHOS.map((d) => (
            <label key={d.id} className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input
                type="radio"
                name="tipo"
                checked={form.tipo === d.id}
                onChange={() => setForm({ ...form, tipo: d.id })}
                className="mt-1"
              />
              <span>
                <strong>{d.label}</strong>
                <span className="block text-xs text-neutral-500">{d.ayuda}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-neutral-700">Nombre completo *</span>
          <input
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-neutral-700">DNI o CE *</span>
          <input
            value={form.documento}
            onChange={(e) => setForm({ ...form, documento: e.target.value })}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-neutral-700">Correo *</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-neutral-700">Teléfono</span>
          <input
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-neutral-700">Cuéntanos más (opcional)</span>
        <textarea
          value={form.detalle}
          onChange={(e) => setForm({ ...form, detalle: e.target.value })}
          rows={3}
          maxLength={1000}
          placeholder="Ej. quiero que borren mi teléfono de su lista de contactos."
          className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink"
        />
      </label>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={enviando || !completo}
          className="rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
        >
          {enviando ? 'Enviando...' : 'Enviar solicitud'}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:border-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
