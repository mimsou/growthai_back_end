import { Injectable } from '@nestjs/common';
import { CrawlerConfigService } from '../../config/crawler-config.service';
import { JSDOM } from 'jsdom';
import { AmpAnalysis } from '../../interfaces/technical-seo.interface';
import * as amphtmlValidator from 'amphtml-validator';

@Injectable()
export class AmpAnalysisService {
  constructor(private readonly crawlerConfigService: CrawlerConfigService) {}

  async analyzeAmp(html: string, url: string): Promise<AmpAnalysis> {
    const config = this.crawlerConfigService.getTechnicalSeoConfig().amp;
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const isAmpPage = this.detectAmpPage(document);
    const ampVersion = this.getAmpVersion(document);
    const ampComponents = await this.validateAmpComponents(html);
    const canonicalRelation = this.analyzeCanonicalRelation(document, url);
    const ampSize = this.analyzeAmpSize(html);

    const score = this.calculateAmpScore(
      isAmpPage,
      ampComponents,
      canonicalRelation,
      ampSize
    );

    const recommendations = this.generateAmpRecommendations(
      isAmpPage,
      ampComponents,
      canonicalRelation,
      ampSize
    );

    return {
      isAmpPage,
      ampVersion,
      ampComponents,
      canonicalRelation,
      ampSize,
      score,
      recommendations
    };
  }

  private detectAmpPage(document: Document): boolean {
    const htmlTag = document.documentElement;
    return htmlTag.hasAttribute('amp') || htmlTag.hasAttribute('⚡');
  }

  private getAmpVersion(document: Document): string {
    const ampRuntime = document.querySelector('script[src*="ampproject"]');
    const versionMatch = ampRuntime?.getAttribute('src')?.match(/v\d+/);
    return versionMatch ? versionMatch[0] : '';
  }

  private async validateAmpComponents(html: string) {
    const validator = await amphtmlValidator.getInstance();
    const result = validator.validateString(html);
    
    const components = new Set<string>();
    const validationResults = [];

    result.errors.forEach(error => {
      const componentMatch = error.code.match(/INVALID_(.+)_TAG/);
      if (componentMatch) {
        components.add(componentMatch[1].toLowerCase());
      }
    });

    Array.from(components).forEach(component => {
      validationResults.push({
        name: component,
        valid: !result.errors.some(error => 
          error.code.includes(component.toUpperCase())
        ),
        errors: result.errors
          .filter(error => error.code.includes(component.toUpperCase()))
          .map(error => error.message)
      });
    });

    return validationResults;
  }

  private analyzeCanonicalRelation(document: Document, url: string) {
    const canonical = document.querySelector('link[rel="canonical"]');
    const ampHtml = document.querySelector('link[rel="amphtml"]');
    
    return {
      hasCanonical: !!canonical,
      canonicalUrl: canonical?.getAttribute('href') || '',
      isValid: this.validateCanonicalAmpRelation(canonical?.getAttribute('href'), ampHtml?.getAttribute('href'), url)
    };
  }

  private validateCanonicalAmpRelation(canonical: string, amphtml: string, currentUrl: string): boolean {
    if (!canonical) return false;
    
    try {
      const canonicalUrl = new URL(canonical, currentUrl);
      const currentUrlObj = new URL(currentUrl);
      
      if (amphtml) {
        const amphtmlUrl = new URL(amphtml, currentUrl);
        return canonicalUrl.pathname === currentUrlObj.pathname;
      }
      
      return canonicalUrl.pathname === currentUrlObj.pathname;
    } catch (e) {
      return false;
    }
  }

  private analyzeAmpSize(html: string) {
    const config = this.crawlerConfigService.getTechnicalSeoConfig().amp;
    const sizeKB = Buffer.from(html).length / 1024;
    
    return {
      size: sizeKB,
      exceedsLimit: sizeKB > config.maxAmpSize
    };
  }

  private calculateAmpScore(
    isAmpPage: boolean,
    ampComponents: any[],
    canonicalRelation: any,
    ampSize: any
  ): number {
    if (!isAmpPage) return 0;

    let score = 100;

    // Component validation
    const invalidComponents = ampComponents.filter(c => !c.valid).length;
    score -= invalidComponents * 10;

    // Canonical relation
    if (!canonicalRelation.hasCanonical) score -= 20;
    if (!canonicalRelation.isValid) score -= 15;

    // Size analysis
    if (ampSize.exceedsLimit) score -= 25;

    return Math.max(0, Math.min(100, score));
  }

  private generateAmpRecommendations(
    isAmpPage: boolean,
    ampComponents: any[],
    canonicalRelation: any,
    ampSize: any
  ): string[] {
    const recommendations: string[] = [];

    if (!isAmpPage) {
      recommendations.push('Consider implementing AMP for better mobile performance');
      return recommendations;
    }

    ampComponents.forEach(component => {
      if (!component.valid) {
        recommendations.push(`Fix invalid AMP component: ${component.name}`);
        component.errors?.forEach(error => {
          recommendations.push(`  - ${error}`);
        });
      }
    });

    if (!canonicalRelation.hasCanonical) {
      recommendations.push('Add canonical link to AMP page');
    } else if (!canonicalRelation.isValid) {
      recommendations.push('Fix canonical relationship between AMP and non-AMP pages');
    }

    if (ampSize.exceedsLimit) {
      recommendations.push(
        `Reduce AMP page size (${ampSize.size.toFixed(2)}KB) to below ${this.crawlerConfigService.getTechnicalSeoConfig().amp.maxAmpSize}KB`
      );
    }

    return recommendations;
  }
}
