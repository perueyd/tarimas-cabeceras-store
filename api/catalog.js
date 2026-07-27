import { getCatalog, listKeyFor, saveConfig, saveList } from './_catalog.js';
import { hasDB } from './_store.js';
import { s } from './_pricing.js';
import { checkAdminAuth } from './_auth.js';

// GET     -> catálogo completo (público, lo usa la tienda para mostrarse).
// POST    -> Authorization: Bearer <admin>, ?resource=product|category|color|size|showcase   body: el objeto (crea o edita por id)
//         -> ?resource=config                                                                body: cambios parciales de storeConfig
// DELETE  -> Authorization: Bearer <admin>, ?resource=product|category|color|size|showcase&id=xxx
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const catalog = await getCatalog();
    return res.status(200).json(catalog);
  }

  const auth = await checkAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
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
    if (!listKey) return res.status(400).json({ error: 'Recurso inválido (product, category, color, size, showcase o config).' });

    // Reordenar: el body trae { ids: [...] } con el nuevo orden. No cambia los
    // datos de cada elemento, solo su posición (el orden del array = orden en
    // la tienda). Los ids desconocidos se ignoran y los que falten se dejan al
    // final, para no perder ningún elemento por un desajuste.
    if (s(req.query.action, 20) === 'reorder') {
      const catalog = await getCatalog();
      const actual = catalog[listKey] || [];
      const orden = Array.isArray(req.body?.ids) ? req.body.ids : [];
      const porId = new Map(actual.map((x) => [x.id, x]));
      const reordenado = [];
      for (const id of orden) {
        if (porId.has(id)) { reordenado.push(porId.get(id)); porId.delete(id); }
      }
      for (const restante of porId.values()) reordenado.push(restante); // los no listados, al final
      await saveList(listKey, reordenado);
      return res.status(200).json({ ok: true, [listKey]: reordenado });
    }

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
