# Canales: Slack y Discord

Ambos van por el backend genérico de webhook. La diferencia es solo el shape
del body, que se autodetecta según si la URL contiene `discord`.

## Slack

### Crear el incoming webhook

1. [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** →
   **From scratch**.
2. Nombre: `alerta-bcra`. Workspace: el tuyo.
3. **Incoming Webhooks** (sidebar) → **Activate Incoming Webhooks**: ON.
4. **Add New Webhook to Workspace** → elegí el canal.
5. Copia la URL que te queda en la lista. Forma:

   ```
   https://hooks.slack.com/services/T01ABC/B02DEF/xyz123
   ```

### NOTIFY_URL

Cualquiera de estas dos formas funciona:

```bash
# Forma directa
NOTIFY_URL=https://hooks.slack.com/services/T01ABC/B02DEF/xyz123

# Forma "webhook genérico" (equivalente)
NOTIFY_URL=webhook://https://hooks.slack.com/services/T01ABC/B02DEF/xyz123
```

### Body que recibe Slack

```json
{ "text": "alerta-bcra · ▲1\n\n<reporte>", "username": "alerta-bcra" }
```

## Discord

### Crear el webhook

1. En el canal donde querés recibir las alertas: **icono de engranaje
   (Settings) → Integrations → Webhooks → New Webhook**.
2. Nombre: `alerta-bcra`. Avatar: opcional.
3. **Copy Webhook URL**. Forma:

   ```
   https://discord.com/api/webhooks/123456/abcDEF...
   ```

### NOTIFY_URL

```bash
NOTIFY_URL=https://discord.com/api/webhooks/123456/abcDEF
```

O equivalente:

```bash
NOTIFY_URL=webhooks://discord.com/api/webhooks/123456/abcDEF
```

### Body que recibe Discord

Discord usa la key `content` en lugar de `text`. La detección es automática
porque el endpoint contiene `discord`:

```json
{ "content": "alerta-bcra · ▲1\n\n<reporte>", "username": "alerta-bcra" }
```

## Troubleshooting

- **Slack 403 / `invalid_payload`** → la URL del webhook está revocada o el
  workspace la blockeó. Generá una nueva.
- **Discord 401** → el webhook fue borrado del canal.
- **Mensaje cortado** → Discord limita a 2000 chars en `content`. Si tu
  reporte es muy largo, reducí lista de CUITs o pasá a Slack/Mattermost.
