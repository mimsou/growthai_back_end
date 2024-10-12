import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class RobotsTxtService {
  private robotsTxtCache: Map<string, string> = new Map();

  constructor(private configService: ConfigService) {}

  async fetchRobotsTxt(url: string): Promise<string> {
    const robotsTxtUrl = new URL('/robots.txt', url).toString();
    try {
      const response = await axios.get(robotsTxtUrl);
      return response.data;
    } catch (error) {
      console.error(`Error fetching robots.txt from ${robotsTxtUrl}: ${error.message}`);
      return '';
    }
  }

  async parseRobotsTxt(url: string): Promise<Map<string, string[]>> {
    const domain = new URL(url).origin;
    if (!this.robotsTxtCache.has(domain)) {
      const robotsTxtContent = await this.fetchRobotsTxt(domain);
      this.robotsTxtCache.set(domain, robotsTxtContent);
    }
    
    const content = this.robotsTxtCache.get(domain);
    const rules = new Map<string, string[]>();
    let currentUserAgent = '*';

    content.split('\n').forEach(line => {
      line = line.trim().toLowerCase();
      if (line.startsWith('user-agent:')) {
        currentUserAgent = line.split(':')[1].trim();
        if (!rules.has(currentUserAgent)) {
          rules.set(currentUserAgent, []);
        }
      } else if (line.startsWith('disallow:') || line.startsWith('allow:')) {
        const [directive, path] = line.split(':');
        rules.get(currentUserAgent).push(`${directive}:${path.trim()}`);
      }
    });

    return rules;
  }

  async isAllowed(url: string): Promise<boolean> {
    const rules = await this.parseRobotsTxt(url);
    const userAgent = this.configService.get<string>('CRAWLER_USER_AGENT');
    const path = new URL(url).pathname;

    const relevantRules = rules.get(userAgent) || rules.get('*') || [];

    for (const rule of relevantRules) {
      const [directive, rulePath] = rule.split(':');
      if (path.startsWith(rulePath)) {
        return directive === 'allow';
      }
    }

    return true;
  }
}