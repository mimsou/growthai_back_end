import { Injectable } from '@nestjs/common';
import { CrawlerConfigService } from '../../config/crawler-config.service';
import { JSDOM } from 'jsdom';
import { ResourceUsageAnalysis } from '../../interfaces/technical-seo.interface';

@Injectable()
export class ResourceUsageAnalysisService {
  constructor(private readonly crawlerConfigService: CrawlerConfigService) {}

  async analyzeResourceUsage(html: string): Promise<ResourceUsageAnalysis> {
    const config = this.crawlerConfigService.getTechnicalSeoConfig().resourceUsage;
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const iframeAnalysis = this.analyzeIframes(document);
    const flashAnalysis = this.analyzeFlashContent(document);

    const score = this.calculateResourceScore(iframeAnalysis, flashAnalysis);
    const recommendations = this.generateResourceRecommendations(iframeAnalysis, flashAnalysis);

    return {
      iframes: iframeAnalysis,
      flash: flashAnalysis,
      score,
      recommendations
    };
  }

  private analyzeIframes(document: Document) {
    const config = this.crawlerConfigService.getTechnicalSeoConfig().resourceUsage.iframe;
    const iframes = document.querySelectorAll('iframe');
    const iframeElements = [];
    const securityIssues = [];

    iframes.forEach((iframe: HTMLIFrameElement) => {
      const sandboxAttr = iframe.getAttribute('sandbox');
      const element = {
        src: iframe.src,
        hasSandbox: !!sandboxAttr,
        securityAttributes: {
          sandbox: sandboxAttr,
          allowScripts: iframe.hasAttribute('allow-scripts'),
          allowSameOrigin: iframe.hasAttribute('allow-same-origin')
        },
        loading: iframe.loading || 'eager'
      };

      if (!sandboxAttr) {
        securityIssues.push(`Iframe missing sandbox attribute: ${iframe.src}`);
      }

      if (iframe.loading !== 'lazy') {
        securityIssues.push(`Iframe not using lazy loading: ${iframe.src}`);
      }

      iframeElements.push(element);
    });

    return {
      count: iframes.length,
      elements: iframeElements,
      exceedsLimit: iframes.length > config.maxIframes,
      securityIssues
    };
  }

  private analyzeFlashContent(document: Document) {
    const flashElements = [];
    const alternatives = [];

    // Check for object elements
    document.querySelectorAll('object').forEach((obj: HTMLObjectElement) => {
      if (obj.type?.includes('flash') || obj.data?.endsWith('.swf')) {
        flashElements.push({
          type: 'object',
          src: obj.data,
          hasAlternative: this.checkForAlternative(obj)
        });
      }
    });

    // Check for embed elements
    document.querySelectorAll('embed').forEach((embed: HTMLEmbedElement) => {
      if (embed.type?.includes('flash') || embed.src?.endsWith('.swf')) {
        flashElements.push({
          type: 'embed',
          src: embed.src,
          hasAlternative: this.checkForAlternative(embed)
        });
      }
    });

    if (flashElements.length > 0) {
      alternatives.push('Consider using HTML5 video/audio elements');
      alternatives.push('Implement JavaScript-based interactive content');
      alternatives.push('Use modern Web APIs for animations and interactivity');
    }

    return {
      detected: flashElements.length > 0,
      elements: flashElements,
      alternatives
    };
  }

  private checkForAlternative(element: HTMLElement): boolean {
    // Check for HTML5 alternatives within the same parent
    const parent = element.parentElement;
    if (!parent) return false;

    return !!(
      parent.querySelector('video') ||
      parent.querySelector('audio') ||
      parent.querySelector('canvas') ||
      parent.querySelector('[data-alternative]')
    );
  }

  private calculateResourceScore(iframeAnalysis: any, flashAnalysis: any): number {
    let score = 100;

    // Iframe penalties
    if (iframeAnalysis.exceedsLimit) {
      score -= 20;
    }
    score -= iframeAnalysis.securityIssues.length * 5;
    
    // Flash penalties
    if (flashAnalysis.detected) {
      score -= 30;
      score -= flashAnalysis.elements.filter(e => !e.hasAlternative).length * 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private generateResourceRecommendations(iframeAnalysis: any, flashAnalysis: any): string[] {
    const recommendations: string[] = [];
    const config = this.crawlerConfigService.getTechnicalSeoConfig().resourceUsage.iframe;

    // Iframe recommendations
    if (iframeAnalysis.exceedsLimit) {
      recommendations.push(
        `Reduce the number of iframes (current: ${iframeAnalysis.count}, limit: ${config.maxIframes})`
      );
    }

    iframeAnalysis.securityIssues.forEach(issue => {
      recommendations.push(issue);
    });

    // Add lazy loading recommendations
    const nonLazyIframes = iframeAnalysis.elements.filter(e => e.loading !== 'lazy').length;
    if (nonLazyIframes > 0) {
      recommendations.push(
        `Add lazy loading to ${nonLazyIframes} iframes to improve page performance`
      );
    }

    // Flash recommendations
    if (flashAnalysis.detected) {
      recommendations.push('Remove Flash content as it is no longer supported by modern browsers');
      flashAnalysis.elements.forEach(element => {
        if (!element.hasAlternative) {
          recommendations.push(`Provide HTML5 alternative for Flash content: ${element.src}`);
        }
      });
      flashAnalysis.alternatives.forEach(alt => recommendations.push(alt));
    }

    return recommendations;
  }
}
