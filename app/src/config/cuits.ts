/**
 * Carga y manipula la lista de CUITs desde un archivo de texto.
 *
 * Lookup en orden:
 *   1. ./cuits.txt (proyecto actual)
 *   2. ~/.alerta-bcra/cuits.txt
 *
 * Formato:
 *   - Una CUIT por línea (formato XX-XXXXXXXX-X o sin guiones)
 *   - Líneas que empiezan con # son comentarios
 *   - Líneas vacías ignoradas
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';

const HOME_PATH = join(homedir(), '.alerta-bcra', 'cuits.txt');
const PROJECT_PATH = resolve(process.cwd(), 'cuits.txt');

export interface CuitsLoad {
  cuits: string[];
  source: 'project' | 'home' | 'none';
  path: string | null;
}

const CUIT_REGEX = /^\d{2}-?\d{8}-?\d{1}$/;

export function validarCUIT(cuit: string): boolean {
  return CUIT_REGEX.test(cuit.trim());
}

export function normalizarCUIT(cuit: string): string {
  return cuit.replace(/[-\s]/g, '');
}

export function formatearCUIT(cuit: string): string {
  const norm = normalizarCUIT(cuit);
  if (norm.length !== 11) return cuit;
  return `${norm.slice(0, 2)}-${norm.slice(2, 10)}-${norm.slice(10)}`;
}

function parseArchivo(contenido: string): string[] {
  return contenido
    .split('\n')
    .map(l => l.split('#')[0].trim())
    .filter(l => l)
    .filter(l => validarCUIT(l))
    .map(formatearCUIT);
}

export function loadCuits(): CuitsLoad {
  if (existsSync(PROJECT_PATH)) {
    const contenido = readFileSync(PROJECT_PATH, 'utf8');
    return { cuits: parseArchivo(contenido), source: 'project', path: PROJECT_PATH };
  }
  if (existsSync(HOME_PATH)) {
    const contenido = readFileSync(HOME_PATH, 'utf8');
    return { cuits: parseArchivo(contenido), source: 'home', path: HOME_PATH };
  }
  return { cuits: [], source: 'none', path: null };
}

function archivoActivo(): string {
  if (existsSync(PROJECT_PATH)) return PROJECT_PATH;
  return HOME_PATH;
}

function asegurarDir(path: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function addCuit(cuit: string, target?: string): { added: boolean; path: string } {
  if (!validarCUIT(cuit)) {
    throw new Error(`CUIT inválido: ${cuit}`);
  }
  const path = target || archivoActivo();
  asegurarDir(path);
  const norm = formatearCUIT(cuit);

  let contenido = '';
  if (existsSync(path)) {
    contenido = readFileSync(path, 'utf8');
    const existentes = parseArchivo(contenido);
    if (existentes.includes(norm)) {
      return { added: false, path };
    }
  }
  const sufijo = contenido.length > 0 && !contenido.endsWith('\n') ? '\n' : '';
  writeFileSync(path, contenido + sufijo + norm + '\n', 'utf8');
  return { added: true, path };
}

export function removeCuit(cuit: string, target?: string): { removed: boolean; path: string } {
  const path = target || archivoActivo();
  if (!existsSync(path)) {
    return { removed: false, path };
  }
  const norm = formatearCUIT(cuit);
  const contenido = readFileSync(path, 'utf8');
  const lineas = contenido.split('\n');
  const filtradas = lineas.filter(l => {
    const sinComment = l.split('#')[0].trim();
    if (!sinComment) return true; // mantener vacías y líneas de comentario puro
    if (!validarCUIT(sinComment)) return true;
    return formatearCUIT(sinComment) !== norm;
  });
  if (filtradas.length === lineas.length) {
    return { removed: false, path };
  }
  writeFileSync(path, filtradas.join('\n'), 'utf8');
  return { removed: true, path };
}
