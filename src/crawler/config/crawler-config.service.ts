import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InclusionExclusionService, Rule } from './inclusion-exclusion.service';
import { GeneralConfig } from './sub-configs/general.config';
import { SitemapConfig } from './sub-configs/sitemap.config';
import { DirectoryTreeConfig } from './sub-configs/directory-tree.config';
import { MultithreadingConfig } from './sub-configs/multithreading.config';

@Injectable()
export class CrawlerConfigService {
  private generalConfig: GeneralConfig;
  private sitemapConfig: SitemapConfig;
  private directoryTreeConfig: DirectoryTreeConfig;
  private multithreadingConfig: MultithreadingConfig;
  private specificUrlList: string[] = [];
  private customStartingPoints: string[] = [];

  constructor(
    private configService: ConfigService,
    private inclusionExclusionService: InclusionExclusionService
  ) {
    this.generalConfig = new GeneralConfig(configService);
    this.sitemapConfig = new SitemapConfig(configService);
    this.directoryTreeConfig = new DirectoryTreeConfig(configService);
    this.multithreadingConfig = new MultithreadingConfig(configService);
    this.loadRulesFromEnv();
    this.loadSpecificUrlListFromEnv();
    this.loadCustomStartingPointsFromEnv();
  }

  getCrawlerConfig() {
    return {
      ...this.generalConfig.getConfig(),
      ...this.sitemapConfig.getConfig(),
      ...this.directoryTreeConfig.getConfig(),
      ...this.multithreadingConfig.getConfig(),
      specificUrlList: this.specificUrlList,
      customStartingPoints: this.customStartingPoints,
      requestTimeout: this.configService.get<number>('CRAWLER_REQUEST_TIMEOUT', 30000),
    };
  }

  getRobotsTxtAdherence(): boolean {
    return this.generalConfig.getConfig().respectRobotsTxt;
  }

  validateCrawlLimits(urlLimit: number, depthLimit: number): void {
    if (urlLimit <= 0 || depthLimit <= 0) {
      throw new Error('URL limit and depth limit must be positive integers');
    }
  }

  getInclusionRules(): Rule[] {
    return this.inclusionExclusionService.getInclusionRules();
  }
  
  getExclusionRules(): Rule[] {
    return this.inclusionExclusionService.getExclusionRules();
  }

  addInclusionRule(pattern: string, isRegex: boolean = false) {
    this.inclusionExclusionService.addInclusionRule(pattern, isRegex);
  }

  addExclusionRule(pattern: string, isRegex: boolean = false) {
    this.inclusionExclusionService.addExclusionRule(pattern, isRegex);
  }

  removeInclusionRule(pattern: string) {
    this.inclusionExclusionService.removeInclusionRule(pattern);
  }

  removeExclusionRule(pattern: string) {
    this.inclusionExclusionService.removeExclusionRule(pattern);
  }

  getSpecificUrlList(): string[] {
    return this.specificUrlList;
  }

  setSpecificUrlList(urlList: string[]): void {
    this.specificUrlList = urlList;
  }

  getDirectoryTreeConfig() {
    return this.directoryTreeConfig.getConfig();
  }

  getCustomStartingPoints(): string[] {
    return this.customStartingPoints;
  }

  setCustomStartingPoints(startingPoints: string[]): void {
    this.customStartingPoints = startingPoints;
  }

  getMultithreadingConfig() {
    return this.multithreadingConfig.getConfig();
  }

  private loadRulesFromEnv() {
    const inclusionRules = this.configService.get<string>('CRAWLER_INCLUSION_RULES', '').split(',');
    const exclusionRules = this.configService.get<string>('CRAWLER_EXCLUSION_RULES', '').split(',');

    inclusionRules.forEach(rule => {
      if (rule) this.addInclusionRule(rule.trim());
    });

    exclusionRules.forEach(rule => {
      if (rule) this.addExclusionRule(rule.trim());
    });
  }

  private loadSpecificUrlListFromEnv() {
    const urlList = this.configService.get<string>('CRAWLER_SPECIFIC_URL_LIST', '').split(',');
    this.specificUrlList = urlList.filter(url => url.trim() !== '');
  }

  private loadCustomStartingPointsFromEnv() {
    const startingPoints = this.configService.get<string>('CRAWLER_CUSTOM_STARTING_POINTS', '').split(',');
    this.customStartingPoints = startingPoints.filter(point => point.trim() !== '');
  }
}