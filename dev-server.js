import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

for (const file of ['.env.local', '.env']) {
  const envPath = path.join(__dirname, file);
  if (!fs.existsSync(envPath)) continue;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    const value = match[2].trim().replace(/^["'](.*)["']$/, '$1');
    if (!(key in process.env)) process.env[key] = value;
  }
}

// Activa la base de datos en archivo (api/_localdb.js) cuando no hay
// credenciales de Upstash en .env.local. Solo afecta a `npm run dev`.
process.env.LOCAL_DEV_DB = '1';

async function createServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Handle API routes
    if (req.url.startsWith('/api/')) {
      const apiPath = req.url.split('?')[0];
      const modulePath = path.join(__dirname, 'api', apiPath.replace(/^\/api\//, '').replace(/\/$/, '') + '.js');

      try {
        if (fs.existsSync(modulePath)) {
          // Convert to file:// URL for Windows compatibility
          const moduleUrl = new URL(`file:///${modulePath.replace(/\\/g, '/')}`).href;
          const module = await import(moduleUrl);
          const handler = module.default;

          if (typeof handler === 'function') {
            // Mock req/res objects for handler
            // Vercel entrega req.query como objeto plano. Un URLSearchParams
            // NO expone los valores como propiedades, así que `req.query.code`
            // salía undefined y fallaban el seguimiento de pedidos, el editor
            // del catálogo, los cupones y los borrados.
            const mockReq = {
              method: req.method,
              headers: req.headers,
              query: Object.fromEntries(new URL(req.url, 'http://localhost').searchParams),
              body: req.method !== 'GET' ? await parseBody(req) : undefined,
            };

            const mockRes = {
              status: (code) => {
                mockRes.statusCode = code;
                return mockRes;
              },
              json: (data) => {
                res.writeHead(mockRes.statusCode || 200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
              },
              // write() permite respuestas por partes (el modo voz de JARVIS
              // habla mientras el texto sigue llegando). La primera escritura
              // manda las cabeceras que el handler haya puesto con setHeader.
              write: (chunk) => {
                if (!res.headersSent) res.writeHead(mockRes.statusCode || 200);
                return res.write(chunk);
              },
              end: (data) => {
                if (!res.headersSent) res.writeHead(mockRes.statusCode || 200);
                res.end(data);
              },
              setHeader: (key, value) => {
                if (!res.headersSent) res.setHeader(key, value);
              },
              statusCode: 200,
            };

            await handler(mockReq, mockRes);
            return;
          }
        }
      } catch (error) {
        console.error(`API Error (${apiPath}):`, error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error', details: error.message }));
        return;
      }
    }

    // Let Vite handle other requests
    vite.middlewares(req, res);
  });

  return server;
}

// Las subidas de fotos mandan bytes crudos (application/octet-stream), no
// JSON. Si se les aplica JSON.parse el handler recibe {} y responde siempre
// "no llegó ningún archivo", así que ese caso se devuelve como Buffer.
function parseBody(req) {
  const tipo = String(req.headers['content-type'] || '');
  const binario = tipo.includes('octet-stream') || tipo.startsWith('image/');
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      if (binario) return resolve(buf);
      try {
        resolve(buf.length ? JSON.parse(buf.toString('utf8')) : {});
      } catch {
        resolve({});
      }
    });
  });
}

createServer().then((server) => {
  server.listen(5173, () => {
    console.log('Dev server running at http://localhost:5173');
  });
});
