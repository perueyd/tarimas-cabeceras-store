// Elegir el modelo de Groq, y sobrevivir a que lo apaguen.
//
// POR QUÉ EXISTE: Groq apagó `llama-3.3-70b-versatile` el 16 de agosto de 2026
// para las cuentas gratuitas. Los dos asistentes de la tienda quedaron caídos
// devolviendo "el asistente no está disponible", y nadie se enteró durante más
// de dos meses: un bot que no contesta no levanta ninguna alarma, el cliente
// simplemente se va.
//
// Esto no puede depender de que alguien mire. Aquí hay una lista de modelos en
// orden de preferencia: si el primero ya no existe, se prueba el siguiente en
// la misma petición. El cliente recibe su respuesta igual y en el log queda
// anotado cuál murió, para cambiarlo con calma.
//
// El modelo que funcionó se recuerda en memoria mientras la función siga
// caliente, así la siguiente consulta no vuelve a tropezar con el muerto.

// En orden: el que recomienda Groq como reemplazo, y dos alternativas de
// distinta familia — si retiran una familia entera, la otra sigue en pie.
const CANDIDATOS = ['openai/gpt-oss-120b', 'llama-3.1-8b-instant', 'openai/gpt-oss-20b'];

// Si el dueño fija GROQ_MODEL en Vercel, manda ese — pero ya NO es la última
// palabra. Antes lo era, y una variable olvidada apuntando a un modelo muerto
// habría dejado los bots caídos aunque el código estuviera bien.
export function listaDeModelos() {
  const fijado = process.env.GROQ_MODEL;
  const lista = fijado ? [fijado, ...CANDIDATOS] : [...CANDIDATOS];
  return [...new Set(lista)]; // sin repetir si el fijado ya está en la lista
}

// El modelo que respondió la última vez. Vale solo mientras la función siga
// viva en Vercel; si se apaga, se vuelve a empezar por el primero. No se
// guarda en la base de datos a propósito: no merece una escritura por consulta.
let ultimoBueno = null;

function ordenados() {
  const lista = listaDeModelos();
  if (!ultimoBueno || !lista.includes(ultimoBueno)) return lista;
  return [ultimoBueno, ...lista.filter((m) => m !== ultimoBueno)];
}

// Un 404 o un 400 de Groq casi siempre significa "ese modelo ya no existe".
// Cualquier otro error (sin clave, demasiadas peticiones, caída de Groq) NO se
// arregla cambiando de modelo, así que se deja subir tal cual: probar los tres
// solo serviría para tardar el triple en dar el mismo error.
function esModeloMuerto(err) {
  return err?.status === 404 || err?.status === 400;
}

/**
 * Llama a Groq probando los modelos por orden hasta que uno responda.
 *
 * `hacerLlamada(modelo)` recibe el nombre del modelo y debe devolver la
 * promesa de la petición. Se le pasa así, y no una configuración, para que
 * sirva tanto a la respuesta normal como a la de voz por streaming.
 */
export async function conModeloDisponible(hacerLlamada) {
  const lista = ordenados();
  let ultimoError = null;

  for (const modelo of lista) {
    try {
      const resultado = await hacerLlamada(modelo);
      if (ultimoBueno !== modelo) {
        ultimoBueno = modelo;
        if (modelo !== lista[0]) console.warn(`IA: se pasó a "${modelo}".`);
      }
      return { resultado, modelo };
    } catch (err) {
      if (!esModeloMuerto(err)) throw err;
      ultimoError = err;
      console.error(
        `IA: el modelo "${modelo}" ya no está disponible en Groq (${err.status}). ` +
          'Actualiza la lista en api/_modelo-ia.js — y si tienes GROQ_MODEL ' +
          'puesta en Vercel, revísala: puede estar apuntando a un modelo muerto.'
      );
    }
  }

  // Se acabaron los candidatos: esto sí es un problema de verdad.
  const err = ultimoError || new Error('No hay ningún modelo de IA disponible.');
  err.sinModelos = true;
  throw err;
}

export { CANDIDATOS };
