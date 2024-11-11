import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrawlingData } from '../schemas/crawling-data.schema';
import {  Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CrawlingDataRepository {
  constructor(
    @InjectModel(CrawlingData.name) private crawlingDataModel: Model<CrawlingData>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async bulkUpdateCrawlingData(pagesData: any[]): Promise<void> {
    const bulkOps = pagesData.map(pageData => ({
      updateOne: {
        filter: { crawlingId: pageData.crawlingId, pageUrlRelative: pageData.pageUrlRelative },
        update: pageData,
        upsert: true
      }
    }));

    await this.crawlingDataModel.bulkWrite(bulkOps);
  }

  async getCrawlingDataById(crawlingId: string): Promise<CrawlingData[]> {
    const cacheKey = `crawling_data_${crawlingId}`;
    const cachedData = await this.cacheManager.get<CrawlingData[]>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const data = await this.crawlingDataModel.find({ crawlingId }).exec();
    await this.cacheManager.set(cacheKey, data,  3600 ); // Cache for 1 hour

    return data;
  }

  async updateDirectoryTreeData(crawlingId: string, directoryTreeData: any): Promise<void> {
    const { directoryTree, depth, fileCount, folderCount, fileTypes } = this.processDirectoryTree(directoryTreeData);

    await this.crawlingDataModel.findOneAndUpdate(
      { crawlingId },
      {
        directoryTree,
        directoryTreeDepth: depth,
        directoryTreeFileCount: fileCount,
        directoryTreeFolderCount: folderCount,
        directoryTreeFileTypes: fileTypes,
      },
      { upsert: true, new: true }
    );
  }

  private processDirectoryTree(tree: any, depth = 0): any {
    let fileCount = 0;
    let folderCount = 0;
    const fileTypes = new Set<string>();

    const processNode = (node: any, currentDepth: number) => {
      if (node.type === 'file') {
        fileCount++;
        const fileExtension = node.name.split('.').pop();
        if (fileExtension) {
          fileTypes.add(fileExtension.toLowerCase());
        }
      } else if (node.type === 'directory') {
        folderCount++;
        if (node.children) {
          node.children.forEach((child: any) => processNode(child, currentDepth + 1));
        }
      }
    };

    processNode(tree, 0);

    return {
      directoryTree: tree,
      depth,
      fileCount,
      folderCount,
      fileTypes: Array.from(fileTypes),
    };
  }

  async calculateAverageScores(crawlingId: string): Promise<Record<string, number>> {
    const aggregationResult = await this.crawlingDataModel.aggregate([
      { $match: { crawlingId } },
      { $group: {
          _id: null,
          totalScores: { $push: "$seoScores" },
          count: { $sum: 1 }
        }
      }
    ]);

    if (aggregationResult.length === 0) {
      return {};
    }

    const { totalScores, count } = aggregationResult[0];
    const averageScores: Record<string, number> = {};

    Object.keys(totalScores[0]).forEach(key => {
      const sum = totalScores.reduce((acc, scores) => acc + (scores[key] || 0), 0);
      averageScores[key] = sum / count;
    });

    return averageScores;
  }
}