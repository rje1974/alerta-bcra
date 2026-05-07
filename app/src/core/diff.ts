/**
 * Compara dos snapshots BCRA y devuelve los cambios significativos.
 *
 * Categorías:
 *   - Nuevos: CUITs con deuda ahora que antes no tenían (o no estaban)
 *   - Empeorados: situación subió (de 1 a 3, etc.)
 *   - Mejorados: situación bajó
 *   - Salieron: CUITs que tenían deuda y ahora 404 (limpios)
 *   - SinCambios: aparecen en ambos sin variación significativa
 */

import type { Consulta, ConsultaOK } from './bcra.js';
import type { Snapshot } from './snapshot.js';

export interface CambioBase {
  cuit: string;
  denominacion?: string;
}

export interface CambioNuevo extends CambioBase {
  tipo: 'NUEVO';
  situacion: number;
  totalDeuda: number;
}

export interface CambioEmpeorado extends CambioBase {
  tipo: 'EMPEORADO';
  situacionAnterior: number | null;
  situacionNueva: number;
  totalDeudaAnterior: number;
  totalDeudaNueva: number;
}

export interface CambioMejorado extends CambioBase {
  tipo: 'MEJORADO';
  situacionAnterior: number;
  situacionNueva: number | null;
  totalDeudaAnterior: number;
  totalDeudaNueva: number;
}

export interface CambioSalido extends CambioBase {
  tipo: 'SALIO';
  situacionAnterior: number;
  totalDeudaAnterior: number;
}

export interface CambioMonto extends CambioBase {
  tipo: 'CAMBIO_MONTO';
  situacion: number;
  totalDeudaAnterior: number;
  totalDeudaNueva: number;
  variacionAbs: number;
  variacionPercent: number | null;
}

export type Cambio = CambioNuevo | CambioEmpeorado | CambioMejorado | CambioSalido | CambioMonto;

export interface DiffOptions {
  debtChangeAbsThreshold?: number;
  debtChangePercentThreshold?: number;
}

export interface DiffResult {
  fechaAnterior: string | null;
  fechaNueva: string;
  nuevos: CambioNuevo[];
  empeorados: CambioEmpeorado[];
  mejorados: CambioMejorado[];
  salieron: CambioSalido[];
  cambiosMonto: CambioMonto[];
  sinCambios: string[];
  errores: { cuit: string; error: string }[];
}

function esOK(c: Consulta): c is ConsultaOK {
  return c.ok === true;
}

function tieneDeuda(c: ConsultaOK): boolean {
  return !c.sinRegistros && c.peorSituacion !== null && c.totalDeuda > 0;
}

export function calcularDiff(anterior: Snapshot | null, nueva: Snapshot): DiffResult {
  return calcularDiffConOpciones(anterior, nueva);
}

export function calcularDiffConOpciones(
  anterior: Snapshot | null,
  nueva: Snapshot,
  options: DiffOptions = {}
): DiffResult {
  const nuevos: CambioNuevo[] = [];
  const empeorados: CambioEmpeorado[] = [];
  const mejorados: CambioMejorado[] = [];
  const salieron: CambioSalido[] = [];
  const cambiosMonto: CambioMonto[] = [];
  const sinCambios: string[] = [];
  const errores: { cuit: string; error: string }[] = [];
  const absThreshold = options.debtChangeAbsThreshold ?? 0;
  const percentThreshold = options.debtChangePercentThreshold ?? 0;

  const cuitsAnt = new Set(Object.keys(anterior?.registros || {}));
  const cuitsNuevos = Object.keys(nueva.registros);

  for (const cuit of cuitsNuevos) {
    const regNuevo = nueva.registros[cuit];
    if (!esOK(regNuevo)) {
      errores.push({ cuit, error: regNuevo.error });
      continue;
    }

    const regAnt = anterior?.registros?.[cuit];
    const teniaDeuda = regAnt && esOK(regAnt) && tieneDeuda(regAnt);
    const tieneDeudaAhora = tieneDeuda(regNuevo);

    // Caso: CUIT nuevo en la lista o no tenía deuda antes y ahora sí
    if (!regAnt || !teniaDeuda) {
      if (tieneDeudaAhora) {
        nuevos.push({
          tipo: 'NUEVO',
          cuit,
          denominacion: regNuevo.denominacion,
          situacion: regNuevo.peorSituacion!,
          totalDeuda: regNuevo.totalDeuda,
        });
      } else {
        sinCambios.push(cuit);
      }
      continue;
    }

    // Caso: tenía deuda y ahora no (salió de la mora)
    const regAntOK = regAnt as ConsultaOK;
    if (!tieneDeudaAhora) {
      salieron.push({
        tipo: 'SALIO',
        cuit,
        denominacion: regNuevo.denominacion || regAntOK.denominacion,
        situacionAnterior: regAntOK.peorSituacion!,
        totalDeudaAnterior: regAntOK.totalDeuda,
      });
      continue;
    }

    // Ambos con deuda — comparar situación
    const sitAnt = regAntOK.peorSituacion!;
    const sitNueva = regNuevo.peorSituacion!;

    if (sitNueva > sitAnt) {
      empeorados.push({
        tipo: 'EMPEORADO',
        cuit,
        denominacion: regNuevo.denominacion,
        situacionAnterior: sitAnt,
        situacionNueva: sitNueva,
        totalDeudaAnterior: regAntOK.totalDeuda,
        totalDeudaNueva: regNuevo.totalDeuda,
      });
    } else if (sitNueva < sitAnt) {
      mejorados.push({
        tipo: 'MEJORADO',
        cuit,
        denominacion: regNuevo.denominacion,
        situacionAnterior: sitAnt,
        situacionNueva: sitNueva,
        totalDeudaAnterior: regAntOK.totalDeuda,
        totalDeudaNueva: regNuevo.totalDeuda,
      });
    } else {
      const variacionAbs = regNuevo.totalDeuda - regAntOK.totalDeuda;
      const variacionPercent = regAntOK.totalDeuda > 0
        ? (variacionAbs / regAntOK.totalDeuda) * 100
        : null;
      const superaAbs = absThreshold > 0 && Math.abs(variacionAbs) >= absThreshold;
      const superaPercent =
        percentThreshold > 0 &&
        variacionPercent !== null &&
        Math.abs(variacionPercent) >= percentThreshold;

      if (superaAbs || superaPercent) {
        cambiosMonto.push({
          tipo: 'CAMBIO_MONTO',
          cuit,
          denominacion: regNuevo.denominacion,
          situacion: sitNueva,
          totalDeudaAnterior: regAntOK.totalDeuda,
          totalDeudaNueva: regNuevo.totalDeuda,
          variacionAbs,
          variacionPercent,
        });
        continue;
      }
      sinCambios.push(cuit);
    }
  }

  // CUITs que estaban antes y ya no — los tratamos como sin cambios
  // (la lista la define el usuario; si los sacó, no es noticia)
  for (const cuit of cuitsAnt) {
    if (!nueva.registros[cuit]) {
      sinCambios.push(cuit);
    }
  }

  return {
    fechaAnterior: anterior?.fecha || null,
    fechaNueva: nueva.fecha,
    nuevos,
    empeorados,
    mejorados,
    salieron,
    cambiosMonto,
    sinCambios,
    errores,
  };
}
