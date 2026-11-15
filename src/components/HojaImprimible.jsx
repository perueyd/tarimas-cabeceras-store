import { createPortal } from 'react-dom';

// Lo que va dentro se imprime SOLO, en una hoja limpia.
//
// Es una copia que no se ve en pantalla y cuelga directamente de <body>. Al
// imprimir, la hoja de estilos apaga todo lo demás (src/index.css,
// ".solo-imprimir"). Hace falta que cuelgue de <body> porque la constancia del
// panel vive dentro de una ventana flotante sobre la lista de pedidos: ahí
// dentro no hay forma de apagar lo de alrededor sin que deje huecos.
export default function HojaImprimible({ children }) {
  return createPortal(<div className="solo-imprimir">{children}</div>, document.body);
}
