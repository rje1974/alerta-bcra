/**
 * Backend webhook genérico — POST con body JSON.
 *
 * URL examples:
 *   webhook://https://hooks.slack.com/services/T/B/X
 *   webhooks://discord.com/api/webhooks/.../...
 *   https://hooks.slack.com/services/T/B/X        (también soportado directo)
 *
 * Body shape (cubre Slack/Discord/Mattermost/genérico):
 *   {
 *     text: titulo + "\n\n" + cuerpo,
 *     username: "alerta-bcra"
 *   }
 *
 * Para Discord, la API espera `content` en lugar de `text` — detectar y mapear.
 */

import type { ParsedNotifyUrl } from '../config/env.js';
import type { NotifyMessage } from './index.js';

export function resolverEndpoint(parsed: ParsedNotifyUrl): string {
  const { protocol, raw } = parsed;

  if (protocol === 'http' || protocol === 'https') {
    return raw;
  }

  if (protocol === 'webhook') {
    // Forma `webhook://https://...` o `webhook://http://...`
    // El URL parser de Node deja host="https" y pathname="//hooks..."
    // Reparseamos a mano sobre el string crudo.
    const sinPrefijo = raw.replace(/^webhook:\/\//, '');
    if (!/^https?:\/\//.test(sinPrefijo)) {
      throw new Error(
        `webhook:// requiere URL absoluta encadenada (ej webhook://https://...): ${raw}`
      );
    }
    return sinPrefijo;
  }

  if (protocol === 'webhooks') {
    // webhooks://host/path → https://host/path
    const sinPrefijo = raw.replace(/^webhooks:\/\//, '');
    return `https://${sinPrefijo}`;
  }

  throw new Error(`Protocolo no soportado para webhook: ${protocol}`);
}

export function construirPayload(
  endpoint: string,
  message: NotifyMessage
): Record<string, string> {
  const cuerpo = `${message.titulo}\n\n${message.cuerpo}`;
  if (endpoint.toLowerCase().includes('discord')) {
    return { content: cuerpo, username: 'alerta-bcra' };
  }
  return { text: cuerpo, username: 'alerta-bcra' };
}

export async function send(parsed: ParsedNotifyUrl, message: NotifyMessage): Promise<void> {
  const endpoint = resolverEndpoint(parsed);
  const payload = construirPayload(endpoint, message);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`webhook ${endpoint} respondió ${res.status}`);
  }
}
