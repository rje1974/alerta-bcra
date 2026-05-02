# Canal: ntfy

ntfy.sh es push notification minimalista, gratis, sin cuenta. App móvil
disponible en Android e iOS.

## Setup en 3 pasos

1. Instalá la app móvil ntfy:
   - Android: [Play Store](https://play.google.com/store/apps/details?id=io.heckel.ntfy) o [F-Droid](https://f-droid.org/en/packages/io.heckel.ntfy/)
   - iOS: [App Store](https://apps.apple.com/us/app/ntfy/id1625396347)

2. Generá un topic random (es la "contraseña" del canal — cualquiera con el
   topic puede leer y postear). Recomendación: 8+ caracteres, mezcla:

   ```
   alerta-bcra-x9k2lm5q
   ```

3. En la app, tocá `+` y suscribite al topic. Default server: `ntfy.sh`.

## NOTIFY_URL para `alerta-bcra-app`

```bash
NOTIFY_URL=ntfy://alerta-bcra-x9k2lm5q
```

## Self-hosted (opcional)

Si tenés tu propio servidor ntfy:

```bash
# Cloud / TLS
NOTIFY_URL=ntfys://ntfy.tudominio.com/mi-topic

# LAN sin TLS (puerto típico 8082)
NOTIFY_URL=ntfy://192.168.1.10:8082/mi-topic
```

## Formato del mensaje

- `Title` header: el resumen (ej `alerta-bcra · ▲1`)
- Body: el reporte completo en texto plano

## Privacidad

- Topic es secret-by-obscurity. Quien lo descubra, ve los mensajes. Usá topics
  random e impredecibles.
- Para más privacidad, considerá self-hosted con auth.

## Troubleshooting

- "No me llegan notifs" → revisá batería/data saver de Android, ntfy es de los
  primeros que el sistema corta.
- "Mensaje vacío" → el body se manda raw, sin escape JSON. Si ves chars raros,
  reportá un issue.
