import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  send,
  resolverEndpoint,
  construirPayload,
} from '../../src/notify/mattermost.js';
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
  it('mattermost:// → http (LAN HTTP)', () => {
    const url = resolverEndpoint(parseNotifyUrl('mattermost://192.168.1.50:8065/hooks/abc'));
    expect(url).toBe('http://192.168.1.50:8065/hooks/abc');
  });

  it('mattermosts:// → https (cloud)', () => {
    const url = resolverEndpoint(
      parseNotifyUrl('mattermosts://workspace.mattermost.com/hooks/xyz')
    );
    expect(url).toBe('https://workspace.mattermost.com/hooks/xyz');
  });

  it('error si falta path al webhook', () => {
    expect(() =>
      resolverEndpoint(parseNotifyUrl('mattermost://192.168.1.50:8065'))
    ).toThrow(/path/);
  });
});

describe('construirPayload', () => {
  it('texto formateado en markdown bold + body username default', () => {
    const payload = construirPayload(parseNotifyUrl('mattermost://x/hooks/abc'), {
      titulo: 'alerta-bcra · +1',
      cuerpo: 'Detalle',
    });
    expect(payload).toEqual({
      text: '**alerta-bcra · +1**\n\nDetalle',
      username: 'alerta-bcra',
    });
  });

  it('respeta username, channel, icon_url de la querystring', () => {
    const payload = construirPayload(
      parseNotifyUrl(
        'mattermost://x/hooks/abc?username=bot&channel=town-square&icon_url=https://x/y.png'
      ),
      { titulo: 't', cuerpo: 'c' }
    );
    expect(payload).toMatchObject({
      username: 'bot',
      channel: 'town-square',
      icon_url: 'https://x/y.png',
    });
  });
});

describe('send (mattermost)', () => {
  it('POST JSON al endpoint LAN HTTP correcto', async () => {
    await send(parseNotifyUrl('mattermost://192.168.1.50:8065/hooks/abc'), {
      titulo: 'titulo',
      cuerpo: 'cuerpo',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://192.168.1.50:8065/hooks/abc');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
    const body = JSON.parse(init.body);
    expect(body.text).toContain('**titulo**');
    expect(body.text).toContain('cuerpo');
    expect(body.username).toBe('alerta-bcra');
  });

  it('tira error si server responde no-2xx', async () => {
    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 401 }));
    await expect(
      send(parseNotifyUrl('mattermosts://x/hooks/y'), { titulo: 't', cuerpo: 'c' })
    ).rejects.toThrow(/401/);
  });
});
