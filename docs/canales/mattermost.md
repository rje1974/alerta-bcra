# Canal: Mattermost

Mattermost es alternativa open source a Slack. Soporta self-hosted (LAN,
ZeroTier, VPN) o cloud.

## Crear un Incoming Webhook

1. Como admin del workspace, andá a **System Console → Integrations →
   Integration Management** y habilitá **Enable Incoming Webhooks**.

2. En el canal donde querés recibir las alertas, abrí el menú (⋮) →
   **Integrations → Incoming Webhooks → Add Incoming Webhook**.

3. Completá:
   - **Title**: alerta-bcra
   - **Channel**: el canal donde llegan las alertas
   - **Lock to this channel**: opcional (recomendado)

4. Mattermost te muestra una URL del estilo:

   ```
   http://mattermost.tudominio.com/hooks/abc123def456ghi789
   ```

   Copiala — es la única vez que la ves entera.

## NOTIFY_URL

### Mattermost cloud / TLS

```bash
NOTIFY_URL=mattermosts://workspace.mattermost.com/hooks/abc123def456ghi789
```

### Mattermost self-hosted LAN (HTTP, puerto custom)

```bash
NOTIFY_URL=mattermost://192.168.1.50:8065/hooks/abc123def456ghi789
```

### Mattermost ZeroTier / VPN privado

```bash
NOTIFY_URL=mattermost://10.243.0.5:8065/hooks/abc123def456ghi789
```

## Parámetros opcionales

Querystring soportada:

```bash
mattermost://server/hooks/abc?username=bot-bcra&channel=alertas&icon_url=https://x/y.png
```

- `username` → reemplaza el username default `alerta-bcra`
- `channel` → override del canal (si el webhook no está locked)
- `icon_url` → avatar del bot

## Formato del mensaje

```json
{
  "text": "**alerta-bcra · ▲1**\n\n<reporte completo>",
  "username": "alerta-bcra"
}
```

El título queda en bold, el body soporta markdown.

## Troubleshooting

- **401/403** → URL del webhook inválida o desactivada, regenerá.
- **400** → body malformado, revisá si el webhook está en modo strict.
- **Connection refused / timeout** → si es LAN, chequeá que el puerto 8065
  esté abierto desde donde corre el cron.
