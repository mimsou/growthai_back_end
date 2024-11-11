import { ConfigService } from '@nestjs/config';
import { getNumberConfig } from '../utils/config-helpers';

export class RateLimitConfig {
  constructor(private configService: ConfigService) {}

  getConfig() {
    return {
      bucketCapacity: getNumberConfig(this.configService, 'RATE_LIMITER_BUCKET_CAPACITY', 60),
      refillRate: getNumberConfig(this.configService, 'RATE_LIMITER_REFILL_RATE', 1),
      enabled: getNumberConfig(this.configService, 'RATE_LIMITER_ENABLED', 1),
    };
  }
}
