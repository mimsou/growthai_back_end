import { Inject, Injectable } from '@nestjs/common';
import { SeoServiceInterface } from '../seo/seo.interface';

@Injectable()
export class SeoStrategy {
  constructor( @Inject('seoServices') private readonly seoServices: Map<string, SeoServiceInterface>) {}

  async execute(seoSubject: string, sessionId:string): Promise<any> {
    const seoService = this.seoServices.get(seoSubject);
    if (!seoService) {
      throw new Error(`No SEO service found for subject: ${seoSubject}`);
    }
    return await seoService.getData(sessionId);
  }

  addSeoService(seoSubject: string, seoService: SeoServiceInterface): void {
    this.seoServices.set(seoSubject, seoService);
  }
}