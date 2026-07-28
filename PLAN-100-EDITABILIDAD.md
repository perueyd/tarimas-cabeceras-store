# 🚀 PLAN: Llevar Panel a 100% Editabilidad

**Objetivo:** Todo configurable desde `/pedidos → ✏️ Editar página` sin tocar código.

**Tiempo estimado:** 4-5 horas  
**Complejidad:** Alta (múltiples archivos, pero patrón consistente)

---

## 📋 FASES DE IMPLEMENTACIÓN

### FASE 1: CORE (Crítica) — 1.5 horas
- [x] Agregar campos a `storeConfig` en `catalog.js`
- [ ] Crear pestaña `BrandingTab` (logo, nombre, subtítulos)
- [ ] Crear pestaña `ContactoTab` (WhatsApp, email, teléfono)
- [ ] Crear pestaña `LandingTab` (hero, títulos de secciones)
- [ ] Crear pestaña `FooterTab` (links legales, copyright)
- [ ] Actualizar Header para usar branding editable
- [ ] Actualizar Footer para usar config editable
- [ ] Actualizar Landing para usar config editable

### FASE 2: ESTÁNDAR (Importantes) — 1.5 horas
- [ ] Crear pestaña `SeoTab` (Meta tags, Open Graph)
- [ ] Crear pestaña `PagosTab` (Métodos, textos, moneda)
- [ ] Crear pestaña `EntregaTab` (Lead time, horarios, zonas)
- [ ] Crear pestaña `DesignTab` (Colores del hero, tipografía)

### FASE 3: PREMIUM (Avanzado) — 2 horas
- [ ] Crear pestaña `PaginasTab` (Contenido de páginas legales)
- [ ] Crear pestaña `BannerTab` (Banners por sección)
- [ ] Crear pestaña `EmailTab` (Plantillas de email)
- [ ] Crear pestaña `BlogTab` (Artículos editable)
- [ ] Endpoint CRUD `/api/catalog?resource=page`

---

## 🗂️ CAMBIOS POR ARCHIVO

### `src/data/catalog.js`
Expandir `storeConfig`:
```
+ branding: { logo, subtitle1, subtitle2 }
+ contacto: { whatsapp, phone, email }
+ landing: { eyebrow, hero, sections }
+ footer: { copyright, links[], thema }
+ seo: { title, description, keywords }
+ pagos: { texto, metodos }
+ entrega: { leadTime, slots, zonas }
+ design: { heroColors[], fonts }
+ paginas: { about, contacto, blog }
```

### `src/pages/CatalogEditor.jsx`
Agregar pestañas en la lista:
```
+ Branding
+ Contacto
+ Landing avanzada
+ Footer
+ SEO
+ Pagos
+ Entrega
+ Diseño
+ Páginas
+ Blog
```

### Componentes a actualizar:
- `src/components/Header.jsx` → usar `storeConfig.branding`
- `src/components/Footer.jsx` → usar `storeConfig.footer`
- `src/pages/Landing.jsx` → usar `storeConfig.landing`
- `src/components/WhatsAppButton.jsx` → usar `storeConfig.contacto`
- `src/pages/Orders.jsx` → usar `storeConfig.contacto` en links

### API
- Ya existe `/api/catalog` con `saveConfig()` — no cambios

---

## 🎯 PRIORIDAD DE EJECUCIÓN

1. **PRIMERO:** `storeConfig` extendido + BrandingTab + ContactoTab (30 min)
   - Máximo impacto inmediato
   
2. **SEGUNDO:** Actualizar Header + Footer + Landing (30 min)
   - Verificar que funcione en Vercel
   
3. **TERCERO:** LandingTab + FooterTab + SeoTab (1 hora)
   - Completar FASE 1
   
4. **CUARTO:** FASE 2 (PagosTab, EntregaTab, DesignTab) (1 hora)
   
5. **QUINTO:** FASE 3 (PaginasTab, BannerTab, EmailTab, BlogTab) (2 horas)

---

## ✅ VERIFICACIÓN

Después de cada fase:
- [ ] Build sin errores: `npm run build`
- [ ] Deploy automático en Vercel
- [ ] Verificar cambios en `/pedidos`
- [ ] Probar editabilidad end-to-end
- [ ] Verificar en tienda que cambios se reflejen

---

## 🔄 PATRÓN CONSISTENTE

Cada nueva pestaña sigue el mismo patrón:

```jsx
// 1. Crear archivo: src/pages/TabName.jsx
function TabName({ adminKey, config, onSave }) {
  const [data, setData] = useState(config);
  const guardar = async () => {
    const res = await fetch('/api/catalog', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
      body: JSON.stringify(data)
    });
    if (res.ok) onSave();
  };
  return (...form...);
}

// 2. Importar en CatalogEditor.jsx
// 3. Agregar a lista de pestañas
// 4. Renderizar: {tab === 'nombre' && <TabName ... />}
// 5. Actualizar componentes para usar storeConfig.campo
```

---

**Estado:** Listo para comenzar  
**Próximo paso:** Empezar con FASE 1
