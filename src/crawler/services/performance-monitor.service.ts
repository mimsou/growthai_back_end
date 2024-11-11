import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);
  private metrics: Map<string, number> = new Map();
  private startTime: number;

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2
  ) {
    this.startTime = Date.now();
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.metrics.set('totalRequests', 0);
    this.metrics.set('successfulRequests', 0);
    this.metrics.set('failedRequests', 0);
    this.metrics.set('rateLimitHits', 0);
    this.metrics.set('averageResponseTime', 0);
    this.metrics.set('peakMemoryUsage', 0);
  }

  incrementMetric(metric: string, value: number = 1): void {
    const currentValue = this.metrics.get(metric) || 0;
    this.metrics.set(metric, currentValue + value);
  }

  setMetric(metric: string, value: number): void {
    this.metrics.set(metric, value);
  }

  getMetric(metric: string): number {
    return this.metrics.get(metric) || 0;
  }

  recordResponseTime(time: number): void {
    const totalRequests = this.getMetric('totalRequests');
    const currentAverage = this.getMetric('averageResponseTime');
    const newAverage = (currentAverage * totalRequests + time) / (totalRequests + 1);
    this.setMetric('averageResponseTime', newAverage);
  }

  updatePeakMemoryUsage(): void {
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // Convert to MB
    const currentPeak = this.getMetric('peakMemoryUsage');
    if (memoryUsage > currentPeak) {
      this.setMetric('peakMemoryUsage', memoryUsage);
    }
  }

  logPerformanceMetrics(): void {
    const duration = (Date.now() - this.startTime) / 1000; // Convert to seconds
    const metrics = Object.fromEntries(this.metrics);
    
    this.logger.log(`Performance Metrics:
      Duration: ${duration.toFixed(2)} seconds
      Total Requests: ${metrics.totalRequests}
      Successful Requests: ${metrics.successfulRequests}
      Failed Requests: ${metrics.failedRequests}
      Rate Limit Hits: ${metrics.rateLimitHits}
      Average Response Time: ${metrics.averageResponseTime.toFixed(2)} ms
      Peak Memory Usage: ${metrics.peakMemoryUsage.toFixed(2)} MB
    `);

    this.eventEmitter.emit('crawler.performanceMetrics', {
      duration,
      ...metrics
    });
  }
}
