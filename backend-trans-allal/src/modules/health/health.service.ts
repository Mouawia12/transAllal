import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DATA_DOMAINS,
  DEFAULT_API_PREFIX,
} from '../../common/constants/app.constants';
import type { ServiceCommunicationContract } from '../../shared/contracts/communication.contract';

@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService) {}

  getStatus() {
    const appName =
      this.configService.get<string>('app.name') ?? 'Trans Allal API';
    const appEnv = this.configService.get<string>('app.env') ?? 'development';
    const appUrl =
      this.configService.get<string>('app.url') ?? 'http://localhost:3000';
    const apiPrefix =
      this.configService.get<string>('app.apiPrefix') ?? DEFAULT_API_PREFIX;
    const wsNamespace =
      this.configService.get<string>('websocket.namespace') ?? '/tracking';
    const appOrigin = new URL(appUrl);
    const websocketProtocol = appOrigin.protocol === 'https:' ? 'wss:' : 'ws:';

    const communication: ServiceCommunicationContract = {
      apiBaseUrl: `${appUrl}/${apiPrefix}`,
      websocketUrl: `${websocketProtocol}//${appOrigin.host}${wsNamespace}`,
    };

    return {
      status: 'ok' as const,
      service: appName,
      environment: appEnv,
      timestamp: new Date().toISOString(),
      communication,
      dataDomains: DATA_DOMAINS,
    };
  }
}
