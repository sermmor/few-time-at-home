export class ConfigurationService {
  static Instance: ConfigurationService;
  constructor(public ip: string, public port: number, public webSocketPort: number, public isUsingMocks: boolean) { ConfigurationService.Instance = this; }
}