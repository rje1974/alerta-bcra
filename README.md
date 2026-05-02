<p align="center">
  <img src="logo.png" alt="alerta-bcra" width="240">
</p>

# alerta-bcra

> Avisa cuando los CUITs de tu cartera cambian de situación en la Central
> de Deudores del BCRA. Tres formas de usarlo, según cuán automatizado
> lo quieras.

## Por qué existe

Estábamos en una reunión CREA cuando salió el tema. El contexto económico
nos estaba generando preocupación por las deudas personales de personas
cercanas y del entorno. Para muchas de ellas hablar de eso es vergonzante,
así que las callan; la deuda crece silenciosa, y cuando se hace evidente
ya es una bomba que explota de la peor forma.

## Tres formas de usarlo

### 1. Prompt para tu agente IA de escritorio (la portátil)

Pensado para agentes con tools de ejecución — Claude Code, Codex,
Gemini CLI, Cursor, etc. Copiás el contenido de `prompt.md`, lo pegás
al inicio de la conversación, y el agente consulta el BCRA y te muestra
el reporte directo.

En chats web tradicionales (ChatGPT, Claude.ai web, Gemini web, Grok)
también sirve, pero con un paso extra: el chat te genera el código
Node.js o bash, vos lo corrés en tu compu y le pegás el resultado para
que arme el reporte legible.

Detalle en [`prompt.md`](prompt.md).

### 2. Skill para Claude Code (la integrada)

Si tenés [Claude Code](https://claude.ai/code) instalado, pegás el
contenido de `skill/alerta-bcra.md` en tu carpeta de skills y le decís
"alertá BCRA". Claude busca tu lista, hace los fetches y te muestra el
reporte en chat. Detalle en [`skill/README.md`](skill/README.md).

### 3. App Node.js con cron (la persistente)

Si querés que corra solo (en tu Raspberry, VPS o compu local), hay una
app en `app/`:

- Cron configurable (default: día 25 de cada mes)
- Diff entre corridas (te muestra qué cambió, no toda la lista)
- Notificaciones a tu canal favorito (ntfy, Mattermost, email, webhook)
- Heartbeat opcional para que te avise si el cron muere

Detalle en [`app/README.md`](app/README.md).

## Lo que detecta

| Categoría | Cuándo aparece |
|---|---|
| **Aparecen con deuda BCRA** | CUITs antes no reportados, ahora sí |
| **Empeoraron** | Situación que subió (sit. 1 → sit. 3, etc.) |
| **Mejoraron** | Situación que bajó |
| **Salieron** | CUITs que estaban con deuda y ahora limpios |

## Limitaciones

- Cubre **solo Central de Deudores BCRA**. No es ficha completa de
  due diligence (no consulta juicios, quiebras, AFIP, etc).
- La API pública del BCRA tiene rate limiting suave; el cliente reintenta
  3 veces en 429/5xx.
- Si querés un MCP server completo de BCRA, mirá
  [`mcp-bcra` de mortiz-dev](https://github.com/mortiz-dev/mcp-bcra) —
  cubre más endpoints (deudores + cheques + estadísticas) y está bien
  hecho.

## Interoperabilidad con agentes IA

Este repo está armado para que un agente IA pueda auto-descubrirlo y
usarlo sin configuración manual. Concretamente:

- **`skill/alerta-bcra.md`** sigue el formato Claude Code skill
  (frontmatter YAML con `name:` + `description:` y cuerpo markdown
  jerárquico). Es legible por cualquier agente que entienda markdown
  con frontmatter — no es protocolo propietario.
- **`prompt.md`** empaqueta el mismo contenido como prompt copy-paste,
  pensado para agentes de escritorio con tools de ejecución (Claude
  Code, Codex, Gemini CLI, Cursor, Hermes / Herminio, etc).
- **`app/`** es Node.js standalone para corrida autónoma con cron.

### Si sos un agente leyendo este repo

1. Empezá por `skill/alerta-bcra.md` — describe en lenguaje natural qué
   hace la herramienta, cuándo se invoca, qué archivos consume y cómo
   se presenta el reporte.
2. Para ejecutar: leé la lista de CUITs (`./cuits.txt` en el directorio
   actual, o `~/.alerta-bcra/cuits.txt` como fallback), consultá la API
   pública del BCRA, y presentá el reporte siguiendo la plantilla del
   skill.
3. Si el usuario pide automatización (cron, notificaciones a canal
   propio), usá la app de `app/` — ver `app/README.md` para detalle de
   instalación, `app/.env.example` para variables de entorno,
   `app/config.yml.example` para esquema futuro.

Diseñado pensando en: Claude Code, Codex, Cursor, Hermes (Herminio), y
cualquier otro agente que respete markdown con frontmatter YAML. **No
requiere protocolo propietario ni servidor MCP** — es archivos de texto
y código que cualquier agente puede leer e interpretar.

## Inspiración

Hace poco vi una charla de Andrej Karpathy
([From Vibe Coding to Agentic Engineering](https://www.youtube.com/watch?v=96jN2OCOfLs),
AI Ascent 2026) que me dejó pensando: ya no programamos solo para
personas, programamos también para los asistentes de IA con los que cada
uno trabaja. Y cada asistente quiere las cosas distinto — algunos leen
prompts, otros cargan skills, otros prefieren correr un programa propio.

Por eso esto viene en tres formatos. Cubrir los tres es la forma más
honesta de que cada uno lo use con su asistente favorito.

## Agradecimientos

Este proyecto existe porque el **BCRA** publica la
[API pública de Central de Deudores](https://www.bcra.gob.ar/Catalogo/EstadisticaCentralDeudores.asp)
de forma gratuita y sin autenticación. Eso convierte a la información
crediticia en un bien común al que cualquiera puede acceder. Gracias
por bancar la apertura de datos.

Y también a [`mcp-bcra` de mortiz-dev](https://github.com/mortiz-dev/mcp-bcra) —
ya mencionado más arriba, pero vale repetirlo: esa implementación es
más completa en endpoints y muestra que hay otros argentinos haciendo
herramientas alrededor de los mismos datos.

## Si te sirvió

⭐ Dejame una estrella en el repo o invitame
[un cafecito](https://cafecito.app/rje1974).

(O escribime y charlamos, también vale.)

## Licencia

MIT — ver [LICENSE](LICENSE).
