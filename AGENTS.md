# AGENTS.md

Instrucciones para agentes de código trabajando en este repo.

## Qué es este proyecto

`alerta-bcra` monitorea CUITs/CUILs argentinos contra la Central de Deudores del BCRA.

Tiene tres interfaces que deben mantenerse alineadas:

| Ruta | Propósito |
|---|---|
| `prompt.md` | Prompt universal copy-paste para asistentes IA |
| `skill/` | Skill conversacional para Claude Code |
| `app/` | App Node.js/TypeScript para cron, snapshots y notificaciones |

Si cambiás lógica de negocio en `app/src/core`, revisá si también hay que actualizar `prompt.md`, `skill/alerta-bcra.md`, `skill/README.md` y `docs/decisiones-arquitectura.md`.

## Comandos

Desde la raíz del repo:

```bash
npm run build
npm test
npm run dev
```

Tests de red real son opt-in:

```bash
RUN_NETWORK_TESTS=1 npm test
```

## Reglas de dominio

- Endpoint principal: `https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/{cuit}`.
- El endpoint es público y no requiere auth.
- `404` significa CUIT limpio/sin deuda reportada, no error.
- `429` y `5xx` deben reintentarse con backoff.
- `monto` viene en miles de pesos; multiplicar por 1000 antes de mostrar.
- Los periodos vienen descendentes; `periodos[0]` es el más reciente.
- Situación BCRA va de 1 a 6.
- No prometas cheques rechazados: este repo no consulta ese endpoint.

## Snapshots

La app usa estrategia dual:

- `snapshots/latest.json`: último estado confiable para calcular diff.
- `snapshots/YYYY-MM-DD-HHMMSS-ms.json`: histórico crudo de corrida.

Si una consulta falla y existe un dato válido anterior, el histórico conserva el error real y `latest.json` conserva el dato anterior. Esto evita falsos `NUEVO` o `SALIO` por fallas transitorias.

## Categorías de diff

- `NUEVO`: aparece con deuda ahora y antes no tenía deuda o no estaba.
- `EMPEORADO`: sube la situación.
- `MEJORADO`: baja la situación.
- `SALIO`: antes tenía deuda y ahora está limpio.
- `CAMBIO_MONTO`: misma situación, pero el monto supera umbral absoluto o porcentual configurado.

## Privacidad y seguridad

- Los CUITs pueden ser información sensible en contexto de cartera, empleados o proveedores.
- No agregues CUITs reales a tests, docs o logs públicos salvo ejemplos ya públicos/dummy.
- No commitees `.env`, credenciales, webhooks privados ni listas reales de `cuits.txt`.
- No hagas cambios destructivos sobre archivos de usuario sin confirmación.

## Estilo de cambios

- Preferí cambios chicos y testeados.
- Mantené TypeScript estricto.
- Agregá tests para cambios en `core`, config o notificaciones.
- Actualizá README/changelog cuando cambie comportamiento observable.
