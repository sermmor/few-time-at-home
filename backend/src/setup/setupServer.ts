import express from 'express';
import * as http from 'http';
import { createSetupFiles, SetupWizardData } from './setupFileCreator';

const cors = require('cors');

// Puerto fijo para el modo setup — debe coincidir con el puerto por defecto
// de frontend/src/configuration.json (3001).
const SETUP_PORT = 3001;

export const startSetupServer = (onBootstrap: () => void): void => {
  const app = express();
  app.use(express.json());
  app.use(cors());

  // El frontend usa este endpoint para saber si ya arrancó el backend real.
  // Durante el setup devolvemos false para que el loading screen siga esperando.
  app.get('/ready', (_req, res) => {
    res.json({ ready: false });
  });

  // El frontend consulta este endpoint nada más cargar.
  app.get('/setup/status', (_req, res) => {
    res.json({ needsSetup: true });
  });

  // El wizard envía los datos aquí cuando el usuario pulsa "Instalar".
  app.post('/setup/complete', (req, res) => {
    try {
      createSetupFiles(req.body as SetupWizardData);
      res.json({ success: true });

      // Cerramos el servidor de setup y arrancamos la app real.
      // Pequeño retardo para que la respuesta llegue al frontend antes de que
      // la conexión se corte.
      setTimeout(() => {
        if ((server as any).closeAllConnections) {
          (server as any).closeAllConnections();
        }
        server.close(() => {
          console.log('> Setup server closed. Bootstrapping application…');
          onBootstrap();
        });
      }, 600);
    } catch (err) {
      console.error('Setup error:', err);
      res.status(500).json({ error: String(err) });
    }
  });

  const server: http.Server = app.listen(SETUP_PORT, () => {
    console.log(`> ⚙️  Setup mode active — listening on port ${SETUP_PORT}`);
    console.log('> Open the frontend to complete the initial configuration.');
  });
};
