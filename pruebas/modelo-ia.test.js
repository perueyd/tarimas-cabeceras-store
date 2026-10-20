// Pruebas del reintento de modelos de IA.
//
// Esto nace de un fallo real y caro: Groq apagó el modelo que usaban los dos
// asistentes y estuvieron MÁS DE DOS MESES caídos sin que nadie lo supiera,
// porque un bot que no contesta no levanta ninguna alarma.
//
// Lo que se prueba aquí es que eso ya no puede volver a pasar en silencio: si
// el primer modelo está muerto, el siguiente responde en la misma petición.

import test from 'node:test';
import assert from 'node:assert/strict';

import { CANDIDATOS, conModeloDisponible, listaDeModelos } from '../api/_modelo-ia.js';

// Imita el error que devuelve Groq cuando un modelo ya no existe.
function modeloRetirado() {
  const err = new Error('model_decommissioned');
  err.status = 404;
  return err;
}

test('si el primer modelo está muerto, responde el siguiente', async () => {
  const probados = [];
  const { resultado, modelo } = await conModeloDisponible(async (m) => {
    probados.push(m);
    if (m === CANDIDATOS[0]) throw modeloRetirado();
    return 'respuesta';
  });

  assert.equal(resultado, 'respuesta');
  assert.equal(modelo, CANDIDATOS[1], 'debe haber usado el segundo de la lista');
  assert.deepEqual(probados, [CANDIDATOS[0], CANDIDATOS[1]]);
});

test('el cliente recibe respuesta aunque mueran dos modelos seguidos', async () => {
  const { resultado } = await conModeloDisponible(async (m) => {
    if (m === CANDIDATOS[0] || m === CANDIDATOS[1]) throw modeloRetirado();
    return 'al tercer intento';
  });
  assert.equal(resultado, 'al tercer intento');
});

test('si TODOS están muertos, el error lo dice claramente', async () => {
  await assert.rejects(
    () => conModeloDisponible(async () => { throw modeloRetirado(); }),
    (err) => err.sinModelos === true
  );
});

// Un error que NO se arregla cambiando de modelo (clave mala, límite de
// peticiones, caída de Groq) debe subir tal cual. Reintentar con los otros
// modelos solo serviría para tardar el triple en dar exactamente el mismo
// error, y en modo voz eso son varios segundos de silencio.
test('un error de clave no se reintenta con otros modelos', async () => {
  let intentos = 0;
  await assert.rejects(
    () =>
      conModeloDisponible(async () => {
        intentos++;
        const err = new Error('invalid_api_key');
        err.status = 401;
        throw err;
      }),
    /invalid_api_key/
  );
  assert.equal(intentos, 1, 'solo debe intentarlo una vez');
});

test('un límite de peticiones tampoco se reintenta', async () => {
  let intentos = 0;
  await assert.rejects(
    () =>
      conModeloDisponible(async () => {
        intentos++;
        const err = new Error('rate_limit');
        err.status = 429;
        throw err;
      }),
    /rate_limit/
  );
  assert.equal(intentos, 1);
});

// Este es el escenario que motivó que GROQ_MODEL dejara de ser la última
// palabra: una variable olvidada en Vercel apuntando a un modelo muerto
// habría dejado los bots caídos aunque el código estuviera correcto.
test('una variable GROQ_MODEL apuntando a un modelo muerto ya no tumba el bot', async () => {
  const antes = process.env.GROQ_MODEL;
  process.env.GROQ_MODEL = 'modelo-que-ya-no-existe';
  try {
    const lista = listaDeModelos();
    assert.equal(lista[0], 'modelo-que-ya-no-existe', 'el fijado se prueba primero');
    assert.ok(lista.length > 1, 'pero NO puede ser el único');

    const { modelo } = await conModeloDisponible(async (m) => {
      if (m === 'modelo-que-ya-no-existe') throw modeloRetirado();
      return 'ok';
    });
    assert.ok(CANDIDATOS.includes(modelo), 'responde con uno de los modelos buenos');
  } finally {
    if (antes === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = antes;
  }
});

test('la lista no repite modelos', () => {
  const antes = process.env.GROQ_MODEL;
  process.env.GROQ_MODEL = CANDIDATOS[0];
  try {
    const lista = listaDeModelos();
    assert.equal(new Set(lista).size, lista.length);
  } finally {
    if (antes === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = antes;
  }
});
