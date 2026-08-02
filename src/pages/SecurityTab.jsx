import { useEffect, useState } from 'react';

// Estado REAL de la seguridad de la tienda.
//
// Antes esta pestaña tenía interruptores para "2FA", "encriptación",
// "protección DDoS", "auditoría" y "backups automáticos". Ninguno hacía nada:
// lo que se guardaba no lo leía ningún archivo del proyecto (comprobado con
// una búsqueda de storeConfig.security en todo el código). El dueño los
// activaba y se quedaba creyendo que su tienda estaba protegida. Una falsa
// sensación de seguridad es peor que no tener la pantalla.
//
// Ahora se muestra lo que de verdad está funcionando —que es bastante—, lo que
// depende del dueño, y lo que no existe. Sin adornos.

function Item({ estado, titulo, detalle }) {
  const estilos = {
    activo: { icono: '✅', color: 'text-green-800', fondo: 'bg-green-50 border-green-200' },
    aviso: { icono: '⚠️', color: 'text-amber-900', fondo: 'bg-amber-50 border-amber-200' },
    falta: { icono: '⭕', color: 'text-neutral-700', fondo: 'bg-neutral-50 border-neutral-200' },
  }[estado];

  return (
    <div className={`rounded-lg border p-3 ${estilos.fondo}`}>
      <p className={`text-sm font-medium ${estilos.color}`}>
        {estilos.icono} {titulo}
      </p>
      <p className="mt-1 text-xs text-neutral-600">{detalle}</p>
    </div>
  );
}

export default function SecurityTab({ catalog }) {
  const cfg = catalog.storeConfig || {};
  const [claveDebil, setClaveDebil] = useState(false);

  useEffect(() => {
    // La clave del panel no se puede leer desde aquí (vive en el servidor),
    // pero sí se puede avisar si la que se usó para entrar es muy corta.
    try {
      const raw = sessionStorage.getItem('ed-orders-key');
      const clave = raw ? JSON.parse(raw).key || '' : '';
      setClaveDebil(clave.length > 0 && clave.length < 10);
    } catch { /* da igual */ }
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
        🔒 Esto es un <strong>informe</strong>, no un panel de interruptores. Muestra lo que está
        protegiendo tu tienda ahora mismo.
      </div>

      <section>
        <h3 className="mb-3 text-lg font-semibold">Funcionando</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <Item
            estado="activo"
            titulo="El precio lo decide el servidor"
            detalle="Nadie puede cambiar el importe desde el navegador: se recalcula desde tu catálogo y se rechaza el cobro si no coincide con lo que se mostró en pantalla."
          />
          <Item
            estado="activo"
            titulo="Panel protegido contra fuerza bruta"
            detalle="Máximo 20 intentos fallidos de clave cada 5 minutos por dispositivo."
          />
          <Item
            estado="activo"
            titulo="La clave caduca sola"
            detalle="Se borra al cerrar la pestaña y caduca a las 8 horas. En una computadora prestada, el siguiente que entre no accede."
          />
          <Item
            estado="activo"
            titulo="Códigos de pedido imposibles de adivinar"
            detalle="10 caracteres al azar de origen criptográfico. Nadie puede probar códigos hasta dar con pedidos ajenos."
          />
          <Item
            estado="activo"
            titulo="Freno contra prueba de tarjetas robadas"
            detalle="Máximo 8 intentos de cobro cada 10 minutos por dispositivo."
          />
          <Item
            estado="activo"
            titulo="Tus claves nunca salen al navegador"
            detalle="La llave secreta de Culqi y los tokens de integraciones solo existen en el servidor; el catálogo público no los incluye."
          />
          <Item
            estado="activo"
            titulo="Conexión cifrada obligatoria"
            detalle="HTTPS forzado, y el navegador tiene prohibido cargar recursos de sitios no autorizados."
          />
          <Item
            estado="activo"
            titulo="Los asistentes no inventan precios"
            detalle="El chatbot y JARVIS solo usan datos de tu catálogo, y JARVIS exige tu clave: no responde a nadie más."
          />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold">Depende de ti</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <Item
            estado={claveDebil ? 'aviso' : 'activo'}
            titulo={claveDebil ? 'Tu clave es corta' : 'Clave de administrador'}
            detalle={
              claveDebil
                ? 'Tiene menos de 10 caracteres. Cámbiala en Vercel (variable ORDERS_ADMIN_KEY) por una más larga.'
                : 'Es la llave de todo tu negocio. No la compartas por WhatsApp ni la reutilices en otros sitios.'
            }
          />
          <Item
            estado={cfg.ruc && cfg.razonSocial ? 'activo' : 'aviso'}
            titulo="Datos legales publicados"
            detalle={
              cfg.ruc && cfg.razonSocial
                ? `RUC ${cfg.ruc} y razón social visibles, como exige INDECOPI.`
                : 'Faltan el RUC o la razón social. Son obligatorios: complétalos en "Datos de la tienda".'
            }
          />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold">No existe todavía</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <Item
            estado="falta"
            titulo="Verificación en dos pasos"
            detalle="El panel entra solo con la clave. Añadirla requiere un servicio de mensajes o una app de códigos."
          />
          <Item
            estado="falta"
            titulo="Registro de quién cambió qué"
            detalle="No queda constancia de las ediciones del panel. Con un solo administrador aporta poco."
          />
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Estas dos aparecían antes como interruptores que se podían "activar". No hacían nada, así
          que se quitaron para no dar una impresión falsa.
        </p>
      </section>
    </div>
  );
}
