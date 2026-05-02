# Decisiones de arquitectura

> Documento vivo. Si tomás una decisión técnica que afecte cómo se usa el proyecto,
> agregala acá. Si una decisión vieja deja de aplicar, marcala como **superada**
> en lugar de borrarla — el contexto importa.

## Origen del proyecto

`alerta-bcra` nació de una versión interna anterior que se usaba para monitorear
empleados y proveedores de una empresa agropecuaria argentina. La motivación
para liberarlo abierto está contada en el README narrativo del repo.

## Decisión 1: 3 productos planeados, 2 en ola 1

| Producto | Audiencia | Estado |
|---|---|---|
| `alerta-bcra` (skill Claude Code) | Casual copy-paste | Ola 1 |
| `alerta-bcra-app` (Node.js cron) | Sysadmin / VPS / Pi | Ola 1 |
| `mcp-auditor-deudas` (MCP focado) | Devs con setup MCP | Ola 2 |

**Por qué no MCP en ola 1**: ya existe [mcp-bcra de mortiz-dev](https://github.com/mortiz-dev/mcp-bcra)
(MIT, bien hecho, cubre 6 endpoints BCRA). Forkearlo o competirlo es duplicación.
Si hacemos MCP propio será como "auditor de cartera" (batch + diff + análisis),
no wrapper raw — para diferenciarse claramente.

## Decisión 2: Patrón URL para notificaciones (estilo Apprise)

Una variable `NOTIFY_URL` define backend y configuración. Implementación propia
en Node (no la lib Python `apprise`) para mantener "copy-paste sin dependencias
externas".

```
ntfy://alerta-bcra-x9k2lm5q                         # ntfy.sh (default zero-config)
mattermost://192.168.1.50:8065/hooks/abc123         # Mattermost LAN HTTP
mattermosts://workspace.mattermost.com/hooks/abc123 # Mattermost cloud HTTPS
smtp://user:pass@smtp.gmail.com:587?to=foo@bar.com  # email
webhook://https://hooks.slack.com/services/...      # Slack/Discord/genérico
```

**Por qué este patrón**:
- Cero `if (channel === 'discord')` por todo el código
- El user elige su canal favorito sin que el código lo opine
- Extensible sin breaking changes (agregás backend nuevo, otros siguen)
- Mantiene "copy-paste y andá": default ntfy.sh con topic random, sin config

## Decisión 3: Heartbeat opcional

Variable `HEARTBEAT_URL` (default null). Si está seteada, después de cada corrida
se hace GET a esa URL. Compatible con `healthchecks.io` y similares.

**Por qué**: lección típica de cron casero — el cron muere y nadie se entera por
semanas. Healthchecks.io detecta cuando el cron deja de pingar y avisa al user
por SUS canales (no los nuestros).

NO es para alertas BCRA. ES bonus track para "el cron está vivo". Documentado
como opcional.

## Decisión 4: Monorepo (no repos separados)

Estructura:
```
alerta-bcra/
├── skill/    # Claude Code skill
├── app/      # Node.js cron app
└── docs/     # canales/, troubleshooting, decisiones (este archivo)
```

**Por qué**: "es un producto con dos interfaces distintas" (cita del usuario).
- Una URL para tuitear
- README único cuenta UNA historia
- Discovery cruzado (alguien que ve la skill ve la app)
- Si la ola 2 suma el MCP, va como `mcp/` folder

## Decisión 5: Persistencia CUITs híbrida

Lookup en orden:
1. `./cuits.txt` (proyecto actual — versionable)
2. `~/.alerta-bcra/cuits.txt` (home — recurrente)
3. Pedir al usuario

**Por qué híbrido**: cubre el caso "lo uso una vez en este proyecto" + "es mi lista
recurrente personal" sin requerir config explícita.

La skill maneja la conversación: "tenés N CUITs, ¿agregás, quitás o seguís?".

## Decisión 6: Stack y dependencias

- **Node.js 18+** (fetch nativo, sin polyfills)
- **TypeScript** estricto, target ES2022, module resolution "bundler"
- **CLI**: `commander` (mainstream, no `yargs`)
- **Tests**: `vitest` (más rápido y simple que jest, mismo API)
- **Sin bun** como requirement (corre en Pi, VPS modesto, etc.)
- **Tests con red**: opt-in vía `RUN_NETWORK_TESTS=1`

## Decisión 7: Naming

- Skill: `alerta-bcra`
- App: `alerta-bcra-app`
- Repo / monorepo: `alerta-bcra`

"Alerta" > "auditor" porque comunica valor (te avisa cuando algo cambia) en
lugar de la mecánica (audita una cartera). Más vendible para README narrativo.

## Decisión 8: License y autor

MIT, año 2026, autor "Juan Eduardo Riva".

## Patrón usado en el motor

El core (`app/src/core/`) está inspirado en una versión interna anterior, pero
**simplificado**:

- Solo BCRA Central de Deudores (la versión interna también consulta cheques
  rechazados, histórico, padrón AFIP — los dejamos para ola 2 si valen)
- Sin "nombre local" — mostramos `denominacion` que devuelve BCRA
- Eventos mapeados al vocabulario user-facing: Nuevos / Empeorados / Mejorados / Salieron
- Snapshot dual: `latest.json` (para diff rápido) + `YYYY-MM-DD-HHMMSS.json` (histórico)

**Importante**: el monto que devuelve BCRA está en miles de pesos. El parser
multiplica × 1000 antes de mostrar.

## Endpoint BCRA

`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/{cuit}`

- Sin auth
- 404 = "no tiene deuda reportada" (NO es error, es CUIT limpio)
- 429/5xx = retry con backoff lineal (3 intentos default)
- Periodos vienen ordenados descendente; `peorSituacion` se calcula del más reciente

## Métrica de éxito

NO stars/downloads. SÍ: **3 conversaciones útiles** que arranquen a partir del
proyecto en 6 meses. "Showcase, no producto mantenido."
