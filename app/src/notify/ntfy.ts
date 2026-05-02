/**
 * Backend ntfy.sh / ntfy self-hosted.
 *
 * URL examples:
 *   ntfy://alerta-bcra-x9k2lm5q                  → POST a https://ntfy.sh/alerta-bcra-x9k2lm5q
 *   ntfys://server.ejemplo.com/mi-topic          → POST a https://server.ejemplo.com/mi-topic
 *   ntfy://server.ejemplo.com:8082/mi-topic      → POST a http://server.ejemplo.com:8082/mi-topic
 *
 * Si solo hay path (ntfy://topic), default a host=ntfy.sh.
 */

import type { ParsedNotifyUrl } from '../config/env.js';
import type { NotifyMessage } from './index.js';

/**
 * Detecta si el "host" parseado por URL es realmente un topic.
 *
 * Cuando el usuario escribe `ntfy://mi-topic`, el parser de Node trata
 * `mi-topic` como host con pathname vacío. Lo distinguimos de un host real
 * por la falta de punto (o de puerto) en el host parseado.
 */
function pareceTopicSinHost(host: string, pathname: string): boolean {
  if (pathname && pathname !== '/') return false;
  if (host.includes(':')) return false; // tiene puerto, es host con topic faltante
  if (host.includes('.')) return false; // tiene dominio, es host explícito
  return true;
}

interface DestinoNtfy {
  scheme: 'http' | 'https';
  host: string;
  topic: string;
}

export function resolverDestino(parsed: ParsedNotifyUrl): DestinoNtfy {
  const { url, protocol } = parsed;
  const host = url.host;
  const pathname = url.pathname;

  if (pareceTopicSinHost(host, pathname)) {
    // ntfy://topic → topic con servidor default ntfy.sh
    return { scheme: 'https', host: 'ntfy.sh', topic: host };
  }

  // ntfys → siempre https. ntfy con host explícito → http (LAN/self-hosted típico).
  const scheme: 'http' | 'https' = protocol === 'ntfys' ? 'https' : 'http';

  // El topic es el primer segmento del path. Quitamos slashes extras.
  const topic = pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!topic) {
    throw new Error(`URL ntfy sin topic: ${parsed.raw}`);
  }
  return { scheme, host, topic };
}

export async function send(parsed: ParsedNotifyUrl, message: NotifyMessage): Promise<void> {
  const { scheme, host, topic } = resolverDestino(parsed);
  const endpoint = `${scheme}://${host}/${topic}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Title: message.titulo,
    },
    body: message.cuerpo,
  });

  if (!res.ok) {
    throw new Error(`ntfy ${endpoint} respondió ${res.status}`);
  }
}
