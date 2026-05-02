import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { send, resolverDestino } from '../../src/notify/ntfy.js';
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

describe('resolverDestino', () => {
  it('ntfy://topic → https://ntfy.sh/topic', () => {
    const dest = resolverDestino(parseNotifyUrl('ntfy://alerta-bcra-x9k2lm5q'));
    expect(dest).toEqual({
      scheme: 'https',
      host: 'ntfy.sh',
      topic: 'alerta-bcra-x9k2lm5q',
    });
  });

  it('ntfys://server.example.com/topic → https con host explícito', () => {
    const dest = resolverDestino(parseNotifyUrl('ntfys://server.example.com/mi-topic'));
    expect(dest).toEqual({
      scheme: 'https',
      host: 'server.example.com',
      topic: 'mi-topic',
    });
  });

  it('ntfy://server.example.com:8082/topic → http con puerto', () => {
    const dest = resolverDestino(parseNotifyUrl('ntfy://server.example.com:8082/mi-topic'));
    expect(dest).toEqual({
      scheme: 'http',
      host: 'server.example.com:8082',
      topic: 'mi-topic',
    });
  });
});

describe('send (ntfy)', () => {
  it('hace POST a ntfy.sh con body=cuerpo y header Title=titulo', async () => {
    await send(parseNotifyUrl('ntfy://alerta-bcra-x9k2lm5q'), {
      titulo: 'alerta-bcra · +1',
      cuerpo: 'Cuerpo del mensaje',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://ntfy.sh/alerta-bcra-x9k2lm5q');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ Title: 'alerta-bcra · +1' });
    expect(init.body).toBe('Cuerpo del mensaje');
  });

  it('ntfys self-hosted manda a https + host + topic', async () => {
    await send(parseNotifyUrl('ntfys://my.ntfy.example.com/foo'), {
      titulo: 't',
      cuerpo: 'c',
    });
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://my.ntfy.example.com/foo');
  });

  it('ntfy con host+puerto LAN usa http', async () => {
    await send(parseNotifyUrl('ntfy://192.168.1.10:8082/foo'), {
      titulo: 't',
      cuerpo: 'c',
    });
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('http://192.168.1.10:8082/foo');
  });

  it('tira error si endpoint responde no-2xx', async () => {
    fetchMock.mockResolvedValueOnce(new Response('no', { status: 500 }));
    await expect(
      send(parseNotifyUrl('ntfy://topic1'), { titulo: 't', cuerpo: 'c' })
    ).rejects.toThrow(/500/);
  });
});
