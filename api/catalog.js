import { getCatalog, listKeyFor, saveConfig, saveList } from './_catalog.js';
import { hasDB } from './_store.js';
import { s } from './_pricing.js';

// GET     -> catálogo completo (público, lo usa la tienda para mostrarse).
// POST    -> ?key=admin&resource=product|category|color   body: el objeto (crea o edita por id)
//         -> ?key=admin&resource=config                    body: cambios parciales de storeConfig
// DELETE  -> ?key=admin&resource=product|category|color&id=xxx
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const catalog = await getCatalog();
    return res.status(200).json(catalog);
  }

  const adminKey = process.env.ORDERS_ADMIN_KEY;
  if (!adminKey || (req.query.key || '') !== adminKey) {
    return res.status(401).json({ error: 'Clave incorrecta.' });
  }
  if (!hasDB) {
    return res.status(501).json({
      error: 'Base de datos no conectada. Conecta la integración gratuita "Upstash Redis" en Vercel (Storage → Marketplace) para poder editar el catálogo desde aquí.',
    });
  }

  const resource = s(req.query.resource, 20);

  if (req.method === 'POST') {
    if (resource === 'config') {
      const cambios = req.body || {};
      const catalog = await getCatalog();
      const merged = { ...catalog.storeConfig, ...cambios };
      await saveConfig(merged);
      return res.status(200).json({ ok: true, storeConfig: merged });
    }

    const listKey = listKeyFor(resource);
    if (!listKey) return res.status(400).json({ error: 'Recurso inválido (product, category, color o config).' });

    const item = req.body;
    const id = s(item?.id, 60).trim();
    if (!id) return res.status(400).json({ error: 'Falta el id del elemento.' });

    const catalog = await getCatalog();
    const list = [...catalog[listKey]];
    const idx = list.findIndex((x) => x.id === id);
    const clean = { ...item, id };
    if (idx >= 0) list[idx] = clean;
    else list.push(clean);

    await saveList(listKey, list);
    return res.status(200).json({ ok: true, [listKey]: list });
  }

  if (req.method === 'DELETE') {
    const listKey = listKeyFor(resource);
    if (!listKey) return res.status(400).json({ error: 'Recurso inválido.' });
    const id = s(req.query.id, 60);
    if (!id) return res.status(400).json({ error: 'Falta el id.' });

    const catalog = await getCatalog();
    const list = catalog[listKey].filter((x) => x.id !== id);
    await saveList(listKey, list);
    return res.status(200).json({ ok: true, [listKey]: list });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
