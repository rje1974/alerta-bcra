import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  send,
  resolverEndpoint,
  construirPayload,
} from '../../src/notify/webhook.js';
import { parseNotifyUrl } from '../../src/config/env.js';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response('ok', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolverEndpoint', () => {
  it('http(s):// directo se usa tal cual', () => {
    const url = resolverEndpoint(parseNotifyUrl('https://hooks.slack.com/services/T/B/X'));
    expect(url).toBe('https://hooks.slack.com/services/T/B/X');
  });

  it('webhook://https://... saca el prefijo', () => {
    const url = resolverEndpoint(
      parseNotifyUrl('webhook://https://hooks.slack.com/services/T/B/X')
    );
    expect(url).toBe('https://hooks.slack.com/services/T/B/X');
  });

  it('webhooks://host/path → https://host/path', () => {
    const url = resolverEndpoint(
      parseNotifyUrl('webhooks://discord.com/api/webhooks/x/y')
    );
    expect(url).toBe('https://discord.com/api/webhooks/x/y');
  });

  it('webhook:// sin URL absoluta encadenada → error claro', () => {
    expect(() =>
      resolverEndpoint(parseNotifyUrl('webhook://nada-ni-http'))
    ).toThrow(/URL absoluta/);
  });
});

describe('construirPayload', () => {
  it('default usa key text', () => {
    const p = construirPayload('https://hooks.slack.com/services/T/B/X', {
      titulo: 't',
      cuerpo: 'c',
    });
    expect(p).toEqual({ text: 't\n\nc', username: 'alerta-bcra' });
  });

  it('si endpoint contiene "discord" usa key content', () => {
    const p = construirPayload('https://discord.com/api/webhooks/x/y', {
      titulo: 't',
      cuerpo: 'c',
    });
    expect(p).toEqual({ content: 't\n\nc', username: 'alerta-bcra' });
  });

  it('detección discord es case-insensitive', () => {
    const p = construirPayload('https://DISCORD.com/api/x', { titulo: 't', cuerpo: 'c' });
    expect(p.content).toBeDefined();
  });
});

describe('send (webhook)', () => {
  it('Slack: POST a la URL https tal cual', async () => {
    await send(parseNotifyUrl('webhook://https://hooks.slack.com/services/T/B/X'), {
      titulo: 'titulo',
      cuerpo: 'cuerpo',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://hooks.slack.com/services/T/B/X');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
    const body = JSON.parse(init.body);
    expect(body).toEqual({ text: 'titulo\n\ncuerpo', username: 'alerta-bcra' });
  });

  it('Discord: usa key content y endpoint correcto', async () => {
    await send(parseNotifyUrl('webhooks://discord.com/api/webhooks/x/y'), {
      titulo: 'titulo',
      cuerpo: 'cuerpo',
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://discord.com/api/webhooks/x/y');
    const body = JSON.parse(init.body);
    expect(body.content).toBe('titulo\n\ncuerpo');
    expect(body.text).toBeUndefined();
  });

  it('tira error si webhook responde no-2xx', async () => {
    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 502 }));
    await expect(
      send(parseNotifyUrl('https://hooks.slack.com/services/T/B/X'), {
        titulo: 't',
        cuerpo: 'c',
      })
    ).rejects.toThrow(/502/);
  });
});
