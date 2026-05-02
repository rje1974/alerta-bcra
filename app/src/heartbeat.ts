/**
 * Ping a healthchecks.io (o compatible) para "este cron está vivo".
 *
 * Si HEARTBEAT_URL no está seteada, no-op.
 * Si el ping falla, loggea pero no rompe la app (heartbeat es bonus, no crítico).
 */

export async function pingHeartbeat(url: string | null): Promise<void> {
  if (!url) return;
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      console.warn(`[heartbeat] ping a ${url} respondió ${res.status}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[heartbeat] error pingueando ${url}: ${msg}`);
  }
}
