import { enLima } from './lima.js';

// Cuándo se puede entregar un pedido.
//
// Vive en su propio archivo y no dentro del checkout porque es una promesa al
// cliente, no un detalle de una pantalla: la fecha que se le ofrece al pagar,
// lo que dice la ficha del producto y lo que contesta CHAT-ED tienen que salir
// de la MISMA regla. Cuando cada pantalla tenía su copia, se desviaban.
//
// LA REGLA DEPENDE DEL PRODUCTO (el dueño, 19/11/2026). Antes había una sola
// para todo —«pedido hasta las 8 a. m., entrega hoy desde las 5 p. m.»— y
// CHAT-ED se la prometía también a quien preguntaba por una tarima:
//
//   · CABECERAS: pedido hasta las 8 a. m. → a las 5 p. m. está lista y desde
//     esa hora se reparte. Para otro día, a cualquier hora. Según la cantidad
//     de pedidos puede retrasarse de 1 a 3 días.
//   · TARIMAS: pedido hasta las 9 a. m. → puede salir el mismo día SEGÚN
//     DISPONIBILIDAD del taller (fabricarla toma unas 2 horas), así que hoy
//     no se garantiza: se confirma por WhatsApp. Para hoy, desde las 11 a. m.
//     (9 a. m. + 2 horas de fabricación).
//   · LO DEMÁS (colchones, etc.): la regla general de siempre.
//
// El dueño las cambia en el panel → Entrega; aquí están los valores de partida.
//
// Todo se calcula en hora de LIMA, no en la del navegador: un cliente que
// compra desde el extranjero —o con el reloj del teléfono mal puesto— tiene
// que recibir la misma fecha que uno de Lima, porque quien fabrica y reparte
// está en Lima.

/**
 * Una regla de entrega:
 *   corte   hasta esta hora (inclusive) el pedido entra para HOY; null = nunca hay entrega el mismo día
 *   desde   hoy mismo solo se reparte desde esta hora (el mueble se termina antes)
 *   seguro  false = lo de hoy depende de la disponibilidad del taller y se confirma por WhatsApp
 *   demora  si puede retrasarse, cuánto (ej. "1 a 3 días"); vacío = no se avisa de retrasos
 */
export const REGLA_GENERAL = Object.freeze({ corte: 8, desde: 17, seguro: true, demora: '' });

export const REGLAS_DE_FABRICA = Object.freeze({
  general: REGLA_GENERAL,
  cabeceras: Object.freeze({ corte: 8, desde: 17, seguro: true, demora: '1 a 3 días' }),
  tarimas: Object.freeze({ corte: 9, desde: 11, seguro: false, demora: '' }),
});

const hora = (v, porDefecto) => {
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : porDefecto;
};

/** Una regla tal como se guarda en el panel, limpia y con valores válidos. */
export function limpiarRegla(regla = {}, base = REGLA_GENERAL) {
  return {
    corte: hora(regla.corte, base.corte),
    desde: hora(regla.desde, base.desde) ?? 0,
    seguro: regla.seguro === undefined ? base.seguro : regla.seguro !== false,
    demora: String(regla.demora ?? base.demora ?? '').replace(/\s+/g, ' ').trim().slice(0, 40),
  };
}

/** Las reglas vigentes: las de fábrica, con lo que el dueño haya cambiado en el panel encima. */
export function reglasDeEntrega(storeConfig = {}) {
  const guardadas = storeConfig?.reglasEntrega && typeof storeConfig.reglasEntrega === 'object' ? storeConfig.reglasEntrega : {};
  const reglas = {};
  for (const clave of new Set([...Object.keys(REGLAS_DE_FABRICA), ...Object.keys(guardadas)])) {
    // null = el dueño marcó «usa la regla general» para ese tipo de producto.
    if (guardadas[clave] === null && clave !== 'general') continue;
    const base = REGLAS_DE_FABRICA[clave] || REGLAS_DE_FABRICA.general;
    reglas[clave] = limpiarRegla(guardadas[clave] || {}, base);
  }
  return reglas;
}

/**
 * La regla de un pedido con estas categorías. Si junta varias (cabecera +
 * tarima), manda la más exigente: hoy solo si TODAS llegan, desde la hora más
 * tardía, y se avisa de cualquier retraso posible.
 */
export function reglaDelPedido(reglas, categorias = []) {
  const unicas = [...new Set(categorias.filter(Boolean))];
  const propias = (unicas.length ? unicas : ['general']).map((c) => reglas?.[c] || reglas?.general || REGLA_GENERAL);
  const cortes = propias.map((r) => r.corte);
  const demoras = [...new Set(propias.map((r) => r.demora).filter(Boolean))];
  return {
    corte: cortes.includes(null) ? null : Math.min(...cortes),
    desde: Math.max(...propias.map((r) => r.desde)),
    seguro: propias.every((r) => r.seguro),
    // Si dos productos avisan de retrasos distintos, se dice el mayor (el último de la lista ordenada por número).
    demora: demoras.sort((a, b) => numeroMayor(a) - numeroMayor(b)).at(-1) || '',
  };
}

const numeroMayor = (texto) => Math.max(0, ...(String(texto).match(/\d+/g) || []).map(Number));

const minutosEnLima = (lima) => lima.getUTCHours() * 60 + lima.getUTCMinutes();

/**
 * El primer día en que se puede entregar, como "2026-10-29".
 * @param {Date} ahora  momento de la compra (por defecto, ahora mismo)
 */
export function primerDiaDeEntrega(ahora = new Date(), regla = REGLA_GENERAL) {
  const lima = enLima(ahora);
  if (!lima) return null;
  // getUTC* porque `enLima` ya devuelve el instante corrido a hora de Lima:
  // leerlo con getHours() volvería a aplicar la zona del navegador encima.
  const dia = new Date(lima.getTime());
  if (!alcanzaParaHoy(ahora, regla)) dia.setUTCDate(dia.getUTCDate() + 1);
  return dia.toISOString().slice(0, 10);
}

/**
 * Si el pedido hecho en este momento alcanza para entregarse hoy mismo.
 * Sirve para decírselo al cliente mientras decide ("pídelo antes de las 8").
 */
export function alcanzaParaHoy(ahora = new Date(), regla = REGLA_GENERAL) {
  const lima = enLima(ahora);
  if (!lima || regla.corte === null) return false;
  return minutosEnLima(lima) <= regla.corte * 60;
}

/**
 * Los horarios que se le pueden ofrecer al cliente para la fecha que eligió.
 *
 * Para HOY MISMO solo caben los que empiezan cuando el mueble ya está hecho
 * (la hora `desde` de la regla: las 5 p. m. para una cabecera). Para cualquier
 * OTRO día el mueble está listo desde la víspera, así que el cliente elige la
 * hora que quiera — mañana, tarde o noche. Antes se filtraba siempre, y eso le
 * quitaba al cliente las entregas de mañana y tarde de los días siguientes.
 *
 * Si para hoy no cuadra ningún horario —porque todavía no se han puesto en el
 * panel— se devuelven todos: mejor una hora a coordinar que dejar al cliente
 * sin poder comprar.
 */
export function horariosDeReparto(slots = [], fechaElegida = '', ahora = new Date(), regla = REGLA_GENERAL) {
  if (!fechaElegida || fechaElegida !== diaEnLima(ahora)) return slots;
  const desHoy = slots.filter((s) => horaDeInicio(s?.label) >= regla.desde);
  return desHoy.length ? desHoy : slots;
}

/** "8 a. m.", "5 p. m.", "12 del mediodía": como se dice en Perú. */
export function horaLegible(h) {
  if (h === 12) return '12 del mediodía';
  if (h === 0) return '12 de la noche';
  return h < 12 ? `${h} a. m.` : `${h - 12} p. m.`;
}

/**
 * La regla dicha en palabras, para la ficha, el carrito, el pago y CHAT-ED.
 * Sale de la misma regla que calcula las fechas: no pueden contradecirse.
 */
export function textoDePlazo(regla = REGLA_GENERAL) {
  const partes = [];
  if (regla.corte === null) {
    partes.push('Te lo entregamos desde el día siguiente, en el horario que elijas.');
  } else if (regla.seguro) {
    partes.push(
      `Pídelo hasta las ${horaLegible(regla.corte)} y te lo entregamos hoy mismo desde las ${horaLegible(regla.desde)};` +
        ' si no, desde el día siguiente en el horario que elijas.'
    );
  } else {
    partes.push(
      `Pídelo hasta las ${horaLegible(regla.corte)} y, según la disponibilidad del taller, puede salir hoy mismo` +
        `${regla.desde ? ` desde las ${horaLegible(regla.desde)}` : ''} (te lo confirmamos por WhatsApp);` +
        ' si no, desde el día siguiente en el horario que elijas.'
    );
  }
  if (regla.demora) partes.push(`Según la cantidad de pedidos, puede demorar de ${regla.demora} más; si pasa, te avisamos por WhatsApp.`);
  return partes.join(' ');
}

/** La hora a la que empieza un horario escrito como "Noche (6:00 p.m. – ...)". */
function horaDeInicio(label) {
  const m = String(label || '').match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m|p\.?\s*m)/i);
  if (!m) return -1;
  const h = Number(m[1]) % 12;
  return /p/i.test(m[3]) ? h + 12 : h;
}

/** El día de hoy en Lima, como "2026-11-07". */
function diaEnLima(ahora) {
  return enLima(ahora)?.toISOString().slice(0, 10) ?? '';
}

/**
 * El plazo de cada tipo de producto que se vende, en palabras: lo que lee
 * CHAT-ED y lo que se propone para la pregunta frecuente. Los tipos sin regla
 * propia van juntos con la general.
 * @param categorias  [{ id, label }] de los tipos que tienen productos a la venta
 */
export function plazosPorCategoria(reglas, categorias = [], decir = textoDePlazo) {
  const propias = categorias.filter((c) => c.id !== 'general' && reglas?.[c.id]);
  const resto = categorias.filter((c) => !reglas?.[c.id]);
  const lista = propias.map((c) => ({ nombre: c.label || c.id, texto: decir(reglas[c.id]) }));
  if (resto.length || !propias.length) {
    const nombres = resto.map((c) => c.label || c.id);
    lista.push({
      nombre: nombres.length ? nombres.join(', ') : 'Todos los productos',
      texto: decir(reglas?.general || REGLA_GENERAL),
    });
  }
  return lista;
}

/**
 * La misma regla escrita para CHAT-ED: corta, con mayúsculas en lo que no
 * puede confundir. Con la frase pensada para el cliente, el modelo mezclaba
 * los tipos (a una cabecera le añadía el «según disponibilidad» de la tarima).
 */
export function reglaParaElAsistente(regla = REGLA_GENERAL) {
  const partes = [];
  if (regla.corte === null) {
    partes.push('NO hay entrega el mismo día');
  } else if (regla.seguro) {
    partes.push(`pedido hasta las ${horaLegible(regla.corte)} → se entrega HOY desde las ${horaLegible(regla.desde)} (seguro)`);
  } else {
    partes.push(
      `pedido hasta las ${horaLegible(regla.corte)} → PUEDE salir hoy desde las ${horaLegible(regla.desde)} SOLO si el taller` +
        ' tiene disponibilidad (NO es seguro: se confirma por WhatsApp)'
    );
  }
  partes.push('pedido después → desde el día siguiente, a la hora que elija el cliente');
  partes.push(regla.demora ? `puede demorar de ${regla.demora} más según la cantidad de pedidos (díselo)` : 'sin aviso de demora');
  return partes.join(' · ');
}

// Lo de provincia no lo decide la tienda sino la agencia: se dice tal cual.
const PROVINCIA = 'A provincias, el tiempo depende de la agencia de envío.';

/** La respuesta a «¿Cuánto demora la entrega?», armada con las reglas: una línea por tipo de producto. */
export function respuestaDeEntrega(reglas, categorias) {
  const lineas = plazosPorCategoria(reglas, categorias).map((p) => `${p.nombre}: ${p.texto}`);
  return `En Lima:\n${lineas.join('\n')}\n${PROVINCIA}`;
}
