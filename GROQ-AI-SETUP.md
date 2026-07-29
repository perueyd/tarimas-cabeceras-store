# 🤖 Configuración de Groq AI - CHAT-ED + JARVIS

Acabas de desplegar **dos asistentes de IA completamente gratis** en tu tienda:

1. **CHAT-ED**: Chatbot en la página web (bottom-right) para atender clientes
2. **JARVIS**: Asistente en el panel admin para ayudarte con contenido y análisis

---

## ✅ Paso 1: Obtener API Key Gratuita

1. Ir a: https://console.groq.com/keys
2. Crear cuenta (o inicia sesión si ya tienes)
3. Generar nueva API Key
4. **Copiar la clave** (empieza con `gsk_`)

**Límites gratis:**
- 25 peticiones por minuto
- Modelo: `mixtral-8x7b-32768` (muy rápido)
- Costo: **$0** (para siempre en tier gratuito)

---

## ✅ Paso 2: Configurar en Vercel

### Opción A: Desde Dashboard Vercel (Recomendado)

1. Ir a: https://vercel.com/dashboard
2. Buscar proyecto `tarimas-cabeceras-store`
3. Click en **Settings**
4. Ir a **Environment Variables**
5. Click **Add New**
   - **Name:** `GROQ_API_KEY`
   - **Value:** `gsk_tu_clave_aqui` (pega la clave)
   - **Environments:** Seleccionar `Production`, `Preview`, `Development`
6. Click **Save**
7. **Redeploy** (ir a Deployments y click redeploy)

### Opción B: Usando CLI

```bash
vercel env add GROQ_API_KEY
# Pega tu clave cuando pida
vercel redeploy
```

---

## ✅ Paso 3: Verificar que Funciona

1. Ir a: https://tarimas-cabeceras-store.vercel.app
2. Abrir el chat (botón 💬 en abajo a la derecha)
3. Escribir algo como: "¿Cuánto cuesta una tarima?"
4. ✅ Si responde, ¡está funcionando!

---

## 🎯 Funcionalidades

### CHAT-ED (Para Clientes)

**Ubicación:** Botón 💬 flotante en abajo a la derecha de la página

**Puede hacer:**
- ✅ Responder preguntas sobre productos
- ✅ Dar información de contacto y horarios
- ✅ Explicar procesos de compra
- ✅ Sugerir productos según necesidad
- ✅ Dar número de WhatsApp para cotizaciones

**Idioma:** Español (péruano 🇵🇪)

**Ejemplo de conversación:**
```
Cliente: "¿Venden cabeceras personalizadas?"
CHAT-ED: "Sí! Todas nuestras cabeceras se hacen a medida. 
Puedes elegir tamaño, color y material. Para medidas 
específicas, escríbenos vía WhatsApp: +51951278010"
```

---

### JARVIS (Para el Admin)

**Ubicación:** Botón 🤖 flotante en abajo a la izquierda del panel `/pedidos`

**Puede hacer:**
- ✅ Generar descripciones de productos
- ✅ Redactar emails de marketing
- ✅ Analizar datos de ventas (proporciona los números)
- ✅ Sugerir mejoras en configuración
- ✅ Ayudar con SEO
- ✅ Explicar cómo funciona el panel

**Idioma:** Español (profesional)

**Ejemplo:**
```
Admin: "Genera descripción para tarima queen 160x200"
JARVIS: "Tarima Queen Premium 160x200 cm
Dotada de tapizado en tela de alta resistencia, 
estructura de madera maciza y sistema de absorción 
de impacto. Disponible en colores Gris, Beige, 
Azul Petróleo, Vino y Negro. Garantía de 2 años."
```

---

## 📊 Costos

| Herramienta | Límite Gratuito | Costo |
|------------|-----------------|-------|
| Groq API | 25 req/min | **$0** |
| CHAT-ED | Unlimited | **$0** |
| JARVIS | Unlimited | **$0** |
| **Total mensual** | - | **$0** 🎉 |

---

## ⚙️ Mantenimiento

### Si se agota el límite de 25 req/min

**Solución:** Upgraar a $5/mes para 30 req/min (seguirá siendo muy barato)

En https://console.groq.com → Plans

### Si el chatbot no responde

1. Verificar que `GROQ_API_KEY` está en Vercel (Settings → Environment Variables)
2. Verificar la clave es correcta (empieza con `gsk_`)
3. Revisar logs en Vercel (Deployments → Logs)
4. Contactar soporte Groq: https://discord.gg/mXy7JsGV

### Si quieres cambiar el comportamiento

**CHAT-ED:** Editar `api/chatbot.js` línea 7 (SYSTEM_PROMPT)
**JARVIS:** Editar `api/jarvis.js` línea 7 (SYSTEM_PROMPT)

Cambiar el prompt y hacer redeploy.

---

## 🚀 Próximas Mejoras (Opcionales)

Si quieres llevar más lejos la IA:

### 1. Guardar historial de conversaciones
- Usar Redis (ya tienes Upstash) para persistencia
- Los chats desaparecen al refrescar ahora

### 2. Personalizar comportamiento por página
- CHAT-ED diferente en landing vs producto
- Contexto específico por página

### 3. Agregar más capacidades a JARVIS
- Predicción de demanda
- Recomendaciones de precio
- Análisis de satisfacción del cliente

### 4. Integración con WhatsApp API
- Respuestas automáticas en WhatsApp también
- Mismo CHAT-ED en todos los canales

---

## 📞 Soporte

**¿Preguntas?**
- Groq Discord: https://discord.gg/mXy7JsGV
- Vercel Support: https://vercel.com/support
- Tu repositorio: https://github.com/perueyd/tarimas-cabeceras-store

**¿Encontraste un bug?**
- Abre un issue en GitHub
- Revisa los logs de Vercel

---

## ✨ ¿Cómo Funciona Técnicamente?

```
CLIENTE EN WEB
    ↓
Click en CHAT-ED 💬
    ↓
ChatbotWidget.jsx (React component)
    ↓
POST /api/chatbot (Vercel serverless)
    ↓
Groq API (mixtral-8x7b-32768)
    ↓
Respuesta en 50-200ms ⚡
    ↓
Mostrar en chat
```

Lo mismo para JARVIS, pero en el panel admin.

**Ventajas:**
- ✅ Sin bases de datos complicadas
- ✅ Sin entrenamiento de modelos
- ✅ Sin infraestructura cara
- ✅ Actualizaciones automáticas de IA
- ✅ Escalable (Vercel maneja el tráfico)

---

**¡Listo! Tu tienda ahora tiene IA. 🎉**

Próximo paso: Ir a https://console.groq.com/keys y obtener tu clave.
