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

// Los estados por los que se puede filtrar la lista del panel, en el orden en
// que se muestran. `estado` vacío = "Todos".
//
// Está aquí y no junto a los botones porque antes existía DOS veces: una lista
// para pintar los botones y un `if` aparte para decidir qué pedidos se veían.
// Al añadir un estado había que acordarse de tocar las dos, y si no coincidían
// el botón existía pero no filtraba nada — una pestaña que al pulsarla decía
// "no hay pedidos" teniéndolos.
//
// Los nombres tienen que existir en ESTADOS_VALIDOS de api/orders.js; hay una
// prueba que lo comprueba, porque una letra de más aquí no da ningún error:
// simplemente el filtro sale siempre vacío.
export const FILTROS_PEDIDO = [
  { id: 'todos', label: 'Todos' },
  { id: 'pendientes', label: 'Por verificar', estado: 'Pago por verificar', urgente: true },
  { id: 'pagados', label: 'Pagados', estado: 'Pagado' },
  { id: 'entregados', label: 'Entregados', estado: 'Entregado' },
  { id: 'cancelados', label: 'Cancelados', estado: 'Cancelado' },
];

export function filtrarPedidos(pedidos = [], filtro) {
  const estado = FILTROS_PEDIDO.find((f) => f.id === filtro)?.estado;
  return estado ? pedidos.filter((p) => p.estado === estado) : pedidos;
}
