/**
 * Persistencia de snapshots de auditorías BCRA.
 *
 * Cada corrida graba dos archivos:
 *   - snapshots/latest.json (siempre el más reciente, para diff rápido)
 *   - snapshots/YYYY-MM-DD-HHMMSS.json (histórico, no se borra)
 *
 * Estructura del snapshot:
 *   {
 *     fecha: ISO string,
 *     registros: { [cuit]: Consulta }
 *   }
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Consulta } from './bcra.js';

export interface Snapshot {
  fecha: string;
  registros: Record<string, Consulta>;
}

export interface SnapshotStore {
  dir: string;
  guardar(snapshot: Snapshot, latestSnapshot?: Snapshot): { latestPath: string; archivePath: string };
  leerLatest(): Snapshot | null;
}

export function conservarUltimosValidos(anterior: Snapshot | null, nueva: Snapshot): Snapshot {
  const registros: Record<string, Consulta> = {};
  for (const [cuit, consulta] of Object.entries(nueva.registros)) {
    if (!consulta.ok && anterior?.registros[cuit]?.ok) {
      registros[cuit] = anterior.registros[cuit];
    } else {
      registros[cuit] = consulta;
    }
  }
  return { ...nueva, registros };
}

export function crearStore(dir: string = './snapshots'): SnapshotStore {
  function asegurarDir(): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  function nombreArchivo(fecha: Date): string {
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    const hh = String(fecha.getHours()).padStart(2, '0');
    const mi = String(fecha.getMinutes()).padStart(2, '0');
    const ss = String(fecha.getSeconds()).padStart(2, '0');
    const ms = String(fecha.getMilliseconds()).padStart(3, '0');
    return `${yyyy}-${mm}-${dd}-${hh}${mi}${ss}-${ms}.json`;
  }

  function pathHistoricoUnico(fecha: Date): string {
    const base = nombreArchivo(fecha).replace(/\.json$/, '');
    let candidate = join(dir, `${base}.json`);
    let i = 1;
    while (existsSync(candidate)) {
      candidate = join(dir, `${base}-${i}.json`);
      i += 1;
    }
    return candidate;
  }

  return {
    dir,

    guardar(snapshot: Snapshot, latestSnapshot: Snapshot = snapshot) {
      asegurarDir();
      const fecha = new Date(snapshot.fecha);
      const archivePath = pathHistoricoUnico(fecha);
      const latestPath = join(dir, 'latest.json');
      const payload = JSON.stringify(snapshot, null, 2);
      const latestPayload = JSON.stringify(latestSnapshot, null, 2);
      writeFileSync(archivePath, payload, 'utf8');
      writeFileSync(latestPath, latestPayload, 'utf8');
      return { latestPath, archivePath };
    },

    leerLatest(): Snapshot | null {
      const latestPath = join(dir, 'latest.json');
      if (!existsSync(latestPath)) return null;
      try {
        const raw = readFileSync(latestPath, 'utf8');
        return JSON.parse(raw) as Snapshot;
      } catch {
        return null;
      }
    },
  };
}
