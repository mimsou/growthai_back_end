import { Injectable } from '@nestjs/common';
import { SeoStrategy } from './ai.seo.strategy';

@Injectable()
export class AIService {
  constructor(private readonly seoStrategy: SeoStrategy) {}
  async getData(seoSubject:string, sessionId:string): Promise<any> {
     return this.seoStrategy.execute(seoSubject, sessionId);
  }
}