# ⚡ QUICK START - 5 minutos para tener TODO funcionando

## 🎯 Tu tienda tiene:
- ✅ CHAT-ED en página pública (💬 botón abajo a la derecha)
- ✅ JARVIS en panel admin (🎙️ botón solo en /pedidos)
- ✅ Trust Badges + Últimas Compras en landing
- ✅ Optimizado (0% ralentización)

**Pero necesitas hacer 2 cosas para que funcione:**

---

## 1️⃣ Obtener GROQ_API_KEY (2 minutos)

### En Local (Desarrollo Ahora)

1. Ir a: https://console.groq.com/keys
2. Crear cuenta o iniciar sesión
3. **Copy** la API key (empieza con `gsk_`)
4. Abrir `.env.local` en tu editor
5. Reemplazar:
   ```
   GROQ_API_KEY=gsk_YOUR_KEY_HERE
   ```
   Por:
   ```
   GROQ_API_KEY=gsk_tu_clave_aqui
   ```
6. **Guardar** archivo
7. Recarga la página del navegador (Ctrl+R o Cmd+R)

### En Producción (Vercel)

1. Ir a: https://vercel.com/dashboard
2. Proyecto: `tarimas-cabeceras-store`
3. **Settings** → **Environment Variables**
4. **Add New**
   - Name: `GROQ_API_KEY`
   - Value: `gsk_tu_clave`
   - Environments: ✅ Production, Preview, Development
5. **Save** → **Redeploy**

---

## 2️⃣ Acceder al Panel Admin (1 minuto)

Tu clave para el panel está en `.env.local`:
```
ORDERS_ADMIN_KEY=admin123
```

### Local
```
http://localhost:5173/pedidos
Clave: admin123
```

### Producción
```
https://tarimas-cabeceras-store.vercel.app/pedidos
Clave: admin123
```

**Luego de entrar, busca el botón 🎙️ abajo a la izquierda** ← Es JARVIS

---

## ✅ Checklist (5 min)

- [ ] Copiaste GROQ_API_KEY de https://console.groq.com/keys
- [ ] Pegaste en `.env.local` (línea 6)
- [ ] Guardaste el archivo
- [ ] Recargaste el navegador
- [ ] Hiciste click en botón 💬 (CHAT-ED)
- [ ] Escribiste "hola" y funcionó ✓
- [ ] (Opcional) Entraste a /pedidos con clave "admin123"
- [ ] (Opcional) Encontraste botón 🎙️ (JARVIS)

---

## 🐛 Si algo no funciona

### CHAT-ED no responde
```
❌ "Error procesando mensaje"
✅ Solución: Verifica GROQ_API_KEY en .env.local
✅ Recarga la página
```

### JARVIS no se ve
```
❌ No puedo entrar a /pedidos
✅ Solución: Clave es "admin123"
✅ O crea tu propia clave en .env.local (línea 8)
```

### El servidor no carga
```
❌ "Internal server error"
✅ Solución: npm run dev
✅ O mata el servidor (Ctrl+C) y reinicia
```

---

## 📚 Documentación Completa

Después de que funcione, lee:
- `GROQ-AI-SETUP.md` → Setup completo de Groq
- `JARVIS-VOICE.md` → Cómo usar JARVIS
- `ADMIN-PANEL-JARVIS.md` → Panel admin + seguridad
- `PERFORMANCE-OPTIMIZATION.md` → Optimizaciones

---

## 🚀 Ya Está Funcionando!

Una vez configurada GROQ_API_KEY:

**En la página pública:**
- Click en 💬
- Escribe: "¿Qué productos tienen?"
- CHAT-ED responde al instante

**En el panel admin:**
- Ve a /pedidos (clave: admin123)
- Click en 🎙️
- Di: "Generar descripción para tarima queen"
- JARVIS responde (¡y habla!)

---

## 💰 Costo

- GROQ_API_KEY: **$0/mes** (gratis siempre)
- CHAT-ED: **$0/mes**
- JARVIS: **$0/mes**
- **TOTAL: $0/mes** 🎉

---

**¿Problemas? Abre una issue en GitHub o escribe por WhatsApp.**

**¡Listo en 5 minutos! ⚡**
