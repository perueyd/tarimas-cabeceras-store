# 🔐 Panel Admin + JARVIS VOICE

**JARVIS está SOLO en tu panel de control** (/pedidos) - es una herramienta exclusiva para el admin.

---

## 🚀 Cómo Acceder al Panel (Donde Está JARVIS)

### Step 1: Configurar Clave de Admin en Vercel

La clave que usas para entrar al panel se configura con una variable de entorno.

**En tu cuenta de Vercel:**

1. Ir a: https://vercel.com/dashboard
2. Seleccionar proyecto: `tarimas-cabeceras-store`
3. Click en **Settings**
4. Ir a **Environment Variables**
5. Click **Add New**
   - **Name:** `ORDERS_ADMIN_KEY`
   - **Value:** Elige una clave segura (ej: `TuClaveSegura2026!`)
   - **Environments:** Seleccionar `Production`, `Preview`, `Development`
6. Click **Save**
7. Click **Redeploy** (en la tab Deployments)

**Alternativamente, si usas CLI:**
```bash
vercel env add ORDERS_ADMIN_KEY
# Escribe tu clave cuando pida
vercel redeploy
```

---

### Step 2: Acceder al Panel en Local (Desarrollo)

Si quieres probar JARVIS en tu máquina:

1. Crear archivo `.env.local` en la raíz del proyecto:
```bash
ORDERS_ADMIN_KEY=tu-clave-local-123
GROQ_API_KEY=gsk_tu_clave_groq
```

2. Ejecutar servidor de desarrollo:
```bash
npm run dev
```

3. Ir a: http://localhost:5173/pedidos
4. Entrar con la clave que pusiste en `.env.local`

---

### Step 3: Entrar al Panel en Producción

1. Ir a: https://tarimas-cabeceras-store.vercel.app/pedidos
2. Entrar con la clave que configuraste en Vercel
3. ¡JARVIS está en el botón 🎙️ abajo a la izquierda!

---

## 🎙️ JARVIS en el Panel

**Ubicación:** Botón flotante 🎙️ en bottom-left (siempre visible)

**Qué puedes hacer:**
- Hablar en español: "Generar descripción para..."
- O escribir: mismo resultado
- JARVIS responde Y habla la respuesta

**Ejemplos:**

### Generar Descripción
```
TÚ: "Generar descripción para tarima queen 160x200"
JARVIS: "Tarima Premium Queen 160x200cm. Tapizado en tela 
de alta resistencia, estructura de madera maciza..."
🔊 (JARVIS habla automáticamente)
```

### Redactar Email
```
TÚ: "Redacta email de bienvenida para nuevos clientes"
JARVIS: "Asunto: Bienvenido a E|D Espacios y Diseño 🎉

Hola [Nombre],

Gracias por visitarnos. Somos E|D Espacios..."
🔊 (JARVIS habla)
```

### Analizar Ventas
```
TÚ: "Tuve 50 órdenes este mes, 60% tarimas, 40% cabeceras"
JARVIS: "Buena base. Estrategia:
1) Enfoca ads en tarimas (mayor conversión)
2) Crea bundles: tarima + cabecera
3) Retargeting a cart abandonados"
🔊 (JARVIS habla)
```

---

## 🔧 Cambiar Clave de Admin

¿Quieres cambiar la clave? (recomendado cada 3 meses)

**En Vercel:**
1. Settings → Environment Variables
2. Busca `ORDERS_ADMIN_KEY`
3. Click en los 3 puntitos
4. Click **Edit**
5. Nuevas valor
6. **Save** → **Redeploy**

**La nueva clave se activa en 5-10 minutos.**

---

## ⚠️ Seguridad de la Clave

**Reglas importantes:**

✅ **HAZLO:**
- Clave de 12+ caracteres (números + letras + símbolos)
- Guárdala en un gestor de contraseñas
- Cámbiala cada 3 meses
- NO la compartas vía WhatsApp/email

❌ **NO HAGAS:**
- Usar "admin123" o "password"
- Guardarla en .env público
- Compartirla en pantallas compartidas
- Usar la misma que otros servicios

**Ejemplo de clave segura:**
```
TarSol_2026.Admin!Key#9847
```

---

## 🐛 Troubleshooting

### "Clave incorrecta" (después de 5 intentos)
```
Solución:
1. Espera 5 minutos (rate limit de seguridad)
2. Verifica que la clave en Vercel es correcta
3. Redeploy en Vercel si recién la configuraste
4. Limpia cookies del navegador (Ctrl+Shift+Del)
5. Intenta en modo incógnito
```

### "JARVIS no responde"
```
Soluciones:
1. Verifica GROQ_API_KEY está en Vercel
2. Verifica tienes conexión a internet
3. Abre DevTools (F12) → Console → busca errores
4. Recarga la página
5. Prueba en otra pestaña (si abriste muchas)
```

### "Escucho el botón de voz pero no se activa"
```
Soluciones:
1. Verifica que el navegador tiene permiso de micrófono
   → Click en candado de la URL → Permisos → Micrófono → Permitir
2. Prueba en Chrome (mejor soporte de Web Speech API)
3. Cierra otras aplicaciones que usen micrófono
4. Reinicia el navegador
```

### "La voz no suena"
```
Soluciones:
1. Verifica volumen del navegador
2. Verifica volumen de la computadora
3. Prueba con auriculares
4. Recarga la página
5. Intenta en otra pestaña
```

---

## 📊 Permisos por Rol

| Rol | Acceso | Voz | Ejecución |
|-----|--------|-----|-----------|
| **Admin** (con clave) | ✅ Panel completo | ✅ JARVIS habla | ✅ Genera contenido |
| **Cliente** (público) | ❌ No ven panel | ❌ Solo chat público | ❌ No ejecutan |
| **Dev** (local) | ✅ Si .env configurado | ✅ JARVIS habla | ✅ Genera contenido |

---

## 🎯 Workflow Típico del Admin

**Mañana:**
1. Entrar a /pedidos con tu clave
2. JARVIS ya está disponible (botón 🎙️)
3. Decir: "¿Qué debo mejorar hoy?"
4. JARVIS analiza y sugiere

**Tareas rápidas:**
- "Generar descripción para nuevo producto"
- "Redacta email de oferta"
- "Analiza mis ventas de esta semana"
- "Consejo SEO para cabeceras"

**Ahorro de tiempo:**
- Antes: 30 min escribiendo descripción → Ahora: 1 min con JARVIS
- Antes: 1 hora redactando email → Ahora: 5 min con JARVIS
- Antes: Analizar datos manualmente → Ahora: JARVIS lo hace en 10 seg

---

## 🔐 Mejores Prácticas

### Clave Segura - Generador
```
Usa esto para generar claves seguras:
https://www.random.org/passwords/?num=1&len=24&digits=on&upperalpha=on&loweralpha=on&symbols=on
```

### Guardar Clave Seguramente
- **Recomendado:** 1Password, Bitwarden, LastPass
- **Aceptable:** Google Password Manager
- **NO:** Notas, Excel, SMS, Gmail

### Acceso Remoto
Si quieres acceder desde otro dispositivo:
1. Usa la misma clave en todos lados
2. NUNCA guardes en navegadores públicos
3. Usa Incognito si es computadora prestada
4. Cierra sesión al terminar

---

## 📞 Soporte

**¿Olvidaste la clave?**
- Cambiala en Vercel → Settings → Environment Variables
- La nueva se activa en 5-10 minutos

**¿JARVIS da errores?**
- Verifica GROQ_API_KEY en Vercel
- Revisa logs: Vercel Dashboard → Deployments → Logs
- Prueba en incógnito

**¿Preguntas sobre JARVIS?**
- Lee JARVIS-VOICE.md (todas las capacidades)
- Lee PERFORMANCE-OPTIMIZATION.md (no ralentiza)
- GitHub Issues si encuentras bugs

---

## ✅ Checklist de Setup

- [ ] Configuré ORDERS_ADMIN_KEY en Vercel
- [ ] Configuré GROQ_API_KEY en Vercel
- [ ] Hice Redeploy en Vercel
- [ ] Espéré 5-10 minutos
- [ ] Fui a /pedidos en producción
- [ ] Entré con la clave
- [ ] Vi el botón 🎙️ abajo a la izquierda
- [ ] Probé hablar o escribir un comando
- [ ] Escuché la respuesta de JARVIS

---

**¡Tu panel admin ahora tiene un asistente de voz! 🎙️**

JARVIS está listo para ayudarte cada vez que entres al panel.
