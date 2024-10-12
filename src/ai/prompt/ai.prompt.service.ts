
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {PromptData } from './ai.prompt-data.schema';

@Injectable()
export class AiPromptService {
  constructor(
    @InjectModel(PromptData.name) private promptDataModel: Model<PromptData>,
  ) {}

  async getPromptBySeoSubject(seoSubject: string): Promise<string | null> {
    const result = await this.promptDataModel.find({ seoSubject: seoSubject }).exec();
    if (!result) return null;
    return result.map(item => item.content).join('\n');
  }
}

