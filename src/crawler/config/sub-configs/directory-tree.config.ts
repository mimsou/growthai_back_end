import { ConfigService } from '@nestjs/config';
import { getBooleanConfig, getNumberConfig, getArrayConfig } from '../utils/config-helpers';

export class DirectoryTreeConfig {
  constructor(private configService: ConfigService) {}

  getConfig() {
    return {
      directoryTreeEnabled: getBooleanConfig(this.configService, 'CRAWLER_DIRECTORY_TREE_ENABLED', true),
      directoryTreeMaxDepth: getNumberConfig(this.configService, 'CRAWLER_DIRECTORY_TREE_MAX_DEPTH', 5),
      directoryTreeAllowedExtensions: getArrayConfig(this.configService, 'CRAWLER_DIRECTORY_TREE_ALLOWED_EXTENSIONS', ['html', 'htm', 'php', 'asp', 'aspx']),
      directoryTreeExcludePatterns: getArrayConfig(this.configService, 'CRAWLER_DIRECTORY_TREE_EXCLUDE_PATTERNS', ['private', 'admin', 'backup']),
    };
  }
}