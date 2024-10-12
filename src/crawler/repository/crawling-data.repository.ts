import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrawlingData } from '../schemas/crawling-data.schema';

@Injectable()
export class CrawlingDataRepository {
  constructor(
    @InjectModel(CrawlingData.name) private crawlingDataModel: Model<CrawlingData>
  ) {}

  async updateCrawlingData(pageData: any): Promise<void> {
    await this.crawlingDataModel.findOneAndUpdate(
      { crawlingId: pageData.crawlingId, pageUrlRelative: pageData.pageUrlRelative },
      pageData,
      { upsert: true, new: true }
    );
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
    const allScores = await this.crawlingDataModel.find({ crawlingId }).select('seoScores -_id');
    const totalScores: Record<string, number> = {};
    let count = 0;

    allScores.forEach(({ seoScores }) => {
      count++;
      Object.entries(seoScores).forEach(([key, value]) => {
        totalScores[key] = (totalScores[key] || 0) + value;
      });
    });

    const averageScores: Record<string, number> = {};
    Object.entries(totalScores).forEach(([key, value]) => {
      averageScores[key] = value / count;
    });

    return averageScores;
  }
}