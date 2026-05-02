#!/usr/bin/env node
/**
 * CLI entry point para alerta-bcra-app.
 *
 * Comandos:
 *   run          → consulta BCRA, calcula diff, notifica, persiste snapshot
 *   list         → muestra CUITs cargados
 *   add <cuit>   → agrega CUIT al archivo activo
 *   remove <cuit> → quita CUIT del archivo activo
 */

import { Command } from 'commander';
import { consultarBCRA } from './core/bcra.js';
import { calcularDiff } from './core/diff.js';
import { renderTextoPlano, renderTitulo } from './core/render.js';
import { crearStore, type Snapshot } from './core/snapshot.js';
import { loadCuits, addCuit, removeCuit } from './config/cuits.js';
import { loadConfig } from './config/env.js';
import { notify } from './notify/index.js';
import { pingHeartbeat } from './heartbeat.js';

const program = new Command();

program
  .name('alerta-bcra-app')
  .description('Monitor de Central de Deudores BCRA')
  .version('0.1.0');

program
  .command('run')
  .description('Consulta BCRA, calcula diff, notifica')
  .option('--dry-run', 'No envía notificación ni guarda snapshot', false)
  .action(async opts => {
    const config = loadConfig();
    const { cuits, source, path } = loadCuits();

    if (cuits.length === 0) {
      console.error('No hay CUITs cargados.');
      console.error('Pegá un archivo cuits.txt en este directorio o usá:');
      console.error('  alerta-bcra-app add <CUIT>');
      process.exit(1);
    }

    console.log(`Cargué ${cuits.length} CUITs desde ${source} (${path})`);
    console.log('Consultando BCRA...');

    const registros: Snapshot['registros'] = {};
    for (const cuit of cuits) {
      process.stdout.write(`  ${cuit} ... `);
      const consulta = await consultarBCRA(cuit, { maxRetries: config.bcraMaxRetries });
      registros[cuit] = consulta;
      if (!consulta.ok) {
        console.log(`error: ${consulta.error}`);
      } else if (consulta.sinRegistros) {
        console.log('limpio');
      } else {
        console.log(`sit. ${consulta.peorSituacion} · ${consulta.cantidadEntidades} entidad(es)`);
      }
    }

    const fecha = new Date().toISOString();
    const nuevoSnapshot: Snapshot = { fecha, registros };

    const store = crearStore(config.snapshotsDir);
    const anterior = store.leerLatest();
    const diff = calcularDiff(anterior, nuevoSnapshot);

    const cuerpo = renderTextoPlano(diff);
    const titulo = renderTitulo(diff);
    console.log('');
    console.log(cuerpo);
    console.log('');

    if (opts.dryRun) {
      console.log('[dry-run] no se guardó snapshot ni se notificó');
      return;
    }

    const { archivePath } = store.guardar(nuevoSnapshot);
    console.log(`Snapshot guardado en ${archivePath}`);

    if (config.notifyUrl) {
      try {
        await notify(config.notifyUrl, { titulo, cuerpo });
        console.log(`Notificación enviada vía ${new URL(config.notifyUrl).protocol}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Error notificando: ${msg}`);
      }
    } else {
      console.log('NOTIFY_URL no seteada — no se notifica.');
    }

    await pingHeartbeat(config.heartbeatUrl);
  });

program
  .command('list')
  .description('Lista los CUITs cargados')
  .action(() => {
    const { cuits, source, path } = loadCuits();
    if (cuits.length === 0) {
      console.log('No hay CUITs cargados.');
      return;
    }
    console.log(`${cuits.length} CUIT(s) desde ${source} (${path}):`);
    cuits.forEach(c => console.log(`  ${c}`));
  });

program
  .command('add <cuit>')
  .description('Agrega un CUIT a la lista')
  .action((cuit: string) => {
    try {
      const { added, path } = addCuit(cuit);
      if (added) {
        console.log(`Agregado a ${path}`);
      } else {
        console.log(`Ya estaba en ${path}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Error: ${msg}`);
      process.exit(1);
    }
  });

program
  .command('remove <cuit>')
  .description('Quita un CUIT de la lista')
  .action((cuit: string) => {
    const { removed, path } = removeCuit(cuit);
    if (removed) {
      console.log(`Quitado de ${path}`);
    } else {
      console.log(`No se encontró en ${path}`);
    }
  });

program.parseAsync(process.argv).catch(err => {
  console.error(err);
  process.exit(1);
});
