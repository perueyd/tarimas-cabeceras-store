import { useCallback, useEffect, useRef, useState } from 'react';
import { analizarImagen, brilloDe, lum } from '../lib/imagenRegiones.js';

// Editor de "qué parte del mueble cambia de color" (solo panel de administración).
//
// POR QUÉ EXISTE: la web adivina sola qué zonas repintar mirando el brillo de la
// foto, y a veces se equivoca — pinta las patas de madera, o parte una tela en
// dos, o no separa el panel del cuerpo. Antes no había forma de corregirlo: el
// dueño solo podía apagar el repintado entero. Aquí puede tocar la foto y decir
// exactamente qué cambia y qué se queda como está.
//
// CÓMO ARRANCA: con lo que la web detectó sola (o con la última corrección
// guardada). Así esto es de verdad "corregir la detección automática" y no
// empezar de cero cada vez.
//
// LO QUE SE GUARDA: por cada tela, una máscara (un PNG chiquito, ~2-5 KB, donde
// solo es opaco lo que se repinta) y su brillo. La tienda las usa tal cual, sin
// volver a analizar nada.

const MAX_TRABAJO = 380; // resolución con la que se dibuja (rápido y de sobra)
const MAX_MASCARA = 256; // resolución con la que se GUARDA (pesa poco en la base)

function medidasTrabajo(img) {
  const w = img.naturalWidth || img.width || MAX_TRABAJO;
  const h = img.naturalHeight || img.height || MAX_TRABAJO;
  const escala = Math.min(1, MAX_TRABAJO / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * escala)), h: Math.max(1, Math.round(h * escala)) };
}

function rgbDeHex(hex) {
  const m = /^#?([\da-f]{6})$/i.exec(String(hex || ''));
  if (!m) return [140, 120, 100];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Qué tan distintos son dos colores PARA ESTE TRABAJO.
//
// No sirve la distancia de colores normal: dentro de una misma tela la luz
// cambia muchísimo (pliegues, sombras, brillos) pero el tono casi nada; y en
// cambio la madera de las patas puede tener una luz parecida a la tela y ser un
// tono completamente distinto. Por eso la claridad pesa poco y el tono pesa
// doble — así la varita agarra la tela entera con sus sombras y se detiene en
// la madera, que es justo lo que hay que separar.
function distancia(r, g, b, r0, g0, b0) {
  const dl = (r + g + b) / 3 - (r0 + g0 + b0) / 3;
  const drg = r - g - (r0 - g0);
  const dbg = b - g - (b0 - g0);
  return Math.sqrt(0.6 * dl * dl + 2 * (drg * drg + dbg * dbg));
}

// Marca en la selección los píxeles opacos de una máscara ya guardada.
function pintarMascaraEnSeleccion(url, w, h, sel, valor) {
  return new Promise((resolve) => {
    const m = new Image();
    m.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(m, 0, 0, w, h);
      const d = ctx.getImageData(0, 0, w, h).data;
      for (let i = 0; i < sel.length; i++) if (d[i * 4 + 3] >= 110) sel[i] = valor;
      resolve();
    };
    m.onerror = () => resolve();
    m.src = url;
  });
}

export default function EditorZonasColor({ abierto, foto, zonas, colores = [], onGuardar, onCerrar }) {
  const canvasRef = useRef(null);
  const datosRef = useRef(null); // píxeles originales a resolución de trabajo
  const lumRef = useRef(null); // luminancia (0..1) de cada píxel
  const selRef = useRef(null); // 0 = no cambia · 1 = tela 1 · 2 = tela 2
  const hoverRef = useRef(null); // lo que la varita seleccionaría al hacer clic
  const brillosRef = useRef([1.15, 1.15]);
  const pintandoRef = useRef(false);
  const ultimoRef = useRef(null);
  const ultimoHoverRef = useRef(-1);

  const [dims, setDims] = useState(null);
  const [estado, setEstado] = useState('cargando'); // cargando | listo | error
  const [herramienta, setHerramienta] = useState('varita'); // varita | pincel
  // Marcar o quitar. Se separa de la herramienta porque lo más frecuente es
  // QUITAR con la varita (un clic en las patas de madera y listo); si la varita
  // solo sumara, habría que borrar a pincel todo lo que sobra.
  const [accion, setAccion] = useState('marcar'); // marcar | quitar
  const [zonaActiva, setZonaActiva] = useState(1);
  const [tolerancia, setTolerancia] = useState(28);
  const [grosor, setGrosor] = useState(26);
  const [hayZona2, setHayZona2] = useState(false);
  const [version, setVersion] = useState(0); // sube para forzar el repintado
  const [aviso, setAviso] = useState('');

  const hex1 = colores[0]?.hex || '#8a6f52';
  const hex2 = colores[1]?.hex || '#3f4a5a';
  const [colorPrueba, setColorPrueba] = useState(hex1);
  const [colorPrueba2, setColorPrueba2] = useState(hex2);

  // ---- Carga de la foto y punto de partida del dibujo -----------------------
  useEffect(() => {
    if (!abierto || !foto) return undefined;
    let cancelado = false;
    setEstado('cargando');
    setAviso('');

    const img = new Image();
    // Necesario para leer los píxeles de fotos servidas desde el almacén.
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      if (cancelado) return;
      const { w, h } = medidasTrabajo(img);
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);

      let datos;
      try {
        datos = ctx.getImageData(0, 0, w, h);
      } catch {
        // Lienzo bloqueado por seguridad (la foto viene de otro dominio que no
        // lo permite). Sin poder leer los píxeles no hay nada que editar.
        if (!cancelado) setEstado('error');
        return;
      }

      const n = w * h;
      const luces = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        luces[i] = lum(datos.data[i * 4], datos.data[i * 4 + 1], datos.data[i * 4 + 2]);
      }
      const sel = new Uint8Array(n);

      // De dónde parte: de la corrección guardada si existe; si no, de lo que la
      // web detecta sola (que es lo que el dueño ve hoy en la tienda).
      let partida = Array.isArray(zonas) && zonas.length ? zonas : null;
      if (!partida) {
        try {
          partida = analizarImagen(img).zonas;
        } catch {
          partida = [{ mascara: null }];
        }
      }

      for (let z = 0; z < partida.length && z < 2; z++) {
        if (partida[z]?.mascara) {
          // eslint-disable-next-line no-await-in-loop
          await pintarMascaraEnSeleccion(partida[z].mascara, w, h, sel, z + 1);
        } else {
          // Sin máscara = "todo el mueble" (así se comporta la tienda hoy).
          for (let i = 0; i < n; i++) if (datos.data[i * 4 + 3] >= 128) sel[i] = z + 1;
        }
      }
      if (cancelado) return;

      datosRef.current = datos;
      lumRef.current = luces;
      selRef.current = sel;
      hoverRef.current = null;
      setHayZona2(partida.length > 1);
      setZonaActiva(1);
      recalcularBrillos(); // con la selección ya puesta, para que la vista previa salga bien de una
      setDims({ w, h });
      setEstado('listo');
      setVersion((v) => v + 1);
    };

    img.onerror = () => {
      if (!cancelado) setEstado('error');
    };
    img.src = foto;

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, foto]);

  // Brillo con el que hay que aclarar cada tela para que el color salga fiel.
  // Es el mismo criterio que usa la web sola (ver imagenRegiones.js).
  function recalcularBrillos() {
    const sel = selRef.current;
    const luces = lumRef.current;
    if (!sel || !luces) return;
    const a = [];
    const b = [];
    for (let i = 0; i < sel.length; i++) {
      if (sel[i] === 1) a.push(luces[i]);
      else if (sel[i] === 2) b.push(luces[i]);
    }
    brillosRef.current = [brilloDe(a), brilloDe(b)];
  }

  // ---- Dibujo del lienzo (vista previa REAL: igual que en la tienda) --------
  const pintar = useCallback(() => {
    const cv = canvasRef.current;
    const datos = datosRef.current;
    const sel = selRef.current;
    const luces = lumRef.current;
    if (!cv || !datos || !sel) return;

    const ctx = cv.getContext('2d');
    const src = datos.data;
    const out = ctx.createImageData(cv.width, cv.height);
    const o = out.data;
    const hover = hoverRef.current;
    const c1 = rgbDeHex(colorPrueba);
    const c2 = rgbDeHex(colorPrueba2);
    const [b1, b2] = brillosRef.current;

    for (let i = 0, p = 0; i < sel.length; i++, p += 4) {
      const z = sel[i];
      if (z) {
        // Lo mismo que hace la tienda: gris aclarado × color elegido.
        const col = z === 1 ? c1 : c2;
        const g = Math.min(255, luces[i] * 255 * (z === 1 ? b1 : b2));
        o[p] = (col[0] * g) / 255;
        o[p + 1] = (col[1] * g) / 255;
        o[p + 2] = (col[2] * g) / 255;
      } else {
        o[p] = src[p];
        o[p + 1] = src[p + 1];
        o[p + 2] = src[p + 2];
      }
      o[p + 3] = src[p + 3];

      // Velo de color: lo que pasaría si hace clic ahí (la "selección
      // automática" que se ve al pasar el mouse). Azul = se marcaría,
      // rojo = se quitaría.
      if (hover && hover[i]) {
        const v = accion === 'quitar' ? [244, 63, 94] : [56, 189, 248];
        o[p] = o[p] * 0.45 + v[0] * 0.55;
        o[p + 1] = o[p + 1] * 0.45 + v[1] * 0.55;
        o[p + 2] = o[p + 2] * 0.45 + v[2] * 0.55;
        if (o[p + 3] < 70) o[p + 3] = 70;
      }
    }
    ctx.putImageData(out, 0, 0);
  }, [colorPrueba, colorPrueba2, accion]);

  useEffect(() => {
    if (estado === 'listo') pintar();
  }, [pintar, version, estado, dims]);

  // ---- Herramientas --------------------------------------------------------

  // Varita: desde el punto tocado se expande a todos los píxeles pegados que
  // tengan un color parecido (esa es la "selección automática").
  function varita(x0, y0) {
    if (!dims) return null;
    const { w, h } = dims;
    const src = datosRef.current.data;
    const n = w * h;
    const i0 = y0 * w + x0;
    if (src[i0 * 4 + 3] < 128) return null; // tocó el fondo transparente
    const r0 = src[i0 * 4];
    const g0 = src[i0 * 4 + 1];
    const b0 = src[i0 * 4 + 2];
    const limite = Math.max(6, tolerancia * 2);

    const marca = new Uint8Array(n);
    const pila = new Int32Array(n); // cada píxel entra una sola vez
    let tope = 0;
    pila[tope++] = i0;
    marca[i0] = 1;

    while (tope) {
      const i = pila[--tope];
      const x = i % w;
      const y = (i / w) | 0;
      for (let k = 0; k < 4; k++) {
        let j = -1;
        if (k === 0 && x > 0) j = i - 1;
        else if (k === 1 && x < w - 1) j = i + 1;
        else if (k === 2 && y > 0) j = i - w;
        else if (k === 3 && y < h - 1) j = i + w;
        if (j < 0 || marca[j]) continue;
        const p = j * 4;
        if (src[p + 3] < 128) continue;
        if (distancia(src[p], src[p + 1], src[p + 2], r0, g0, b0) > limite) continue;
        marca[j] = 1;
        pila[tope++] = j;
      }
    }
    return marca;
  }

  // Pincel / borrador: un trazo redondo entre el punto anterior y el actual
  // (si solo se marcara el punto actual, al mover rápido quedarían huecos).
  function trazo(desde, hasta, borrar) {
    const { w, h } = dims;
    const src = datosRef.current.data;
    const sel = selRef.current;
    const r = Math.max(1, grosor / 2);
    const pasos = Math.max(1, Math.round(Math.hypot(hasta.x - desde.x, hasta.y - desde.y)));
    for (let s = 0; s <= pasos; s++) {
      const cx = Math.round(desde.x + ((hasta.x - desde.x) * s) / pasos);
      const cy = Math.round(desde.y + ((hasta.y - desde.y) * s) / pasos);
      for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(h - 1, Math.ceil(cy + r)); y++) {
        for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(w - 1, Math.ceil(cx + r)); x++) {
          if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
          const i = y * w + x;
          if (borrar) sel[i] = 0;
          else if (src[i * 4 + 3] >= 128) sel[i] = zonaActiva;
        }
      }
    }
  }

  function punto(e) {
    const cv = canvasRef.current;
    if (!cv || !dims) return null;
    const r = cv.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * dims.w);
    const y = Math.floor(((e.clientY - r.top) / r.height) * dims.h);
    if (x < 0 || y < 0 || x >= dims.w || y >= dims.h) return null;
    return { x, y };
  }

  function onDown(e) {
    if (estado !== 'listo') return;
    const pt = punto(e);
    if (!pt) return;
    // Capturar el puntero permite seguir pintando aunque el dedo/mouse se salga
    // del lienzo. Si el navegador no lo permite no pasa nada: se sigue igual.
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* sin captura, el trazo sigue funcionando dentro del lienzo */
    }
    if (herramienta === 'varita') {
      const marca = varita(pt.x, pt.y);
      if (marca) {
        const sel = selRef.current;
        const valor = accion === 'quitar' ? 0 : zonaActiva;
        for (let i = 0; i < sel.length; i++) if (marca[i]) sel[i] = valor;
        recalcularBrillos();
      }
      hoverRef.current = null;
    } else {
      pintandoRef.current = true;
      ultimoRef.current = pt;
      trazo(pt, pt, accion === 'quitar');
    }
    setVersion((v) => v + 1);
  }

  function onMove(e) {
    if (estado !== 'listo') return;
    const pt = punto(e);
    if (!pt) return;
    if (pintandoRef.current) {
      trazo(ultimoRef.current || pt, pt, accion === 'quitar');
      ultimoRef.current = pt;
      setVersion((v) => v + 1);
      return;
    }
    if (herramienta !== 'varita') return;
    // Vista previa de la varita al pasar por encima, sin tocar nada todavía.
    const i = pt.y * dims.w + pt.x;
    if (i === ultimoHoverRef.current) return;
    ultimoHoverRef.current = i;
    hoverRef.current = varita(pt.x, pt.y);
    setVersion((v) => v + 1);
  }

  function onUp() {
    if (!pintandoRef.current) return;
    pintandoRef.current = false;
    ultimoRef.current = null;
    recalcularBrillos();
    setVersion((v) => v + 1);
  }

  function onLeave() {
    onUp();
    if (hoverRef.current) {
      hoverRef.current = null;
      ultimoHoverRef.current = -1;
      setVersion((v) => v + 1);
    }
  }

  function todoElMueble() {
    const sel = selRef.current;
    const src = datosRef.current.data;
    for (let i = 0; i < sel.length; i++) sel[i] = src[i * 4 + 3] >= 128 ? zonaActiva : 0;
    recalcularBrillos();
    setVersion((v) => v + 1);
  }

  function limpiar() {
    selRef.current.fill(0);
    recalcularBrillos();
    setVersion((v) => v + 1);
  }

  function quitarSegundaTela() {
    const sel = selRef.current;
    for (let i = 0; i < sel.length; i++) if (sel[i] === 2) sel[i] = 1;
    setHayZona2(false);
    setZonaActiva(1);
    recalcularBrillos();
    setVersion((v) => v + 1);
  }

  // Máscara que se guarda: un PNG donde solo es opaco lo que se repinta.
  // Se reduce a 256 px y se le da un borde suave para que el color no corte en
  // escalera — y para que pese poco (viaja en el catálogo a cada visitante).
  function mascaraPNG(valor) {
    const { w, h } = dims;
    const sel = selRef.current;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d');
    const im = ctx.createImageData(w, h);
    for (let i = 0, p = 0; i < sel.length; i++, p += 4) if (sel[i] === valor) im.data[p + 3] = 255;
    ctx.putImageData(im, 0, 0);

    const esc = Math.min(1, MAX_MASCARA / Math.max(w, h));
    const fw = Math.max(1, Math.round(w * esc));
    const fh = Math.max(1, Math.round(h * esc));
    const cv2 = document.createElement('canvas');
    cv2.width = fw;
    cv2.height = fh;
    const ctx2 = cv2.getContext('2d');
    ctx2.filter = 'blur(0.8px)';
    ctx2.drawImage(cv, 0, 0, fw, fh);
    return cv2.toDataURL('image/png');
  }

  function guardar() {
    const sel = selRef.current;
    const src = datosRef.current.data;
    let opacos = 0;
    let z1 = 0;
    let z2 = 0;
    for (let i = 0; i < sel.length; i++) {
      if (src[i * 4 + 3] >= 128) opacos++;
      if (sel[i] === 1) z1++;
      else if (sel[i] === 2) z2++;
    }
    if (!z1 && !z2) {
      setAviso('No marcaste ninguna parte. Toca el mueble con la varita, o usa "Todo el mueble".');
      return;
    }
    if (!z1 && z2) {
      setAviso('La tela 1 quedó vacía. Marca primero la tela principal.');
      return;
    }
    recalcularBrillos();
    const [b1, b2] = brillosRef.current;
    // Si la tela 1 cubre prácticamente todo y no hay segunda tela, no hace
    // falta guardar máscara: "todo el mueble" ya es el recorte de la foto.
    const cubreTodo = !z2 && z1 >= opacos * 0.985;
    const resultado = [{ mascara: cubreTodo ? null : mascaraPNG(1), brillo: Number(b1.toFixed(2)) }];
    if (z2) resultado.push({ mascara: mascaraPNG(2), brillo: Number(b2.toFixed(2)) });
    onGuardar(resultado);
  }

  if (!abierto) return null;

  const paleta = colores.length ? colores : [{ id: 'x', label: 'Muestra', hex: hex1 }];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Elegir qué parte cambia de color"
    >
      <div className="max-h-[95vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">¿Qué parte cambia de color?</h2>
            <p className="text-sm text-neutral-500">
              Pasa el mouse por la foto: se resalta sola la parte parecida a donde apuntas. Haz clic
              para confirmarla. Con <strong>🚫 Quitar</strong> haces lo contrario: un clic en las
              patas de madera y dejan de pintarse. Lo que quede sin marcar se verá siempre igual que
              en la foto original.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="shrink-0 rounded-full bg-neutral-100 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-200"
          >
            ✕ Cerrar
          </button>
        </div>

        {estado === 'error' && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            No se pudo leer esta foto. Puede que el almacén de fotos esté bloqueado o que la
            dirección ya no exista. Vuelve a intentarlo cuando la foto se vea en la tienda.
          </div>
        )}
        {estado === 'cargando' && <p className="py-10 text-center text-sm text-neutral-500">Cargando la foto…</p>}

        {estado === 'listo' && dims && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_18rem]">
            {/* Lienzo: lo que se ve aquí es EXACTAMENTE lo que verá el cliente */}
            <div className="rounded-xl bg-neutral-100 p-2">
              <canvas
                ref={canvasRef}
                width={dims.w}
                height={dims.h}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerLeave={onLeave}
                className="mx-auto block h-auto w-full max-w-full cursor-crosshair rounded-lg"
                style={{ touchAction: 'none' }}
              />
              <p className="mt-2 text-center text-xs text-neutral-500">
                Vista previa con el color de prueba — así se verá en la tienda.
              </p>
            </div>

            {/* Controles */}
            <div className="space-y-4 text-sm">
              <div>
                <p className="mb-1 font-medium text-neutral-700">Con qué</p>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { id: 'varita', txt: '🪄 Varita', ayuda: 'De un clic agarra toda la parte parecida' },
                    { id: 'pincel', txt: '🖌️ Pincel', ayuda: 'Arrastra para ir a mano por los bordes' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      title={t.ayuda}
                      onClick={() => {
                        setHerramienta(t.id);
                        hoverRef.current = null;
                        setVersion((v) => v + 1);
                      }}
                      className={`rounded-lg border px-2 py-2 text-xs transition ${
                        herramienta === t.id ? 'border-ink bg-ink text-white' : 'border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      {t.txt}
                    </button>
                  ))}
                </div>
                <p className="mb-1 mt-3 font-medium text-neutral-700">Para</p>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { id: 'marcar', txt: '✅ Marcar', ayuda: 'Que esta parte SÍ cambie de color' },
                    { id: 'quitar', txt: '🚫 Quitar', ayuda: 'Que esta parte NO cambie (patas de madera, etc.)' },
                  ].map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      title={a.ayuda}
                      onClick={() => {
                        setAccion(a.id);
                        hoverRef.current = null;
                        ultimoHoverRef.current = -1;
                        setVersion((v) => v + 1);
                      }}
                      className={`rounded-lg border px-2 py-2 text-xs transition ${
                        accion === a.id
                          ? a.id === 'quitar'
                            ? 'border-rose-600 bg-rose-600 text-white'
                            : 'border-ink bg-ink text-white'
                          : 'border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      {a.txt}
                    </button>
                  ))}
                </div>
              </div>

              {herramienta === 'varita' ? (
                <label className="block">
                  <span className="font-medium text-neutral-700">Cuánto abarca: {tolerancia}%</span>
                  <input
                    type="range"
                    min="5"
                    max="70"
                    value={tolerancia}
                    onChange={(e) => {
                      setTolerancia(Number(e.target.value));
                      ultimoHoverRef.current = -1;
                    }}
                    className="mt-1 w-full"
                  />
                  <span className="text-xs text-neutral-500">
                    Súbelo si te marca poco; bájalo si se pasa a otras partes.
                  </span>
                </label>
              ) : (
                <label className="block">
                  <span className="font-medium text-neutral-700">Grosor: {grosor}</span>
                  <input
                    type="range"
                    min="4"
                    max="90"
                    value={grosor}
                    onChange={(e) => setGrosor(Number(e.target.value))}
                    className="mt-1 w-full"
                  />
                </label>
              )}

              <div>
                <p className="mb-1 font-medium text-neutral-700">Estás marcando</p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setZonaActiva(1)}
                    className={`flex-1 rounded-lg border px-2 py-2 text-xs transition ${
                      zonaActiva === 1 ? 'border-ink bg-neutral-100 font-medium' : 'border-neutral-300'
                    }`}
                  >
                    Tela principal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZonaActiva(2);
                      setHayZona2(true);
                    }}
                    className={`flex-1 rounded-lg border px-2 py-2 text-xs transition ${
                      zonaActiva === 2 ? 'border-ink bg-neutral-100 font-medium' : 'border-neutral-300'
                    }`}
                  >
                    Segunda tela
                  </button>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  Usa la segunda tela solo si el cliente debe poder elegir DOS colores distintos en
                  este mueble (ej. cuerpo y botones).
                </p>
                {hayZona2 && (
                  <button
                    type="button"
                    onClick={quitarSegundaTela}
                    className="mt-1 text-xs text-red-600 underline"
                  >
                    Quitar la segunda tela (que todo sea un solo color)
                  </button>
                )}
              </div>

              <div>
                <p className="mb-1 font-medium text-neutral-700">Color de prueba</p>
                <div className="flex flex-wrap gap-1.5">
                  {paleta.map((c) => (
                    <button
                      key={`a-${c.id}`}
                      type="button"
                      title={`Tela principal: ${c.label}`}
                      onClick={() => setColorPrueba(c.hex)}
                      className={`h-7 w-7 rounded-full border ${
                        colorPrueba === c.hex ? 'ring-2 ring-ink ring-offset-1' : 'border-neutral-300'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
                {hayZona2 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {paleta.map((c) => (
                      <button
                        key={`b-${c.id}`}
                        type="button"
                        title={`Segunda tela: ${c.label}`}
                        onClick={() => setColorPrueba2(c.hex)}
                        className={`h-6 w-6 rounded-md border ${
                          colorPrueba2 === c.hex ? 'ring-2 ring-ink ring-offset-1' : 'border-neutral-300'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                )}
                <p className="mt-1 text-xs text-neutral-500">Solo para ver aquí; no cambia nada en la tienda.</p>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-neutral-200 pt-3">
                <button
                  type="button"
                  onClick={todoElMueble}
                  className="rounded-lg border border-neutral-300 px-2 py-1.5 text-xs hover:bg-neutral-50"
                >
                  Todo el mueble
                </button>
                <button
                  type="button"
                  onClick={limpiar}
                  className="rounded-lg border border-neutral-300 px-2 py-1.5 text-xs hover:bg-neutral-50"
                >
                  Limpiar
                </button>
              </div>

              {aviso && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{aviso}</p>}

              <div className="space-y-2 border-t border-neutral-200 pt-3">
                <button
                  type="button"
                  onClick={guardar}
                  className="w-full rounded-lg bg-ink px-4 py-2.5 font-medium text-white"
                >
                  Guardar esta selección
                </button>
                <button
                  type="button"
                  onClick={() => onGuardar(null)}
                  className="w-full rounded-lg border border-neutral-300 px-4 py-2 text-xs text-neutral-600 hover:bg-neutral-50"
                >
                  Volver a la detección automática
                </button>
                <p className="text-xs text-neutral-400">
                  Se guarda al pulsar <strong>Guardar producto</strong> abajo, como el resto de los cambios.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
