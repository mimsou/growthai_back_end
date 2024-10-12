import { IsOptional, IsString, IsNumber, IsBoolean, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { SpecificUrlListDto } from './specific-url-list.dto';

export class CrawlOptionsDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsNumber()
  urlLimit?: number;

  @IsOptional()
  @IsNumber()
  depthLimit?: number;

  @IsOptional()
  @IsBoolean()
  followInternalLinks?: boolean;

  @IsOptional()
  @IsBoolean()
  followExternalLinks?: boolean;

  @IsOptional()
  @IsBoolean()
  followSubfolderLinks?: boolean;

  @IsOptional()
  @IsString()
  addInclusionRule?: string;

  @IsOptional()
  @IsString()
  addExclusionRule?: string;

  @IsOptional()
  @IsString()
  removeInclusionRule?: string;

  @IsOptional()
  @IsString()
  removeExclusionRule?: string;

  @IsOptional()
  @IsBoolean()
  useDirectoryTreeCrawling?: boolean;

  @IsOptional()
  @IsString()
  directoryTreeRootPath?: string;

  @IsOptional()
  @Type(() => SpecificUrlListDto)
  specificUrlList?: SpecificUrlListDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customStartingPoints?: string[];

  @IsOptional()
  @IsBoolean()
  sitemapEnabled?: boolean;
}
