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
import { calcularDiffConOpciones } from './core/diff.js';
import { renderTextoPlano, renderTitulo } from './core/render.js';
import { conservarUltimosValidos, crearStore, type Snapshot } from './core/snapshot.js';
import { loadCuits, addCuit, removeCuit } from './config/cuits.js';
import { loadConfig, loadEnvFile } from './config/env.js';
import { notify } from './notify/index.js';
import { pingHeartbeat } from './heartbeat.js';

loadEnvFile();

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

    const store = crearStore(config.snapshotsDir);
    const anterior = store.leerLatest();
    const registros: Snapshot['registros'] = {};
    const errores: string[] = [];
    for (const cuit of cuits) {
      process.stdout.write(`  ${cuit} ... `);
      const consulta = await consultarBCRA(cuit, { maxRetries: config.bcraMaxRetries });
      if (!consulta.ok) {
        errores.push(cuit);
        registros[cuit] = consulta;
        console.log(`error: ${consulta.error}`);
        if (anterior?.registros[cuit]?.ok) {
          console.log('    se conserva el último dato válido para latest.json');
        }
      } else if (consulta.sinRegistros) {
        registros[cuit] = consulta;
        console.log('limpio');
      } else {
        registros[cuit] = consulta;
        console.log(`sit. ${consulta.peorSituacion} · ${consulta.cantidadEntidades} entidad(es)`);
      }
    }

    const fecha = new Date().toISOString();
    const snapshotConsultado: Snapshot = { fecha, registros };
    const nuevoSnapshot = conservarUltimosValidos(anterior, snapshotConsultado);

    const diff = calcularDiffConOpciones(anterior, nuevoSnapshot, {
      debtChangeAbsThreshold: config.debtChangeAbsThreshold,
      debtChangePercentThreshold: config.debtChangePercentThreshold,
    });
    for (const cuit of errores) {
      const actual = nuevoSnapshot.registros[cuit];
      if (actual?.ok) {
        diff.errores.push({ cuit, error: 'Consulta falló; se conservó el último dato válido' });
      }
    }

    const cuerpo = renderTextoPlano(diff);
    const titulo = renderTitulo(diff);
    console.log('');
    console.log(cuerpo);
    console.log('');

    if (opts.dryRun) {
      console.log('[dry-run] no se guardó snapshot ni se notificó');
      return;
    }

    const { archivePath } = store.guardar(snapshotConsultado, nuevoSnapshot);
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
