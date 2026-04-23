import { existsSync } from 'fs';
import { startSetupServer } from './setup/setupServer';
import { bootstrapApp }     from './setup/bootstrap';

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
