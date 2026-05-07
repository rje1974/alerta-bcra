---
name: alerta-bcra
description: Audita CUITs/CUILs en la Central de Deudores del BCRA. Detecta deuda reportada, situaciones 1 a 6 y cambios contra snapshots previos. Uso conversacional copy-paste, sin instalar nada.
---

# alerta-bcra

Esta skill convierte una conversación en una auditoría real contra el endpoint
público de la Central de Deudores del BCRA. Sin librerías, sin auth, sin
instalar nada. Hacés `fetch` directo, parseás JSON, mostrás resultado.

Para uso recurrente con cron (no copy-paste), ver `app/` en el repo.

---

## Cuándo invocarla

Activá esta skill cuando el usuario pida algo del estilo:

- "alertá BCRA"
- "auditá estos CUITs"
- "chequeá deudas"
- "consultá la Central de Deudores"
- "cómo está [empleado X] en el BCRA"
- "revisá la cartera de proveedores en el BCRA"
- "agregá CUIT 30-12345678-9 a mi lista"
- "sacá CUIT X de la lista"
- "mostrame mi lista de CUITs"

---

## Lookup de la lista de CUITs

Antes de pedirle nada al usuario, buscá en este orden:

1. **`./cuits.txt`** en el directorio actual del proyecto
2. **`~/.alerta-bcra/cuits.txt`** (lista personal del usuario)
3. Si no hay ninguno → pedile al usuario que pegue la lista o un CUIT.

Formato esperado del archivo:

```
# Comentarios con #
30-50000076-1
33-65517437-9
30500010912
```

CUITs aceptados con o sin guiones, regex `^\d{2}-?\d{8}-?\d{1}$`. Líneas vacías
y comentarios se ignoran.

---

## Endpoint BCRA

```
GET https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/{cuit-sin-guiones}
Accept: application/json
```

Sin auth. Códigos:

- **200**: tiene deuda reportada → `{ status, results: { ... } }`
- **404**: no tiene deuda reportada → CUIT limpio (NO es error)
- **429 / 5xx**: rate limit / server. Reintentá con backoff lineal (3 intentos).

### Shape del 200

```typescript
{
  status: 200,
  results: {
    identificacion: number,        // CUIT como número
    denominacion: string,          // Nombre / razón social
    periodos: [
      {
        periodo: "YYYYMM",          // ej "202604"
        entidades: [
          {
            entidad: string,        // banco/financiera
            situacion: number,      // 1-6
            monto: number,          // EN MILES DE PESOS, multiplicar ×1000
            diasAtrasoPago: number,
            enRevision: "S" | "N",
            procesoJud: "S" | "N"
          }
        ]
      }
    ]
  }
}
```

**IMPORTANTE**: el monto está en miles de pesos. Multiplicá por 1000 antes
de mostrar al usuario.

Los periodos vienen ordenados descendente — `periodos[0]` es el más reciente.
La "peor situación" se calcula como el `Math.max` de las situaciones del
periodo más reciente.

### Tabla de situaciones

| Sit. | Significado |
|------|-------------|
| 1 | Normal |
| 2 | Riesgo bajo |
| 3 | Cumplimiento deficiente |
| 4 | Difícil recuperación |
| 5 | Irrecuperable |
| 6 | Irrecuperable por disposición técnica |

---

## Cómo hacer el fetch (copy-paste para el agente)

Sin instalar nada, en cualquier proyecto Node.js 18+:

```javascript
async function consultarBCRA(cuit) {
  const id = String(cuit).replace(/[-\s]/g, '');
  const url = `https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/${id}`;

  for (let intento = 0; intento < 3; intento++) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await res.json().catch(() => ({ status: res.status }));
    if (!data.status) data.status = res.status;

    if (data.status === 404) {
      return { cuit, sinRegistros: true };
    }
    if (data.status === 200 && data.results) {
      const ult = data.results.periodos?.[0];
      const entidades = ult?.entidades || [];
      const peorSituacion = entidades.length
        ? Math.max(...entidades.map(e => e.situacion))
        : null;
      const totalDeuda = entidades.reduce((s, e) => s + e.monto * 1000, 0);
      return {
        cuit,
        denominacion: data.results.denominacion,
        peorSituacion,
        totalDeuda,
        cantidadEntidades: entidades.length,
        entidades: entidades.map(e => ({ ...e, monto: e.monto * 1000 })),
      };
    }
    if (data.status === 429 || (data.status >= 500 && data.status < 600)) {
      await new Promise(r => setTimeout(r, 2000 * (intento + 1)));
      continue;
    }
    return { cuit, error: `BCRA respondió ${data.status}` };
  }
  return { cuit, error: 'Reintentos agotados' };
}
```

Si el usuario tiene Node.js disponible, podés correrlo directo. Si no,
generá el equivalente en bash con `curl`:

```bash
curl -s "https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/30500000761" \
  | jq '.results | {denominacion, peor: ([.periodos[0].entidades[].situacion] | max // null), total_miles: ([.periodos[0].entidades[].monto] | add // 0)}'
```

---

## Cómo presentar el reporte

En castellano rioplatense, formato legible. Plantilla:

```
alerta-bcra · DD/MM/AAAA

Auditados N CUITs.

▲ Empeoraron (k)
  • XX-XXXXXXXX-X — Razón Social
    1 (normal) → 3 (cumplimiento deficiente) · $100.000 → $850.000

+ Aparecen con deuda BCRA (k)
  • XX-XXXXXXXX-X — Razón Social
    Sit. 2 (riesgo bajo) · $250.000

▼ Mejoraron (k)
  • ...

✓ Salieron de mora (k)
  • ...

$ Cambios relevantes de deuda (k)
  • XX-XXXXXXXX-X — Razón Social
    Sit. 1 (normal) · $100.000 → $250.000 (+$150.000 · +150,0%)

Sin cambios (m): XX-XXXXXXXX-X, XX-XXXXXXXX-X, ...
```

Si no hay cambios contra el snapshot anterior (o si es la primera corrida),
decilo de frente: "Sin cambios significativos. Lista limpia."

Formato pesos en `Intl.NumberFormat('es-AR', {style: 'currency', currency: 'ARS'})`.

---

## Persistencia de la lista

### Guardar

Si el usuario pega CUITs nuevos y querés ofrecer guardarlos, preguntale:

> "¿Querés que la guarde en `~/.alerta-bcra/cuits.txt` para no tenerla que
> volver a pegar?"

Si dice que sí:

```bash
mkdir -p ~/.alerta-bcra
cat >> ~/.alerta-bcra/cuits.txt <<EOF
30-50000076-1
33-65517437-9
EOF
```

### Add

```javascript
// Verificá si ya está antes de duplicar
const existentes = fs.readFileSync(path, 'utf8').split('\n').map(l => l.trim());
if (!existentes.includes('30-12345678-9')) {
  fs.appendFileSync(path, '30-12345678-9\n');
}
```

### Remove

```javascript
const lineas = fs.readFileSync(path, 'utf8').split('\n');
const filtradas = lineas.filter(l => l.trim() !== '30-12345678-9');
fs.writeFileSync(path, filtradas.join('\n'));
```

### Listar

`cat ./cuits.txt` o `cat ~/.alerta-bcra/cuits.txt`. Mostrá fuente al usuario:
"Tu lista personal en `~/.alerta-bcra/cuits.txt` tiene 5 CUITs:".

---

## Diff entre corridas (opcional)

Si encontrás `./snapshots/latest.json` con resultado confiable de corrida
anterior, compará y reportá cambios. Como compatibilidad, si existe
`./alerta-bcra-snapshot.json`, podés leerlo como snapshot anterior legacy.
Categorías:

- **Nuevos**: aparecen con deuda ahora, antes no estaban o no tenían deuda.
- **Empeorados**: situación subió (1→3, 2→4, etc.).
- **Mejorados**: situación bajó.
- **Salieron**: tenían deuda y ahora 404 (limpios).
- **Cambios relevantes de deuda**: misma situación, pero el monto cambió más que
  el umbral definido por el usuario.

Estructura del snapshot:

```json
{
  "fecha": "2026-05-01T12:34:56.000Z",
  "registros": {
    "30-50000076-1": { "ok": true, "peorSituacion": 1, "totalDeuda": 100000, ... },
    "33-65517437-9": { "ok": true, "sinRegistros": true, ... }
  }
}
```

Cuando guardes snapshots, usá esta estrategia:

- `./snapshots/latest.json`: último estado confiable para comparar la próxima vez.
- `./snapshots/YYYY-MM-DD-HHMMSS-ms.json`: histórico crudo de la corrida.

Si una consulta falla pero hay un dato anterior válido, el histórico debe guardar
el error real y `latest.json` debe conservar el dato anterior. Así no generás
falsos `NUEVO` o `SALIO` por una falla transitoria.

Después de cada corrida, si guardaste snapshot, ofrecé al usuario:

> "Guardé `./snapshots/latest.json` para que la próxima vez te muestre
> sólo lo que cambió."

---

## Comandos conversacionales

| El usuario dice | Vos hacés |
|---|---|
| "alertá BCRA" / "auditá mi lista" | Lookup CUITs → fetch → reporte |
| "auditá estos CUITs: 30-X-Y, 30-Z-W" | Parsea, fetch, reporte. Ofrecé guardar. |
| "agregá CUIT 30-X-Y" | Append a `~/.alerta-bcra/cuits.txt` (o `./cuits.txt` si existe). Confirmá si ya estaba. |
| "sacá CUIT 30-X-Y" / "sacá Walter" | Remové del archivo activo. Si "Walter" no es CUIT, pedile el CUIT específico. |
| "mostrame mi lista" | `cat` el archivo activo, mostrá CUITs uno por línea. |
| "borrá la lista" | Confirmá antes (es destructivo). Después `rm`. |

---

## Errores comunes y cómo manejarlos

- **CUIT mal formateado**: validá `^\d{2}-?\d{8}-?\d{1}$` antes de fetch. Si
  falla, decile al usuario qué cuit es problema.
- **404 en BCRA**: NO es error. CUIT limpio = sin deuda reportada.
- **Network error**: reintentos con backoff. Si todos fallan, reportá el CUIT
  en sección "Errores de consulta" del reporte, no abortes.
- **Rate limit (429)**: el endpoint es generoso, pero si auditás 50+ CUITs a
  la vez, sumá `await new Promise(r => setTimeout(r, 200))` entre llamadas.

---

## Ejemplos de conversaciones reales

### Ejemplo 1: primera corrida sin lista

> **Usuario**: alertá BCRA

> **Vos**: No encontré ni `./cuits.txt` ni `~/.alerta-bcra/cuits.txt`. ¿Me
> pegás los CUITs que querés auditar? (Uno por línea, con o sin guiones).

> **Usuario**:
> ```
> 30-50000076-1
> 33-65517437-9
> 30500010912
> ```

> **Vos**: Listo, audito 3 CUITs contra el BCRA...
>
> ```
> alerta-bcra · 01/05/2026
>
> Auditados 3 CUITs.
>
> Sin cambios significativos. Lista limpia.
> ```
>
> ¿Querés que guarde estos 3 CUITs en `~/.alerta-bcra/cuits.txt` para la
> próxima vez?

> **Usuario**: dale

> **Vos**: Guardé. La próxima vez que digas "alertá BCRA" salen estos 3
> automáticamente.

### Ejemplo 2: con cambios

> **Usuario**: alertá BCRA

> **Vos**: Cargué 12 CUITs desde `~/.alerta-bcra/cuits.txt`. Audito...
>
> ```
> alerta-bcra · 01/05/2026
> Comparación: 01/04/2026 → 01/05/2026
>
> ▲ Empeoraron (1)
>   • 20-12345678-9 — JUAN PEREZ
>     1 (normal) → 3 (cumplimiento deficiente) · $100.000 → $850.000
>
> + Aparecen con deuda BCRA (1)
>   • 27-87654321-2 — MARIA LOPEZ
>     Sit. 2 (riesgo bajo) · $50.000
> ```
>
> Llamá a Pérez. La de López es chiquita, pero ojo.

### Ejemplo 3: agregar/sacar

> **Usuario**: agregá 30-99887766-1

> **Vos**: Agregué `30-99887766-1` a `~/.alerta-bcra/cuits.txt`. Tu lista
> ahora tiene 13 CUITs.

> **Usuario**: sacá 30-99887766-1

> **Vos**: Quité `30-99887766-1`. Quedan 12 CUITs.

> **Usuario**: mostrame la lista

> **Vos**: 12 CUITs en `~/.alerta-bcra/cuits.txt`:
>
> ```
> 30-50000076-1
> 33-65517437-9
> 30-50001091-2
> ...
> ```

---

## Cosas que NO tenés que hacer

- **No pidas auth**: el endpoint es público, no hay token.
- **No instales nada**: sin librerías, fetch nativo de Node 18+.
- **No expongas CUITs en logs públicos**: si el usuario te pasa una lista,
  no la pegues en respuestas a otros usuarios. Es info sensible (KYC).
- **No prometas nada que no podés ver**: el endpoint no incluye cheques
  rechazados — eso es otro endpoint distinto del BCRA. Si el usuario lo pide,
  decilo claro.
