import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { conservarUltimosValidos, crearStore, type Snapshot } from '../../src/core/snapshot.js';

describe('crearStore', () => {
  it('no pisa snapshots históricos con la misma fecha', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'alerta-bcra-snapshot-'));
    try {
      const store = crearStore(tmpDir);
      const snapshot: Snapshot = { fecha: '2026-05-01T08:00:00.123Z', registros: {} };
      const primero = store.guardar(snapshot);
      const segundo = store.guardar(snapshot);

      expect(primero.archivePath).not.toBe(segundo.archivePath);
      expect(basename(primero.archivePath)).toMatch(/123\.json$/);
      expect(basename(segundo.archivePath)).toMatch(/123-1\.json$/);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('puede guardar histórico crudo y latest confiable por separado', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'alerta-bcra-snapshot-'));
    try {
      const store = crearStore(tmpDir);
      const historico: Snapshot = {
        fecha: '2026-05-01T08:00:00.123Z',
        registros: { '20-12345678-9': { ok: false, error: 'timeout' } },
      };
      const latest: Snapshot = {
        fecha: '2026-05-01T08:00:00.123Z',
        registros: {
          '20-12345678-9': {
            ok: true,
            peorSituacion: 2,
            totalDeuda: 200000,
            cantidadEntidades: 1,
            periodos: [],
            consultadoEn: '2026-04-01T08:00:00.000Z',
          },
        },
      };

      const paths = store.guardar(historico, latest);
      expect(JSON.parse(readFileSync(paths.archivePath, 'utf8'))).toEqual(historico);
      expect(JSON.parse(readFileSync(paths.latestPath, 'utf8'))).toEqual(latest);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('conservarUltimosValidos', () => {
  it('no reemplaza un dato válido anterior por error transitorio', () => {
    const anterior: Snapshot = {
      fecha: '2026-04-01T08:00:00.000Z',
      registros: {
        '20-12345678-9': {
          ok: true,
          peorSituacion: 2,
          totalDeuda: 200000,
          cantidadEntidades: 1,
          periodos: [],
          consultadoEn: '2026-04-01T08:00:00.000Z',
        },
      },
    };
    const nueva: Snapshot = {
      fecha: '2026-05-01T08:00:00.000Z',
      registros: {
        '20-12345678-9': { ok: false, error: 'timeout' },
      },
    };

    const r = conservarUltimosValidos(anterior, nueva);
    expect(r.registros['20-12345678-9']).toEqual(anterior.registros['20-12345678-9']);
  });
});
