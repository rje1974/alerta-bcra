# Heartbeat: healthchecks.io

`HEARTBEAT_URL` es opcional. Si lo seteás, después de cada corrida se hace un
GET a esa URL — sirve para que un servicio externo te avise si tu cron muere.

healthchecks.io tiene tier gratis con 20 checks. Más que suficiente.

## Setup

1. Cuenta gratis en [healthchecks.io](https://healthchecks.io). No requiere
   tarjeta.

2. **Add Check**:
   - Name: `alerta-bcra`
   - Schedule:
     - Si corrés diario: `Simple → Period 1 day, Grace 1 hour`
     - Si corrés semanal: `Simple → Period 7 days, Grace 6 hours`
   - Tags: `bcra`, `cron`

3. Te queda una URL única tipo:

   ```
   https://hc-ping.com/abc12345-6789-def0-1234-567890abcdef
   ```

4. Pegala en tu `.env`:

   ```bash
   HEARTBEAT_URL=https://hc-ping.com/abc12345-6789-def0-1234-567890abcdef
   ```

## Notificaciones

En la sección **Integrations**, conectá:

- **Email** (default)
- **Slack** / **Discord** webhook
- **Telegram**, **Pushover**, etc.

Si pasan más que `Period + Grace` sin pingueo, te llega la alerta.

## Comportamiento de `alerta-bcra-app`

- Si el ping falla (timeout, 4xx, 5xx), **no rompe** la app — sólo loggea
  warning. El heartbeat es bonus, no crítico.
- El ping es GET (no POST). Healthchecks acepta cualquier método.
- Solo se pinguea **al final** de una corrida exitosa. Si el script crashea
  antes, no pinguea — y healthchecks te avisa por su lado.

## Alternativas compatibles

Cualquier servicio que acepte un GET sin payload sirve:

- [cronitor.io](https://cronitor.io) (tier gratis 5 monitors)
- [uptimerobot.com](https://uptimerobot.com) heartbeat monitors
- Tu propio endpoint que loggea timestamps

## Self-hosted

`healthchecks.io` es open source. Si querés correrlo en tu infra:

```bash
docker run -d --name hc -p 8000:8000 \
  -e HOST=0.0.0.0 \
  -e SITE_ROOT=http://hc.tu-dominio.com \
  healthchecks/healthchecks
```

Documentación oficial: [healthchecks/healthchecks en GitHub](https://github.com/healthchecks/healthchecks).
