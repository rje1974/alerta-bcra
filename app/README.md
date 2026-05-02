# `alerta-bcra-app`

> TODO: completar narrativa.

App Node.js con cron que monitorea la Central de Deudores del BCRA y avisa cuando hay cambios.

## Quick start

```bash
cd app
npm install
cp .env.example .env
cp cuits.txt.example cuits.txt
# editar cuits.txt con tu lista
npm run start -- run
```

## Configuración

Ver `.env.example` y `config.yml.example`.

### Canales de notificación

`alerta-bcra-app` usa un patrón URL para notificaciones. Una sola variable `NOTIFY_URL` define el backend:

```
ntfy://topic-x9k2lm5q                          # ntfy.sh (default zero-config)
ntfys://server.ejemplo.com/topic               # ntfy self-hosted HTTPS
mattermost://192.168.88.36:8065/hooks/abc123   # Mattermost LAN HTTP
mattermosts://workspace.com/hooks/abc123       # Mattermost cloud HTTPS
smtp://user:pass@smtp.gmail.com:587?to=foo@bar.com  # email SMTP
webhook://https://hooks.slack.com/services/... # webhook genérico (Slack/Discord)
```

Ver `docs/canales/` para detalle de cada uno.

## Heartbeat (opcional)

TODO: documentar healthchecks.io.

## Comandos

```bash
npm run start -- run           # corre auditoría + diff + notifica
npm run start -- list          # lista CUITs cargados
npm run start -- add <cuit>    # agrega CUIT
npm run start -- remove <cuit> # quita CUIT
```

## Desarrollo

```bash
npm test                       # vitest (red opt-in con RUN_NETWORK_TESTS=1)
npm run dev                    # tsx --watch
```
