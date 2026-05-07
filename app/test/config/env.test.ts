import { describe, it, expect } from 'vitest';
import { loadConfig } from '../../src/config/env.js';

describe('loadConfig', () => {
  it('usa defaults cuando no hay env', () => {
    expect(loadConfig({})).toMatchObject({
      notifyUrl: null,
      heartbeatUrl: null,
      snapshotsDir: './snapshots',
      bcraMaxRetries: 3,
      debtChangeAbsThreshold: 0,
      debtChangePercentThreshold: 0,
    });
  });

  it('parsea umbrales de cambio de deuda', () => {
    const config = loadConfig({
      DEBT_CHANGE_ABS_THRESHOLD: '100000',
      DEBT_CHANGE_PERCENT_THRESHOLD: '25',
    });
    expect(config.debtChangeAbsThreshold).toBe(100000);
    expect(config.debtChangePercentThreshold).toBe(25);
  });

  it('rechaza BCRA_MAX_RETRIES inválido', () => {
    expect(() => loadConfig({ BCRA_MAX_RETRIES: 'foo' })).toThrow(/BCRA_MAX_RETRIES/);
    expect(() => loadConfig({ BCRA_MAX_RETRIES: '-1' })).toThrow(/BCRA_MAX_RETRIES/);
  });
});
