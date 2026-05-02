# Ejemplos de uso — alerta-bcra-app

Corridas reales de la app, cubriendo los flujos más comunes.

> Asumimos que ya hiciste `npm install` desde la raíz del repo.

---

## 1. Primera corrida (sin snapshot anterior)

```bash
cd app
echo "30-50000076-1
33-65517437-9
30-50001091-2" > cuits.txt

npm start -- run
```

Output:

```
Cargué 3 CUITs desde project (/home/juan/alerta-bcra/app/cuits.txt)
Consultando BCRA...
  30-50000076-1 ... limpio
  33-65517437-9 ... limpio
  30-50001091-2 ... limpio

alerta-bcra · 01/05/2026
Comparación: primera corrida → 01/05/2026

Sin cambios significativos.

Snapshot guardado en ./snapshots/2026-05-01-204510.json
NOTIFY_URL no seteada — no se notifica.
```

Como es la primera corrida, no hay nada con qué comparar. Se guarda el
snapshot para que la próxima vez detecte cambios.

---

## 2. Corrida con cambios detectados

(Después de que algún CUIT cambie de situación entre corridas.)

```bash
npm start -- run
```

Output:

```
Cargué 3 CUITs desde project (/home/juan/alerta-bcra/app/cuits.txt)
Consultando BCRA...
  30-50000076-1 ... limpio
  33-65517437-9 ... sit. 3 · 1 entidad(es)
  30-50001091-2 ... limpio

alerta-bcra · 01/06/2026
Comparación: 01/05/2026 → 01/06/2026

▲ Empeoraron (1)
  • 33-65517437-9 — AFIP
    1 (normal) → 3 (cumplimiento deficiente) · $0 → $850.000

Snapshot guardado en ./snapshots/2026-06-01-094510.json
Notificación enviada vía ntfy:
```

(Los datos son ilustrativos — ningún CUIT real debería figurar acá.)

---

## 3. Add y remove de CUITs

```bash
npm start -- add 30-99887766-1
# → Agregado a /home/juan/alerta-bcra/app/cuits.txt

npm start -- add 30-99887766-1
# → Ya estaba en /home/juan/alerta-bcra/app/cuits.txt

npm start -- list
# → 4 CUIT(s) desde project (/home/juan/alerta-bcra/app/cuits.txt):
#     30-50000076-1
#     33-65517437-9
#     30-50001091-2
#     30-99887766-1

npm start -- remove 30-99887766-1
# → Quitado de /home/juan/alerta-bcra/app/cuits.txt

npm start -- list
# → 3 CUIT(s) desde project (/home/juan/alerta-bcra/app/cuits.txt):
#     30-50000076-1
#     33-65517437-9
#     30-50001091-2
```

Si no hay `cuits.txt` en el proyecto pero sí en `~/.alerta-bcra/cuits.txt`,
los `add` y `remove` operan sobre el archivo de home.

---

## 4. Notificación a ntfy + heartbeat

`.env`:

```bash
NOTIFY_URL=ntfy://alerta-bcra-x9k2lm5q
HEARTBEAT_URL=https://hc-ping.com/abc12345-6789-def0-1234-567890abcdef
```

Corrida:

```bash
npm start -- run
```

Output (final):

```
...
Snapshot guardado en ./snapshots/2026-05-01-204510.json
Notificación enviada vía ntfy:
```

En tu celular suscripto al topic `alerta-bcra-x9k2lm5q` te llega una push
notification con el reporte completo. healthchecks.io recibe el ping y
resetea el timer del cron.

Si el cron muere (servidor cae, script crashea), no llega el ping y
healthchecks te avisa por sus canales (email / Slack / etc.) según hayas
configurado vos.

---

## 5. Notificación a Mattermost LAN

Caso: tenés una instancia self-hosted en tu red local (típico en empresa
chica con ZeroTier o VPN).

`.env`:

```bash
NOTIFY_URL=mattermost://192.168.88.36:8065/hooks/abc123def456ghi789
```

Notá:

- `mattermost://` (HTTP, no HTTPS — para LAN sin TLS)
- IP+puerto custom
- Path `/hooks/...` viene del incoming webhook que generaste en Mattermost

Corrida:

```bash
npm start -- run
```

Output (final):

```
...
Notificación enviada vía mattermost:
```

En el canal de Mattermost donde está el webhook aparece:

```
[alerta-bcra] APP

**alerta-bcra · ▲1**

alerta-bcra · 01/05/2026
Comparación: 01/04/2026 → 01/05/2026

▲ Empeoraron (1)
  • 20-12345678-9 — JUAN PEREZ
    ...
```

El bold del titulo viene del `**...**` markdown que Mattermost renderiza.

---

## 6. Dry-run (probar sin notificar ni guardar)

Útil cuando estás afinando la lista de CUITs o la configuración:

```bash
npm start -- run --dry-run
```

Output:

```
Cargué 3 CUITs desde project ...
Consultando BCRA...
  ...

alerta-bcra · 01/05/2026
Comparación: 01/05/2026 → 01/05/2026

Sin cambios significativos.

[dry-run] no se guardó snapshot ni se notificó
```

Hace el fetch real al BCRA pero NO guarda snapshot, NO manda notificación,
NO pinguea heartbeat.

---

## 7. Cron típico en Linux

Crontab para correr todos los días a las 7:36 (minuto no-redondo a propósito,
para no caer en horarios "ruidosos" que algunos servicios anti-bot marcan):

```cron
36 7 * * * cd /home/juan/alerta-bcra/app && /usr/bin/npm start -- run >> /tmp/alerta-bcra.log 2>&1
```

Opcional con `tsx` directo (más rápido que `npm start` que pasa por su shell):

```cron
36 7 * * * cd /home/juan/alerta-bcra/app && /usr/bin/npx tsx src/index.ts run >> /tmp/alerta-bcra.log 2>&1
```

Si usás PM2 con `cron_restart`, ejemplo en `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'alerta-bcra',
    cwd: '/home/juan/alerta-bcra/app',
    script: 'npx',
    args: 'tsx src/index.ts run',
    cron_restart: '36 7 * * *',
    autorestart: false,
    env: {
      NOTIFY_URL: 'mattermost://192.168.88.36:8065/hooks/...',
      HEARTBEAT_URL: 'https://hc-ping.com/...',
    }
  }]
};
```

> **Nota PM2**: con `cron_restart` se dispara una primera corrida apenas hacés
> `pm2 start`. Si tenés side effects observables (mandar mensaje a un canal),
> seguí con `pm2 stop alerta-bcra` después del primer disparo.
