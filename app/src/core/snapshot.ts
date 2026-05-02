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
  guardar(snapshot: Snapshot): { latestPath: string; archivePath: string };
  leerLatest(): Snapshot | null;
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
    return `${yyyy}-${mm}-${dd}-${hh}${mi}${ss}.json`;
  }

  return {
    dir,

    guardar(snapshot: Snapshot) {
      asegurarDir();
      const fecha = new Date(snapshot.fecha);
      const archivePath = join(dir, nombreArchivo(fecha));
      const latestPath = join(dir, 'latest.json');
      const payload = JSON.stringify(snapshot, null, 2);
      writeFileSync(archivePath, payload, 'utf8');
      writeFileSync(latestPath, payload, 'utf8');
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
