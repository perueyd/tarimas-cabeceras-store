import { FILTROS_PEDIDO } from '../../lib/pedidos.js';

// El filtro de la lista de pedidos.
//
// POR QUÉ CAMBIÓ DE ASPECTO: antes eran cinco pastillas con borde, exactamente
// iguales a las pestañas de arriba. En la pantalla de Pedidos había TRES filas
// de botones idénticos apiladas —grupos, pestañas y esto— y las tres parecían
// menú: no se veía dónde acababa la navegación y empezaba el contenido, y la
// más importante de las tres (los pedidos por verificar) era la que menos
// destacaba, porque competía con otras diez etiquetas del mismo tamaño.
//
// Ahora es una sola línea sin cajas, pegada a la lista que filtra, y cada
// estado lleva al lado cuántos pedidos tiene. El que está puesto se ve con
// fondo gris claro; los demás, en gris. Así se lee como una herramienta de la
// lista, no como un tercer nivel de pestañas.
//
// Los números van SIEMPRE, incluso en cero: saber que no hay ninguno cancelado
// es información, y si solo aparecieran los que tienen pedidos, los botones
// cambiarían de sitio cada vez que entra uno nuevo.
export default function FiltroPedidos({ pedidos = [], filtro, onElegir }) {
  return (
    <div className="fila-deslizable mb-4 flex flex-wrap items-center gap-1 text-sm">
      {FILTROS_PEDIDO.map((f) => {
        const cuantos = f.estado ? pedidos.filter((p) => p.estado === f.estado).length : pedidos.length;
        const puesto = filtro === f.id;
        // Lo urgente se marca en rojo aunque el filtro esté sin pulsar: es el
        // único número de esta fila que obliga al dueño a hacer algo hoy.
        const rojo = f.urgente && cuantos > 0;

        return (
          <button
            key={f.id}
            onClick={() => onElegir(f.id)}
            className={`whitespace-nowrap rounded-md px-2.5 py-1.5 transition ${
              puesto ? 'bg-neutral-100 font-medium text-ink' : 'text-neutral-500 hover:bg-neutral-50 hover:text-ink'
            }`}
          >
            {f.label}
            <span className={`ml-1.5 text-xs ${rojo ? 'font-semibold text-red-600' : 'text-neutral-400'}`}>
              {cuantos}
            </span>
          </button>
        );
      })}
    </div>
  );
}
