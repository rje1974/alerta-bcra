/**
 * Backend Mattermost (incoming webhook).
 *
 * URL examples (importante soportar HTTP + puerto custom para LAN/ZeroTier):
 *   mattermost://192.168.1.50:8065/hooks/abc123     → http://...
 *   mattermosts://workspace.mattermost.com/hooks/xyz → https://...
 *   mattermost://server/hooks/abc?channel=town-square&username=alerta-bcra
 *
 * Body: { text, username?, icon_url?, channel? }
 */

import type { ParsedNotifyUrl } from '../config/env.js';
import type { NotifyMessage } from './index.js';

interface PayloadMattermost {
  text: string;
  username: string;
  channel?: string;
  icon_url?: string;
}

export function construirPayload(
  parsed: ParsedNotifyUrl,
  message: NotifyMessage
): PayloadMattermost {
  const params = parsed.url.searchParams;
  const payload: PayloadMattermost = {
    text: `**${message.titulo}**\n\n${message.cuerpo}`,
    username: params.get('username') || 'alerta-bcra',
  };
  const channel = params.get('channel');
  if (channel) payload.channel = channel;
  const iconUrl = params.get('icon_url');
  if (iconUrl) payload.icon_url = iconUrl;
  return payload;
}

export function resolverEndpoint(parsed: ParsedNotifyUrl): string {
  const scheme = parsed.protocol === 'mattermosts' ? 'https' : 'http';
  const host = parsed.url.host;
  if (!host) {
    throw new Error(`URL Mattermost sin host: ${parsed.raw}`);
  }
  const pathname = parsed.url.pathname;
  if (!pathname || pathname === '/') {
    throw new Error(`URL Mattermost sin path al webhook (ej /hooks/abc): ${parsed.raw}`);
  }
  return `${scheme}://${host}${pathname}`;
}

export async function send(parsed: ParsedNotifyUrl, message: NotifyMessage): Promise<void> {
  const endpoint = resolverEndpoint(parsed);
  const payload = construirPayload(parsed, message);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Mattermost ${endpoint} respondió ${res.status}`);
  }
}
