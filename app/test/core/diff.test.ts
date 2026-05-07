import { describe, it, expect } from 'vitest';
import { calcularDiff, calcularDiffConOpciones } from '../../src/core/diff.js';
import type { Snapshot } from '../../src/core/snapshot.js';

const FECHA_ANT = '2026-04-01T08:00:00.000Z';
const FECHA_NUEVA = '2026-05-01T08:00:00.000Z';

function snap(fecha: string, registros: Snapshot['registros']): Snapshot {
  return { fecha, registros };
}

describe('calcularDiff', () => {
  it('primera corrida sin anterior — todo limpio = sin cambios', () => {
    const nueva = snap(FECHA_NUEVA, {
      '30-50000076-1': {
        ok: true,
        sinRegistros: true,
        peorSituacion: null,
        totalDeuda: 0,
        cantidadEntidades: 0,
        periodos: [],
        consultadoEn: FECHA_NUEVA,
      },
    });
    const r = calcularDiff(null, nueva);
    expect(r.nuevos).toHaveLength(0);
    expect(r.empeorados).toHaveLength(0);
    expect(r.salieron).toHaveLength(0);
    expect(r.sinCambios).toContain('30-50000076-1');
  });

  it('CUIT que aparece con deuda nueva → NUEVO', () => {
    const ant = snap(FECHA_ANT, {});
    const nueva = snap(FECHA_NUEVA, {
      '20-12345678-9': {
        ok: true,
        peorSituacion: 3,
        totalDeuda: 500000,
        cantidadEntidades: 1,
        periodos: [{ periodo: '202604', entidades: [] }],
        consultadoEn: FECHA_NUEVA,
      },
    });
    const r = calcularDiff(ant, nueva);
    expect(r.nuevos).toHaveLength(1);
    expect(r.nuevos[0].cuit).toBe('20-12345678-9');
    expect(r.nuevos[0].situacion).toBe(3);
    expect(r.nuevos[0].totalDeuda).toBe(500000);
  });

  it('situación empeora 1 → 3 → EMPEORADO', () => {
    const ant = snap(FECHA_ANT, {
      '20-12345678-9': {
        ok: true,
        peorSituacion: 1,
        totalDeuda: 100000,
        cantidadEntidades: 1,
        periodos: [{ periodo: '202603', entidades: [] }],
        consultadoEn: FECHA_ANT,
      },
    });
    const nueva = snap(FECHA_NUEVA, {
      '20-12345678-9': {
        ok: true,
        peorSituacion: 3,
        totalDeuda: 500000,
        cantidadEntidades: 1,
        periodos: [{ periodo: '202604', entidades: [] }],
        consultadoEn: FECHA_NUEVA,
      },
    });
    const r = calcularDiff(ant, nueva);
    expect(r.empeorados).toHaveLength(1);
    expect(r.empeorados[0].situacionAnterior).toBe(1);
    expect(r.empeorados[0].situacionNueva).toBe(3);
  });

  it('situación mejora 3 → 1 → MEJORADO', () => {
    const ant = snap(FECHA_ANT, {
      '20-12345678-9': {
        ok: true,
        peorSituacion: 3,
        totalDeuda: 500000,
        cantidadEntidades: 1,
        periodos: [{ periodo: '202603', entidades: [] }],
        consultadoEn: FECHA_ANT,
      },
    });
    const nueva = snap(FECHA_NUEVA, {
      '20-12345678-9': {
        ok: true,
        peorSituacion: 1,
        totalDeuda: 100000,
        cantidadEntidades: 1,
        periodos: [{ periodo: '202604', entidades: [] }],
        consultadoEn: FECHA_NUEVA,
      },
    });
    const r = calcularDiff(ant, nueva);
    expect(r.mejorados).toHaveLength(1);
  });

  it('CUIT con deuda → ahora limpio (404) → SALIO', () => {
    const ant = snap(FECHA_ANT, {
      '20-12345678-9': {
        ok: true,
        peorSituacion: 2,
        totalDeuda: 200000,
        cantidadEntidades: 1,
        periodos: [{ periodo: '202603', entidades: [] }],
        consultadoEn: FECHA_ANT,
      },
    });
    const nueva = snap(FECHA_NUEVA, {
      '20-12345678-9': {
        ok: true,
        sinRegistros: true,
        peorSituacion: null,
        totalDeuda: 0,
        cantidadEntidades: 0,
        periodos: [],
        consultadoEn: FECHA_NUEVA,
      },
    });
    const r = calcularDiff(ant, nueva);
    expect(r.salieron).toHaveLength(1);
    expect(r.salieron[0].situacionAnterior).toBe(2);
  });

  it('error en consulta nueva → error reportado', () => {
    const ant = snap(FECHA_ANT, {});
    const nueva = snap(FECHA_NUEVA, {
      '20-12345678-9': { ok: false, error: 'timeout' },
    });
    const r = calcularDiff(ant, nueva);
    expect(r.errores).toHaveLength(1);
    expect(r.errores[0].error).toBe('timeout');
  });

  it('misma situación pero cambio grande de monto → CAMBIO_MONTO', () => {
    const ant = snap(FECHA_ANT, {
      '20-12345678-9': {
        ok: true,
        peorSituacion: 1,
        totalDeuda: 100000,
        cantidadEntidades: 1,
        periodos: [{ periodo: '202603', entidades: [] }],
        consultadoEn: FECHA_ANT,
      },
    });
    const nueva = snap(FECHA_NUEVA, {
      '20-12345678-9': {
        ok: true,
        peorSituacion: 1,
        totalDeuda: 180000,
        cantidadEntidades: 1,
        periodos: [{ periodo: '202604', entidades: [] }],
        consultadoEn: FECHA_NUEVA,
      },
    });

    const r = calcularDiffConOpciones(ant, nueva, { debtChangeAbsThreshold: 50000 });
    expect(r.cambiosMonto).toHaveLength(1);
    expect(r.cambiosMonto[0].variacionAbs).toBe(80000);
  });

  it('sin umbrales de monto mantiene compatibilidad y no alerta cambios de monto', () => {
    const ant = snap(FECHA_ANT, {
      '20-12345678-9': {
        ok: true,
        peorSituacion: 1,
        totalDeuda: 100000,
        cantidadEntidades: 1,
        periodos: [{ periodo: '202603', entidades: [] }],
        consultadoEn: FECHA_ANT,
      },
    });
    const nueva = snap(FECHA_NUEVA, {
      '20-12345678-9': {
        ok: true,
        peorSituacion: 1,
        totalDeuda: 999999,
        cantidadEntidades: 1,
        periodos: [{ periodo: '202604', entidades: [] }],
        consultadoEn: FECHA_NUEVA,
      },
    });

    const r = calcularDiff(ant, nueva);
    expect(r.cambiosMonto).toHaveLength(0);
    expect(r.sinCambios).toContain('20-12345678-9');
  });
});
