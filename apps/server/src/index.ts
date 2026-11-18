import { BRAND_NAME } from '@rollhouse/shared';
import { createGameServer } from './app';
import { loadConfig } from './config';
import { openDatabase, recordBoot } from './db';

const config = loadConfig();
const db = openDatabase(config.dataDir);
const boots = recordBoot(db, config.gitSha, config.version);
const server = createGameServer(config);

server.onShutdown(() => {
  db.close();
  console.log(`${BRAND_NAME}: shut down cleanly`);
});

function failToListen(err: unknown): never {
  console.error(`${BRAND_NAME}: failed to listen on :${config.port}`, err);
  process.exit(1);
}

// Colyseus only wires up the HTTP server's error handler after a successful
// listen, so catch bind errors (e.g. EADDRINUSE) ourselves.
(server.transport as unknown as { server?: NodeJS.EventEmitter }).server?.once(
  'error',
  failToListen,
);
await server.listen(config.port).catch(failToListen);
console.log(
  `${BRAND_NAME} ${config.version} (${config.gitSha}) listening on :${config.port}, base URL ${config.baseUrl}, boot #${boots}`,
);
