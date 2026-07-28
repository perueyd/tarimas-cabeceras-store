# 🧪 GUÍA E2E: PRUEBAS COMPLETAS DEL SISTEMA

Esta guía te permite probar cada característica del sistema de ofertas y descuentos.

---

## 🚀 REQUISITOS

✅ Dev server corriendo en `http://localhost:5173`  
✅ Tienda visible en `/tienda`  
✅ Panel admin en `/pedidos` (requiere clave)

---

## 📋 CASOS DE PRUEBA E2E

### **CASO 1: Crear Flash Sale y Usarlo en Checkout** ⏱️ ~5 min

#### Paso 1: Acceder al panel
```
URL: http://localhost:5173/pedidos
Clave: (usa la que tengas configurada, o desarrollo sin auth)
```

#### Paso 2: Crear Flash Sale
1. Haz clic en `💰 Ofertas y descuentos`
2. Haz clic en `+ Nueva oferta`
3. Selecciona `🎉 Flash Sale`
4. Ingresa:
   - Descuento: `30%`
   - Vence: (hoy o mañana)
   - Marca "Activo ahora"
5. Haz clic en `Guardar oferta`

**Esperado:** Se muestra en la lista de ofertas con estado "Activo"

#### Paso 3: Ir a tienda e intentar comprar
1. Ve a `/tienda`
2. Haz clic en un producto
3. Selecciona tamaño, color, cantidad
4. Haz clic en `Agregar al carrito`
5. Ve al carrito (`/carrito`)

**Esperado:**
- El carrito debe mostrar el descuento Flash Sale
- El precio total debe reflejar el 30% de descuento
- No se requiere código (es automático)

#### Paso 4: Proceder a checkout
1. Haz clic en `Proceder a pago`
2. Rellena datos (nombre, email, teléfono)
3. Selecciona método de pago

**Esperado:** El descuento se mantiene en el resumen de pago

---

### **CASO 2: Crear Código Promocional** ⏱️ ~3 min

#### Paso 1: Crear código
1. Panel → `💰 Ofertas y descuentos`
2. `+ Nueva oferta`
3. Selecciona `🏷️ Código`
4. Ingresa:
   - Código: `PRUEBA10`
   - Tipo: Porcentaje
   - Valor: `10%`
   - Máximo: `100` usos
   - Vence: (hoy + 7 días)
5. Guardar

#### Paso 2: Usar en checkout
1. Ve a `/tienda`, agrega producto
2. Ve a `/carrito` → `Proceder a pago`
3. Busca el campo "Código promocional"
4. Ingresa: `PRUEBA10`

**Esperado:** Se aplica descuento de 10%

---

### **CASO 3: Descuento por Cantidad** ⏱️ ~4 min

#### Paso 1: Crear oferta
1. Panel → `💰 Ofertas y descuentos`
2. `+ Nueva oferta`
3. `📦 Por cantidad`
4. Ingresa:
   - Cantidad mínima: `2`
   - Descuento: `15%`
5. Guardar

#### Paso 2: Probar
1. Ve a `/tienda`
2. Agrega **2 o más productos diferentes** al carrito
3. Ve a checkout

**Esperado:** Descuento de 15% aplicado automáticamente (sin código)

---

### **CASO 4: Descuento por Categoría** ⏱️ ~4 min

#### Paso 1: Crear oferta
1. Panel → `💰 Ofertas y descuentos`
2. `+ Nueva oferta`
3. `🏷️ Por categoría`
4. Selecciona: `Cabeceras`
5. Descuento: `20%`
6. Guardar

#### Paso 2: Probar
1. Ve a `/tienda?categoria=cabeceras`
2. Agrega UNA cabecera al carrito
3. Ve a checkout

**Esperado:** 20% de descuento (solo aplica en Cabeceras)

---

### **CASO 5: Ver Analytics** ⏱️ ~2 min

#### Paso 1: Acceder
1. Panel → `📈 Analytics`

#### Paso 2: Explorar
- Filtra por rango: "Última semana", "Último mes", etc.
- Observa:
  - Tarjetas de resumen (ofertas, usos, descuento otorgado)
  - Código más popular
  - Tipos más usados
  - Gráfica de evolución diaria

**Esperado:** Datos calculados correctamente basados en historial

---

### **CASO 6: Ver Historial de Códigos** ⏱️ ~2 min

#### Paso 1: Acceder
1. Panel → `📋 Historial de códigos`

#### Paso 2: Buscar
- Búsqueda por código: ingresa `PRUEBA10`
- Búsqueda por teléfono: ingresa un número

**Esperado:** Se muestran registros de usos con cliente, monto, descuento, fecha

---

### **CASO 7: Crear Automación** ⏱️ ~3 min

#### Paso 1: Crear notificación
1. Panel → `⚙️ Automaciones`
2. `+ Nueva automación`
3. Tipo: `🔔 Notificación admin`
4. Mensaje: `Se usó el código {codigo}`
5. Guardar

#### Paso 2: Verificar
- Automación aparece en la lista con estado "Activa"

**Esperado:** Cuando un cliente use el código, admin recibe notificación

---

## 📱 PRUEBAS MOBILE (Responsive)

### Redimensionar navegador a 375x812 (iPhone)

1. Abre DevTools (F12)
2. Modo responsivo (Ctrl+Shift+M)
3. Selecciona iPhone SE (375x812)

**Probar:**
- ✅ Tienda se ve bien
- ✅ Carrito es navegable
- ✅ Checkout es legible
- ✅ Panel admin es usable
- ✅ Analytics se adapta

---

## ✅ CHECKLIST DE PRUEBAS

- [ ] Flash Sale funciona
- [ ] Código manual funciona
- [ ] Descuento por cantidad funciona
- [ ] Descuento por categoría funciona
- [ ] Analytics calcula correctamente
- [ ] Historial registra uso
- [ ] Automaciones se pueden crear
- [ ] Mobile responsive funciona
- [ ] No hay errores en consola
- [ ] Descuentos se aplican en checkout

---

## 🐛 TROUBLESHOOTING

**El descuento no se aplica**
- Verifica que la oferta esté marcada "Activo"
- Revisa que no esté vencida
- Recarga la página

**Analytics no muestra datos**
- Verifica que haya historial (usa al menos una oferta)
- Espera 5 segundos a que cargue
- Intenta diferente rango de fechas

**Panel requiere autenticación**
- Contacta al admin por la clave
- O usa dev mode sin auth (si está configurado)

---

## 📊 MÉTRICAS DE ÉXITO

Si pasas todos estos casos, tu sistema está **100% operacional**:

✅ **Funcionalidad:** Todas las 8 ofertas funcionan  
✅ **Descuentos:** Se aplican automáticamente y con código  
✅ **Analytics:** Se calculan correctamente  
✅ **Historial:** Se registra todo  
✅ **Mobile:** Funciona en todos los tamaños  
✅ **Rendimiento:** Sin lag o errores  

---

## 🚀 DESPUÉS DE PRUEBAS

Una vez que todo funciona:

1. **Cancela planes en Vercel** (solo dejar Free)
2. **Haz deploy** de los cambios
3. **Comunica al cliente** que nuevo sistema está listo
4. **Capacita sobre el panel** (usa GUIA-OFERTAS.md)
5. **Monitorea analytics** primera semana

---

**¡Tu sistema está listo para producción!** 🎉
