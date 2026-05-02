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

## Inspiración

Hace poco vi una charla de Andrej Karpathy
([From Vibe Coding to Agentic Engineering](https://www.youtube.com/watch?v=96jN2OCOfLs),
AI Ascent 2026) que me dejó pensando: ya no programamos solo para
personas, programamos también para los asistentes de IA con los que cada
uno trabaja. Y cada asistente quiere las cosas distinto — algunos leen
prompts, otros cargan skills, otros prefieren correr un programa propio.

Por eso esto viene en tres formatos. Cubrir los tres es la forma más
honesta de que cada uno lo use con su asistente favorito.

## Si te sirvió

⭐ Dejame una estrella en el repo o invitame
[un cafecito](https://cafecito.app/rje1974).

(O escribime y charlamos, también vale.)

## Licencia

MIT — ver [LICENSE](LICENSE).
