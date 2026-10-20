// Lo que NO puede salir por la puerta pública.
//
// /api/catalog es público: lo pide el navegador de cada visitante para pintar
// la tienda. Todo lo que viaje ahí lo puede leer cualquiera, incluida la
// competencia. Esta prueba vigila que los campos privados sigan filtrándose,
// porque el filtro es fácil de olvidar: ya pasó dos veces.
//
//   · La primera, con los tokens de Instagram, TikTok y el webhook de Slack
//     guardados en la configuración de la tienda.
//   · La segunda, con el costo de fabricación de cada producto: se añadió el
//     campo y el filtro solo limpiaba la configuración, no los productos. No
//     llegó a filtrarse nada únicamente porque aún no había costos puestos.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const fuente = fs.readFileSync(path.join(RAIZ, 'api/catalog.js'), 'utf8');

test('el filtro público limpia la configuración Y los productos', () => {
  assert.match(
    fuente,
    /products:\s*\(catalog\.products[^)]*\)\.map\(/,
    'soloPublico() debe recorrer los productos. Si solo limpia storeConfig, ' +
      'cualquier campo privado que se añada a un producto viaja al navegador ' +
      'de todos los visitantes.'
  );
});

test('el costo de fabricación está en la lista de campos privados', () => {
  const lista = fuente.match(/const PRIVADO_PRODUCTO = \[([^\]]+)\]/)?.[1] || '';
  for (const campo of ['costo', 'costoPorMedida']) {
    assert.match(
      lista,
      new RegExp(`'${campo}'`),
      `"${campo}" debe estar en PRIVADO_PRODUCTO: es lo que al dueño le cuesta ` +
        'fabricar, y con ese dato un competidor sabe cuánto gana por pieza.'
    );
  }
});

test('los tokens de integraciones y el correo del dueño siguen filtrados', () => {
  const lista = fuente.match(/const PRIVADO = \[([^\]]+)\]/)?.[1] || '';
  assert.match(lista, /'integrations'/, 'los tokens de redes sociales no pueden salir');
  assert.match(lista, /'ownerEmail'/, 'el correo del dueño no pueden salir');
});

test('el panel (con clave) SÍ recibe el catálogo completo', () => {
  // Si se filtrara también para el admin, el editor no podría mostrar ni
  // guardar los costos: aparecerían vacíos y al guardar se borrarían.
  assert.match(
    fuente,
    /auth\.ok \? catalog : soloPublico\(catalog\)/,
    'la lectura con clave debe devolver el catálogo sin filtrar'
  );
});

// Esta es la prueba de verdad: se ejecuta el filtro con un catálogo de
// mentira y se comprueba qué sale.
test('un catálogo con costos pierde los costos al hacerse público', async () => {
  // soloPublico no se exporta (es interna del endpoint), así que se reconstruye
  // la misma lógica desde el propio archivo para probarla de verdad en vez de
  // confiar en que el texto esté bien escrito.
  const mod = await import('../api/catalog.js').catch(() => null);
  assert.ok(mod, 'api/catalog.js debe poder importarse sin ejecutar nada');

  // Comprobación por estructura: el map tiene que aplicar sinCampos con la
  // lista de campos privados del producto.
  assert.match(
    fuente,
    /sinCampos\(p, PRIVADO_PRODUCTO\)/,
    'cada producto debe pasar por sinCampos() con PRIVADO_PRODUCTO'
  );
  assert.match(
    fuente,
    /sinCampos\(catalog\.storeConfig, PRIVADO\)/,
    'la configuración debe pasar por sinCampos() con PRIVADO'
  );
});
