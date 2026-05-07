/**
 * Renderiza el resultado del diff como texto plano para notificación.
 */

import type { DiffResult, Cambio } from './diff.js';

const SITUACION_LABEL: Record<number, string> = {
  1: 'normal',
  2: 'riesgo bajo',
  3: 'cumplimiento deficiente',
  4: 'difícil recuperación',
  5: 'irrecuperable',
  6: 'irrecuperable por disposición técnica',
};

function formatPesos(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatSituacion(s: number | null): string {
  if (s === null) return 'sin deuda';
  return `${s} (${SITUACION_LABEL[s] || 'desconocida'})`;
}

function lineaCambio(c: Cambio): string {
  const id = c.denominacion ? `${c.cuit} — ${c.denominacion}` : c.cuit;
  switch (c.tipo) {
    case 'NUEVO':
      return `  • ${id}\n    Sit. ${formatSituacion(c.situacion)} · ${formatPesos(c.totalDeuda)}`;
    case 'EMPEORADO':
      return `  • ${id}\n    ${formatSituacion(c.situacionAnterior)} → ${formatSituacion(c.situacionNueva)} · ${formatPesos(c.totalDeudaAnterior)} → ${formatPesos(c.totalDeudaNueva)}`;
    case 'MEJORADO':
      return `  • ${id}\n    ${formatSituacion(c.situacionAnterior)} → ${formatSituacion(c.situacionNueva)} · ${formatPesos(c.totalDeudaAnterior)} → ${formatPesos(c.totalDeudaNueva)}`;
    case 'SALIO':
      return `  • ${id}\n    Estaba en ${formatSituacion(c.situacionAnterior)} (${formatPesos(c.totalDeudaAnterior)}), ahora limpio`;
    case 'CAMBIO_MONTO': {
      const signo = c.variacionAbs > 0 ? '+' : '';
      const pct = c.variacionPercent === null ? '' : ` · ${signo}${c.variacionPercent.toFixed(1)}%`;
      return `  • ${id}\n    Sit. ${formatSituacion(c.situacion)} · ${formatPesos(c.totalDeudaAnterior)} → ${formatPesos(c.totalDeudaNueva)} (${signo}${formatPesos(c.variacionAbs)}${pct})`;
    }
  }
}

export function renderTextoPlano(diff: DiffResult): string {
  const lineas: string[] = [];
  const fechaAnt = diff.fechaAnterior
    ? new Date(diff.fechaAnterior).toLocaleDateString('es-AR')
    : 'primera corrida';
  const fechaNueva = new Date(diff.fechaNueva).toLocaleDateString('es-AR');

  lineas.push(`alerta-bcra · ${fechaNueva}`);
  lineas.push(`Comparación: ${fechaAnt} → ${fechaNueva}`);
  lineas.push('');

  const totalCambios =
    diff.nuevos.length +
    diff.empeorados.length +
    diff.mejorados.length +
    diff.salieron.length +
    diff.cambiosMonto.length;

  if (totalCambios === 0 && diff.errores.length === 0) {
    lineas.push('Sin cambios significativos.');
    return lineas.join('\n');
  }

  if (diff.empeorados.length > 0) {
    lineas.push(`▲ Empeoraron (${diff.empeorados.length})`);
    diff.empeorados.forEach(c => lineas.push(lineaCambio(c)));
    lineas.push('');
  }

  if (diff.nuevos.length > 0) {
    lineas.push(`+ Aparecen con deuda BCRA (${diff.nuevos.length})`);
    diff.nuevos.forEach(c => lineas.push(lineaCambio(c)));
    lineas.push('');
  }

  if (diff.mejorados.length > 0) {
    lineas.push(`▼ Mejoraron (${diff.mejorados.length})`);
    diff.mejorados.forEach(c => lineas.push(lineaCambio(c)));
    lineas.push('');
  }

  if (diff.salieron.length > 0) {
    lineas.push(`✓ Salieron de mora (${diff.salieron.length})`);
    diff.salieron.forEach(c => lineas.push(lineaCambio(c)));
    lineas.push('');
  }

  if (diff.cambiosMonto.length > 0) {
    lineas.push(`$ Cambios relevantes de deuda (${diff.cambiosMonto.length})`);
    diff.cambiosMonto.forEach(c => lineas.push(lineaCambio(c)));
    lineas.push('');
  }

  if (diff.errores.length > 0) {
    lineas.push(`! Errores de consulta (${diff.errores.length})`);
    diff.errores.forEach(e => lineas.push(`  • ${e.cuit}: ${e.error}`));
  }

  return lineas.join('\n').trimEnd();
}

export function renderTitulo(diff: DiffResult): string {
  const partes: string[] = [];
  if (diff.empeorados.length > 0) partes.push(`▲${diff.empeorados.length}`);
  if (diff.nuevos.length > 0) partes.push(`+${diff.nuevos.length}`);
  if (diff.mejorados.length > 0) partes.push(`▼${diff.mejorados.length}`);
  if (diff.salieron.length > 0) partes.push(`✓${diff.salieron.length}`);
  if (diff.cambiosMonto.length > 0) partes.push(`$${diff.cambiosMonto.length}`);
  if (partes.length === 0) return 'alerta-bcra · sin cambios';
  return `alerta-bcra · ${partes.join(' ')}`;
}
