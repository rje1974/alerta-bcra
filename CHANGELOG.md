# Changelog

## [Unreleased]

### Added
- Carga automática de `.env` para la app Node.js.
- Alertas opcionales por cambios relevantes de monto de deuda.
- Tests para configuración, snapshots y diff por monto.
- `AGENTS.md` con contexto para agentes de código.

### Changed
- Los snapshots históricos guardan la corrida cruda, mientras `latest.json` conserva el último dato válido cuando una consulta BCRA falla transitoriamente.
- Los snapshots históricos incluyen milisegundos y sufijo incremental para evitar pisadas.
- Documentación de configuración, heartbeat, snapshots y cron.
- Prompt universal y skill Claude Code alineados con las capacidades actuales del motor.
