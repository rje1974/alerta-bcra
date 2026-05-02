/**
 * Lee variables de entorno relevantes y devuelve la configuración parseada.
 */

export interface AppConfig {
  notifyUrl: string | null;
  heartbeatUrl: string | null;
  snapshotsDir: string;
  bcraMaxRetries: number;
}

const DEFAULTS: AppConfig = {
  notifyUrl: null,
  heartbeatUrl: null,
  snapshotsDir: './snapshots',
  bcraMaxRetries: 3,
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    notifyUrl: env.NOTIFY_URL?.trim() || DEFAULTS.notifyUrl,
    heartbeatUrl: env.HEARTBEAT_URL?.trim() || DEFAULTS.heartbeatUrl,
    snapshotsDir: env.SNAPSHOTS_DIR?.trim() || DEFAULTS.snapshotsDir,
    bcraMaxRetries: env.BCRA_MAX_RETRIES ? parseInt(env.BCRA_MAX_RETRIES, 10) : DEFAULTS.bcraMaxRetries,
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
