// Los textos de la tienda: preguntas, datos, legales y encuesta.
//
// Cuatro pestañas que son casi todo formularios de texto largo.
// Los legales son los más delicados: lo que se guarda aquí manda sobre
// los textos del código.
//
// Salió de CatalogEditor.jsx, que tenía 3.360 líneas — el 16% de todo el
// código del proyecto en un solo archivo. Cada cambio pequeño obligaba a
// abrirlo entero.

import { useEffect, useState } from 'react';
import { PRIVACIDAD, TERMINOS } from '../../data/textosLegales.js';
import { Field, Seccion, useReordenar, useReordenarScopes } from './comunes.jsx';

export function FaqTab({ catalog, api, flash }) {
  const [faq, setFaq] = useState(() => (Array.isArray(catalog.storeConfig.faq) ? catalog.storeConfig.faq : []));
  const [saving, setSaving] = useState(false);

  function setItem(i, campo, valor) {
    setFaq((prev) => prev.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it)));
  }
  function agregar() {
    setFaq((prev) => [...prev, { q: '', a: '' }]);
  }
  function quitar(i) {
    setFaq((prev) => prev.filter((_, idx) => idx !== i));
  }
  // Reordenar (arrastrando o con las flechas) guarda al instante, igual que
  // en el resto del panel — no hace falta tocar "Guardar preguntas" solo para
  // cambiar el orden.
  function moverFaq(desde, hasta) {
    setFaq((prev) => {
      const nuevo = [...prev];
      const [movida] = nuevo.splice(desde, 1);
      nuevo.splice(hasta, 0, movida);
      api('POST', 'config', { faq: nuevo }).catch(() => {});
      return nuevo;
    });
  }
  function mover(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= faq.length) return;
    moverFaq(i, j);
  }
  const orden = useReordenarScopes();
  async function guardar() {
    setSaving(true);
    try {
      // Descarta preguntas vacías al guardar.
      const limpio = faq.map((it) => ({ q: (it.q || '').trim(), a: (it.a || '').trim() })).filter((it) => it.q && it.a);
      await api('POST', 'config', { faq: limpio });
      setFaq(limpio);
      flash('Preguntas frecuentes guardadas.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="mb-3 text-xs text-neutral-500">
        Se muestran en la portada, al final. El cliente toca una pregunta y se despliega la
        respuesta. Deja la lista vacía si no quieres mostrarlas.
      </p>
      <div className="space-y-3">
        {faq.map((it, i) => {
          const { arrastrando, destino } = orden.estado('faq', i);
          return (
          <div
            key={i}
            {...orden.zoneProps('faq', i, moverFaq)}
            className={`rounded-lg border bg-white p-3 transition ${arrastrando ? 'opacity-40' : ''} ${
              destino ? 'ring-2 ring-sky-400' : 'border-neutral-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                {...orden.handleProps('faq', i)}
                className="cursor-move select-none px-0.5 text-neutral-300 hover:text-neutral-500"
                title="Arrastra para reordenar"
              >
                ⠿
              </span>
              <span className="w-4 shrink-0 text-center text-[11px] font-medium text-neutral-400">{i + 1}</span>
              <input
                value={it.q}
                onChange={(e) => setItem(i, 'q', e.target.value)}
                placeholder="Pregunta (ej. ¿Cuánto demora la entrega?)"
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium outline-none focus:border-ink"
              />
              <button onClick={() => mover(i, -1)} disabled={i === 0} className="text-xs text-neutral-400 disabled:opacity-30" title="Subir">▲</button>
              <button onClick={() => mover(i, 1)} disabled={i === faq.length - 1} className="text-xs text-neutral-400 disabled:opacity-30" title="Bajar">▼</button>
              <button onClick={() => quitar(i)} className="text-xs text-red-600" title="Eliminar">✕</button>
            </div>
            <textarea
              value={it.a}
              onChange={(e) => setItem(i, 'a', e.target.value)}
              placeholder="Respuesta"
              rows={2}
              className="mt-2 w-full resize-none rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
            />
          </div>
          );
        })}
      </div>
      <button onClick={agregar} className="mt-3 text-xs text-sky-700 hover:underline">+ Agregar pregunta</button>
      <div className="mt-4">
        <button onClick={guardar} disabled={saving} className="rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
          {saving ? 'Guardando...' : 'Guardar preguntas'}
        </button>
      </div>
    </div>
  );
}

export function ConfigTab({ catalog, api, flash }) {
  const [cfg, setCfg] = useState(catalog.storeConfig);
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setCfg((prev) => ({ ...prev, [field]: value }));
  }
  function setBank(i, field, value) {
    setCfg((prev) => ({ ...prev, banks: prev.banks.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)) }));
  }
  function addBank() {
    setCfg((prev) => ({ ...prev, banks: [...(prev.banks || []), { banco: '', titular: '', cuenta: '', cci: '' }] }));
  }
  function removeBank(i) {
    setCfg((prev) => ({ ...prev, banks: prev.banks.filter((_, idx) => idx !== i) }));
  }
  function setSlot(i, field, value) {
    setCfg((prev) => ({ ...prev, deliverySlots: prev.deliverySlots.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)) }));
  }
  function addSlot() {
    setCfg((prev) => ({ ...prev, deliverySlots: [...(prev.deliverySlots || []), { id: '', label: '' }] }));
  }
  function removeSlot(i) {
    setCfg((prev) => ({ ...prev, deliverySlots: prev.deliverySlots.filter((_, idx) => idx !== i) }));
  }
  function setSocial(red, value) {
    setCfg((prev) => ({ ...prev, social: { ...(prev.social || {}), [red]: value } }));
  }
  function setNewsletter(field, value) {
    setCfg((prev) => ({ ...prev, newsletter: { ...(prev.newsletter || {}), [field]: value } }));
  }

  async function guardar() {
    setSaving(true);
    try {
      // Los pagos se guardan solo desde la pestaña Pagos: si esta pestaña los
      // mandara también, pisaría con datos viejos lo que se cambió allí.
      const { paymentMethods, yape, yapeTitular, yapeQr, plin, plinTitular, plinQr, ...resto } = cfg;
      await api('POST', 'config', resto);
      flash('Datos de la tienda guardados.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="mb-5 rounded-lg bg-neutral-50 p-3">
        <p className="mb-1 text-sm font-medium text-neutral-700">
          Datos legales del negocio <span className="font-normal text-neutral-400">(para el Libro de Reclamaciones)</span>
        </p>
        <p className="mb-3 text-xs text-neutral-500">
          Se muestran en la página pública del Libro de Reclamaciones para identificar al proveedor.
          Déjalos vacíos si aún no los tienes — la página igual funciona.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Razón social" value={cfg.razonSocial} onChange={(v) => set('razonSocial', v)} placeholder="Ej. CORPORACIÓN AGAMENON S.A.C." />
          <Field label="RUC" value={cfg.ruc} onChange={(v) => set('ruc', v)} placeholder="20xxxxxxxxx" />
          <div className="sm:col-span-2">
            <Field label="Domicilio fiscal" value={cfg.direccionFiscal} onChange={(v) => set('direccionFiscal', v)} placeholder="Dirección registrada del negocio" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="WhatsApp (con 51, sin espacios)" value={cfg.whatsapp} onChange={(v) => set('whatsapp', v)} placeholder="51987654321" />
        <Field label="Tu correo (aviso de pedido nuevo)" value={cfg.ownerEmail ?? ''} onChange={(v) => set('ownerEmail', v)} placeholder="tucorreo@gmail.com" />
        <Field label="Tiempo de fabricación/entrega" value={cfg.leadTime} onChange={(v) => set('leadTime', v)} placeholder="3 a 4 días hábiles" />
        <Field
          label="Días mínimos para entrega"
          value={cfg.deliveryMinDays}
          onChange={(v) => set('deliveryMinDays', Number(v) || 0)}
          type="number"
        />
        <Field
          label="Cuotas a mostrar (0 = no mostrar)"
          value={cfg.cuotasNumero ?? 0}
          onChange={(v) => set('cuotasNumero', Math.max(Number(v) || 0, 0))}
          type="number"
        />
        <Field
          label="Texto junto a las cuotas"
          value={cfg.cuotasTexto ?? ''}
          onChange={(v) => set('cuotasTexto', v)}
          placeholder="sin intereses con tu tarjeta"
        />
      </div>
      <p className="mt-1 text-xs text-neutral-400">
        Las cuotas son solo informativas para animar la compra («o 3 cuotas de S/ X»); no cobran en
        cuotas de verdad. Ponlo en 0 si no quieres mostrarlo.
      </p>

      <p className="mt-5 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500">
        Los métodos de pago, los números de Yape y Plin y sus QR se configuran en la pestaña <strong>Pagos</strong>.
      </p>

      <div className="mt-5 rounded-lg bg-neutral-50 p-3">
        <p className="mb-1 text-sm font-medium text-neutral-700">Aviso de color en la página del producto</p>
        <p className="mb-2 text-xs text-neutral-500">
          Aparece en letra pequeña debajo del selector de color. Sirve para avisar que el tono
          puede variar. Déjalo vacío para no mostrar nada.
        </p>
        <textarea
          value={cfg.avisoColor ?? ''}
          onChange={(e) => set('avisoColor', e.target.value)}
          rows={2}
          placeholder="El color de la foto es referencial. El tono real puede variar según tu pantalla..."
          className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
        />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-neutral-700">Horarios de entrega</p>
        <div className="space-y-2">
          {(cfg.deliverySlots || []).map((s, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={s.id}
                onChange={(e) => setSlot(i, 'id', e.target.value)}
                placeholder="id (ej. manana)"
                className="w-1/3 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
              />
              <input
                value={s.label}
                onChange={(e) => setSlot(i, 'label', e.target.value)}
                placeholder="Mañana (9:00 a.m. – 1:00 p.m.)"
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
              />
              <button onClick={() => removeSlot(i)} className="text-sm text-red-600">✕</button>
            </div>
          ))}
        </div>
        <button onClick={addSlot} className="mt-2 text-xs text-sky-700 hover:underline">+ Agregar horario</button>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-neutral-700">Cuentas bancarias (para transferencia)</p>
        <div className="space-y-3">
          {(cfg.banks || []).map((b, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-lg bg-neutral-50 p-3 sm:grid-cols-4">
              <input value={b.banco} onChange={(e) => setBank(i, 'banco', e.target.value)} placeholder="Banco" className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-ink" />
              <input value={b.titular} onChange={(e) => setBank(i, 'titular', e.target.value)} placeholder="Titular" className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-ink" />
              <input value={b.cuenta} onChange={(e) => setBank(i, 'cuenta', e.target.value)} placeholder="N° de cuenta" className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-ink" />
              <div className="flex gap-2">
                <input value={b.cci} onChange={(e) => setBank(i, 'cci', e.target.value)} placeholder="CCI" className="flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-ink" />
                <button onClick={() => removeBank(i)} className="text-sm text-red-600">✕</button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addBank} className="mt-2 text-xs text-sky-700 hover:underline">+ Agregar cuenta bancaria</button>
      </div>

      <div className="mt-5 rounded-lg bg-neutral-50 p-3">
        <p className="mb-1 text-sm font-medium text-neutral-700">Redes sociales (pie de página)</p>
        <p className="mb-3 text-xs text-neutral-500">
          Pega el enlace completo de cada red. Solo se muestra el ícono de las que llenes.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Instagram" value={cfg.social?.instagram || ''} onChange={(v) => setSocial('instagram', v)} placeholder="https://instagram.com/tu-tienda" />
          <Field label="Facebook" value={cfg.social?.facebook || ''} onChange={(v) => setSocial('facebook', v)} placeholder="https://facebook.com/tu-tienda" />
          <Field label="TikTok" value={cfg.social?.tiktok || ''} onChange={(v) => setSocial('tiktok', v)} placeholder="https://tiktok.com/@tu-tienda" />
          <Field label="YouTube" value={cfg.social?.youtube || ''} onChange={(v) => setSocial('youtube', v)} placeholder="https://youtube.com/@tu-tienda" />
          <Field label="X (Twitter)" value={cfg.social?.x || ''} onChange={(v) => setSocial('x', v)} placeholder="https://x.com/tu-tienda" />
        </div>
      </div>

      <div className="mt-5 rounded-lg bg-neutral-50 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
          <input
            type="checkbox"
            checked={cfg.newsletter?.activo ?? true}
            onChange={(e) => setNewsletter('activo', e.target.checked)}
          />
          Mostrar el formulario de suscripción (newsletter) en el pie de página
        </label>
        {(cfg.newsletter?.activo ?? true) && (
          <div className="mt-3 space-y-3">
            <Field label="Título" value={cfg.newsletter?.titulo || ''} onChange={(v) => setNewsletter('titulo', v)} placeholder="Recibe nuestras ofertas y novedades" />
            <Field label="Descripción" value={cfg.newsletter?.descripcion || ''} onChange={(v) => setNewsletter('descripcion', v)} placeholder="Suscríbete y entérate primero de descuentos..." />
            <p className="text-xs text-neutral-400">
              Los correos suscritos los ves en el panel → pestaña <strong>📧 Suscriptores</strong>.
            </p>
          </div>
        )}
      </div>

      <button onClick={guardar} disabled={saving} className="mt-6 rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
        {saving ? 'Guardando...' : 'Guardar datos de la tienda'}
      </button>
    </div>
  );
}

// ============================================================
// LEGAL (Política de Privacidad y Términos y Condiciones)
// ============================================================
export function LegalTab({ catalog, api, flash }) {
  const [legal, setLegal] = useState({
    privacidadActiva: true,
    privacidadTitulo: 'Política de Privacidad',
    privacidadTexto: '',
    terminosActivo: true,
    terminosTitulo: 'Términos y Condiciones',
    terminosTexto: '',
    ...(catalog.storeConfig.legal || {}),
  });
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setLegal((prev) => ({ ...prev, [field]: value }));
  }
  async function guardar() {
    setSaving(true);
    try {
      await api('POST', 'config', { legal });
      flash('Páginas legales guardadas.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="mb-5 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
        ⚠️ Estos textos son plantillas orientativas. Antes de confiar en ellas, haz que un
        abogado en Perú las revise. Los datos <strong>{'{{proveedor}}'}</strong> y{' '}
        <strong>{'{{whatsapp}}'}</strong> se reemplazan solos con tu razón social/RUC/domicilio y tu
        número de WhatsApp (edítalos en «Datos de la tienda»).
      </div>

      {/* Política de Privacidad */}
      <div className="rounded-lg border border-neutral-200 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
          <input type="checkbox" checked={legal.privacidadActiva} onChange={(e) => set('privacidadActiva', e.target.checked)} />
          Mostrar la Política de Privacidad (enlace en el pie de página)
        </label>
        {legal.privacidadActiva && (
          <div className="mt-3 space-y-2">
            <Field label="Título" value={legal.privacidadTitulo} onChange={(v) => set('privacidadTitulo', v)} />
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-neutral-700">Texto</span>
              <textarea
                value={legal.privacidadTexto}
                onChange={(e) => set('privacidadTexto', e.target.value)}
                rows={12}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
              />
              <span className="mt-1 block text-xs text-neutral-400">Separa los párrafos con una línea en blanco.</span>
            </label>
            {/* El texto guardado en la base manda sobre el que trae el
                proyecto, así que hay que ofrecer explícitamente la versión
                completa; si no, nunca llegaría a la web. */}
            {legal.privacidadTexto !== PRIVACIDAD && (
              <button
                type="button"
                onClick={() => set('privacidadTexto', PRIVACIDAD)}
                className="w-full rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-left text-xs font-medium text-sky-900 transition hover:border-sky-500"
              >
                ⚖️ Usar el texto completo — añade los proveedores que tratan los datos, el
                envío al extranjero, los plazos de conservación y los derechos ARCO (Ley 29733)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Términos y Condiciones */}
      <div className="mt-4 rounded-lg border border-neutral-200 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
          <input type="checkbox" checked={legal.terminosActivo} onChange={(e) => set('terminosActivo', e.target.checked)} />
          Mostrar los Términos y Condiciones (enlace en el pie de página)
        </label>
        {legal.terminosActivo && (
          <div className="mt-3 space-y-2">
            <Field label="Título" value={legal.terminosTitulo} onChange={(v) => set('terminosTitulo', v)} />
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-neutral-700">Texto</span>
              <textarea
                value={legal.terminosTexto}
                onChange={(e) => set('terminosTexto', e.target.value)}
                rows={12}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
              />
              <span className="mt-1 block text-xs text-neutral-400">Separa los párrafos con una línea en blanco.</span>
            </label>
            {legal.terminosTexto !== TERMINOS && (
              <button
                type="button"
                onClick={() => set('terminosTexto', TERMINOS)}
                className="w-full rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-left text-xs font-medium text-sky-900 transition hover:border-sky-500"
              >
                ⚖️ Usar el texto completo — añade que los precios incluyen IGV, el derecho de
                devolución, la garantía legal y la jurisdicción (Ley 29571)
              </button>
            )}
          </div>
        )}
      </div>

      <button onClick={guardar} disabled={saving} className="mt-6 rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
        {saving ? 'Guardando...' : 'Guardar páginas legales'}
      </button>
    </div>
  );
}

// ============================================================
// ENCUESTA POST-COMPRA
// ============================================================
export function EncuestaTab({ catalog, api, flash }) {
  const [encuesta, setEncuesta] = useState({
    activa: true,
    titulo: '¿Nos ayudas con una encuesta rápida?',
    descripcion: '',
    preguntas: [],
    ...(catalog.storeConfig.encuesta || {}),
  });
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setEncuesta((prev) => ({ ...prev, [field]: value }));
  }
  function setPregunta(i, field, value) {
    setEncuesta((prev) => ({
      ...prev,
      preguntas: prev.preguntas.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)),
    }));
  }
  function setOpciones(i, value) {
    // Las opciones se editan como texto separado por comas.
    const opciones = value.split(',').map((o) => o.trim()).filter(Boolean);
    setPregunta(i, 'opciones', opciones);
  }
  function addPregunta(tipo) {
    const id = `p${Date.now().toString(36)}`;
    const nueva = tipo === 'opciones'
      ? { id, label: '', tipo: 'opciones', opciones: [] }
      : { id, label: '', tipo: 'texto' };
    setEncuesta((prev) => ({ ...prev, preguntas: [...prev.preguntas, nueva] }));
  }
  function removePregunta(i) {
    setEncuesta((prev) => ({ ...prev, preguntas: prev.preguntas.filter((_, idx) => idx !== i) }));
  }
  async function guardar() {
    setSaving(true);
    try {
      await api('POST', 'config', { encuesta });
      flash('Encuesta guardada.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <p className="mb-3 text-xs text-neutral-500">
        La encuesta aparece en la página de gracias, después de comprar. Es opcional para el
        cliente (puede tocar «Ahora no»). Las respuestas las ves en el panel → pestaña{' '}
        <strong>📊 Encuestas</strong>.
      </p>

      <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
        <input type="checkbox" checked={encuesta.activa} onChange={(e) => set('activa', e.target.checked)} />
        Mostrar la encuesta después de la compra
      </label>

      {encuesta.activa && (
        <>
          <div className="mt-4 space-y-3">
            <Field label="Título" value={encuesta.titulo} onChange={(v) => set('titulo', v)} placeholder="¿Nos ayudas con una encuesta rápida?" />
            <Field label="Descripción" value={encuesta.descripcion} onChange={(v) => set('descripcion', v)} placeholder="Es opcional y nos ayuda a mejorar." />
          </div>

          <p className="mb-2 mt-6 text-sm font-medium text-neutral-700">Preguntas</p>
          <div className="space-y-3">
            {encuesta.preguntas.map((p, i) => (
              <div key={p.id} className="rounded-lg bg-neutral-50 p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                    {p.tipo === 'opciones' ? 'Opciones' : 'Texto libre'}
                  </span>
                  <input
                    value={p.label}
                    onChange={(e) => setPregunta(i, 'label', e.target.value)}
                    placeholder="Escribe la pregunta"
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
                  />
                  <button onClick={() => removePregunta(i)} className="text-xs text-red-600 hover:underline">Eliminar</button>
                </div>
                {p.tipo === 'opciones' && (
                  <input
                    value={(p.opciones || []).join(', ')}
                    onChange={(e) => setOpciones(i, e.target.value)}
                    placeholder="Opciones separadas por coma: Google, Instagram, Recomendación"
                    className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-3">
            <button onClick={() => addPregunta('opciones')} className="text-xs text-sky-700 hover:underline">+ Pregunta de opciones</button>
            <button onClick={() => addPregunta('texto')} className="text-xs text-sky-700 hover:underline">+ Pregunta de texto libre</button>
          </div>
        </>
      )}

      <button onClick={guardar} disabled={saving} className="mt-6 block rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
        {saving ? 'Guardando...' : 'Guardar encuesta'}
      </button>
    </div>
  );
}

// ============================================================
// Campo de texto reutilizable
// ============================================================
