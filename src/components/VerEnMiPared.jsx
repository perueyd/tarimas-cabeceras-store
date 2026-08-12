import { useEffect, useRef, useState } from 'react';

// "Ver en mi pared": abre la cámara del celular y superpone la foto del mueble
// para que el cliente vea cómo queda en su cuarto antes de comprar.
//
// Por qué así y no realidad aumentada de verdad: la AR con detección de planos
// necesita un modelo 3D de cada mueble (.glb/.usdz), que cuesta dinero y
// semanas por cada uno de los 33 productos. Una CABECERA es plana y va contra
// la pared, así que una superposición 2D que el cliente puede mover y escalar
// se ve prácticamente igual de bien — y funciona en cualquier teléfono con
// cámara, sin depender de nadie ni pagar nada.
//
// Requisitos que ya se cumplen:
//  · Las fotos son PNG con fondo transparente (salen así de Canva).
//  · La cabecera Permissions-Policy permite la cámara solo a esta web.
//  · Se pide permiso al tocar el botón, nunca antes.

export default function VerEnMiPared({ abierto, onCerrar, imagenSrc, colorHex, nombre, tintable }) {
  const videoRef = useRef(null);
  // Se guarda la cámara aparte del elemento <video>, porque el elemento se
  // destruye y se vuelve a crear cada vez que se toma una foto y se repite.
  const camaraRef = useRef(null);
  const contenedorRef = useRef(null);
  const [estado, setEstado] = useState('pidiendo'); // pidiendo | listo | error
  const [error, setError] = useState('');
  const [captura, setCaptura] = useState(null);

  // Posición y tamaño del mueble sobre la imagen de la cámara.
  const [pos, setPos] = useState({ x: 50, y: 45, escala: 1 });
  const arrastre = useRef(null);
  const pellizco = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    let stream = null;
    let cancelado = false;

    (async () => {
      try {
        // La cámara trasera es la que apunta a la pared.
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
          audio: false,
        });
        if (cancelado) { stream.getTracks().forEach((t) => t.stop()); return; }
        camaraRef.current = stream;
        conectarCamara(videoRef.current);
        setEstado('listo');
      } catch (err) {
        setEstado('error');
        setError(
          {
            NotAllowedError: 'Necesitamos permiso para usar la cámara. Tócalo de nuevo y elige "Permitir".',
            NotFoundError: 'No encontramos ninguna cámara en este dispositivo.',
            NotReadableError: 'Otra aplicación está usando la cámara. Ciérrala e intenta de nuevo.',
          }[err?.name] || 'No pudimos abrir la cámara. Prueba desde el celular.'
        );
      }
    })();

    return () => {
      cancelado = true;
      // Soltar la cámara al cerrar: si no, el celular sigue con la luz
      // encendida y consumiendo batería.
      if (stream) stream.getTracks().forEach((t) => t.stop());
      camaraRef.current = null;
    };
  }, [abierto]);

  // Engancha la cámara al elemento <video> CADA VEZ que aparece.
  //
  // Al tomar una foto se deja de mostrar el video (se muestra la captura), así
  // que el navegador lo destruye; al pulsar "Repetir" se crea uno NUEVO, vacío.
  // La cámara seguía encendida, pero nadie la volvía a conectar a ese elemento
  // nuevo: la pantalla se quedaba en negro y solo se arreglaba cerrando y
  // volviendo a abrir. Por eso esto no va en el arranque, sino aquí: se ejecuta
  // en cada montaje del video.
  function conectarCamara(el) {
    videoRef.current = el;
    if (!el || !camaraRef.current) return;
    if (el.srcObject !== camaraRef.current) el.srcObject = camaraRef.current;
    el.play().catch(() => {});
  }

  useEffect(() => {
    if (!abierto) { setCaptura(null); setPos({ x: 50, y: 45, escala: 1 }); }
  }, [abierto]);

  // Mientras la cámara está abierta, la página de atrás NO se puede mover.
  //
  // Sin esto, arrastrar el mueble hacia abajo se le escapaba al navegador del
  // celular y lo tomaba como "desliza la página": aparecía y desaparecía la
  // barra de direcciones (que cambia el alto de la pantalla bajo los pies de
  // esta ventana) y en Android bastaba con jalar hacia abajo estando arriba del
  // todo para disparar el "recargar página" — la pantalla se quedaba en blanco.
  // Es la misma protección que ya tenía la ventana de "Ver en grande".
  useEffect(() => {
    if (!abierto) return undefined;
    const cuerpo = document.body.style;
    const raiz = document.documentElement.style;
    const antesOverflow = cuerpo.overflow;
    const antesRebote = raiz.overscrollBehavior;
    cuerpo.overflow = 'hidden';
    raiz.overscrollBehavior = 'none'; // corta el "jalar para recargar"
    return () => {
      cuerpo.overflow = antesOverflow;
      raiz.overscrollBehavior = antesRebote;
    };
  }, [abierto]);

  if (!abierto) return null;

  // ---- mover y escalar con el dedo ----

  function distancia(t) {
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.hypot(dx, dy);
  }

  const acotar = (n, min, max) => Math.min(Math.max(n, min), max);

  // Se guarda dónde empezó el dedo Y dónde estaba el mueble, y se mueve por la
  // diferencia entre ambos. Así el mueble sigue al dedo sin saltos.
  function empezarArrastre(clientX, clientY) {
    arrastre.current = { tocX: clientX, tocY: clientY, x: pos.x, y: pos.y };
  }

  function moverArrastre(clientX, clientY) {
    const caja = contenedorRef.current?.getBoundingClientRect();
    // Se copian los valores ANTES de pedirle a React que redibuje.
    //
    // Antes se leían dentro del propio redibujado, y ese redibujado ocurre un
    // instante DESPUÉS: si en ese instante el dedo ya se había levantado, el
    // dato del arrastre ya no existía y la página se caía entera —la pantalla
    // se quedaba en blanco y solo se recuperaba recargando. Pasaba sobre todo
    // arrastrando hacia abajo, porque el dedo sale de la zona de la cámara.
    const inicio = arrastre.current;
    if (!caja || !inicio || !caja.width || !caja.height) return;
    const dx = ((clientX - inicio.tocX) / caja.width) * 100;
    const dy = ((clientY - inicio.tocY) / caja.height) * 100;
    setPos((p) => ({
      ...p,
      x: acotar(inicio.x + dx, 0, 100),
      y: acotar(inicio.y + dy, 0, 100),
    }));
  }

  function alTocar(e) {
    if (e.touches.length === 2) {
      pellizco.current = { d: distancia(e.touches), escala: pos.escala };
      arrastre.current = null;
    } else if (e.touches.length === 1) {
      empezarArrastre(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  function alMover(e) {
    // Mismo cuidado que en el arrastre: los valores del pellizco se copian
    // antes de redibujar, porque al levantar los dedos se borran.
    const pin = pellizco.current;
    if (e.touches.length === 2 && pin && pin.d > 0) {
      const factor = distancia(e.touches) / pin.d;
      setPos((p) => ({ ...p, escala: acotar(pin.escala * factor, 0.25, 4) }));
      return;
    }
    if (e.touches.length === 1) moverArrastre(e.touches[0].clientX, e.touches[0].clientY);
  }

  function alSoltar() {
    arrastre.current = null;
    pellizco.current = null;
  }

  // Con ratón (para probarlo desde una computadora): arrastrar mueve, la rueda
  // agranda o achica.
  function alPresionarRaton(e) {
    empezarArrastre(e.clientX, e.clientY);
  }
  function alMoverRaton(e) {
    if (arrastre.current) moverArrastre(e.clientX, e.clientY);
  }
  function alRodar(e) {
    setPos((p) => ({ ...p, escala: acotar(p.escala * (e.deltaY < 0 ? 1.08 : 0.93), 0.25, 4) }));
  }

  // ---- captura ----

  async function tomarFoto() {
    const video = videoRef.current;
    const caja = contenedorRef.current?.getBoundingClientRect();
    if (!video || !caja) return;

    const lienzo = document.createElement('canvas');
    lienzo.width = caja.width * 2;
    lienzo.height = caja.height * 2;
    const ctx = lienzo.getContext('2d');

    // El vídeo se dibuja recortado igual que se ve en pantalla (object-cover).
    const escalaV = Math.max(lienzo.width / video.videoWidth, lienzo.height / video.videoHeight);
    const vw = video.videoWidth * escalaV;
    const vh = video.videoHeight * escalaV;
    ctx.drawImage(video, (lienzo.width - vw) / 2, (lienzo.height - vh) / 2, vw, vh);

    // El mueble encima, en la misma posición y tamaño que en pantalla.
    await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const ancho = lienzo.width * 0.6 * pos.escala;
        const alto = (img.height / img.width) * ancho;
        ctx.drawImage(
          img,
          (pos.x / 100) * lienzo.width - ancho / 2,
          (pos.y / 100) * lienzo.height - alto / 2,
          ancho,
          alto
        );
        resolve();
      };
      img.onerror = resolve; // sin la foto, al menos se guarda la pared
      img.src = imagenSrc;
    });

    setCaptura(lienzo.toDataURL('image/jpeg', 0.9));
  }

  function compartir() {
    if (!captura) return;
    const a = document.createElement('a');
    a.href = captura;
    a.download = `${(nombre || 'mueble').replace(/\s+/g, '-').toLowerCase()}-en-mi-pared.jpg`;
    a.click();
  }

  return (
    // `touch-none` en TODA la ventana (antes solo en la zona de la cámara): con
    // el dedo sobre el título o los botones, el navegador seguía creyendo que
    // se quería desplazar la página.
    <div
      className="fixed inset-0 z-[70] flex touch-none flex-col overflow-hidden bg-black"
      style={{ height: '100dvh', maxHeight: '100dvh', overscrollBehavior: 'none' }}
    >
      <div className="flex flex-shrink-0 items-center justify-between px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{nombre}</p>
          <p className="text-xs text-white/70">
            {estado === 'listo' ? 'Arrastra para mover · pellizca para agrandar' : 'Abriendo cámara…'}
          </p>
        </div>
        <button onClick={onCerrar} className="rounded-full px-3 py-1 text-2xl leading-none hover:bg-white/20" aria-label="Cerrar">
          ✕
        </button>
      </div>

      <div
        ref={contenedorRef}
        // "isolate": encierra la mezcla de color DENTRO de esta caja. Sin eso,
        // la capa de color se mezclaba con todo lo pintado detrás —y detrás hay
        // un vídeo en vivo, que el celular dibuja en una capa aparte. Esa
        // combinación es la que deja la pantalla en blanco en varios Android.
        // Es la misma protección que lleva la foto en la ficha del producto.
        className="relative isolate min-h-0 flex-1 touch-none overflow-hidden"
        onTouchStart={alTocar}
        onTouchMove={alMover}
        onTouchEnd={alSoltar}
        onMouseDown={alPresionarRaton}
        onMouseMove={alMoverRaton}
        onMouseUp={alSoltar}
        onMouseLeave={alSoltar}
        onWheel={alRodar}
      >
        {estado === 'error' ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-4xl">📷</p>
            <p className="max-w-xs text-sm text-white/90">{error}</p>
            {/* "Volver" a secas: esta ventana ya no se abre solo desde la
                ficha del producto, también desde "Arma tu dormitorio". */}
            <button onClick={onCerrar} className="mt-2 rounded-lg bg-white px-5 py-2 text-sm font-medium text-black">
              Volver
            </button>
          </div>
        ) : captura ? (
          <img src={captura} alt="Tu foto" className="h-full w-full object-contain" />
        ) : (
          <>
            <video ref={conectarCamara} playsInline muted className="h-full w-full object-cover" />
            <img
              src={imagenSrc}
              alt=""
              aria-hidden
              className="pointer-events-none absolute select-none"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${60 * pos.escala}%`,
                transform: 'translate(-50%, -50%)',
                // Mismo teñido que en la ficha del producto.
                filter: tintable ? 'grayscale(1)' : undefined,
              }}
            />
            {tintable && colorHex && (
              <div
                className="pointer-events-none absolute mix-blend-multiply"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  width: `${60 * pos.escala}%`,
                  aspectRatio: '1',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: colorHex,
                  WebkitMaskImage: `url(${imagenSrc})`,
                  maskImage: `url(${imagenSrc})`,
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskPosition: 'center',
                }}
              />
            )}
          </>
        )}
      </div>

      {estado === 'listo' && (
        <div className="flex flex-shrink-0 items-center justify-center gap-3 px-4 py-4">
          {captura ? (
            <>
              <button onClick={() => setCaptura(null)} className="rounded-lg border border-white/40 px-5 py-2.5 text-sm text-white">
                Repetir
              </button>
              <button onClick={compartir} className="rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-black">
                Guardar foto
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setPos({ x: 50, y: 45, escala: 1 })}
                className="rounded-lg border border-white/40 px-4 py-2.5 text-sm text-white"
              >
                Centrar
              </button>
              <button
                onClick={tomarFoto}
                className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/20"
                aria-label="Tomar foto"
              >
                <span className="h-12 w-12 rounded-full bg-white" />
              </button>
              <div className="w-[88px]" />
            </>
          )}
        </div>
      )}
    </div>
  );
}
