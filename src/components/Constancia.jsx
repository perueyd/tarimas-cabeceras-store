import { NOMBRE_TIENDA, SITIO_URL, logoEsImagen, urlSeguimiento } from '../data/sitio.js';
import { useCatalog } from '../context/CatalogContext.jsx';
import { separarIGV } from '../lib/igv.js';
import { esLineaDeServicio } from '../lib/servicios.js';
import { LEYENDA_CONSTANCIA, TITULO_CONSTANCIA } from '../lib/constancia.js';

// La constancia de pedido, lista para imprimir o guardar como PDF.
//
// Se usa en dos sitios con el MISMO dibujo:
//   · la página pública /constancia?codigo=… — sin datos personales, porque
//     con el código la puede abrir cualquiera que lo tenga;
//   · el panel del dueño — con el nombre, el documento y la dirección del
//     cliente, que ahí sí están (el pedido completo solo se lee con la clave).
// Lo que cambia entre una y otra es solo qué trae `pedido`: lo que no viene,
// no se pinta.
//
// La leyenda de que NO es un comprobante de pago va siempre (ver
// src/lib/constancia.js): es lo que evita que este papel se tome por la boleta.

function fechaLarga(iso) {
  try {
    return new Date(iso).toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function Dato({ etiqueta, children }) {
  if (!children) return null;
  return (
    <p className="text-sm">
      <span className="text-neutral-500">{etiqueta}: </span>
      <span className="font-medium text-neutral-900">{children}</span>
    </p>
  );
}

export default function Constancia({ pedido }) {
  const { storeConfig, currencyFormatter, getColorById, getSizeById } = useCatalog();
  const marca = storeConfig.branding || {};
  const items = Array.isArray(pedido.items) ? pedido.items : [];
  const total = Number(pedido.monto) || 0;
  const descuento = Number(pedido.promoDescuento) || 0;
  const { base, igv } = pedido.base != null ? { base: pedido.base, igv: pedido.igv } : separarIGV(total);
  const pagado = pedido.estado === 'Pagado' || pedido.estado === 'Entregado';

  // "Queen · Azul · Brazos: con brazos": lo elegido, en palabras.
  function detalleDe(i) {
    if (esLineaDeServicio(i)) return 'Servicio';
    const partes = [
      getSizeById(i.sizeId)?.label || i.sizeId,
      getColorById(i.colorId)?.label || i.colorId,
      i.colorId2 && (getColorById(i.colorId2)?.label || i.colorId2),
      ...(Array.isArray(i.opciones) ? i.opciones.map((o) => `${o.label}: ${o.valor}`) : []),
    ];
    return partes.filter(Boolean).join(' · ');
  }

  return (
    <article className="constancia mx-auto max-w-2xl bg-white p-6 text-neutral-900 sm:p-10">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-5">
        <div className="flex items-center gap-3">
          {logoEsImagen(marca.logo) ? (
            <img src={marca.logo} alt="" className="h-10 w-auto" />
          ) : (
            <span className="text-2xl font-bold tracking-tighter">{marca.logo || 'E|D'}</span>
          )}
          <div>
            <p className="text-sm font-semibold tracking-wide">{marca.nombre || NOMBRE_TIENDA}</p>
            {(storeConfig.razonSocial || storeConfig.ruc) && (
              <p className="text-xs text-neutral-500">
                {storeConfig.razonSocial}
                {storeConfig.razonSocial && storeConfig.ruc ? ' · ' : ''}
                {storeConfig.ruc && `RUC ${storeConfig.ruc}`}
              </p>
            )}
            {storeConfig.direccionFiscal && <p className="text-xs text-neutral-500">{storeConfig.direccionFiscal}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold uppercase tracking-wide">{TITULO_CONSTANCIA}</p>
          <p className="font-mono text-sm">{pedido.code}</p>
          <p className="text-xs text-neutral-500">{fechaLarga(pedido.fecha)}</p>
        </div>
      </header>

      {/* La leyenda va arriba, antes de los importes: quien solo mire el total
          tiene que haber pasado por ella. */}
      <p className="mt-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-medium leading-relaxed text-amber-900">
        {LEYENDA_CONSTANCIA}
        {pedido.comprobante && (
          <>
            {' '}
            Comprobante electrónico de este pedido: <span className="font-mono font-bold">{pedido.comprobante}</span>.
          </>
        )}
      </p>

      <section className="mt-5 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
        <Dato etiqueta="Estado">{pedido.estado}</Dato>
        <Dato etiqueta="Forma de pago">{pedido.metodo}</Dato>
        <Dato etiqueta="Cliente">{pedido.nombre}</Dato>
        <Dato etiqueta={pedido.docTipo === 'factura' ? 'RUC' : 'DNI'}>{pedido.docNumero}</Dato>
        <Dato etiqueta="Razón social">{pedido.razonSocial}</Dato>
        <Dato etiqueta="Teléfono">{pedido.telefono}</Dato>
        <Dato etiqueta="Entrega">{pedido.entrega}</Dato>
        <Dato etiqueta="Dirección">
          {pedido.direccion && `${pedido.direccion}${pedido.zona ? ` (${pedido.zona})` : ''}`}
        </Dato>
      </section>

      {/* En el celular la tabla no cabía y se cortaba la columna «Importe»:
          letra más chica y columnas angostas en pantallas pequeñas. */}
      <table className="mt-6 w-full text-left text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-xs uppercase tracking-wide text-neutral-500">
            <th className="py-2 pr-2 font-medium">Descripción</th>
            <th className="w-9 py-2 text-center font-medium sm:w-12">Cant.</th>
            <th className="w-[4.5rem] py-2 text-right font-medium sm:w-24">P. unit.</th>
            <th className="w-[4.5rem] py-2 text-right font-medium sm:w-24">Importe</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, n) => (
            <tr key={n} className="border-b border-neutral-100 align-top">
              <td className="py-2 pr-2">
                <span className="break-words font-medium">{i.productName}</span>
                {detalleDe(i) && <span className="block text-xs text-neutral-500">{detalleDe(i)}</span>}
              </td>
              <td className="py-2 text-center">{i.qty}</td>
              <td className="py-2 text-right">{i.unitPrice != null ? currencyFormatter.format(i.unitPrice) : '—'}</td>
              <td className="py-2 text-right">
                {i.unitPrice != null ? currencyFormatter.format(i.unitPrice * i.qty) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <dl className="w-full max-w-xs space-y-1 text-sm">
          {descuento > 0 && (
            <div className="flex justify-between text-neutral-600">
              <dt>Descuento{pedido.promoCode ? ` (${pedido.promoCode})` : ''}</dt>
              <dd>− {currencyFormatter.format(descuento)}</dd>
            </div>
          )}
          <div className="flex justify-between text-neutral-600">
            <dt>Valor de venta</dt>
            <dd>{currencyFormatter.format(base)}</dd>
          </div>
          <div className="flex justify-between text-neutral-600">
            <dt>IGV (18 %)</dt>
            <dd>{currencyFormatter.format(igv)}</dd>
          </div>
          <div className="flex justify-between border-t border-neutral-300 pt-2 text-base font-bold">
            <dt>{pagado ? 'Total pagado' : 'Total del pedido'}</dt>
            <dd>{currencyFormatter.format(total)}</dd>
          </div>
          {pedido.adelanto > 0 && (
            <>
              <div className="flex justify-between text-neutral-600">
                <dt>Adelanto</dt>
                <dd>{currencyFormatter.format(pedido.adelanto)}</dd>
              </div>
              <div className="flex justify-between text-neutral-600">
                <dt>Saldo al recibir</dt>
                <dd>{currencyFormatter.format(pedido.saldo || 0)}</dd>
              </div>
            </>
          )}
        </dl>
      </div>

      {!pagado && pedido.estado !== 'Cancelado' && (
        <p className="mt-4 text-xs text-neutral-500">
          El pago de este pedido todavía está por verificar. Esta constancia no acredita que esté pagado.
        </p>
      )}

      <footer className="mt-8 border-t border-neutral-200 pt-4 text-xs text-neutral-500">
        <p>
          Sigue tu pedido en <span className="font-medium text-neutral-700">{urlSeguimiento(pedido.code).replace(/^https?:\/\//, '')}</span>
        </p>
        <p className="mt-1">
          {SITIO_URL.replace(/^https?:\/\//, '')}
          {storeConfig.contacto?.telefonoFormato ? ` · WhatsApp ${storeConfig.contacto.telefonoFormato}` : ''}
        </p>
      </footer>
    </article>
  );
}
