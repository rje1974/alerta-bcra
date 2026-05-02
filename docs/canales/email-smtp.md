# Canal: Email (SMTP)

Manda el reporte por mail al destinatario que indiques. Usa nodemailer.

## Gmail con App Password (recomendado)

Gmail no permite usar tu password normal desde apps externas. Necesitás
generar una **App Password** de 16 caracteres.

### Paso 1: Activar 2FA

[myaccount.google.com/security](https://myaccount.google.com/security) →
**2-Step Verification** → activar.

### Paso 2: Generar App Password

[myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) →

- App: **Mail**
- Device: **Other (Custom name)** → poné `alerta-bcra`

Te devuelve algo así:

```
abcd efgh ijkl mnop
```

Borrá los espacios → `abcdefghijklmnop`.

### Paso 3: NOTIFY_URL

```bash
NOTIFY_URL=smtp://tu-cuenta@gmail.com:abcdefghijklmnop@smtp.gmail.com:587?to=destino@dominio.com
```

Si tu password tiene caracteres especiales (`@`, `:`, `/`, `?`, `#`),
URL-encodealos:

```bash
# Ejemplo: pass = "abc:def@ghi"
NOTIFY_URL=smtp://user@gmail.com:abc%3Adef%40ghi@smtp.gmail.com:587?to=destino@dominio.com
```

## Outlook / Hotmail

```bash
NOTIFY_URL=smtp://tu-cuenta@outlook.com:tu-password@smtp.office365.com:587?to=destino@dominio.com
```

## Fastmail

Fastmail también requiere App Password (creala en
**Settings → Privacy & Security → App Passwords**).

```bash
NOTIFY_URL=smtps://tu-cuenta@fastmail.com:apppass16@smtp.fastmail.com:465?to=destino@dominio.com
```

Notá `smtps://` (puerto 465 con TLS directo). Para `smtp://` (puerto 587 con
STARTTLS) usás el patrón estándar.

## Mandar a varios destinatarios

Usá una alias / lista de distribución del lado del proveedor de mail. La URL
soporta sólo un `to=`.

## Override del remitente

Por default el `From` es el mismo que el usuario auth. Si necesitás otro:

```bash
NOTIFY_URL=smtp://user:pass@smtp.gmail.com:587?to=destino@x.com&from=alertas@empresa.com
```

(Gmail puede rechazar `from` que no sea tuyo. Outlook también.)

## Formato del mensaje

- **Subject**: el resumen (ej `alerta-bcra · ▲1`)
- **Body** (text plano): el reporte completo

## Troubleshooting

- **Invalid login** → verificá que sea **App Password**, no tu pass normal.
- **535 Authentication failed** → 2FA no está activo, App Password no se puede
  generar.
- **Self-signed cert error** → usá `smtps://` (puerto 465) en lugar de `smtp://`.
- **Timeout** → algunos hosts bloquean salida en 587/465. Probá desde un VPS.
