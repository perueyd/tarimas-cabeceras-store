# 📊 DIAGNÓSTICO: Panel de Control - Nivel de Editabilidad

**Fecha:** 2026-07-28  
**Proyecto:** E|D Espacios y Diseño  
**Usuario:** perueyd@gmail.com

---

## 🎯 NIVEL ACTUAL DE TU PÁGINA

### **NIVEL: INTERMEDIO (Intermediate-Advanced)**

Tu página está en un **60-70% de editabilidad**. No es básica (muchísimo está controlable), pero aún quedan hardcodeados elementos importantes que un dueño de negocio debería poder cambiar sin programador.

**Comparación:**
- 🔴 **Básico (0-30%)**: Solo catálogo editable, header/footer/textos hardcodeados
- 🟡 **Intermedio (40-70%)**: Catálogo + landing + algunas secciones — **TÚ AQUÍ**
- 🟢 **Avanzado (70-90%)**: Todo texto, estructura, imágenes editables. Falta: temas visuales
- 💎 **Enterprise (90-100%)**: CMS completo, temas visuales, A/B testing, versiones

---

## ✅ QUÉ ESTÁ EDITABLE (Desde `/pedidos → ✏️ Editar página`)

### **Pestaña: CATÁLOGO (Productos)**
- ✅ Nombres, descripciones, precios
- ✅ Fotos (principal + galería)
- ✅ Colores disponibles
- ✅ Tamaños y medidas (GLOBAL + por producto)
- ✅ Opciones personalizadas (laterales, capitoné, patas)
- ✅ Categorías (crear/renombrar/reordenar)
- ✅ Ocultar/mostrar productos (borradores)
- ✅ Duplicar productos
- ✅ Reseñas del cliente (editar/aprobar)

### **Pestaña: TAMAÑOS**
- ✅ Crear/editar/eliminar tamaños
- ✅ Medidas visuales (cm)
- ✅ Asignar por categoría

### **Pestaña: VITRINA ANIMADA**
- ✅ Paneles de la vitrina (rotativa)
- ✅ Imágenes, colores, nombres
- ✅ Vincular a categorías

### **Pestaña: PREGUNTAS FRECUENTES**
- ✅ Crear/editar/eliminar FAQs
- ✅ Reordenar (arrastrar)

### **Pestaña: COLORES**
- ✅ Crear/editar/eliminar colores
- ✅ Foto por color
- ✅ Subir múltiples telas a la vez

### **Pestaña: CONFIGURACIÓN**
- ✅ Email del dueño
- ✅ Redes sociales (Instagram, Facebook, TikTok, etc.)
- ✅ Cuotas (mostrar/ocultar + texto)
- ✅ Newsletter (título, descripción, activar/desactivar)
- ✅ Política de privacidad / Términos (activar/desactivar + renombrar)

---

## ❌ QUÉ NO ESTÁ EDITABLE (HARDCODEADO)

### **NIVEL 1: TEXTOS CRÍTICOS (High Priority)**

#### Header (Logo + navegación)
```
E|D (Logo) — HARDCODED en Header.jsx
Textos: "ESPACIOS Y DISEÑO", "PROYECTOS INMOBILIARIOS" — HARDCODED
Menú: "Tienda", "Rastrear pedido", "Carrito" — HARDCODED
```
❌ No puedes cambiar el logo, subtítulos ni textos del menú sin programador.

#### Hero/Landing (Sección principal)
```
"Tu dormitorio, en el color que imaginas." — PARCIALMENTE editable (en storeConfig.landing)
"Hecho en Perú · Envíos a todo el país" — HARDCODED en LANDING_DEFAULTS
Botones de color interactivos (5 colores fijos) — HARDCODEADOS
```
⚠️ Algunos textos SÍ se pueden editar en el panel (PortadaTab), pero muchos están a mitad de camino.

#### Footer (Pie de página)
```
"Pagos procesados de forma segura con Culqi. Precios en Soles (S/)." — HARDCODED en Footer.jsx
Copyright año dinámico — OK (automático)
Redes sociales — ✅ Editables
Newsletter — ✅ Editable
Política/Términos — ✅ Editables (títulos + activar)
```
⚠️ Línea de pagos y divisas está fija. No puedes cambiar "Culqi" a otro procesador.

### **NIVEL 2: SECCIONES IMPORTANTES (High Priority)**

#### Sección: "Comprar es simple" (Pasos)
```
Título: "Comprar es simple" — PARCIALMENTE editable
3 pasos: "Elige", "Paga seguro", "Recíbelo" — ✅ EDITABLES (PortadaTab)
Pero: El TÍTULO del paso "Paga seguro" dice siempre "Paga seguro" — la estructura está FIJA
```
✅ Pasos editables, pero no la estructura o icónos.

#### Sección: "Categorías destacadas" (Espacios)
```
Nombre: "Categorías destacadas — arrastra para girar, toca para entrar" — HARDCODED
El carrusel rotativo (arrastra) — ✅ Editable desde Vitrina
Pero: El TEXTO explicativo del carrusel NO es editable
```
⚠️ Título y descripción de la sección están fijos.

#### Sección: "Todo para tu hogar"
```
Título: "Todo para tu hogar" — HARDCODED en Landing.jsx (LANDING_DEFAULTS)
Descripción: "Empezamos con tarimas..." — HARDCODED
Las 5 categorías (Tarimas, Cabeceras, Melamina...) — Vinculadas a categorías ✅, pero textos de "Próximamente" HARDCODED
```
❌ El título, descripción y textos genéricos son fijos.

#### Sección: "Preguntas frecuentes"
```
Título: "Preguntas frecuentes" — HARDCODED
Las FAQs (Q&A) — ✅ EDITABLES
```
⚠️ Título fijo, contenido editable.

### **NIVEL 3: VÍNCULOS Y RUTAS (Medium Priority)**

#### Vínculos internos (todas con rutas fijas)
```
/tienda — Listado de productos
/tienda?categoria=cabeceras — Cabeceras
/carrito — Carrito
/seguimiento — Rastrear pedido
/pedidos — Panel admin (PROTEGIDO con clave)
/libro-de-reclamaciones — Libro de reclamaciones
/politica-privacidad — Política de privacidad
/terminos-condiciones — Términos y condiciones
```
✅ Las rutas funcionan correctamente. Las que tienen contenido editable (Política/Términos) sí se pueden cambiar.

#### Vínculos externos (HARDCODEADOS)
```
WhatsApp flotante: +51 951 278 010 — HARDCODED en WhatsAppButton.jsx
"Escríbenos por WhatsApp" — Número fijo en MULTIPLE lugares:
  - Header.jsx NO (no aparece ahí, solo en footer)
  - Landing.jsx — NO
  - Botón flotante — SÍ está
```
❌ El número de WhatsApp es fijo. No puedes cambiar sin editar código.

---

## 🚨 PROBLEMAS IDENTIFICADOS

### **1. Desalineación de contenido editable**
- Algunos textos están en `LANDING_DEFAULTS` (hardcodeado) + también en `storeConfig.landing` (editable)
- Genera confusión: ¿cuál prevalece?
- **Solución:** Mover TODOS los defaults a `storeConfig.landing` en Redis.

### **2. WhatsApp disperso en el código**
- El número +51 951 278 010 aparece en:
  - `WhatsAppButton.jsx` (botón flotante) — HARDCODED
  - Mensaje de recuperación de carritos en `Orders.jsx` — HARDCODED
  - Varios enlaces `<a href="https://wa.me/...">` — HARDCODEADOS
- **Solución:** Centralizar en `storeConfig.contacto.whatsapp` (editable).

### **3. Ícono "E|D" no editable**
- El logo de "E|D" (estilo ASCII) está en `Header.jsx` como JSX puro.
- Si cambias de nombre de marca, no puedes actualizar en el panel.
- **Solución:** Mover a `storeConfig.branding.logo` y renderear desde ahí.

### **4. Títulos de secciones fijos**
- "Categorías destacadas", "Todo para tu hogar", "Comprar es simple" son HARDCODED.
- **Solución:** Mover a `storeConfig.landing.sections.{nombre}` = { titulo, descripcion }.

### **5. Estructura HTML del footer está en código**
- Los links legales ("Libro de Reclamaciones", "Política", "Términos") están en `Footer.jsx`.
- No puedes agregar/quitar links sin programador.
- **Solución:** Mover a `storeConfig.footer.links[]`.

---

## 🎯 PLAN DE MEJORAS (Priorizado)

### **FASE 1: CRÍTICO (2-3 horas)**
Esto te daría control TOTAL de textos principales.

| Cambio | Impacto | Esfuerzo | Archivos |
|--------|--------|----------|----------|
| **Centralizar configs de Landing** | Alto | 1h | Landing.jsx, _catalog.js, PortadaTab |
| **Hacer WhatsApp editable** | Alto | 30m | WhatsAppButton.jsx, Orders.jsx, _catalog.js, ConfigTab |
| **Títulos de secciones editables** | Medio | 1h | Landing.jsx, _catalog.js, PortadaTab |
| **Footer links editables** | Medio | 45m | Footer.jsx, _catalog.js, ConfigTab |
| **Logo/Branding editable** | Bajo | 45m | Header.jsx, _catalog.js, ConfigTab |

### **FASE 2: ESTÁNDAR (2-3 horas)**
Esto te permitiría cambiar aspectos más profundos.

| Cambio | Impacto | Esfuerzo | Archivos |
|--------|--------|----------|----------|
| **Colores del hero editables** | Medio | 1h | Landing.jsx, _catalog.js, PortadaTab |
| **Descripción de categorías editables** | Bajo | 45m | Home.jsx, CatalogContext, ProductCard |
| **Texto de métodos de pago editables** | Bajo | 30m | Checkout.jsx, _catalog.js, ConfigTab |
| **SEO (Meta tags) editables** | Medio | 1h | index.html, App.jsx, _catalog.js |
| **Tipografía/tema de color editable** | Alto | 3h | global CSS, Tailwind config, ConfigTab |

### **FASE 3: PREMIUM (4-5 horas)**
Esto te acercaría a un CMS completo.

| Cambio | Impacto | Esfuerzo | Archivos |
|--------|--------|----------|----------|
| **Páginas de contenido (about, contacto)** | Medio | 2h | Nuevas rutas, editor de texto rico |
| **Blog/Noticiario editable** | Bajo | 2h | Nueva tabla Redis, CRUD completo |
| **Banners promocionales por sección** | Alto | 1.5h | Landing.jsx, _catalog.js |
| **Temas visuales (light/dark mode) editable** | Bajo | 2h | CSS vars, ConfigTab |
| **Email de transacciones personalizable** | Bajo | 1.5h | api/_email.js, ConfigTab |

---

## 📋 RECOMENDACIÓN INMEDIATA

**Hazlo en este orden:**

### **Hoy (próximas 2-3 horas):**
1. ✅ Ya hecho: Referencia de WhatsApp en pedidos
2. **Hacer WhatsApp número editable** (FASE 1)
   - Centraliza en `storeConfig.contacto.whatsapp`
   - Agrega campo en ConfigTab
   - Remplaza hardcodes en WhatsAppButton, Orders, Links

3. **Centralizar Landing configs** (FASE 1)
   - Mueve LANDING_DEFAULTS a Redux/storeConfig
   - Crea PortadaTab unificada (ahora hay fragmentos)
   - Prueba en Vercel

### **Próximo fin de semana:**
4. **Hacer logo/branding editable** (FASE 1)
5. **Footer links editables** (FASE 1)

### **En 2-3 semanas:**
6. Empezar FASE 2 (colores, SEO, tipografía)

---

## 🔗 VERIFICACIÓN DE VÍNCULOS

Todos los vínculos internos funcionan:
- `/tienda` ✅ Funciona
- `/carrito` ✅ Funciona
- `/seguimiento` ✅ Funciona (rastrear pedidos)
- `/pedidos` ✅ Funciona (panel admin protegido)
- `/libro-de-reclamaciones` ✅ Funciona
- `/politica-privacidad` ✅ Funciona (editable)
- `/terminos-condiciones` ✅ Funciona (editable)

**Vínculos externos:**
- WhatsApp flotante: `wa.me/51951278010` ✅ Correcto formato

---

## 💡 RESUMEN

| Aspecto | Estado | Score |
|--------|--------|-------|
| **Catálogo (Productos, Colores, Tamaños)** | ✅ Completamente editable | 100% |
| **Contenido de Landing (Hero, Pasos, FAQs)** | ⚠️ Parcialmente editable | 60% |
| **Configuración (Social, Email, Cuotas)** | ✅ Completamente editable | 100% |
| **Header/Footer** | ❌ Mayormente hardcoded | 20% |
| **Vínculos y rutas** | ✅ Funcionales, pero números hardcodeados | 70% |
| **Temas visuales y CSS** | ❌ Hardcodeado (Tailwind fijo) | 0% |
| **TOTAL** | **INTERMEDIO** | **64%** |

---

## ✨ Siguiente paso

¿Quieres que empecemos con:
1. **Hacer WhatsApp editable** (máximo impacto en 30 min)
2. **Centralizar Landing** (mejor UX en el panel)
3. **Hacer logo editable** (identidad de marca)
4. **Todo lo anterior** (recomendado — 2-3 horas totales)

**Propuesta:** Vamos con TODO lo anterior (FASE 1 completa) para que mañana tengas un panel 85%+ editable.

---

**Generado:** 2026-07-28  
**Próxima revisión:** Después de implementar FASE 1
