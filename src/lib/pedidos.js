// Qué cuenta como venta, en un solo sitio.
//
// Parece una tontería —dos nombres de estado— pero de esto dependen cosas que
// no pueden discrepar entre sí:
//
//   · el total de "Ventas confirmadas" del panel,
//   · las gráficas de ventas por día y por producto,
//   · la hoja de cálculo que se descarga,
//   · y el IGV y la renta que se le declaran a la SUNAT.
//
// Si el panel contara un pedido que la declaración no cuenta, el dueño vería
// un número en pantalla y otro distinto al pagar impuestos, sin forma de saber
// cuál creer. Estaba escrito por duplicado (una copia en el panel y otra en
// api/_impuestos.js) hasta que se juntaron aquí.

// Los estados en los que el dinero YA entró. Tienen que existir de verdad en
// ESTADOS_VALIDOS de api/orders.js — hay una prueba que lo comprueba.
//
// "Pago por verificar" no cuenta: todavía puede caerse. "Cancelado" tampoco:
// ya se cayó. Declarar IGV por cualquiera de los dos es pagar impuestos por
// dinero que no se cobró.
export const ESTADOS_DE_VENTA = ['Pagado', 'Entregado'];

export function esVenta(pedido) {
  return ESTADOS_DE_VENTA.includes(pedido?.estado);
}
