import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validarCUIT, formatearCUIT, normalizarCUIT, addCuit, removeCuit } from '../../src/config/cuits.js';

describe('validarCUIT', () => {
  it('acepta formato con guiones', () => {
    expect(validarCUIT('30-50000076-1')).toBe(true);
  });
  it('acepta formato sin guiones', () => {
    expect(validarCUIT('30500000761')).toBe(true);
  });
  it('rechaza largo incorrecto', () => {
    expect(validarCUIT('123')).toBe(false);
    expect(validarCUIT('123456789012')).toBe(false);
  });
  it('rechaza con letras', () => {
    expect(validarCUIT('30-ABCDEFGH-1')).toBe(false);
  });
});

describe('formatearCUIT', () => {
  it('agrega guiones a CUIT plano', () => {
    expect(formatearCUIT('30500000761')).toBe('30-50000076-1');
  });
  it('idempotente con CUIT formateado', () => {
    expect(formatearCUIT('30-50000076-1')).toBe('30-50000076-1');
  });
});

describe('normalizarCUIT', () => {
  it('quita guiones', () => {
    expect(normalizarCUIT('30-50000076-1')).toBe('30500000761');
  });
});

describe('addCuit/removeCuit con archivo temporal', () => {
  let tmpDir: string;
  let cuitsFile: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'alerta-bcra-test-'));
    cuitsFile = join(tmpDir, 'cuits.txt');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('add a archivo nuevo', () => {
    const r = addCuit('30-50000076-1', cuitsFile);
    expect(r.added).toBe(true);
    const contenido = readFileSync(cuitsFile, 'utf8');
    expect(contenido).toContain('30-50000076-1');
  });

  it('add idempotente', () => {
    addCuit('30-50000076-1', cuitsFile);
    const r = addCuit('30-50000076-1', cuitsFile);
    expect(r.added).toBe(false);
  });

  it('remove de archivo existente', () => {
    writeFileSync(cuitsFile, '30-50000076-1\n33-65517437-9\n');
    const r = removeCuit('30-50000076-1', cuitsFile);
    expect(r.removed).toBe(true);
    const contenido = readFileSync(cuitsFile, 'utf8');
    expect(contenido).not.toContain('30-50000076-1');
    expect(contenido).toContain('33-65517437-9');
  });

  it('remove devuelve false si no existe', () => {
    writeFileSync(cuitsFile, '33-65517437-9\n');
    const r = removeCuit('30-50000076-1', cuitsFile);
    expect(r.removed).toBe(false);
  });

  it('add rechaza CUIT inválido', () => {
    expect(() => addCuit('123', cuitsFile)).toThrow();
  });

  it('loadCuits parsea archivo con comentarios inline después del CUIT', async () => {
    // Regresión: el parser viejo solo reconocía # al inicio de línea
    const cuitsConInline = [
      '# header',
      '30-50000076-1   # BCRA',
      '33-65517437-9 # AFIP',
      '30-50001091-2#sin espacio',
      '',
      '# comentario al final',
    ].join('\n');
    writeFileSync(cuitsFile, cuitsConInline);

    // Trampolín: loadCuits busca en cwd, no soporta path arbitrario.
    // Validamos el parser indirectamente: removeCuit usa parseArchivo internamente.
    const r = removeCuit('30-50000076-1', cuitsFile);
    expect(r.removed).toBe(true);
    const restante = readFileSync(cuitsFile, 'utf8');
    // Las otras 2 entradas con comments inline deben quedar (como líneas, sin tocar)
    expect(restante).toContain('33-65517437-9');
    expect(restante).toContain('30-50001091-2');
  });
});
