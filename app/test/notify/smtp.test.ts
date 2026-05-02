import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseNotifyUrl } from '../../src/config/env.js';

const { sendMailMock, createTransportMock } = vi.hoisted(() => {
  const sendMailMock = vi.fn();
  const createTransportMock = vi.fn();
  return { sendMailMock, createTransportMock };
});

vi.mock('nodemailer', () => ({
  default: { createTransport: createTransportMock },
}));

import { send, parsearOpciones } from '../../src/notify/smtp.js';

beforeEach(() => {
  sendMailMock.mockReset();
  sendMailMock.mockResolvedValue({ messageId: 'fake-id' });
  createTransportMock.mockReset();
  createTransportMock.mockReturnValue({ sendMail: sendMailMock });
});

describe('parsearOpciones', () => {
  it('smtp:// → secure=false, port default 587', () => {
    const opts = parsearOpciones(
      parseNotifyUrl('smtp://user:pass@smtp.gmail.com?to=destino@bar.com')
    );
    expect(opts).toMatchObject({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: 'user', pass: 'pass' },
      to: 'destino@bar.com',
      from: 'user',
    });
  });

  it('smtps:// → secure=true, port default 465', () => {
    const opts = parsearOpciones(
      parseNotifyUrl('smtps://user:pass@smtp.fastmail.com?to=destino@bar.com')
    );
    expect(opts).toMatchObject({
      host: 'smtp.fastmail.com',
      port: 465,
      secure: true,
    });
  });

  it('puerto explícito en URL respetado', () => {
    const opts = parsearOpciones(
      parseNotifyUrl('smtp://u:p@smtp.gmail.com:2525?to=x@y.com')
    );
    expect(opts.port).toBe(2525);
  });

  it('?from= override', () => {
    const opts = parsearOpciones(
      parseNotifyUrl('smtp://u:p@smtp.gmail.com:587?to=x@y.com&from=custom@y.com')
    );
    expect(opts.from).toBe('custom@y.com');
  });

  it('error si falta ?to=', () => {
    expect(() =>
      parsearOpciones(parseNotifyUrl('smtp://u:p@smtp.gmail.com:587'))
    ).toThrow(/destinatario/);
  });

  it('error si falta usuario', () => {
    expect(() =>
      parsearOpciones(parseNotifyUrl('smtp://smtp.gmail.com:587?to=x@y.com'))
    ).toThrow(/usuario/);
  });
});

describe('send (smtp)', () => {
  it('crea transporter correcto y manda email', async () => {
    await send(
      parseNotifyUrl('smtps://user:pass@smtp.gmail.com:465?to=destino@bar.com'),
      { titulo: 'Asunto', cuerpo: 'Cuerpo del mail' }
    );
    expect(createTransportMock).toHaveBeenCalledOnce();
    const transportArgs = createTransportMock.mock.calls[0][0];
    expect(transportArgs).toMatchObject({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: 'user', pass: 'pass' },
    });
    expect(sendMailMock).toHaveBeenCalledOnce();
    const mailArgs = sendMailMock.mock.calls[0][0];
    expect(mailArgs).toMatchObject({
      to: 'destino@bar.com',
      subject: 'Asunto',
      text: 'Cuerpo del mail',
    });
  });

  it('propaga error de nodemailer', async () => {
    sendMailMock.mockRejectedValueOnce(new Error('SMTP rechazado'));
    await expect(
      send(parseNotifyUrl('smtp://u:p@host:587?to=x@y.com'), {
        titulo: 't',
        cuerpo: 'c',
      })
    ).rejects.toThrow(/SMTP rechazado/);
  });
});
