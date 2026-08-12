import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ProductImage from '../components/ProductImage.jsx';
import ColorPicker from '../components/ColorPicker.jsx';
import ProductZoomModal from '../components/ProductZoomModal.jsx';
import BotonCompartir from '../components/BotonCompartir.jsx';
import VerEnMiPared from '../components/VerEnMiPared.jsx';
import RecommendedProducts from '../components/RecommendedProducts.jsx';
import { useCart } from '../context/CartContext.jsx';
import { resolveProductImage, useCatalog } from '../context/CatalogContext.jsx';
import { trackAddToCart } from '../lib/analytics.js';
import { getUnitPrice } from '../lib/pricing.js';

// Normaliza un elemento de la galería. Puede venir de cuatro formas:
//  · una URL simple (fotos viejas, no cambian de color)
//  · { url, tintable } — también se pinta con el color elegido
//  · { url, porTamano } — tiene una versión por cada tamaño
//  · { url, porTamano, segunOpcion } — además cambia según lo que elija el
//    cliente en un grupo de opciones
// La tercera es la de las fichas de medidas: la de 2 Plazas dice 150 cm y la
// King dice 200, así que la ficha tiene que seguir al tamaño que eligió el
// cliente. Si no trae la de ese tamaño, se usa la de siempre.
//
// La cuarta es la cabecera aérea: no es el mismo mueble medido de otra forma,
// es otro mueble — sin laterales, sin falda, colgado en la pared y con la
// altura contada desde el piso. Su ficha no puede ser la del pedestal.
function normalizarFotoGaleria(item, sizeId, opciones) {
  if (typeof item === 'string') return { url: item, tintable: false };
  const grupo = item.segunOpcion?.grupo;
  const variante = grupo ? item.segunOpcion.valores?.[opciones?.[grupo]] : null;
  const fuente = variante || item;
  const delTamano = fuente.porTamano?.[sizeId];
  return {
    url: delTamano || fuente.url || item.url,
    tintable: Boolean(item.tintable),
    sigueAlTamano: Boolean(delTamano),
  };
}

// El aviso que trae la variante elegida, si la hay. El texto vive en el
// catálogo junto a la ficha, no aquí: así se cambia desde los datos y esta
// página no tiene que saber qué es "aérea".
function avisoDeVariante(product, opciones) {
  const fotos = Array.isArray(product?.gallery) ? product.gallery : [];
  for (const f of fotos) {
    if (!f || typeof f !== 'object' || !f.segunOpcion) continue;
    const aviso = f.segunOpcion.valores?.[opciones?.[f.segunOpcion.grupo]]?.aviso;
    if (aviso) return aviso;
  }
  return null;
}

// Las especificaciones han llegado a guardarse de TRES formas distintas:
//  · objeto { Material: 'Madera' }            -> lo que guarda el panel
//  · lista  [{ label, value }]                -> como trabaja el formulario
//  · objeto { 0: {label, value}, 1: {...} }   -> una lista que se guardó mal
// La tercera es la que salía en la tienda como "[object Object]". En vez de
// perseguir cuál se guardó, se aceptan las tres y siempre se dibuja una lista.
function normalizarSpecs(specs) {
  const bruto = Array.isArray(specs) ? specs : specs && typeof specs === 'object' ? Object.entries(specs) : [];
  const filas = bruto.map((item) => {
    // De una lista: { label, value }
    if (!Array.isArray(item)) return { label: item?.label, value: item?.value };
    // De un objeto: [clave, valor]. El valor puede ser el texto... o el
    // renglón entero, si lo que se guardó era en realidad una lista.
    const [clave, valor] = item;
    if (valor && typeof valor === 'object') return { label: valor.label, value: valor.value };
    return { label: clave, value: valor };
  });
  return filas
    .filter((f) => f.label != null && String(f.label).trim() !== '')
    .map((f) => ({ label: String(f.label), value: String(f.value ?? '') }));
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { colors, currencyFormatter, sizes, storeConfig, getProductById, loaded } = useCatalog();
  const product = getProductById(id);
  const { addItem } = useCart();

  const availableSizes = product ? sizes.filter((s) => product.sizePricing[s.id] != null) : [];

  // Si llegó desde el catálogo filtrando por medida, se abre en ESA medida.
  // Si la que pide no existe en este producto, el efecto de más abajo la
  // corrige sola al primer tamaño disponible.
  const [searchParams] = useSearchParams();
  const tamanoPedido = searchParams.get('tamano');
  const [sizeId, setSizeId] = useState(tamanoPedido || availableSizes[0]?.id);
  // Colores según el tamaño elegido: si ese tamaño tiene su propia lista
  // (colorsBySize) se usa esa; si no, la lista general del producto — una
  // cabecera King puede venir en menos colores que una de 1.5 plaza.
  const colorIdsForSize = product ? product.colorsBySize?.[sizeId] || product.availableColors : [];
  const availableColors = colors.filter((c) => colorIdsForSize.includes(c.id));
  // Colores de la SEGUNDA tela (el detalle: botones, panel, ribete). Si el
  // dueño no eligió una lista aparte se usan los mismos de la tela principal —
  // pero muchas veces el detalle viene en menos colores que el cuerpo.
  const colorIds2 = product?.availableColors2?.length ? product.availableColors2 : colorIdsForSize;
  const availableColors2 = colors.filter((c) => colorIds2.includes(c.id));

  const [colorId, setColorId] = useState(availableColors[0]?.id);
  // Segundo color: solo se usa si la foto tiene dos telas distintas (se
  // detecta sola al cargar la imagen — ver ProductImage/imagenRegiones).
  const [colorId2, setColorId2] = useState(availableColors[0]?.id);
  const [dosTelas, setDosTelas] = useState(false);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [enMiPared, setEnMiPared] = useState(false); // ventana ampliada de la imagen
  const [activeIdx, setActiveIdx] = useState(0); // qué foto se ve en grande: 0 = la principal, 1+ = galería
  // El cliente aún no eligió color: se muestra la foto TAL CUAL la subiste (a
  // color, sin desaturar). Recién al tocar un color se aplica el teñido — así
  // la primera impresión nunca sale "plomo" por el filtro de desaturado.
  const [colorElegido, setColorElegido] = useState(false);

  // Al entrar a OTRO producto (ej. desde "También te puede interesar") sin que
  // el componente se remonte, se reinicia la vista para no arrastrar el estado
  // del producto anterior (una foto de galería que no existe aquí, etc.).
  useEffect(() => {
    setActiveIdx(0);
    setColorElegido(false);
  }, [id]);

  // Elegir un color, dentro o fuera de la ventana ampliada, cuenta como "el
  // cliente ya eligió" — a partir de ahí la imagen se pinta.
  function elegirColor(idSel) {
    setColorId(idSel);
    setColorElegido(true);
  }
  function elegirColor2(idSel) {
    setColorId2(idSel);
    setColorElegido(true);
  }

  // Opciones del producto (ej. brazos, tipo de patas, tipo de botón).
  // Arranca con el primer valor de cada grupo ya elegido.
  const gruposOpciones = useMemo(
    () => (Array.isArray(product?.opciones) ? product.opciones : []),
    [product]
  );
  const [opcionesTocadas, setOpcionesTocadas] = useState(() =>
    Object.fromEntries(
      (Array.isArray(product?.opciones) ? product.opciones : [])
        .filter((g) => g.valores?.length)
        .map((g) => [g.id, g.valores[0].id])
    )
  );

  // Un valor puede IMPONER el de otro grupo. La cabecera aérea no lleva
  // laterales: son las piezas que la apoyan en el pedestal, así que colgada no
  // existen. Sin esto se podía pedir "Aérea + Con laterales", que no se
  // fabrica, y el pedido llegaba con dos cosas que se contradicen.
  //
  // La regla vive en el catálogo (valor.fuerza), no aquí: esta página no tiene
  // por qué saber qué es "aérea", y el día que cambie se cambia en los datos.
  const { valores: opciones, forzados } = useMemo(() => {
    const impuestos = {};
    for (const g of gruposOpciones) {
      const v = (g.valores || []).find((x) => x.id === opcionesTocadas[g.id]);
      if (v?.fuerza) Object.assign(impuestos, v.fuerza);
    }
    return { valores: { ...opcionesTocadas, ...impuestos }, forzados: impuestos };
  }, [gruposOpciones, opcionesTocadas]);
  const setOpciones = setOpcionesTocadas;

  // Identifica la lista de colores disponible. Cambia tanto al elegir otro
  // tamaño como cuando el catálogo termina de cargar (llega async), así que
  // sirve para corregir el color en ambos casos.
  const colorKey = `${availableColors.map((c) => c.id).join(',')}|${availableColors2.map((c) => c.id).join(',')}`;
  // El tamaño también puede quedar sin elegir si al montar el catálogo aún no
  // había cargado — este key detecta cuándo aparecen los tamaños.
  const sizeKey = availableSizes.map((s) => s.id).join(',');

  // Corrige la selección cuando el color/tamaño elegido no está en la lista
  // vigente (color que no aplica al nuevo tamaño, o valores que quedaron sin
  // fijar porque el catálogo cargó después del primer render).
  useEffect(() => {
    if (availableSizes.length && !availableSizes.some((s) => s.id === sizeId)) {
      setSizeId(availableSizes[0].id);
    }
    if (availableColors.length && !availableColors.some((c) => c.id === colorId)) {
      setColorId(availableColors[0].id);
    }
    if (availableColors2.length && !availableColors2.some((c) => c.id === colorId2)) {
      setColorId2(availableColors2[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizeKey, colorKey]);

  // Para pintar: si el estado aún no se corrigió (justo tras cargar), se usa el
  // primer color disponible como respaldo, así la imagen nunca sale sin color.
  const selectedColor = colors.find((c) => c.id === colorId) || availableColors[0];
  const selectedColor2 = colors.find((c) => c.id === colorId2) || availableColors2[0];
  const priceInfo = useMemo(
    () => (product ? getUnitPrice(product, sizeId, opciones) : null),
    [product, sizeId, opciones]
  );
  const unitPrice = priceInfo?.unitPrice ?? 0;
  // Imagen según color y tamaño: foto propia del color, si no la del tamaño,
  // si no la imagen base teñida (ver resolveProductImage).
  const img = product ? resolveProductImage(product, selectedColor?.id, sizeId) : null;

  // Todas las "vistas" del modelo: la principal (cambia de color) + las fotos
  // de galería que el dueño haya subido — algunas pueden también cambiar de
  // color (otro ángulo del mismo mueble), otras se muestran tal cual.
  const vistas = product
    ? [
        { url: img.src, tintable: img.tintable },
        ...(Array.isArray(product.gallery)
          ? product.gallery.map((item) => normalizarFotoGaleria(item, sizeId, opciones))
          : []),
      ]
    : [];
  // Si la foto principal cambia (porque el cliente eligió otro tamaño, o un
  // color con foto propia), se vuelve a ella. Si no, el cliente que estaba
  // mirando una foto de galería seguía viéndola mientras la medida de al lado
  // ya decía otra cosa: la ficha decía "King, llega en 2 piezas" y la foto
  // mostraba una tarima de una sola pieza.
  // Excepción: las fotos que YA siguen al tamaño (las fichas de medidas) no
  // hacen saltar de vuelta — al contrario, si el cliente está comparando la
  // ficha de 2 Plazas con la King, lo que quiere es ver la ficha cambiar.
  const urlPrincipal = img?.src;
  useEffect(() => {
    setActiveIdx((idx) => {
      if (idx === 0) return 0;
      const foto = product?.gallery?.[idx - 1];
      return foto && typeof foto === 'object' && foto.porTamano ? idx : 0;
    });
  }, [urlPrincipal, product]);

  const vistaActiva = vistas[activeIdx] || vistas[0];
  const specs = normalizarSpecs(product?.specs);

  // Las decisiones del cliente, numeradas. Con tamaño, 21 colores, un segundo
  // color y las opciones de tela y laterales, la ficha era una lista larga sin
  // orden aparente: numerarlas dice de un vistazo cuántas cosas hay que elegir
  // y cuántas faltan. Se calcula aquí porque las secciones aparecen y
  // desaparecen (el segundo color solo si la foto tiene dos telas).
  const pasos = [];
  if (availableSizes.length) pasos.push('tamano');
  if (availableColors.length) pasos.push('color');
  if (dosTelas && availableColors2.length) pasos.push('color2');
  gruposOpciones.forEach((g) => pasos.push(`op:${g.id}`));
  const numeroDe = (clave) => pasos.indexOf(clave) + 1;
  // Corrección manual de "qué parte cambia de color", si el dueño la hizo para
  // ESTA foto (se guarda por dirección de foto, así cada ángulo tiene la suya).
  const zonasManual = vistaActiva ? product?.zonasFoto?.[vistaActiva.url] : undefined;
  // Medida visible sobre la imagen: la propia de este producto para el tamaño
  // elegido, o la general del tamaño si no la personalizó.
  const tamanoElegido = availableSizes.find((s) => s.id === sizeId);
  const medidaActual = tamanoElegido ? (product?.sizeDims?.[tamanoElegido.id] || tamanoElegido.dims) : null;
  // ¿La foto que se está viendo es de OTRA medida? Solo cuenta si el cliente
  // está mirando la foto principal (en una ficha de medidas o una foto de
  // ambiente el aviso no viene a cuento) y hay más de una medida donde elegir.
  const fotoDeOtraMedida =
    activeIdx === 0 &&
    availableSizes.length > 1 &&
    !product?.colorImages?.[selectedColor?.id] &&
    !product?.sizeImages?.[sizeId];
  // Aviso de la variante elegida (la cabecera aérea es otro mueble, no el mismo
  // en otra posición). Se muestra siempre que esté elegida, se esté mirando la
  // foto que se esté mirando.
  const avisoVariante = avisoDeVariante(product, opciones);

  // Los productos creados desde el panel solo existen en la base de datos, así
  // que en el primer render (antes de que responda /api/catalog) todavía no
  // están. Sin esta espera, un enlace recién compartido mostraba "Producto no
  // encontrado" durante un instante.
  if (!product && !loaded) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-neutral-500">Cargando producto…</p>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p>Producto no encontrado.</p>
        <Link to="/tienda" className="mt-4 inline-block underline">Volver al catálogo</Link>
      </main>
    );
  }

  function handleAddToCart() {
    // Se guarda la imagen ya resuelta para el color elegido, así el carrito
    // muestra la foto correcta (propia del color o base teñida).
    const item = {
      productId: product.id,
      productName: product.name,
      baseImage: img.src,
      tintable: img.tintable,
      sizeId,
      // Se usa el color efectivo (con respaldo) por si el estado aún no se
      // corrigió tras la carga async del catálogo.
      colorId: selectedColor?.id,
      // Solo se guarda el segundo color si la foto realmente tiene dos telas.
      colorId2: dosTelas ? selectedColor2?.id : undefined,
      opciones,
      // Detalle legible ("Brazos: Con brazos") para mostrarlo en el carrito
      // sin tener que volver a buscarlo en el catálogo.
      opcionesDetalle: priceInfo?.detalle || [],
      qty,
      unitPrice,
    };
    addItem(item);
    trackAddToCart(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleBuyNow() {
    handleAddToCart();
    navigate('/carrito');
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      {product.oculto && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          👁️ Vista previa — este producto está <strong>oculto</strong> y no aparece en la tienda. Para publicarlo, ponlo en «Mostrar» desde el panel.
        </div>
      )}
      {/* Vuelve a la categoría de la que vino, no a la portada: así el cliente
          no pierde el filtro que traía. */}
      <Link
        to={product.category ? `/tienda?categoria=${product.category}` : '/tienda'}
        className="text-sm text-neutral-500 hover:text-ink"
      >
        ← Volver al catálogo
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          {/* El botón "Ver en grande" existe siempre, tiña la foto o no —
              solo cambia lo que hay ADENTRO (repintable o tal cual). */}
          <button
            type="button"
            onClick={() => setZoom(true)}
            className="group relative block w-full cursor-zoom-in"
            aria-label="Ver la imagen en grande"
          >
            {vistaActiva.tintable ? (
              <ProductImage
                baseImage={vistaActiva.url}
                colorHex={selectedColor?.hex}
                colorHex2={selectedColor2?.hex}
                // Solo la foto PRINCIPAL decide si el mueble tiene dos telas;
                // las demás vistas usan ese mismo resultado, para que el
                // segundo selector no aparezca/desaparezca al cambiar de foto.
                onDosTelas={activeIdx === 0 ? setDosTelas : undefined}
                alt={product.name}
                className="aspect-[4/3] w-full rounded-xl"
                tintable
                mostrarColor={colorElegido}
                zonasManual={zonasManual}
                invertirTelas={product.invertirTelas}
              />
            ) : (
              <img loading="lazy" decoding="async"
                src={vistaActiva.url}
                alt={product.name}
                className="aspect-[4/3] w-full rounded-xl object-cover"
              />
            )}
            {medidaActual && (
              <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
                📐 {medidaActual}
              </span>
            )}
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
              🔍 Ver en grande
            </span>
          </button>

          {/* No hay foto de cada modelo en cada medida (son 34 modelos por 4
              medidas). Cuando falta la de la medida elegida se muestra la que
              hay, y el cliente ve que cambia el precio pero no la foto: parece
              que la web no le hizo caso. Esta línea lo dice y lo manda a la
              ficha, que sí es la de su medida. */}
          {(fotoDeOtraMedida || avisoVariante) && (
            <div className="mt-2 space-y-1.5 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
              {/* El de la variante va primero: cambia QUÉ mueble es, no solo
                  de qué medida es la foto. */}
              {avisoVariante && <p>⚠️ {avisoVariante}</p>}
              {fotoDeOtraMedida && (
                <p>
                  La foto es <strong className="font-medium text-neutral-600">referencial</strong>:
                  es este mismo modelo, fotografiado en otra medida. Las medidas exactas de{' '}
                  {tamanoElegido?.label} están en la ficha de medidas, aquí abajo.
                </p>
              )}
            </div>
          )}

          {/* La duda que frena una compra de mueble es "¿me quedará bien?".
              Esto la responde: la cámara del celular con el mueble encima. */}
          <button
            type="button"
            onClick={() => setEnMiPared(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-ink px-4 py-3 text-sm font-semibold transition hover:bg-neutral-50"
          >
            📷 Ver en mi pared
            <span className="text-xs font-normal text-neutral-500">— con la cámara</span>
          </button>

          {/* Compartir va justo debajo de la foto: es donde el cliente decide
              "esto se lo mando a mi esposa", no al final de la página. */}
          <BotonCompartir
            nombre={product.name}
            precio={currencyFormatter.format(unitPrice)}
            className="mt-2"
          />

          {/* Miniaturas: la principal (cambia de color) + las fotos de galería
              (algunas también cambian de color, otras se ven tal cual). */}
          {vistas.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {vistas.map((v, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  className={`relative shrink-0 overflow-hidden rounded-lg border ${activeIdx === i ? 'border-ink ring-2 ring-ink' : 'border-neutral-200'}`}
                  title={i === 0 ? 'Foto principal' : v.tintable ? 'Esta foto también cambia de color' : 'Foto adicional'}
                >
                  <img loading="lazy" decoding="async" src={v.url} alt="" className="h-16 w-16 object-cover" />
                  {v.tintable && (
                    <span className="absolute bottom-0.5 right-0.5 rounded-full bg-white/90 px-1 text-[9px]">🎨</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
          <p className="mt-2 text-neutral-500">{product.shortDescription}</p>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="text-xl font-semibold">{currencyFormatter.format(unitPrice)}</p>
            {priceInfo?.discountPercent > 0 && (
              <>
                {/* El tachado incluye los recargos de opciones, para comparar
                    manzanas con manzanas contra el precio final de arriba. */}
                <p className="text-sm text-neutral-400 line-through">
                  {currencyFormatter.format(priceInfo.original + priceInfo.extra)}
                </p>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                  -{priceInfo.discountPercent}%
                </span>
              </>
            )}
          </div>
          {/* Cuotas referenciales (informativo, no cobra en cuotas). */}
          {storeConfig.cuotasNumero > 1 && unitPrice > 0 && (
            <p className="mt-1 text-sm text-neutral-500">
              o {storeConfig.cuotasNumero} cuotas de{' '}
              <span className="font-medium text-neutral-700">
                {currencyFormatter.format(unitPrice / storeConfig.cuotasNumero)}
              </span>
              {storeConfig.cuotasTexto ? ` ${storeConfig.cuotasTexto}` : ''}
            </p>
          )}

          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-neutral-700">
              <Paso n={numeroDe('tamano')} /> Tamaño
            </p>
            {/* En rejilla y no "en fila que se va cortando": con las medidas
                dentro, cada botón salía de un ancho (219, 219, 278, 281 px) y
                quedaban tres filas desiguales, que es lo que hacía ver la
                página cargada. Todos iguales se leen de un vistazo. */}
            <div className="grid grid-cols-2 gap-2">
              {availableSizes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSizeId(s.id)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                    sizeId === s.id
                      ? 'border-ink bg-ink text-white'
                      : 'border-neutral-300 hover:border-neutral-500'
                  }`}
                >
                  <span className="block font-medium">{s.label}</span>
                  <span className="block text-xs opacity-70">{product.sizeDims?.[s.id] || s.dims}</span>
                </button>
              ))}
            </div>
          </div>

          {availableColors.length > 0 && (
            <div className="mt-5">
              <ColorPicker
                colors={availableColors}
                selectedId={colorElegido ? colorId : null}
                onSelect={elegirColor}
                titulo={<><Paso n={numeroDe('color')} /> {dosTelas ? 'Color principal' : 'Color'}</>}
                aviso={dosTelas ? undefined : storeConfig.avisoColor}
              />
            </div>
          )}

          {/* Segundo selector: aparece solo si la foto tiene dos telas. */}
          {dosTelas && availableColors2.length > 0 && (
            <div className="mt-5">
              <ColorPicker
                colors={availableColors2}
                selectedId={colorElegido ? colorId2 : null}
                onSelect={elegirColor2}
                titulo={<><Paso n={numeroDe('color2')} /> Color del detalle</>}
                aviso={storeConfig.avisoColor}
              />
            </div>
          )}

          {/* Opciones del producto: brazos, tipo de patas, tipo de botón... */}
          {gruposOpciones.map((g) => {
            // Grupo impuesto por otra elección (ej. al pedirla aérea, "sin
            // laterales" deja de ser una decisión). Se muestra igual, pero
            // bloqueado y diciendo por qué: esconderlo daría la sensación de
            // que la web se comió una opción.
            const impuesto = Object.prototype.hasOwnProperty.call(forzados, g.id);
            const quienLoImpone = impuesto
              ? gruposOpciones
                  .flatMap((otro) => (otro.valores || []).map((v) => ({ otro, v })))
                  .find(({ otro, v }) => v.fuerza?.[g.id] && opciones[otro.id] === v.id)
              : null;
            return (
            <div key={g.id} className="mt-5">
              <p className="mb-2 text-sm font-medium text-neutral-700">
                <Paso n={numeroDe(`op:${g.id}`)} /> {g.label}
                {impuesto && quienLoImpone && (
                  <span className="ml-2 font-normal text-neutral-400">
                    — lo define «{quienLoImpone.v.label}»
                  </span>
                )}
              </p>
              {/* Las que llevan foto van en rejilla de tres, todas del mismo
                  tamaño; las de solo texto siguen en fila. Antes las de foto
                  eran tarjetas sueltas de 112 × 144 px que rompían el ritmo de
                  la columna. */}
              <div
                className={
                  (g.valores || []).some((v) => v.img)
                    ? 'grid max-w-sm grid-cols-3 gap-2'
                    : 'flex flex-wrap gap-2'
                }
              >
                {(g.valores || []).map((v) => {
                  const activo = opciones[g.id] === v.id;
                  const extra = Math.max(Number(v.precioExtra) || 0, 0);
                  return (
                    <button
                      key={v.id}
                      disabled={impuesto}
                      onClick={() => setOpciones((prev) => ({ ...prev, [g.id]: v.id }))}
                      className={`overflow-hidden rounded-lg border text-sm transition ${
                        impuesto && !activo ? 'cursor-not-allowed opacity-40' : ''
                      } ${
                        v.img
                          ? activo
                            ? 'border-ink ring-2 ring-ink'
                            : 'border-neutral-300 hover:border-neutral-500'
                          : `px-3 py-2 ${activo ? 'border-ink bg-ink text-white' : 'border-neutral-300 hover:border-neutral-500'}`
                      }`}
                    >
                      {/* Si la opción tiene foto (tipo de botón, modelo de pata),
                          se muestra para que el cliente vea de qué se trata. */}
                      {v.img && (
                        <img loading="lazy" decoding="async"
                          src={v.img}
                          alt={v.label}
                          className="aspect-square w-full bg-neutral-50 object-contain"
                        />
                      )}
                      <span className={v.img ? `block px-2 py-1.5 text-xs ${activo ? 'bg-ink text-white' : ''}` : 'block'}>
                        <span className="block font-medium">{v.label}</span>
                        {extra > 0 && (
                          <span className="block text-xs opacity-70">+{currencyFormatter.format(extra)}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            );
          })}

          <div className="mt-5 flex items-center gap-3">
            <p className="text-sm font-medium text-neutral-700">Cantidad</p>
            <div className="flex items-center rounded-lg border border-neutral-300">
              <button
                className="px-3 py-1 text-lg"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span className="w-8 text-center">{qty}</span>
              <button className="px-3 py-1 text-lg" onClick={() => setQty((q) => q + 1)}>
                +
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleAddToCart}
              className="flex-1 rounded-lg border border-ink px-6 py-3 text-sm font-medium transition hover:bg-neutral-100"
            >
              {added ? 'Añadido ✓' : 'Añadir al carrito'}
            </button>
            <button
              onClick={handleBuyNow}
              className="flex-1 rounded-lg bg-ink px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Comprar ahora
            </button>
          </div>

          <p className="mt-4 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
            🚚 Fabricado a pedido — entrega en <span className="font-medium">{storeConfig.leadTime}</span>.
            Al pagar eliges la fecha y el rango de horario que te acomode.
          </p>

          {specs.length > 0 && (
            <div className="mt-10">
              <h2 className="mb-3 text-sm font-medium text-neutral-700">Especificaciones</h2>
              <dl className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 text-sm">
                {specs.map((s) => (
                  <div key={s.label} className="flex justify-between gap-4 px-4 py-2.5">
                    <dt className="shrink-0 text-neutral-500">{s.label}</dt>
                    <dd className="text-right font-medium">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      <RecommendedProducts
        excludeIds={[product.id]}
        excludeCategories={[product.category]}
        title="Completa tu dormitorio"
      />

      <ReviewsSection productId={product.id} />

      <VerEnMiPared
        abierto={enMiPared}
        onCerrar={() => setEnMiPared(false)}
        imagenSrc={vistaActiva.url}
        colorHex={selectedColor?.hex}
        tintable={vistaActiva.tintable}
        nombre={product.name}
      />

      <ProductZoomModal
        open={zoom}
        onClose={() => setZoom(false)}
        img={{ src: vistaActiva.url, tintable: vistaActiva.tintable }}
        selectedColor={selectedColor}
        selectedColor2={selectedColor2}
        availableColors={availableColors}
        availableColors2={availableColors2}
        zonasManual={zonasManual}
        invertirTelas={product.invertirTelas}
        colorId={colorId}
        colorId2={colorId2}
        onSelectColor={elegirColor}
        onSelectColor2={elegirColor2}
        dosTelas={dosTelas}
        setDosTelas={activeIdx === 0 ? setDosTelas : undefined}
        aviso={storeConfig.avisoColor}
        productName={product.name}
        mostrarColor={colorElegido}
      />
    </main>
  );
}

// Numerito delante de cada cosa que hay que elegir. No se dibuja si el paso no
// existe (n = 0), para no sacar un "0" suelto si alguna sección desaparece.
function Paso({ n }) {
  if (!n) return null;
  return (
    <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 text-[11px] font-semibold text-neutral-600">
      {n}
    </span>
  );
}

export function Stars({ n, size = 'text-base' }) {
  return (
    <span className={`${size} leading-none`} aria-label={`${n} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= n ? 'text-amber-500' : 'text-neutral-300'}>★</span>
      ))}
    </span>
  );
}

// Reseñas del producto: promedio, lista de comentarios y formulario con estrellas.
function ReviewsSection({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState({ nombre: '', estrellas: 5, comentario: '', foto: '' });
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  async function subirFoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setMsg('La foto pesa más de 4 MB. Elige una más liviana.');
      return;
    }
    setSubiendoFoto(true);
    setMsg('');
    try {
      const res = await fetch(`/api/upload-resena?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: file,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo subir la foto.');
      setForm((f) => ({ ...f, foto: data.url }));
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSubiendoFoto(false);
    }
  }

  useEffect(() => {
    fetch(`/api/reviews?product=${encodeURIComponent(productId)}`)
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews || []))
      .catch(() => {});
  }, [productId]);

  const promedio = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.estrellas, 0) / reviews.length).toFixed(1)
    : null;

  async function enviar(e) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.comentario.trim()) {
      setMsg('Completa tu nombre y comentario.');
      return;
    }
    setSending(true);
    setMsg('');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo enviar tu reseña.');
      // Si mandó foto, la reseña queda pendiente de aprobación: no se agrega a
      // la lista visible todavía.
      if (!form.foto) setReviews([data.review, ...reviews]);
      const teniaFoto = Boolean(form.foto);
      setForm({ nombre: '', estrellas: 5, comentario: '', foto: '' });
      setMsg(
        teniaFoto
          ? '¡Gracias! Tu opinión con foto se publicará cuando la revisemos. ⭐'
          : data.saved ? '¡Gracias por tu opinión! ⭐' : 'Gracias — tu opinión se registró y aparecerá pronto.'
      );
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mt-16 border-t border-neutral-200 pt-10">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Opiniones</h2>
        {promedio ? (
          <span className="flex items-center gap-2 text-sm text-neutral-600">
            <Stars n={Math.round(promedio)} /> {promedio} de 5 · {reviews.length} opinión{reviews.length !== 1 ? 'es' : ''}
          </span>
        ) : (
          <span className="text-sm text-neutral-400">Sé el primero en opinar</span>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="space-y-4">
          {reviews.length === 0 && (
            <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-400">
              Este producto aún no tiene opiniones.
            </p>
          )}
          {reviews.map((r) => (
            <div key={r.id} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{r.nombre}</p>
                <Stars n={r.estrellas} size="text-sm" />
              </div>
              <p className="mt-2 text-sm text-neutral-600">{r.comentario}</p>
              {r.foto && (
                <a href={r.foto} target="_blank" rel="noreferrer" className="mt-2 inline-block">
                  <img loading="lazy" decoding="async" src={r.foto} alt="Foto del cliente" className="h-24 w-24 rounded-lg border border-neutral-200 object-cover" />
                </a>
              )}
              <p className="mt-2 text-xs text-neutral-400">{new Date(r.fecha).toLocaleDateString('es-PE')}</p>
            </div>
          ))}
        </div>

        <form onSubmit={enviar} className="h-fit rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm font-medium">Deja tu opinión</p>
          <div className="mt-3">
            <p className="mb-1 text-xs text-neutral-500">Tu calificación</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setForm({ ...form, estrellas: i })}
                  className={`text-2xl transition ${i <= form.estrellas ? 'text-amber-500' : 'text-neutral-300 hover:text-amber-300'}`}
                  aria-label={`${i} estrellas`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <input
            type="text"
            placeholder="Tu nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            maxLength={60}
            className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
          />
          <textarea
            placeholder="Cuéntanos qué te pareció el producto"
            value={form.comentario}
            onChange={(e) => setForm({ ...form, comentario: e.target.value })}
            maxLength={500}
            rows={4}
            className="mt-3 w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
          />
          {/* Foto opcional del mueble instalado. Se revisa antes de publicarse. */}
          <div className="mt-3">
            {form.foto ? (
              <div className="flex items-center gap-2">
                <img loading="lazy" decoding="async" src={form.foto} alt="" className="h-14 w-14 rounded-lg border border-neutral-200 object-cover" />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, foto: '' })}
                  className="text-xs text-neutral-500 hover:text-neutral-700"
                >
                  Quitar foto
                </button>
              </div>
            ) : (
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-neutral-500 hover:text-neutral-700">
                <span className="rounded-lg border border-neutral-300 px-3 py-1.5">📷 {subiendoFoto ? 'Subiendo...' : 'Agregar foto (opcional)'}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={subirFoto} disabled={subiendoFoto} />
              </label>
            )}
          </div>
          {msg && <p className="mt-2 text-xs text-neutral-500">{msg}</p>}
          <button
            disabled={sending}
            className="mt-3 w-full rounded-lg bg-ink px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
          >
            {sending ? 'Enviando...' : 'Publicar opinión'}
          </button>
        </form>
      </div>
    </section>
  );
}
