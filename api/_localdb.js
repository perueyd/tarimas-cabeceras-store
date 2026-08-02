// Base de datos LOCAL para desarrollo (solo `npm run dev`).
//
// En producción la tienda usa Upstash Redis. Esas credenciales viven en Vercel,
// así que en la laptop el panel se quedaba en "Base de datos no conectada".
// Este archivo imita los comandos de Redis que usa la tienda, guardando todo en
// un archivo JSON (.localdb.json) al lado del proyecto.
//
// IMPORTANTE: este módulo SOLO se carga si LOCAL_DEV_DB=1, variable que pone
// dev-server.js. En Vercel nunca está puesta, así que en producción este
// archivo ni siquiera se importa: la tienda real sigue usando Redis igual que
// siempre.
//
// Las respuestas imitan el formato REST de Upstash: { result: ... }.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.localdb.json');

// Cada clave se guarda como { t: tipo, v: valor, exp?: vencimiento }.
// Tipos: 's' texto, 'l' lista, 'h' hash, 'set' conjunto.
function leer() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return {};
  }
}

function escribir(db) {
  try {
    fs.writeFileSync(FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.warn('[db local] no se pudo guardar:', err.message);
  }
}

// Borra la clave si ya venció (EXPIRE). Devuelve la entrada viva, o undefined.
function vivo(db, key) {
  const entry = db[key];
  if (!entry) return undefined;
  if (entry.exp && Date.now() > entry.exp) {
    delete db[key];
    return undefined;
  }
  return entry;
}

// Índices de LRANGE: el final es INCLUSIVO y admite negativos (-1 = último).
function rango(len, start, stop) {
  let i = Number(start);
  let f = Number(stop);
  if (i < 0) i = Math.max(len + i, 0);
  if (f < 0) f = len + f;
  f = Math.min(f, len - 1);
  return [i, f];
}

export function localRedisCmd(command) {
  const [rawCmd, key, ...args] = command;
  const cmd = String(rawCmd).toUpperCase();
  const db = leer();
  const entry = vivo(db, key);
  let result;
  let mutado = true;

  switch (cmd) {
    case 'GET':
      result = entry?.t === 's' ? entry.v : null;
      mutado = false;
      break;

    case 'SET':
      db[key] = { t: 's', v: String(args[0]) };
      result = 'OK';
      break;

    // INCR crea la clave en 0 si no existe. Devuelve NÚMERO: _ratelimit.js
    // compara con === 1 para saber si es el primer intento de la ventana.
    case 'INCR': {
      const n = (entry?.t === 's' ? Number(entry.v) || 0 : 0) + 1;
      db[key] = { t: 's', v: String(n), exp: entry?.exp };
      result = n;
      break;
    }

    case 'EXPIRE':
      if (entry) {
        entry.exp = Date.now() + Number(args[0]) * 1000;
        db[key] = entry;
        result = 1;
      } else {
        result = 0;
        mutado = false;
      }
      break;

    // LPUSH mete al PRINCIPIO: los pedidos más nuevos quedan primero, que es
    // como los lee el panel.
    case 'LPUSH': {
      const lista = entry?.t === 'l' ? entry.v : [];
      lista.unshift(...args.map(String));
      db[key] = { t: 'l', v: lista, exp: entry?.exp };
      result = lista.length;
      break;
    }

    case 'LRANGE': {
      const lista = entry?.t === 'l' ? entry.v : [];
      const [i, f] = rango(lista.length, args[0], args[1]);
      result = i > f ? [] : lista.slice(i, f + 1);
      mutado = false;
      break;
    }

    case 'LSET': {
      const lista = entry?.t === 'l' ? entry.v : [];
      const i = Number(args[0]);
      if (i < 0 || i >= lista.length) throw new Error('index out of range');
      lista[i] = String(args[1]);
      db[key] = { t: 'l', v: lista, exp: entry?.exp };
      result = 'OK';
      break;
    }

    // LREM con count 0 borra TODAS las apariciones del valor.
    case 'LREM': {
      const lista = entry?.t === 'l' ? entry.v : [];
      const count = Number(args[0]);
      const valor = String(args[1]);
      let quedan = [];
      let borrados = 0;
      const limite = count === 0 ? Infinity : Math.abs(count);
      const orden = count < 0 ? [...lista].reverse() : lista;
      for (const x of orden) {
        if (x === valor && borrados < limite) borrados++;
        else quedan.push(x);
      }
      if (count < 0) quedan = quedan.reverse();
      db[key] = { t: 'l', v: quedan, exp: entry?.exp };
      result = borrados;
      break;
    }

    case 'HSET': {
      const hash = entry?.t === 'h' ? entry.v : {};
      let nuevos = 0;
      for (let i = 0; i < args.length; i += 2) {
        if (!(args[i] in hash)) nuevos++;
        hash[String(args[i])] = String(args[i + 1]);
      }
      db[key] = { t: 'h', v: hash, exp: entry?.exp };
      result = nuevos;
      break;
    }

    case 'HGET':
      result = entry?.t === 'h' ? (entry.v[String(args[0])] ?? null) : null;
      mutado = false;
      break;

    // Suma atómica dentro de un hash. Es lo que evita que dos compras a la vez
    // se pisen el contador de usos de un cupón.
    case 'HINCRBY': {
      const hash = entry?.t === 'h' ? entry.v : {};
      const campo = String(args[0]);
      const n = (Number(hash[campo]) || 0) + (Number(args[1]) || 0);
      hash[campo] = String(n);
      db[key] = { t: 'h', v: hash, exp: entry?.exp };
      result = n;
      break;
    }

    case 'HVALS':
      result = entry?.t === 'h' ? Object.values(entry.v) : [];
      mutado = false;
      break;

    case 'HDEL': {
      const hash = entry?.t === 'h' ? entry.v : {};
      let borrados = 0;
      for (const f of args) {
        if (String(f) in hash) {
          delete hash[String(f)];
          borrados++;
        }
      }
      db[key] = { t: 'h', v: hash, exp: entry?.exp };
      result = borrados;
      break;
    }

    case 'SADD': {
      const set = entry?.t === 'set' ? entry.v : [];
      let nuevos = 0;
      for (const m of args) {
        if (!set.includes(String(m))) {
          set.push(String(m));
          nuevos++;
        }
      }
      db[key] = { t: 'set', v: set, exp: entry?.exp };
      result = nuevos;
      break;
    }

    case 'SISMEMBER':
      result = entry?.t === 'set' && entry.v.includes(String(args[0])) ? 1 : 0;
      mutado = false;
      break;

    case 'DEL':
      result = key in db ? 1 : 0;
      delete db[key];
      break;

    default:
      throw new Error(`[db local] comando no soportado: ${cmd}`);
  }

  if (mutado) escribir(db);
  return { result };
}
