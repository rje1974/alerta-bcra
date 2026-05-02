/**
 * Backend SMTP / mailto.
 *
 * URL examples:
 *   smtp://user:pass@smtp.gmail.com:587?to=destino@bar.com&from=remitente@foo.com
 *   smtps://user:pass@smtp.fastmail.com:465?to=destino@bar.com
 *   mailto://user:pass@smtp.gmail.com?to=destino@bar.com
 *
 * Para Gmail: requiere App Password (con 2FA activado).
 */

import nodemailer from 'nodemailer';
import type { ParsedNotifyUrl } from '../config/env.js';
import type { NotifyMessage } from './index.js';

export interface OpcionesSmtp {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
  from: string;
  to: string;
}

export function parsearOpciones(parsed: ParsedNotifyUrl): OpcionesSmtp {
  const { url, protocol } = parsed;
  const params = url.searchParams;

  const to = params.get('to');
  if (!to) {
    throw new Error(`URL SMTP sin destinatario (?to=...): ${parsed.raw}`);
  }
  if (!url.hostname) {
    throw new Error(`URL SMTP sin host: ${parsed.raw}`);
  }
  if (!url.username) {
    throw new Error(`URL SMTP sin usuario: ${parsed.raw}`);
  }

  const secure = protocol === 'smtps';
  const port = url.port ? parseInt(url.port, 10) : secure ? 465 : 587;

  const user = decodeURIComponent(url.username);
  const pass = decodeURIComponent(url.password);
  const from = params.get('from') || user;

  return {
    host: url.hostname,
    port,
    secure,
    auth: { user, pass },
    from,
    to,
  };
}

export async function send(parsed: ParsedNotifyUrl, message: NotifyMessage): Promise<void> {
  const opts = parsearOpciones(parsed);

  const transporter = nodemailer.createTransport({
    host: opts.host,
    port: opts.port,
    secure: opts.secure,
    auth: opts.auth,
  });

  await transporter.sendMail({
    from: opts.from,
    to: opts.to,
    subject: message.titulo,
    text: message.cuerpo,
  });
}
