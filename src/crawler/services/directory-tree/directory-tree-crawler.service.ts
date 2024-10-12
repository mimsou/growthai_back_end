import { Injectable } from '@nestjs/common';
import { CrawlerConfigService } from '../../config/crawler-config.service';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class DirectoryTreeCrawlerService {
  constructor(private readonly crawlerConfigService: CrawlerConfigService) {}

  async crawlDirectoryTree(rootPath: string): Promise<any> {
    const config = this.crawlerConfigService.getDirectoryTreeConfig();
    return this.crawlDirectory(rootPath, 0, config);
  }

  private async crawlDirectory(dirPath: string, currentDepth: number, config: any): Promise<any> {
    if (currentDepth > config.directoryTreeMaxDepth) {
      return null;
    }

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const result: any = { name: path.basename(dirPath), type: 'directory', children: [] };

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (this.shouldExclude(entry.name, config.directoryTreeExcludePatterns)) {
        continue;
      }

      if (entry.isDirectory()) {
        const subDir = await this.crawlDirectory(fullPath, currentDepth + 1, config);
        if (subDir) {
          result.children.push(subDir);
        }
      } else if (entry.isFile() && this.isAllowedFile(entry.name, config.directoryTreeAllowedExtensions)) {
        result.children.push({ name: entry.name, type: 'file' });
      }
    }

    return result;
  }

  private shouldExclude(name: string, excludePatterns: string[]): boolean {
    return excludePatterns.some(pattern => name.toLowerCase().includes(pattern.toLowerCase()));
  }

  private isAllowedFile(name: string, allowedExtensions: string[]): boolean {
    const ext = path.extname(name).toLowerCase().slice(1);
    return allowedExtensions.includes(ext);
  }
}
