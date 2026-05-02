# Canal: webhook genérico

Para cualquier servicio que reciba un POST JSON: n8n, Zapier, Make, tu propio
endpoint, etc.

## Formato

POST con `Content-Type: application/json` y body:

```json
{
  "text": "<titulo>\n\n<cuerpo>",
  "username": "alerta-bcra"
}
```

Si la URL del endpoint contiene la substring `discord` (case-insensitive), se
usa la key `content` en lugar de `text`. Para todo el resto, `text`.

## NOTIFY_URL

Tres formas equivalentes:

```bash
# 1. URL https directa
NOTIFY_URL=https://tu-servidor.com/hooks/alerta-bcra

# 2. Prefijo webhook:// (útil si querés ser explícito)
NOTIFY_URL=webhook://https://tu-servidor.com/hooks/alerta-bcra

# 3. webhooks:// (atajo, fuerza https)
NOTIFY_URL=webhooks://tu-servidor.com/hooks/alerta-bcra
```

## Ejemplo: n8n

1. En n8n, creá un workflow nuevo con nodo **Webhook**:
   - HTTP Method: POST
   - Path: `alerta-bcra` (o lo que prefieras)
   - Response Mode: Last Node

2. Activá el workflow. n8n te muestra la **Production URL**:

   ```
   https://n8n.tu-dominio.com/webhook/alerta-bcra
   ```

3. Pegala en `NOTIFY_URL`:

   ```bash
   NOTIFY_URL=https://n8n.tu-dominio.com/webhook/alerta-bcra
   ```

4. El nodo recibe el JSON. De ahí, ramificá: enviar a Telegram, guardar en
   sheet, etc.

## Ejemplo: probar con curl (mock server)

Para validar que tu integración recibe lo que esperás, levantá un servidor
local de echo:

```bash
# Terminal 1
nc -l -p 9000

# Terminal 2 (probá la URL apuntando al mock)
NOTIFY_URL=http://localhost:9000/test \
  npm -w app start -- run --dry-run
```

## Servicios populares que aceptan este formato

- **Slack** (incoming webhooks, ver `slack-discord.md`)
- **Discord** (ver `slack-discord.md`)
- **Mattermost** (también soporta ver `mattermost.md`)
- **Telegram Bot API** → necesita formato distinto, no soportado direct.
  Workaround: usar n8n como bridge.
- **Microsoft Teams** → Office 365 connector usa otro shape, no soportado direct.

## Troubleshooting

- **Body llega como string** → verificá que tu endpoint parsea JSON. Algunos
  servicios esperan `application/x-www-form-urlencoded`.
- **CORS error** → no aplica, esto corre server-side.
- **Timeout** → si tu webhook tarda mucho, considerá una cola intermedia.
