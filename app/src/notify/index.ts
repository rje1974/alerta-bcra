/**
 * Dispatcher de notificaciones según protocolo de NOTIFY_URL.
 *
 * Soporta:
 *   ntfy://, ntfys://       → ntfy.ts
 *   mattermost://, mattermosts:// → mattermost.ts
 *   smtp://, mailto://      → smtp.ts
 *   webhook://, http(s)://  → webhook.ts
 *
 * Cada backend exporta `send(parsed, message)`.
 */

import { parseNotifyUrl, type ParsedNotifyUrl } from '../config/env.js';
import { send as sendNtfy } from './ntfy.js';
import { send as sendMattermost } from './mattermost.js';
import { send as sendSmtp } from './smtp.js';
import { send as sendWebhook } from './webhook.js';

export interface NotifyMessage {
  titulo: string;
  cuerpo: string;
}

export type Backend = (parsed: ParsedNotifyUrl, message: NotifyMessage) => Promise<void>;

const BACKENDS: Record<string, Backend> = {
  ntfy: sendNtfy,
  ntfys: sendNtfy,
  mattermost: sendMattermost,
  mattermosts: sendMattermost,
  smtp: sendSmtp,
  smtps: sendSmtp,
  mailto: sendSmtp,
  webhook: sendWebhook,
  webhooks: sendWebhook,
  http: sendWebhook,
  https: sendWebhook,
};

export async function notify(notifyUrl: string, message: NotifyMessage): Promise<void> {
  const parsed = parseNotifyUrl(notifyUrl);
  const backend = BACKENDS[parsed.protocol];
  if (!backend) {
    throw new Error(`Protocolo de notificación no soportado: ${parsed.protocol}`);
  }
  await backend(parsed, message);
}
