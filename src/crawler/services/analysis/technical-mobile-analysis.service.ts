import { Injectable } from '@nestjs/common';
import { CrawlerConfigService } from '../../config/crawler-config.service';
import { JSDOM } from 'jsdom';
import { MobileFriendlinessAnalysis } from '../../interfaces/technical-seo.interface';

@Injectable()
export class TechnicalMobileAnalysisService {
  constructor(private readonly crawlerConfigService: CrawlerConfigService) {}

  async analyzeMobileFriendliness(html: string): Promise<MobileFriendlinessAnalysis> {
    const config = this.crawlerConfigService.getTechnicalSeoConfig().mobileFriendliness;
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const viewportAnalysis = this.analyzeViewport(document);
    const touchElementsAnalysis = this.analyzeTouchElements(document);
    const fontSizeAnalysis = this.analyzeFontSize(document);
    const contentWidthAnalysis = this.analyzeContentWidth(document);
    const mediaQueriesAnalysis = this.analyzeMediaQueries(document);

    const score = this.calculateMobileFriendlinessScore(
      viewportAnalysis,
      touchElementsAnalysis,
      fontSizeAnalysis,
      contentWidthAnalysis,
      mediaQueriesAnalysis
    );

    const recommendations = this.generateMobileRecommendations(
      viewportAnalysis,
      touchElementsAnalysis,
      fontSizeAnalysis,
      contentWidthAnalysis,
      mediaQueriesAnalysis
    );

    return {
      viewport: viewportAnalysis,
      touchElements: touchElementsAnalysis,
      fontSize: fontSizeAnalysis,
      contentWidth: contentWidthAnalysis,
      mediaQueries: mediaQueriesAnalysis,
      score,
      recommendations
    };
  }

  private analyzeViewport(document: Document) {
    const viewport = document.querySelector('meta[name="viewport"]');
    const viewportContent = viewport?.getAttribute('content') || '';
    const properties = new Map(
      viewportContent.split(',').map(prop => {
        const [key, value] = prop.trim().split('=');
        return [key, value];
      })
    );

    const issues = [];
    if (!viewport) {
      issues.push('Missing viewport meta tag');
    }
    if (!properties.has('width') || properties.get('width') !== 'device-width') {
      issues.push('Viewport width not set to device-width');
    }
    if (!properties.has('initial-scale') || properties.get('initial-scale') !== '1.0') {
      issues.push('Initial scale not set to 1.0');
    }

    return {
      hasViewport: !!viewport,
      isResponsive: properties.get('width') === 'device-width',
      viewportContent,
      issues
    };
  }

  private analyzeTouchElements(document: Document) {
    const config = this.crawlerConfigService.getTechnicalSeoConfig().mobileFriendliness;
    const interactiveElements = document.querySelectorAll('a, button, input, select, textarea');
    const elementsWithSmallTargets = [];
    const window = document.defaultView;

    interactiveElements.forEach((element: Element) => {
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        const spacing = this.calculateElementSpacing(element, computedStyle);

        if (rect.width < config.viewportAnalysis.minTouchTargetSize || 
            rect.height < config.viewportAnalysis.minTouchTargetSize ||
            spacing < config.viewportAnalysis.minTouchTargetSpacing) {
            elementsWithSmallTargets.push({
                selector: this.generateSelector(element),
                size: Math.min(rect.width, rect.height),
                spacing
            });
        }
    });

    return {
        elementsWithSmallTargets,
        totalIssues: elementsWithSmallTargets.length
    };
}

  private analyzeFontSize(document: Document) {
    const config = this.crawlerConfigService.getTechnicalSeoConfig().mobileFriendliness;
    const textElements = document.querySelectorAll('p, span, div, a, button, input, label');
    const tooSmallElements = [];
    const window = document.defaultView;

    textElements.forEach((element: Element) => {
      const computedStyle = window.getComputedStyle(element);
      const fontSize = parseFloat(computedStyle.fontSize);

      if (fontSize < config.viewportAnalysis.minFontSize) {
        tooSmallElements.push({
          selector: this.generateSelector(element),
          size: fontSize
        });
      }
    });

    return {
      tooSmallElements,
      totalIssues: tooSmallElements.length
    };
  }

  private analyzeContentWidth(document: Document) {
    const config = this.crawlerConfigService.getTechnicalSeoConfig().mobileFriendliness;
    const body = document.body;
    const html = document.documentElement;

    const contentWidth = Math.max(
      body.scrollWidth,
      body.offsetWidth,
      html.clientWidth,
      html.scrollWidth,
      html.offsetWidth
    );

    const viewportWidth = html.clientWidth;

    return {
      exceedsViewport: contentWidth > config.viewportAnalysis.maxContentWidth,
      horizontalScrolling: contentWidth > viewportWidth,
      contentWidth,
      viewportWidth
    };
  }

  private analyzeMediaQueries(document: Document) {
    const styleSheets = Array.from(document.styleSheets);
    const breakpoints = new Set<number>();
    const responsiveImages = document.querySelectorAll('img[srcset], picture source');

    styleSheets.forEach(stylesheet => {
        try {
            const rules = Array.from(stylesheet.cssRules);
            rules.forEach(rule => {
                if (rule instanceof CSSMediaRule) {
                    const mediaText = rule.media.mediaText;
                    const widthMatch = mediaText.match(/\(min-width:\s*(\d+)px\)/);
                    if (widthMatch) {
                        breakpoints.add(parseInt(widthMatch[1]));
                    }
                }
            });
        } catch (e) {
            // Handle cross-origin stylesheet errors
        }
    });

    const commonBreakpoints = [320, 768, 1024, 1440];
    const missingBreakpoints = commonBreakpoints.filter(bp => !breakpoints.has(bp));

    return {
        hasResponsiveImages: responsiveImages.length > 0,
        responsiveBreakpoints: Array.from(breakpoints).sort((a, b) => a - b),
        missingBreakpoints: missingBreakpoints.map(bp => `${bp}px`)
    };
}

  private calculateElementSpacing(element: Element, computedStyle: CSSStyleDeclaration): number {
    const margin = parseFloat(computedStyle.marginTop) +
                  parseFloat(computedStyle.marginBottom) +
                  parseFloat(computedStyle.marginLeft) +
                  parseFloat(computedStyle.marginRight);

    const padding = parseFloat(computedStyle.paddingTop) +
                   parseFloat(computedStyle.paddingBottom) +
                   parseFloat(computedStyle.paddingLeft) +
                   parseFloat(computedStyle.paddingRight);

    return Math.min(margin, padding);
  }

  private generateSelector(element: Element): string {
    const path = [];
    let current = element;

    while (current && current.nodeType === 1) { // Use 1 instead of Node.ELEMENT_NODE
        let selector = current.nodeName.toLowerCase();
        
        if (current.id) {
            selector += `#${current.id}`;
            path.unshift(selector);
            break;
        }
        
        if (current.className) {
            selector += `.${current.className.trim().replace(/\s+/g, '.')}`;
        }
        
        path.unshift(selector);
        current = current.parentElement;
    }

    return path.join(' > ');
}

  private calculateMobileFriendlinessScore(
    viewport: any,
    touchElements: any,
    fontSize: any,
    contentWidth: any,
    mediaQueries: any
  ): number {
    let score = 100;

    // Viewport issues
    if (!viewport.hasViewport) score -= 30;
    if (!viewport.isResponsive) score -= 20;
    viewport.issues.forEach(() => score -= 5);

    // Touch target issues
    score -= Math.min(touchElements.totalIssues * 2, 20);

    // Font size issues
    score -= Math.min(fontSize.totalIssues * 2, 15);

    // Content width issues
    if (contentWidth.exceedsViewport) score -= 10;
    if (contentWidth.horizontalScrolling) score -= 15;

    // Media queries
    if (!mediaQueries.hasResponsiveImages) score -= 10;
    score -= Math.min(mediaQueries.missingBreakpoints.length * 2, 10);

    return Math.max(0, Math.min(100, score));
  }

  private generateMobileRecommendations(
    viewport: any,
    touchElements: any,
    fontSize: any,
    contentWidth: any,
    mediaQueries: any
  ): string[] {
    const recommendations: string[] = [];

    // Viewport recommendations
    viewport.issues.forEach(issue => recommendations.push(issue));

    // Touch target recommendations
    if (touchElements.totalIssues > 0) {
      recommendations.push(
        `Increase touch target size for ${touchElements.totalIssues} elements to improve mobile usability`
      );
    }

    // Font size recommendations
    if (fontSize.totalIssues > 0) {
      recommendations.push(
        `Increase font size for ${fontSize.totalIssues} elements to improve readability on mobile devices`
      );
    }

    // Content width recommendations
    if (contentWidth.exceedsViewport) {
      recommendations.push(
        `Content width (${contentWidth.contentWidth}px) exceeds recommended maximum width. Consider implementing responsive design`
      );
    }

    // Media queries recommendations
    if (!mediaQueries.hasResponsiveImages) {
        recommendations.push('Implement responsive images using srcset and sizes attributes');
      }
      if (mediaQueries.missingBreakpoints.length > 0) {
        recommendations.push(
          `Add media queries for common breakpoints: ${mediaQueries.missingBreakpoints.join(', ')}`
        );
      }
  
      return recommendations;
    }
  }