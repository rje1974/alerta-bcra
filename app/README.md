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

La app carga automáticamente un archivo `.env` en el directorio desde donde se ejecuta. Las variables ya exportadas en el entorno tienen prioridad sobre `.env`; si no hay valor, se usan defaults.

Variables principales:

```bash
NOTIFY_URL=                         # canal de notificación, opcional
HEARTBEAT_URL=                      # healthchecks.io o compatible, opcional
SNAPSHOTS_DIR=./snapshots           # carpeta de snapshots
BCRA_MAX_RETRIES=3                  # entero >= 0
DEBT_CHANGE_ABS_THRESHOLD=100000    # alerta si el cambio absoluto supera este monto
DEBT_CHANGE_PERCENT_THRESHOLD=25    # alerta si el cambio porcentual supera este valor
```

Los umbrales de deuda se pueden usar juntos. Si ambos quedan en `0`, solo se alertan cambios de situación, altas, salidas y errores.

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

Si `HEARTBEAT_URL` está seteada, la app hace un `GET` al final de cada corrida. Está pensado para servicios como healthchecks.io o endpoints compatibles. Si el heartbeat falla, la app lo registra como warning pero no marca la corrida como fallida.

Ejemplo:

```bash
HEARTBEAT_URL=https://hc-ping.com/uuid-del-check
```

## Snapshots

Cada corrida guarda:

```text
snapshots/latest.json               # último estado confiable para calcular diff
snapshots/YYYY-MM-DD-HHMMSS-ms.json # histórico crudo de corrida
```

El histórico guarda lo que pasó en esa corrida, incluyendo errores de consulta. `latest.json`, en cambio, se usa como base confiable para el próximo diff: si una consulta BCRA falla pero existe un dato válido anterior para ese CUIT, conserva ese dato anterior. Así una falla transitoria no borra historial ni genera falsos `NUEVO` en la siguiente corrida. El reporte igualmente muestra el error de consulta.

## Cron

Ejemplo diario a las 09:00:

```cron
0 9 * * * cd /ruta/alerta-bcra/app && npm run start -- run >> alerta-bcra.log 2>&1
```

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
