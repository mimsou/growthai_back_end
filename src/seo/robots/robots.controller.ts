import { Controller, Get, Query } from '@nestjs/common';
import { RobotsService } from './robots.service';

@Controller('seo/robots')
export class RobotsController {
  constructor(private readonly robotsService: RobotsService) {}

  @Get()
  async getRobotsData(@Query('url') url: string, @Query('auditId') auditId: string) {
    return this.robotsService.analyzeRobots(url, auditId);
  }
}
