import ConfigData from '../../configuration.json';

const BASE_URL = `http://${ConfigData.ip}:${ConfigData.port}`;

export interface SetupWizardData {
  cloudRootPath:     string;
  connectToTelegram: boolean;
  telegramBotToken:  string;
  telegramUsername:  string;
  telegramTokenPass: string;
}

export const SetupActions = {
  checkStatus: (): Promise<{ needsSetup: boolean }> =>
    fetch(`${BASE_URL}/setup/status`, {
      signal: AbortSignal.timeout(3000),
    })
      .then(r => r.json())
      .catch(() => ({ needsSetup: false })),

  complete: (data: SetupWizardData): Promise<{ success: boolean; error?: string }> =>
    fetch(`${BASE_URL}/setup/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json()),
};
