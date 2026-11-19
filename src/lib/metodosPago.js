// Métodos de pago activos y datos de cada billetera. Lo usan el checkout y la
// pestaña Pagos del panel, para que los dos lean la configuración igual.
//
// Antes Yape y Plin eran un solo método ("yapePlin"). Ahora van separados
// porque la boleta debe decir con cuál se pagó. Una tienda que tenía
// "yapePlin" encendido (o que nunca tocó la opción) arranca con los dos
// encendidos, sin tener que configurar nada.

export function metodosActivos(pm = {}) {
  const { yapePlin, ...resto } = pm;
  return {
    culqi: true,
    transferencia: true,
    // Pagar al recibir. Apagado salvo que el dueño lo encienda: compromete
    // fabricar un mueble a medida antes de haber cobrado nada.
    contraEntrega: pm.contraEntrega ?? false,
    ...resto,
    yape: pm.yape ?? yapePlin ?? true,
    plin: pm.plin ?? yapePlin ?? true,
  };
}

/** Número, titular y QR de Yape o de Plin. Plin hereda los datos de Yape si no tiene los suyos. */
export function billetera(cfg = {}, tipo) {
  if (tipo === 'plin') {
    return { nombre: 'Plin', numero: cfg.plin || cfg.yape, titular: cfg.plinTitular || cfg.yapeTitular, qr: cfg.plinQr };
  }
  return { nombre: 'Yape', numero: cfg.yape, titular: cfg.yapeTitular, qr: cfg.yapeQr };
}

/**
 * Textos guardados que todavía mencionan la tarjeta (o Culqi), para avisar
 * cuando el pago con tarjeta está apagado. El dueño la apagó y la tienda la
 * seguía prometiendo en el pie de página, en la portada, en una pregunta
 * frecuente y en las condiciones de compra (revisado el 19/11/2026).
 * Devuelve dónde se edita cada uno, como se ve en el panel.
 */
export function textosQueMencionanTarjeta(cfg = {}) {
  const menciona = (texto) => /tarjeta|culqi/i.test(String(texto || ''));
  const hallados = [];
  if (menciona(cfg.footer?.paymentText)) hallados.push({ donde: 'Cómo se ve → Branding (pie de página)', texto: cfg.footer.paymentText });
  for (const paso of cfg.landing?.comoFunciona?.pasos || []) {
    if (menciona(paso?.texto)) hallados.push({ donde: 'Cómo se ve → Página principal («Cómo funciona»)', texto: paso.texto });
  }
  for (const f of cfg.faq || []) {
    if (menciona(f?.a || f?.respuesta)) hallados.push({ donde: `Cómo funciona → Preguntas («${f.q || f.pregunta}»)`, texto: f.a || f.respuesta });
  }
  if (cfg.cuotasNumero > 1 && menciona(cfg.cuotasTexto)) hallados.push({ donde: 'Cómo funciona → Datos de la tienda (cuotas)', texto: cfg.cuotasTexto });
  if (menciona(cfg.legal?.terminosTexto)) {
    const frase = String(cfg.legal.terminosTexto).split(/\n|(?<=\.)\s/).find(menciona) || '';
    hallados.push({ donde: 'Ajustes delicados → Legal (Términos y condiciones)', texto: frase.trim() });
  }
  return hallados;
}
