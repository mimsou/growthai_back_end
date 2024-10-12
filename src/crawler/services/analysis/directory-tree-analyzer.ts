import { Injectable } from '@nestjs/common';

@Injectable()
export class DirectoryTreeAnalyzer {
  analyzeDirectoryTree(directoryTree: any): Record<string, number | string | Record<string, number>> {
    const analysis: Record<string, number | string | Record<string, number>> = {
      totalFiles: 0,
      totalFolders: 0,
      maxDepth: 0,
      averageFilesPerFolder: 0,
      mostCommonFileType: '',
      fileTypeDistribution: {} as Record<string, number>,
    };

    this.traverseTree(directoryTree, 0, analysis);

    analysis.averageFilesPerFolder = analysis.totalFiles as number / (analysis.totalFolders as number);
    analysis.mostCommonFileType = this.getMostCommonFileType(analysis.fileTypeDistribution as Record<string, number>);

    return analysis;
  }

  private traverseTree(node: any, depth: number, analysis: Record<string, number | string | Record<string, number>>) {
    if (node.type === 'file') {
      analysis.totalFiles = (analysis.totalFiles as number) + 1;
      const fileType = this.getFileType(node.name);
      (analysis.fileTypeDistribution as Record<string, number>)[fileType] = ((analysis.fileTypeDistribution as Record<string, number>)[fileType] || 0) + 1;
    } else if (node.type === 'directory') {
      analysis.totalFolders = (analysis.totalFolders as number) + 1;
      analysis.maxDepth = Math.max(analysis.maxDepth as number, depth);
      if (node.children) {
        node.children.forEach((child: any) => this.traverseTree(child, depth + 1, analysis));
      }
    }
  }

  private getFileType(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'unknown';
  }

  private getMostCommonFileType(fileTypeDistribution: Record<string, number>): string {
    return Object.entries(fileTypeDistribution).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  generateInsights(analysis: Record<string, number | string | Record<string, number>>): string[] {
    const insights: string[] = [];

    insights.push(`The website contains ${analysis.totalFiles} files in ${analysis.totalFolders} folders.`);
    insights.push(`The deepest folder is ${analysis.maxDepth} levels deep.`);
    insights.push(`On average, there are ${(analysis.averageFilesPerFolder as number).toFixed(2)} files per folder.`);
    insights.push(`The most common file type is ${analysis.mostCommonFileType}.`);

    if ((analysis.maxDepth as number) > 5) {
      insights.push("The folder structure is quite deep. Consider simplifying for better organization.");
    }

    if ((analysis.averageFilesPerFolder as number) > 20) {
      insights.push("Some folders contain a large number of files. Consider reorganizing for better maintainability.");
    }

    return insights;
  }
}