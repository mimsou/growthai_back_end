import { ConfigService } from '@nestjs/config';
import { getBooleanConfig, getNumberConfig } from '../utils/config-helpers';

export class HttpHeaderConfig {
  constructor(private configService: ConfigService) {}

  getConfig() {
    return {
      // Add these lines to the existing config
      xRobotsTagEnabled: getBooleanConfig(this.configService, 'X_ROBOTS_TAG_ENABLED', true),
      xRobotsTagMaxLength: getNumberConfig(this.configService, 'X_ROBOTS_TAG_MAX_LENGTH', 1000),
    };
  }
}
