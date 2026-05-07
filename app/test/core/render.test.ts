import { describe, it, expect } from 'vitest';
import { renderTextoPlano, renderTitulo } from '../../src/core/render.js';
import type { DiffResult } from '../../src/core/diff.js';

describe('render', () => {
  it('incluye cambios relevantes de monto en cuerpo y título', () => {
    const diff: DiffResult = {
      fechaAnterior: '2026-04-01T08:00:00.000Z',
      fechaNueva: '2026-05-01T08:00:00.000Z',
      nuevos: [],
      empeorados: [],
      mejorados: [],
      salieron: [],
      cambiosMonto: [
        {
          tipo: 'CAMBIO_MONTO',
          cuit: '20-12345678-9',
          denominacion: 'Persona Test',
          situacion: 1,
          totalDeudaAnterior: 100000,
          totalDeudaNueva: 180000,
          variacionAbs: 80000,
          variacionPercent: 80,
        },
      ],
      sinCambios: [],
      errores: [],
    };

    expect(renderTitulo(diff)).toContain('$1');
    expect(renderTextoPlano(diff)).toContain('Cambios relevantes de deuda (1)');
    expect(renderTextoPlano(diff)).toContain('20-12345678-9');
    expect(renderTextoPlano(diff)).toContain('+80.0%');
  });
});
