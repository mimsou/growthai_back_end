import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RobotsData } from './robots-data.schema';
import { SeoServiceInterface } from '../seo.interface';

@Injectable()
export class RobotsService implements SeoServiceInterface {
  constructor(
    @InjectModel(RobotsData.name) private robotsDataModel: Model<RobotsData>,
  ) { }

  async analyzeRobots(url: string, auditId: string): Promise<any> {
    const rawData = await this.getRobotsData(url);
    await this.saveRobotsData(auditId, rawData);
    return rawData;
  }

  async getRobotsData(url: string): Promise<{ exist: boolean; content?: string }> {

    const rootUrl = await this.getRootUrl(url);
    const robotsTxtUrl = `${rootUrl}/robots.txt`;
    try {
      const response = await fetch(robotsTxtUrl);
      const isText =  this.isTextFile(response);
      console.log(!this.isTextFile(response));
      if (response.ok && this.isTextFile(response) ) {
        return {
          exist: true,
          content: await response.text(),
        };
      }
    } catch (_) {
      return {
        exist: false,
        content:''
      };
    }
  }

  private async getRootUrl(url: string): Promise<string> {
    const parsedUrl = new URL(url);
    return `${parsedUrl.protocol}//${parsedUrl.hostname}`;
  }

  private isTextFile(response: Response): boolean {
    const contentType = response.headers.get('content-type');
    return contentType && contentType.includes('text/plain');
  }

  private async saveRobotsData(auditId: string, rawData: { exist: boolean; content?: string }): Promise<void> {
    const robotsData = new this.robotsDataModel({
      auditId,
      exist: rawData.exist,
      content: rawData.content,
    });
    await robotsData.save();
  }

  public async getData(sessionId: string): Promise<any> {
    try {
      const robotsData = await this.robotsDataModel.findOne({ auditId: sessionId }).exec()
      return robotsData.content
    } catch (error) {
      throw new Error(`Failed to fetch robots data: ${error.message}`)
    }
  }
  
}

