# 🎙️ JARVIS VOICE - Asistente IA que Habla y Ejecuta

**JARVIS 2.0:** Tu nuevo asistente admin que no solo da consejos, sino que **HABLA** y **EJECUTA ACCIONES**.

---

## ✨ Capacidades

### 1. **Habla Nativa** 🔊
- ✅ Escucha tus comandos en ESPAÑOL
- ✅ Responde hablando (text-to-speech)
- ✅ Reconocimiento de voz en tiempo real
- ✅ Puedes detener en cualquier momento

### 2. **Ejecuta Acciones** ⚡
Detecta automáticamente lo que quieres hacer:

| Comando | Acción |
|---------|--------|
| "Generar descripción para..." | Crea descripción de producto |
| "Redacta email..." | Genera email de marketing |
| "Consejo SEO para..." | Sugiere optimizaciones SEO |
| "Analiza ventas..." | Interpreta datos de ventas |
| "Sugiere precio..." | Calcula precio óptimo |

### 3. **Interfaz Inteligente** 🎨
- Botón flotante con micrófono (🎙️)
- Panel expandible con historial
- Estado visual en tiempo real (escuchando/hablando)
- Quick-action buttons para accesos rápidos

---

## 🎯 Cómo Usar

### Opción 1: Hablar (Más Rápido)
```
1. Click en botón 🎙️
2. Click en "🎤 Habla"
3. Di: "Generar descripción para tarima queen"
4. JARVIS responde y habla la respuesta
5. Click "Detener" cuando termina
```

### Opción 2: Escribir (Más Preciso)
```
1. Click en botón 🎙️
2. Escribe en el input
3. Click en "📤" o presiona Enter
4. JARVIS responde (igual que antes)
```

### Opción 3: Botones Rápidos
```
1. Click en botón 🎙️
2. Click en uno de los 4 botones:
   - 📝 Descripción
   - ✉️ Email
   - 🔍 SEO
   - 📊 Análisis
3. Se auto-completa el input, click enviar
```

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Generar Descripción
```
TÚ (hablando): "Generar descripción para tarima queen 160x200 tapizada"

JARVIS (hablando): "Tarima Premium Queen 160x200cm. Tapizado en tela 
de alta resistencia, estructura de madera maciza, disponible en 5 colores: 
Gris, Beige, Azul Petróleo, Vino y Negro. Garantía de 2 años."
```

### Ejemplo 2: Email de Marketing
```
TÚ (escribiendo): "Redacta email para clientes frecuentes con descuento"

JARVIS (hablando): "Asunto: Exclusive 15% off para ti 🎁

Hola [Nombre],

Como cliente VIP, te ofrecemos 15% descuento en tu próxima compra.
Válido hasta el 15 de agosto. ¿Cuál es tu favorito?

Código: VIP15"
```

### Ejemplo 3: Análisis de Ventas
```
TÚ (hablando): "Analiza mis ventas, tuve 50 órdenes este mes"

JARVIS (hablando): "Buena base. Si 60% son tarimas y 40% cabeceras:
(1) Enfoca publicidad en tarimas (mayor margen)
(2) Crea bundle: tarima + cabecera (aumenta ticket)
(3) Retargeting a cart abandonados con urgencia"
```

---

## 🔧 Tecnología Detrás

### Speech Recognition (Voz → Texto)
```javascript
// Web Speech API (nativa del navegador)
const SpeechRecognition = window.SpeechRecognition 
                        || window.webkitSpeechRecognition;
recognition.lang = 'es-ES'; // Español
recognition.continuous = false; // Una frase por vez
```

**Soportado en:**
- ✅ Chrome/Edge (perfecto)
- ✅ Safari (muy bien)
- ✅ Firefox (con permiso)
- ❌ Opera mini (no soporta)

### Text-to-Speech (Texto → Voz)
```javascript
// Web Audio API (nativa del navegador)
const utterance = new SpeechSynthesisUtterance(text);
utterance.lang = 'es-ES';
utterance.rate = 1; // velocidad normal
speechSynthesis.speak(utterance);
```

**Voces disponibles:**
- ✅ Voz masculina (default)
- ✅ Voz femenina (configurable)
- ✅ Varios acentos españoles

### Action Detection
```javascript
// Detecta automáticamente la intención
const ACTIONS = {
  generateDescription: 'generar descripción',
  generateEmail: 'generar email',
  seoAdvice: 'consejo seo',
  analyzeSales: 'analizar ventas',
  suggestPrice: 'sugerir precio',
};

// Si el usuario dice "generar descripción para...",
// JARVIS sabe que quiere una descripción
```

---

## ⚙️ Configuración

### Cambiar Idioma
En `src/components/JarvisVoice.jsx`, línea ~45:
```javascript
recognitionRef.current.lang = 'es-MX'; // Mexicano
// o
recognitionRef.current.lang = 'es-AR'; // Argentino
// o
recognitionRef.current.lang = 'es-ES'; // Español
```

### Cambiar Velocidad de Voz
Línea ~120:
```javascript
utterance.rate = 0.9; // más lento
// o
utterance.rate = 1.2; // más rápido
```

### Agregar Más Acciones
1. Agregar a `ACTIONS` object (línea ~7)
2. Crear función `handle[Action]()` 
3. Agregar case en `executeAction()` (línea ~180)
4. Agregar button en Quick Actions (línea ~290)

---

## 📱 Compatibilidad

| Dispositivo | Soporte | Notas |
|------------|---------|-------|
| Desktop Chrome | ✅ 100% | Mejor experiencia |
| Desktop Safari | ✅ 90% | Voces limitadas |
| Desktop Firefox | ✅ 80% | Requiere permiso |
| Tablet | ✅ 85% | Micrófono recomendado |
| Mobile | ⚠️ 70% | Variable por navegador |
| IE 11 | ❌ 0% | No soporta Web Speech |

### Dar Permiso de Micrófono
1. Cuando abres JARVIS por primera vez
2. Navegador pide permiso de micrófono
3. Click "Permitir"
4. ¡Listo, puedes hablar!

---

## 🎤 Consejos para Mejor Reconocimiento

1. **Habla claro y pausado**
   - No murmulles
   - Pausa entre frases

2. **Sin ruido de fondo**
   - Cierra ventanas
   - Apaga música
   - Ambiente silencioso

3. **Usa el micrófono correcto**
   - Auriculares con micrófono (mejor)
   - No el micrófono integrado de laptop

4. **Frases cortas**
   - Máximo 20 palabras por comando
   - Una acción por vez

5. **Ejemplos de comandos claros:**
   - ✅ "Generar descripción para tarima queen"
   - ✅ "Redacta email de bienvenida"
   - ✅ "Análisis de mis ventas"
   - ❌ "Oye JARVIS, quiero que hagas una cosa..."
   - ❌ "¿Podrías generar..."

---

## 🐛 Troubleshooting

### "No escucha mi voz"
```
Soluciones:
1. Verifica permiso de micrófono (settings → privacidad)
2. Prueba otro navegador (Chrome es más confiable)
3. Acércate más al micrófono
4. Habla más fuerte y claro
5. Reinicia la página
```

### "La voz no suena"
```
Soluciones:
1. Verifica volumen del navegador
2. Prueba con auriculares
3. Recarga la página
4. En algunos navegadores, scroll en la página activa el audio
```

### "Responde algo raro"
```
Soluciones:
1. Revisa si GROQ_API_KEY está en Vercel
2. Verifica logs en Vercel: Deployments → Logs
3. Intenta de nuevo (límite es 25 req/min)
4. Escribe en lugar de hablar para mayor precisión
```

### "¿Soporta otros idiomas?"
```
Sí, pero requiere cambio en código:
- recognitionRef.current.lang = 'en-US'; // Inglés
- recognitionRef.current.lang = 'fr-FR'; // Francés
- etc.
```

---

## 🚀 Mejoras Futuras

### Phase 2 (Próximas semanas):
- ✅ Guardar acciones ejecutadas (historial)
- ✅ Ejecutar cambios directamente en panel (sin copy-paste)
- ✅ Integración con Vercel Analytics (datos reales)
- ✅ Múltiples voces (elegir género/acento)

### Phase 3 (Próximo mes):
- ✅ Traducir respuestas automáticamente
- ✅ Memorizar preferencias del usuario
- ✅ Alertas de voz ("Tienes nuevo pedido")
- ✅ Comandos más complejos ("Aumenta precio de tarimas 5%")

---

## 💰 Costo

| Servicio | Costo |
|----------|-------|
| Web Speech API (speech-to-text) | **$0** (nativo navegador) |
| Web Audio API (text-to-speech) | **$0** (nativo navegador) |
| Groq API (respuestas IA) | **$0** (free tier) |
| **Total** | **$0/mes** 🎉 |

**Sin costos ocultos.** Todo es nativo del navegador o servicios gratuitos.

---

## ✅ Checklist

- [ ] JARVIS VOICE está en el panel (/pedidos)
- [ ] Permiso de micrófono configurado
- [ ] Probé el botón 🎙️ en la página
- [ ] Probé hablar un comando
- [ ] Probé escribir un comando
- [ ] Escuché la respuesta (audio ON)
- [ ] Configuré GROQ_API_KEY en Vercel
- [ ] Hice redeploy en Vercel

---

## 📞 Soporte

**¿Preguntas sobre JARVIS VOICE?**
- Verifica PERFORMANCE-OPTIMIZATION.md para speed
- Verifica GROQ-AI-SETUP.md para configuración
- Issues técnicos: GitHub Issues
- Bugs de voz: Abre DevTools (F12) → Console → reporta error

---

**¡Ahora tu panel admin habla! 🎙️🚀**

Habla en español, JARVIS entiende, ejecuta acciones y te responde. El futuro del admin es aquí.
