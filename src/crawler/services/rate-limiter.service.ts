import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimitExceededException } from '../exceptions/crawler.exceptions';

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private tokens: number;
  private lastRefillTimestamp: number;
  private readonly bucketCapacity: number;
  private readonly refillRate: number;

  constructor(private configService: ConfigService) {
    this.bucketCapacity = this.configService.get<number>('RATE_LIMITER_BUCKET_CAPACITY', 60);
    this.refillRate = this.configService.get<number>('RATE_LIMITER_REFILL_RATE', 1); // tokens per second
    this.tokens = this.bucketCapacity;
    this.lastRefillTimestamp = Date.now();
  }

  async acquire(): Promise<boolean> {
    this.refillTokens();

    if (this.tokens > 0) {
      this.tokens--;
      this.logger.debug(`Token acquired. Remaining tokens: ${this.tokens}`);
      return true;
    }

    this.logger.warn('Rate limit exceeded. Waiting for token refill.');
    throw new RateLimitExceededException('Rate limit exceeded');
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefillTimestamp) / 1000; // Convert to seconds
    const tokensToAdd = Math.floor(timePassed * this.refillRate);

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.bucketCapacity, this.tokens + tokensToAdd);
      this.lastRefillTimestamp = now;
      this.logger.debug(`Refilled ${tokensToAdd} tokens. Current tokens: ${this.tokens}`);
    }
  }
}