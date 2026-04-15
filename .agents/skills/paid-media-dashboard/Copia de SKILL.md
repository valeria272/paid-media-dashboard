---
name: social-media-dashboard
description: >
  Genera dashboards PRO de social media en tiempo real para agencias y equipos de marketing.
  Úsalo SIEMPRE que el usuario mencione: dashboard de redes sociales, análisis de Instagram,
  métricas de TikTok, reporte de LinkedIn, performance de Meta Ads, KPIs sociales, contenido
  viral, hooks para redes, insights de social media, analítica de cuentas, reporte de clientes,
  dashboard tipo Metricool, Hootsuite o Sprout Social. También actívalo cuando el usuario quiera
  conectar cuentas de redes sociales, ver engagement, alcance, impresiones, seguidores, o cuando
  pida un "social media report", "dashboard para el equipo" o "análisis de contenido". Si hay
  tokens de API, credenciales o datos de redes sociales en la conversación, SIEMPRE usa este skill.
---

# Social Media Dashboard PRO — Skill

Skill para crear dashboards de social media de nivel agencia: visuales, en tiempo real (con tokens reales o mock), con insights accionables, análisis de contenido viral y propuestas de hooks. Supera en calidad a Metricool, Hootsuite y Sprout Social en diseño y profundidad de análisis.

---

## Flujo de trabajo principal

### PASO 1 — Detección de modo

Determina en qué modo operar según lo que el usuario proporcione:

| Modo | Cuándo usarlo |
|---|---|
| **REAL** | Usuario provee tokens de API (Instagram Graph, Meta, LinkedIn, TikTok) |
| **DEMO** | Usuario no tiene tokens → generar datos mock ultra-realistas |
| **HÍBRIDO** | Mezcla: algunas redes con token real, otras en mock |

Si el usuario no especifica, pregunta directamente:
> "¿Tienes los tokens de acceso de las cuentas? Si los tienes, el dashboard se conectará en vivo. Si no, puedo generar un demo con datos realistas mientras configuras las APIs."

---

### PASO 2 — Recolección de contexto

Antes de generar, obtén:
- **Nombre del cliente/marca** (para personalizar el dashboard)
- **Redes activas**: Instagram, Meta Ads, LinkedIn, TikTok (cuáles aplican)
- **Período de análisis**: últimos 7, 14, 30, 90 días
- **Tokens de API** (si modo REAL) — ver `/references/api-setup.md` para guía de obtención
- **Objetivos**: ¿es para presentar al cliente? ¿uso interno del equipo? ¿revisión semanal?

---

### PASO 3 — Generación del dashboard

Genera **dos outputs simultáneos**:

#### A) Artifact HTML interactivo (en el chat)
- Dashboard completo en un solo archivo HTML/CSS/JS
- Sin dependencias externas pesadas (usa CDN solo para Chart.js y posibles íconos)
- Funcional, interactivo, con filtros por red y por período
- Ver especificaciones completas en `/references/dashboard-spec.md`

#### B) Archivo HTML descargable (para compartir con el equipo)
- Mismo dashboard, pero standalone y sin necesidad de Claude
- Si modo REAL: incluye el código de fetch a APIs con los tokens ya configurados
- Si modo DEMO: datos hardcodeados + instrucciones de reemplazo
- Guardar en `/mnt/user-data/outputs/dashboard-[cliente]-[fecha].html`

---

### PASO 4 — Análisis con IA (llamada a Claude API)

Después de renderizar los datos, realiza una llamada a `api.anthropic.com/v1/messages` con el contexto de métricas para generar:

1. **Top 3 insights accionables** — qué está funcionando y por qué
2. **Top 3 oportunidades de mejora** — qué cambiar con datos como respaldo
3. **Contenido a replicar** — características del contenido top (formato, duración, hora, temática)
4. **Contenido a discontinuar** — qué no está funcionando
5. **5 hooks propuestos** — basados en el contenido viral del período, con formato específico por red

Ver prompt template en `/references/ai-analysis-prompts.md`

---

### PASO 5 — Sección de Hooks & Virales

Siempre incluir en el dashboard una sección dedicada:

```
📌 HOOKS PROPUESTOS PARA ESTA SEMANA
─────────────────────────────────────
Instagram Reels:
  • Hook 1: [texto gancho primeros 3 segundos]
  • Hook 2: [variante con pregunta]
  
TikTok:
  • Hook 1: [hook de patrón de interrupción]
  • Hook 2: [hook de curiosidad/cliffhanger]
  
LinkedIn:
  • Hook 1: [hook de insight contraintuitivo]
  • Hook 2: [hook de historia personal + dato]
```

Los hooks deben estar **basados en datos reales** del período (qué formatos tuvieron más retención, qué palabras en captions generaron más engagement).

---

## Arquitectura técnica del dashboard

### Stack del artifact
- **HTML5 + CSS3 vanilla** — sin frameworks pesados
- **Chart.js** (CDN) — para todas las visualizaciones
- **Diseño dark mode por defecto** — estética premium tipo analytics tool
- **Layout**: sidebar izquierda (navegación por cliente/red) + main panel
- **Responsive**: funciona en desktop y tablet

### Estructura de secciones

```
[HEADER] Logo cliente | Período | Última actualización | Botón "Actualizar datos"
[NAV]    Tabs: Resumen General | Instagram | Meta Ads | TikTok | LinkedIn | Hooks & Virales
[MAIN]
  ├── KPI Cards (métricas clave en tiempo real)
  ├── Gráfico de tendencias (línea temporal)
  ├── Top contenido del período (cards con preview)
  ├── Análisis de audiencia (demographics si disponible)
  ├── Comparativa entre redes
  ├── Insights IA (generados via Claude API)
  └── Hooks & Propuestas virales
```

### KPIs por red

**Instagram (orgánico)**
- Seguidores totales + variación %
- Alcance total (posts + stories + reels)
- Impresiones totales
- Engagement rate (promedio y por formato)
- Mejor hora de publicación
- Top 5 posts por engagement
- Saves, shares, comentarios desglosados

**Meta Ads**
- Inversión total del período
- Alcance pagado
- Impresiones pagadas
- CPM, CPC, CTR
- Conversiones + costo por conversión
- ROAS (si hay pixel configurado)
- Top 3 creativos por performance

**TikTok**
- Seguidores + variación
- Vistas totales de videos
- Tasa de visualización completa (%)
- Engagement rate
- Shares (métrica clave en TikTok)
- Top 5 videos por vistas
- Tendencias de audio/hashtag usados

**LinkedIn**
- Seguidores de página + variación
- Alcance orgánico
- Impresiones
- Engagement rate
- Clicks a perfil/web
- Top posts por engagement
- Datos demográficos de audiencia (cargo, industria)

---

## Modo REAL — Integración con APIs

Para instrucciones detalladas de autenticación y endpoints, ver:
📄 `/references/api-setup.md`

Resumen rápido:
- **Instagram + Meta Ads**: Meta Graph API v18+ con token de larga duración
- **TikTok**: TikTok Business API con OAuth 2.0
- **LinkedIn**: LinkedIn Marketing API con token OAuth

Cuando el usuario proporcione tokens, construir el dashboard con `fetch()` calls reales en el HTML output. Siempre incluir:
- Manejo de errores (token expirado, rate limit, cuenta sin permisos)
- Botón "Actualizar" que re-fetcha datos
- Timestamp de última actualización

---

## Modo DEMO — Datos mock

Ver plantilla de datos en `/references/mock-data-template.md`

Los datos mock deben:
- Ser **ultra-realistas** (engagement rates creíbles por industria, no inventados)
- Incluir variación natural (no números redondos)
- Simular tendencias coherentes (crecimiento orgánico con fluctuaciones)
- Mostrar **al menos 1 "post viral"** del período para ejemplificar el análisis

---

## Diseño visual — Estética PRO

Seguir las instrucciones de `/mnt/skills/public/frontend-design/SKILL.md` para el diseño, con estas especificaciones adicionales:

- **Paleta**: Dark (#0A0A0F fondo, #12121A cards), acentos por red (rosa Instagram, azul LinkedIn, negro TikTok, azul Meta)
- **Tipografía**: Fuente display moderna (ej: Space Grotesk NO — usar DM Sans, Syne, o Plus Jakarta Sans)
- **Cards de KPI**: número grande destacado, variación con color (verde/rojo), icono de red
- **Gráficos**: Chart.js con tema oscuro, colores por red social
- **Animaciones**: números que cuentan al cargar (counter animation), skeleton loading state
- **Calidad**: que se sienta más PRO que Metricool — gradientes sutiles, glassmorphism en cards, bordes con glow

---

## Checklist de calidad antes de entregar

- [ ] Dashboard tiene al menos 4 secciones (resumen, por red, contenido top, insights)
- [ ] KPIs visibles sin scroll en desktop
- [ ] Insights de IA incluidos (aunque sea mock si no hay API key disponible)
- [ ] Sección de hooks con al menos 4 propuestas concretas
- [ ] Archivo HTML descargable guardado en /outputs/
- [ ] Instrucciones de conexión a APIs reales incluidas en un modal o sección "Configuración"
- [ ] Dashboard funciona offline (datos no dependen de fetch externo en modo demo)

---

## Referencias

- `/references/api-setup.md` — Guía paso a paso para obtener tokens de Meta, TikTok y LinkedIn
- `/references/dashboard-spec.md` — Especificación detallada de componentes y layout
- `/references/mock-data-template.md` — Estructura de datos mock por red social
- `/references/ai-analysis-prompts.md` — Prompts para análisis con Claude API
- `/references/kpi-benchmarks.md` — Benchmarks de KPIs por industria para contextualizar métricas
