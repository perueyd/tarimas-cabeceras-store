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
