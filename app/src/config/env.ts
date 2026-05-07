/**
 * Lee variables de entorno relevantes y devuelve la configuración parseada.
 */

import { config as loadDotenv } from 'dotenv';

export interface AppConfig {
  notifyUrl: string | null;
  heartbeatUrl: string | null;
  snapshotsDir: string;
  bcraMaxRetries: number;
  debtChangeAbsThreshold: number;
  debtChangePercentThreshold: number;
}

const DEFAULTS: AppConfig = {
  notifyUrl: null,
  heartbeatUrl: null,
  snapshotsDir: './snapshots',
  bcraMaxRetries: 3,
  debtChangeAbsThreshold: 0,
  debtChangePercentThreshold: 0,
};

export function loadEnvFile(): void {
  loadDotenv({ quiet: true });
}

function parseNonNegativeInt(value: string | undefined, name: string, fallback: number): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} debe ser un entero >= 0; recibido: ${value}`);
  }
  return parsed;
}

function parseNonNegativeNumber(value: string | undefined, name: string, fallback: number): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} debe ser un número >= 0; recibido: ${value}`);
  }
  return parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    notifyUrl: env.NOTIFY_URL?.trim() || DEFAULTS.notifyUrl,
    heartbeatUrl: env.HEARTBEAT_URL?.trim() || DEFAULTS.heartbeatUrl,
    snapshotsDir: env.SNAPSHOTS_DIR?.trim() || DEFAULTS.snapshotsDir,
    bcraMaxRetries: parseNonNegativeInt(env.BCRA_MAX_RETRIES, 'BCRA_MAX_RETRIES', DEFAULTS.bcraMaxRetries),
    debtChangeAbsThreshold: parseNonNegativeNumber(
      env.DEBT_CHANGE_ABS_THRESHOLD,
      'DEBT_CHANGE_ABS_THRESHOLD',
      DEFAULTS.debtChangeAbsThreshold
    ),
    debtChangePercentThreshold: parseNonNegativeNumber(
      env.DEBT_CHANGE_PERCENT_THRESHOLD,
      'DEBT_CHANGE_PERCENT_THRESHOLD',
      DEFAULTS.debtChangePercentThreshold
    ),
  };
}

export interface ParsedNotifyUrl {
  protocol: string;
  raw: string;
  url: URL;
}

export function parseNotifyUrl(raw: string): ParsedNotifyUrl {
  // Normalizamos protocolos custom para que `URL` los pueda parsear
  const url = new URL(raw);
  const protocol = url.protocol.replace(/:$/, '');
  return { protocol, raw, url };
}
