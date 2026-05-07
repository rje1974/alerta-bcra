# Skill `alerta-bcra` para Claude Code

Skill conversacional. Le pedís a Claude Code que audite CUITs en la Central
de Deudores del BCRA y lo hace usando el endpoint público — sin instalar
nada, sin auth.

## Instalación

### Opción A: copy-paste rápido (sesión actual)

```bash
mkdir -p ~/.claude/skills/alerta-bcra
curl -sL https://raw.githubusercontent.com/rje1974/alerta-bcra/main/skill/alerta-bcra.md \
  > ~/.claude/skills/alerta-bcra/alerta-bcra.md
```

Reiniciá Claude Code y la skill aparece.

### Opción B: clonar el repo (recomendado)

```bash
git clone https://github.com/rje1974/alerta-bcra.git ~/proyectos/alerta-bcra
ln -s ~/proyectos/alerta-bcra/skill ~/.claude/skills/alerta-bcra
```

Así te llevás también la app Node.js (en `app/`) y los docs de canales.

## Uso

Después de instalar, en cualquier conversación con Claude Code:

```
> alertá BCRA
```

Si tenés una lista guardada en `./cuits.txt` o `~/.alerta-bcra/cuits.txt`,
la usa directo. Si no, te pide que pegues los CUITs.

Otras frases que disparan la skill:

- "auditá estos CUITs"
- "chequeá la deuda BCRA de [CUIT]"
- "agregá CUIT 30-X-Y a mi lista"
- "sacá CUIT 30-X-Y"
- "mostrame mi lista"

Más ejemplos: ver final de `alerta-bcra.md`.

## Cómo funciona

1. La skill busca CUITs en `./cuits.txt` o `~/.alerta-bcra/cuits.txt` (en ese
   orden de prioridad). Si no hay, te pide pegarlos.

2. Para cada CUIT hace un GET a:

   ```
   https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/{cuit-sin-guiones}
   ```

   Endpoint público, sin auth. 404 = "no tiene deuda reportada" (CUIT limpio).

3. Parsea el JSON, multiplica montos × 1000 (BCRA reporta en miles), arma un
   reporte en castellano y te lo muestra.

4. Si encuentra `./snapshots/latest.json` con corrida previa confiable, calcula
   diff: Aparecen con deuda BCRA / Empeorados / Mejorados / Salieron / Cambios de monto.

## Diferencia con la app Node.js

| | Skill | App |
|---|---|---|
| Instalación | Copy-paste, sin deps | `npm install` en VPS / Pi |
| Uso | Conversacional ad hoc | Cron diario / semanal |
| Notificaciones | Mostrar en chat | ntfy / Mattermost / email / webhook |
| Persistencia | Archivo de texto + snapshots compatibles | snapshots/ con histórico completo |
| Audiencia | Usuario casual | Sysadmin |

Las dos comparten el mismo patrón de URL `cuits.txt`, así que una lista que
mantenés vía skill funciona igual con la app, y vice-versa.

## Pre-requisitos

- Claude Code instalado y andando
- Node.js 18+ disponible en el shell donde Claude Code ejecuta tools (para
  `fetch` nativo). Si no, la skill puede fallback a `curl`.

## Soporte

- Issues / PRs: [github.com/rje1974/alerta-bcra](https://github.com/rje1974/alerta-bcra)
- Endpoint BCRA: [doc oficial](https://www.bcra.gob.ar/Catalogo/EstadisticaCentralDeudores.asp)
