import { describe, it, expect } from 'vitest';
import { normalizarCUIT, montoAPesos, parseBCRAResponse, consultarBCRA } from '../../src/core/bcra.js';

describe('normalizarCUIT', () => {
  it('quita guiones', () => {
    expect(normalizarCUIT('30-50000076-1')).toBe('30500000761');
  });
  it('quita espacios', () => {
    expect(normalizarCUIT('30 50000076 1')).toBe('30500000761');
  });
  it('idempotente sin guiones', () => {
    expect(normalizarCUIT('30500000761')).toBe('30500000761');
  });
});

describe('montoAPesos', () => {
  it('miles de pesos a pesos enteros', () => {
    expect(montoAPesos(150.5)).toBe(150500);
    expect(montoAPesos(0)).toBe(0);
    expect(montoAPesos(0.001)).toBe(1);
  });
});

describe('parseBCRAResponse', () => {
  it('404 → sinRegistros', () => {
    const r = parseBCRAResponse({ status: 404 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.sinRegistros).toBe(true);
      expect(r.peorSituacion).toBeNull();
      expect(r.totalDeuda).toBe(0);
    }
  });

  it('200 con periodos parsea peorSituacion del periodo más reciente', () => {
    const r = parseBCRAResponse({
      status: 200,
      results: {
        identificacion: 30500000761,
        denominacion: 'Banco Central',
        periodos: [
          {
            periodo: '202604',
            entidades: [
              { entidad: 'Banco X', situacion: 1, monto: 100, diasAtrasoPago: 0, enRevision: 'N', procesoJud: 'N' },
              { entidad: 'Banco Y', situacion: 3, monto: 50, diasAtrasoPago: 30, enRevision: 'N', procesoJud: 'N' },
            ],
          },
        ],
      },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.peorSituacion).toBe(3);
      expect(r.totalDeuda).toBe(150000);
      expect(r.cantidadEntidades).toBe(2);
    }
  });

  it('500 → error', () => {
    const r = parseBCRAResponse({ status: 500, errorMessages: ['boom'] });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/500/);
    }
  });
});

const RUN_NETWORK = process.env.RUN_NETWORK_TESTS === '1';
const networkSuite = RUN_NETWORK ? describe : describe.skip;

networkSuite('consultarBCRA — red real (RUN_NETWORK_TESTS=1)', () => {
  it('CUIT BCRA (público) responde sin error', async () => {
    const r = await consultarBCRA('30-50000076-1', { maxRetries: 1 });
    expect(r.ok).toBe(true);
  }, 15000);

  it('CUIT inexistente devuelve sinRegistros o error tipado', async () => {
    const r = await consultarBCRA('00000000000', { maxRetries: 0 });
    expect(typeof r.ok).toBe('boolean');
  }, 10000);
});
