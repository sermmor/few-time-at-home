import { existsSync } from 'fs';
import { startSetupServer } from './setup/setupServer';
import { bootstrapApp }     from './setup/bootstrap';

// Red de seguridad: desde Node 15 una promesa rechazada sin .catch() mata el
// proceso. Un fallo puntual de red (p. ej. ETIMEDOUT hacia api.telegram.org)
// no debe tumbar todo el backend, así que lo registramos y seguimos.
process.on('unhandledRejection', (reason: any) => {
  const code = reason?.code ?? reason?.errno ?? '';
  const msg  = reason?.message ?? String(reason);
  console.error(`> [unhandledRejection] ${code} ${msg}`.replace(/bot\d+:[\w-]+/g, 'bot<token>'));
});

const needsSetup =
  !existsSync('keys.json') || !existsSync('configuration.json');

if (needsSetup) {
  // Primera ejecución: arrancar servidor mínimo de configuración.
  startSetupServer(() => {
    console.log('> Setup complete. Starting application…');
    bootstrapApp();
  });
} else {
  // Configuración ya existente: arranque normal.
  bootstrapApp();
}
