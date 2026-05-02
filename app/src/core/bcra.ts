/**
 * Cliente del Web Service público de la Central de Deudores del BCRA.
 * Endpoint: https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/{identificacion}
 * No requiere autenticación.
 *
 * Doc oficial: https://www.bcra.gob.ar/Catalogo/EstadisticaCentralDeudores.asp
 *
 * Notas sobre montos: la API devuelve montos en miles de pesos.
 * Ej: monto=150.5 significa $150.500.
 */

const BCRA_BASE = 'https://api.bcra.gob.ar/centraldedeudores/v1.0';

export interface Entidad {
  entidad: string;
  situacion: number;
  monto: number;
  diasAtraso: number;
  enRevision: boolean;
  procesoJud: boolean;
}

export interface Periodo {
  periodo: string;
  entidades: Entidad[];
}

export interface ConsultaOK {
  ok: true;
  sinRegistros?: boolean;
  identificacion?: number;
  denominacion?: string;
  peorSituacion: number | null;
  totalDeuda: number;
  cantidadEntidades: number;
  periodos: Periodo[];
  consultadoEn: string;
}

export interface ConsultaError {
  ok: false;
  error: string;
}

export type Consulta = ConsultaOK | ConsultaError;

export interface ConsultarOpts {
  maxRetries?: number;
}

export function normalizarCUIT(cuit: string | number): string {
  return String(cuit).replace(/[-\s]/g, '');
}

export function montoAPesos(montoMiles: number): number {
  return Math.round(montoMiles * 1000);
}

interface BCRARawResponse {
  status?: number;
  results?: {
    identificacion?: number;
    denominacion?: string;
    periodos?: Array<{
      periodo: string;
      entidades?: Array<{
        entidad: string;
        situacion: number;
        monto: number;
        diasAtrasoPago: number;
        enRevision: string;
        procesoJud: string;
      }>;
    }>;
  };
  errorMessages?: unknown;
}

export function parseBCRAResponse(raw: BCRARawResponse): Consulta {
  if (raw.status === 404) {
    return {
      ok: true,
      sinRegistros: true,
      peorSituacion: null,
      totalDeuda: 0,
      cantidadEntidades: 0,
      periodos: [],
      consultadoEn: new Date().toISOString(),
    };
  }
  if (raw.status !== 200 || !raw.results) {
    return {
      ok: false,
      error: `BCRA respondió status ${raw.status}: ${JSON.stringify(raw.errorMessages || raw)}`,
    };
  }

  const r = raw.results;
  const periodos: Periodo[] = (r.periodos || []).map(p => ({
    periodo: p.periodo,
    entidades: (p.entidades || []).map(e => ({
      entidad: e.entidad,
      situacion: e.situacion,
      monto: montoAPesos(e.monto),
      diasAtraso: e.diasAtrasoPago,
      enRevision: e.enRevision === 'S',
      procesoJud: e.procesoJud === 'S',
    })),
  }));

  // BCRA devuelve periodos ordenados descendente — el más reciente es periodos[0]
  const ultimoPeriodo = periodos[0];
  const peorSituacion = ultimoPeriodo
    ? Math.max(...ultimoPeriodo.entidades.map(e => e.situacion), 0) || null
    : null;
  const totalDeuda = ultimoPeriodo
    ? ultimoPeriodo.entidades.reduce((s, e) => s + e.monto, 0)
    : 0;
  const cantidadEntidades = ultimoPeriodo ? ultimoPeriodo.entidades.length : 0;

  return {
    ok: true,
    identificacion: r.identificacion,
    denominacion: r.denominacion,
    peorSituacion,
    totalDeuda,
    cantidadEntidades,
    periodos,
    consultadoEn: new Date().toISOString(),
  };
}

export async function consultarBCRA(
  cuit: string | number,
  opts: ConsultarOpts = {}
): Promise<Consulta> {
  const id = normalizarCUIT(cuit);
  const url = `${BCRA_BASE}/Deudas/${id}`;
  const maxRetries = opts.maxRetries ?? 3;

  for (let intento = 0; intento <= maxRetries; intento++) {
    let raw: BCRARawResponse;
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      raw = await res.json().catch(() => ({ status: res.status }));
      if (!raw.status) raw.status = res.status;
    } catch (err) {
      if (intento < maxRetries) {
        await new Promise(r => setTimeout(r, 2000 * (intento + 1)));
        continue;
      }
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `Error de red al consultar BCRA: ${msg}` };
    }

    // Reintentar en 429 (rate limit) o 5xx (server)
    if (
      (raw.status === 429 || (raw.status! >= 500 && raw.status! < 600)) &&
      intento < maxRetries
    ) {
      await new Promise(r => setTimeout(r, 2000 * (intento + 1)));
      continue;
    }

    return parseBCRAResponse(raw);
  }
  return { ok: false, error: 'Reintentos agotados' };
}
