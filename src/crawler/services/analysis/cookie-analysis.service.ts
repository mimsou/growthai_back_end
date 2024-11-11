import { Injectable } from '@nestjs/common';
import { CrawlerConfigService } from '../../config/crawler-config.service';
import { CookieAnalysis } from '../../interfaces/technical-seo.interface';

@Injectable()
export class CookieAnalysisService {
  constructor(private readonly crawlerConfigService: CrawlerConfigService) {}

  async analyzeCookies(cookies: string[], headers: Record<string, string>, html: string): Promise<CookieAnalysis> {
    const config = this.crawlerConfigService.getTechnicalSeoConfig().cookies;
    
    const parsedCookies = this.parseCookies(cookies);
    const statistics = this.calculateCookieStatistics(parsedCookies);
    const gdprCompliance = this.analyzeGdprCompliance(parsedCookies, headers, html);
    
    const score = this.calculateCookieScore(statistics, gdprCompliance);
    const recommendations = this.generateCookieRecommendations(
      parsedCookies,
      statistics,
      gdprCompliance
    );

    return {
      cookies: parsedCookies,
      statistics,
      gdprCompliance,
      score,
      recommendations
    };
  }

  private parseCookies(cookies: string[]) {
    return cookies.map(cookie => {
      const parts = cookie.split(';').map(part => part.trim());
      const [nameValue, ...attributes] = parts;
      const [name, value] = nameValue.split('=').map(s => s.trim());

      const cookieObj = {
        name,
        value,
        domain: '',
        size: Buffer.from(cookie).length,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
        category: this.categorizeCookie(name)
      };

      attributes.forEach(attr => {
        const [key, val] = attr.split('=').map(s => s.trim());
        if (key.toLowerCase() === 'domain') cookieObj.domain = val;
        if (key.toLowerCase() === 'httponly') cookieObj.httpOnly = true;
        if (key.toLowerCase() === 'secure') cookieObj.secure = true;
        if (key.toLowerCase() === 'samesite') cookieObj.sameSite = val;
      });

      return cookieObj;
    });
  }

  private categorizeCookie(name: string): string {
    const categories = {
      necessary: ['sess', 'auth', 'token', 'csrf', 'security'],
      preferences: ['theme', 'lang', 'timezone', 'prefs'],
      statistics: ['ga', 'analytics', 'stats', '_utm'],
      marketing: ['ad', 'track', 'pixel', 'campaign']
    };

    const lowerName = name.toLowerCase();
    
    for (const [category, patterns] of Object.entries(categories)) {
      if (patterns.some(pattern => lowerName.includes(pattern))) {
        return category;
      }
    }

    return 'unknown';
  }

  private calculateCookieStatistics(cookies: any[]) {
    const config = this.crawlerConfigService.getTechnicalSeoConfig().cookies;
    const categoryCounts = {};
    let totalSize = 0;

    cookies.forEach(cookie => {
      categoryCounts[cookie.category] = (categoryCounts[cookie.category] || 0) + 1;
      totalSize += cookie.size;
    });

    return {
      totalCount: cookies.length,
      totalSize,
      categoryCounts,
      exceedsLimit: cookies.length > config.maxCookiesPerDomain
    };
  }

  private analyzeGdprCompliance(cookies: any[], headers: Record<string, string>, html: string) {
    const hasConsentManager = this.detectConsentManager(html);
    const necessaryOnly = cookies.every(cookie => cookie.category === 'necessary');
    const issues = [];

    // Check for secure flag on sensitive cookies
    cookies.forEach(cookie => {
      if (cookie.category === 'necessary' && !cookie.secure) {
        issues.push(`Security cookie "${cookie.name}" missing secure flag`);
      }
      if (!cookie.sameSite) {
        issues.push(`Cookie "${cookie.name}" missing SameSite attribute`);
      }
    });

    // Check for appropriate security headers
    if (!headers['set-cookie']?.includes('SameSite')) {
      issues.push('Missing SameSite cookie policy in headers');
    }

    return {
      hasConsentManager,
      necessaryOnly,
      issues
    };
  }

  private detectConsentManager(html: string): boolean {
    const consentPatterns = [
      'cookieconsent',
      'gdpr',
      'cookie-law',
      'cookie-notice',
      'cookie-banner',
      'cookie-policy',
      'consent-manager',
      'usercentrics',
      'onetrust',
      'cookiebot'
    ];

    return consentPatterns.some(pattern => 
      html.toLowerCase().includes(pattern)
    );
  }

  private calculateCookieScore(statistics: any, gdprCompliance: any): number {
    let score = 100;
    const config = this.crawlerConfigService.getTechnicalSeoConfig().cookies;

    // Deduct points for excessive cookies
    if (statistics.exceedsLimit) {
      score -= 20;
    }

    // Deduct points for missing consent manager
    if (!gdprCompliance.hasConsentManager) {
      score -= 30;
    }

    // Deduct points for each compliance issue
    score -= gdprCompliance.issues.length * 10;

    // Deduct points for high proportion of marketing cookies
    const marketingRatio = (statistics.categoryCounts['marketing'] || 0) / statistics.totalCount;
    if (marketingRatio > 0.3) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  private generateCookieRecommendations(
    cookies: any[],
    statistics: any,
    gdprCompliance: any
  ): string[] {
    const recommendations: string[] = [];
    const config = this.crawlerConfigService.getTechnicalSeoConfig().cookies;

    if (statistics.exceedsLimit) {
      recommendations.push(
        `Reduce the number of cookies (current: ${statistics.totalCount}, limit: ${config.maxCookiesPerDomain})`
      );
    }

    if (!gdprCompliance.hasConsentManager) {
      recommendations.push('Implement a GDPR-compliant cookie consent manager');
    }

    gdprCompliance.issues.forEach(issue => {
      recommendations.push(issue);
    });

    if (statistics.totalSize > config.maxCookieSize * 1024) {
      recommendations.push(
        `Reduce total cookie size (current: ${(statistics.totalSize / 1024).toFixed(2)}KB, limit: ${config.maxCookieSize}KB)`
      );
    }

    const unsecuredNecessaryCookies = cookies.filter(
        c => c.category === 'necessary' && !c.secure
      ).length;
  
      if (unsecuredNecessaryCookies > 0) {
        recommendations.push(
          `Add secure flag to ${unsecuredNecessaryCookies} necessary cookies`
        );
      }
  
      const marketingCookies = cookies.filter(c => c.category === 'marketing').length;
      if (marketingCookies > 0) {
        recommendations.push(
          `Consider reducing marketing cookies (current: ${marketingCookies}) to improve privacy compliance`
        );
      }
  
      // Check for SameSite attribute
      const missingSameSite = cookies.filter(c => !c.sameSite).length;
      if (missingSameSite > 0) {
        recommendations.push(
          `Add SameSite attribute to ${missingSameSite} cookies for better security`
        );
      }
  
      // Third-party cookie recommendations
      const thirdPartyCookies = cookies.filter(
        c => c.domain && !c.domain.includes(window.location.hostname)
      ).length;
      if (thirdPartyCookies > 0) {
        recommendations.push(
          `Review necessity of ${thirdPartyCookies} third-party cookies`
        );
      }
  
      return recommendations;
    }
  }
  