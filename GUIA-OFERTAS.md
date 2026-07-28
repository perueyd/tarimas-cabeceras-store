# 💰 GUÍA COMPLETA: SISTEMA DE OFERTAS Y DESCUENTOS

## Introducción

Tu panel ahora tiene un **sistema unificado de 8 tipos de ofertas** con control total. Todo está en:
```
/pedidos → 💰 Ofertas y descuentos
```

---

## 📊 LOS 8 TIPOS DE OFERTAS

### 1️⃣ **🏷️ Código Promocional**
Cliente ingresa un código en checkout para obtener descuento.

**Configuración:**
- Código (ej: VERANO2026)
- Tipo: Porcentaje (%) o Monto fijo (S/)
- Valor del descuento
- Límite de usos (opcional) - ej: máximo 50 usos
- Fecha de vencimiento (opcional)

**Ejemplo:** Código "NOCHE" = 20% descuento, válido solo 100 veces, vence 2026-12-31

---

### 2️⃣ **🎉 Flash Sale (Descuento Global)**
Un único descuento que aplica a TODA la tienda. Perfecto para ofertas rápidas.

**Configuración:**
- Porcentaje global (ej: 50%)
- Fecha de vencimiento
- ON/OFF desde el panel

**Ejemplo:** "50% en TODO este Black Friday"

---

### 3️⃣ **📦 Por Cantidad de Items**
Automático: si el cliente compra 2+ productos, obtiene descuento sin código.

**Configuración:**
- Cantidad mínima (ej: 2, 3, 5...)
- Tipo: Porcentaje o Monto
- Valor del descuento

**Ejemplo:** "Llevas 3+ productos = 15% descuento automático"

---

### 4️⃣ **🏷️ Por Categoría**
Descuento solo en productos de una categoría específica.

**Configuración:**
- Selecciona la categoría (Cabeceras, Tarimas, etc)
- Tipo: Porcentaje o Monto
- Valor del descuento

**Ejemplo:** "10% descuento SOLO en Cabeceras"

---

### 5️⃣ **🎁 Sistema de Regalo**
"Compra mínimo $X, recibe $Y en descuento/regalo"

**Configuración:**
- Monto mínimo de compra (ej: $200)
- Monto del regalo/descuento (ej: $50)

**Ejemplo:** "Compra $300, recibe $100 de descuento"

---

### 6️⃣ **👥 Referidos (Código de Amigo)**
"Invita N amigos y obtén X% de descuento"

**Configuración:**
- Cantidad de referidos requeridos (ej: 3)
- Descuento que obtiene (ej: 20%)

**Ejemplo:** "Invita 5 amigos, obtén 25% descuento en tu siguiente compra"

---

### 7️⃣ **📧 Cupones de Email**
Códigos únicos para tus suscriptores.

**Configuración:**
- Descuento por código
- Tipo: Porcentaje o Monto
- Válido solo para emails específicos

**Nota:** Se integra con tu lista de suscriptores.

---

### 8️⃣ **🎪 Mostrador en Tienda**
Banner visible en la tienda mostrando la oferta actual.

**Configuración:**
- Texto del banner (máx 60 caracteres)
- Se muestra en la página principal

**Ejemplo:** "🔥 Lleva 2 = 15% desc en la segunda"

---

## 🎮 CÓMO USAR EL PANEL

### Crear una nueva oferta
1. Ve a `/pedidos` → `💰 Ofertas y descuentos`
2. Haz clic en `+ Nueva oferta`
3. Selecciona el tipo
4. Llena los campos específicos
5. Marca "Activo ahora" si quieres que aplique inmediatamente
6. Haz clic en "Guardar oferta"

### Editar una oferta
1. Haz clic en el botón "Editar" en la oferta
2. Modifica los campos
3. Haz clic en "Guardar oferta"

### Desactivar temporalmente
- Haz clic en "Desactivar" sin eliminar la oferta
- Puedes reactivarla después

### Eliminar una oferta
- Haz clic en "Eliminar" (no se puede deshacer, pero el historial queda registrado)

### Filtrar por tipo
- Haz clic en los botones de tipo en la parte superior
- Ejemplo: "🏷️ Código" para ver solo códigos promocionales

---

## 📈 ESTRATEGIAS RECOMENDADAS

### Para aumentar el ticket promedio
```
✅ Crear: Por Cantidad
   - 2+ items = 10% desc
   - 4+ items = 15% desc
   - 6+ items = 20% desc
```

### Para limpiar inventario
```
✅ Crear: Flash Sale
   - 30% descuento global
   - Vence en 3 días
   - Enciende/apaga fácil
```

### Para promover categorías específicas
```
✅ Crear: Por Categoría
   - Cabeceras = 25% desc
   - Tarimas = 10% desc
   - Accesorios = 15% desc
```

### Para Black Friday
```
✅ Combina múltiples estrategias:
   1. Flash Sale 50%
   2. Código BLACKFRIDAY = 60%
   3. Por cantidad 4+ = extra 10%
   4. Mostrador: "🔥 Black Friday 50%"
```

---

## 🔒 SEGURIDAD Y CONTROL

✅ **Los descuentos se validan SIEMPRE en el servidor**
- Nunca se confía en lo que envía el navegador
- Es imposible "truquear" un descuento

✅ **Historial completo**
- Se registra cada código usados
- Contador de "Usado X veces"
- Trazabilidad total

✅ **Control total sobre validez**
- Límites de uso por código
- Fechas de vencimiento
- Activar/desactivar sin perder datos

---

## 💡 TIPS AVANZADOS

### Código con límite de usos
Perfecto para "Primeras 50 compras = 30% desc"
```
Código: PRIMEROS50
Valor: 30%
Máximo: 50 usos
```

### Oferta por categoría con vencimiento
"Este mes: Cabeceras a mitad de precio"
```
Tipo: Por Categoría
Categoría: Cabeceras
Valor: 50%
Vence: 2026-08-31
```

### Flash sale rápida
"Descuento solo hoy"
```
Tipo: Flash Sale
Valor: 40%
Vence: HOY (fecha actual)
```

---

## 🚀 PRÓXIMAS FUNCIONALIDADES (ROADMAP)

- [ ] Historial detallado de uso por cliente
- [ ] Analytics: qué código se usa más
- [ ] Descuentos escalonados (A partir de X compras)
- [ ] Combinación automática de ofertas
- [ ] Integración con WhatsApp (enviar código por mensaje)

---

## ❓ PREGUNTAS FRECUENTES

**P: ¿Puedo tener múltiples ofertas activas al mismo tiempo?**
R: Sí, pero solo se aplica el descuento más alto.

**P: ¿El cliente ve la oferta antes de comprar?**
R: Sí, en la página de producto aparece si hay oferta activa.

**P: ¿Se pueden combinar descuentos?**
R: No, se aplica el más beneficioso. Ej: Flash Sale 40% vs Código 20% = se aplica 40%.

**P: ¿Qué pasa si vence una oferta?**
R: Se desactiva automáticamente, pero queda guardada en tu historial.

**P: ¿Puedo recuperar una oferta eliminada?**
R: No directamente, pero está en el historial de base de datos. Contacta soporte.

---

**¡Tienes control total ahora! 🚀**
