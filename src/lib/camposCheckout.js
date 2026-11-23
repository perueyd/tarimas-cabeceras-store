import { revisarComprobante } from './documento.js';

// Qué le falta al formulario de pago, en el MISMO orden en que se ve en
// pantalla. Antes el pago solo decía «Completa todos los campos» y el cliente
// tenía que buscar cuál; ahora se le lleva al primero que falta y se le dice
// su nombre (pedido del dueño, 23/11/2026).

const CAMPOS = [
  ['nombre', 'tu nombre completo'],
  ['email', 'tu correo electrónico'],
  ['telefono', 'tu teléfono o WhatsApp'],
  ['direccion', 'la dirección'],
  ['distrito', 'el distrito'],
];

/**
 * El primer campo que falta o está mal, o null si todo está completo.
 * @returns {{ campo: string, mensaje: string } | null}
 */
export function primerCampoQueFalta(form = {}) {
  for (const [campo, nombre] of CAMPOS) {
    if (!String(form[campo] || '').trim()) return { campo, mensaje: `Falta ${nombre}.` };
  }
  const factura = form.docTipo === 'factura';
  if (!String(form.docNumero || '').trim()) {
    return { campo: 'docNumero', mensaje: `Falta tu ${factura ? 'RUC' : 'DNI'} para el comprobante.` };
  }
  const errorDoc = revisarComprobante({ tipo: form.docTipo, numero: form.docNumero, razonSocial: form.razonSocial });
  if (errorDoc) {
    // Con el RUC bien escrito, lo único que puede faltar es la razón social.
    const campo = factura && /razón social/i.test(errorDoc) ? 'razonSocial' : 'docNumero';
    return { campo, mensaje: errorDoc };
  }
  if (!form.entregaFecha) return { campo: 'entregaFecha', mensaje: 'Falta elegir la fecha de entrega.' };
  if (!form.entregaHorario) return { campo: 'entregaHorario', mensaje: 'Falta elegir el horario de entrega.' };
  return null;
}
