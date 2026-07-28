// Sistema de Gamificación: Puntos, badges, ranking, rachas
// Engancha clientes para comprar más veces

import { hasDB, redisCmd } from './_store.js';
import { checkAdminAuth } from './_auth.js';

const KEY_CLIENTES = 'gamificacion:clientes';
const KEY_BADGES = 'gamificacion:badges';

async function listarClientesGamificados() {
  if (!hasDB) return [];
  const data = await redisCmd(['GET', KEY_CLIENTES]);
  if (!data.result) return [];
  try {
    return JSON.parse(data.result);
  } catch {
    return [];
  }
}

async function guardarClientesGamificados(list) {
  if (!hasDB) return false;
  await redisCmd(['SET', KEY_CLIENTES, JSON.stringify(list)]);
  return true;
}

// Agregar puntos a cliente
export async function agregarPuntos(telefono, nombre, cantidad, razon) {
  if (!hasDB) return;

  try {
    const clientes = await listarClientesGamificados();
    let cliente = clientes.find((c) => c.telefono === telefono);

    if (!cliente) {
      cliente = {
        telefono,
        nombre,
        puntos: 0,
        nivel: 1,
        badges: [],
        compras: 0,
        rachaActual: 0,
        ultimaCompra: null,
        creado: new Date().toISOString(),
      };
      clientes.push(cliente);
    }

    cliente.puntos += cantidad;
    cliente.compras += 1;
    cliente.ultimaCompra = new Date().toISOString();

    // Detectar racha (compra cada 7 días)
    const diasDesdeUltima = cliente.ultimaCompra
      ? Math.floor(
          (new Date() - new Date(cliente.ultimaCompra)) / (1000 * 60 * 60 * 24)
        )
      : 999;

    if (diasDesdeUltima <= 7) {
      cliente.rachaActual += 1;
    } else {
      cliente.rachaActual = 1;
    }

    // Upgrade de nivel
    if (cliente.puntos >= 500 && cliente.nivel === 1) cliente.nivel = 2;
    if (cliente.puntos >= 1500 && cliente.nivel === 2) cliente.nivel = 3;
    if (cliente.puntos >= 3000 && cliente.nivel === 3) cliente.nivel = 4;

    // Badges automáticos
    const badges = [];
    if (cliente.compras === 1) badges.push('🎯 Primera Compra');
    if (cliente.compras === 5) badges.push('⭐ 5 Compras');
    if (cliente.compras === 10) badges.push('🏆 10 Compras');
    if (cliente.rachaActual >= 5) badges.push('🔥 Racha 5');
    if (cliente.rachaActual >= 10) badges.push('⚡ Racha 10');
    if (cliente.nivel === 4) badges.push('👑 VIP');

    cliente.badges = [...new Set([...cliente.badges, ...badges])];

    const idx = clientes.findIndex((c) => c.telefono === telefono);
    if (idx >= 0) clientes[idx] = cliente;

    await guardarClientesGamificados(clientes);
    return cliente;
  } catch (err) {
    console.error('Error en gamificación:', err);
  }
}

// Handler API
export default async function handler(req, res) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  if (req.method === 'GET') {
    // GET ?telefono=X - obtener perfil gamificado
    if (req.query.telefono) {
      const clientes = await listarClientesGamificados();
      const cliente = clientes.find((c) => c.telefono === req.query.telefono);
      return res.status(200).json({ cliente: cliente || null });
    }

    // GET sin query - ranking global
    const clientes = await listarClientesGamificados();
    const ranking = clientes
      .sort((a, b) => b.puntos - a.puntos)
      .slice(0, 10)
      .map((c, i) => ({
        ...c,
        posicion: i + 1,
      }));

    return res.status(200).json({ ranking, total: clientes.length });
  }

  if (req.method === 'POST') {
    // POST - agregar puntos
    const { telefono, nombre, cantidad, razon } = req.body;
    if (!telefono || !cantidad) {
      return res.status(400).json({ error: 'Falta telefono o cantidad' });
    }

    const cliente = await agregarPuntos(telefono, nombre || 'Cliente', cantidad, razon);
    return res.status(200).json({ ok: true, cliente });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
