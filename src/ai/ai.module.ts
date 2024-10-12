import { Module , forwardRef } from '@nestjs/common';
import { AIService } from './ai.service';
import { SeoStrategy } from './ai.seo.strategy'; 
import { RobotsService } from '../seo/robots/robots.service';
import { SEOModule } from 'src/seo/seo.module';
import { SEOEnum } from 'src/enum/seo.enum';
import { MongooseModule } from '@nestjs/mongoose';
import { SeoServiceInterface } from 'src/seo/seo.interface';
import { RobotsData, RobotsDataSchema } from '../seo/robots/robots-data.schema';
import { PromptData, PromptDataSchema } from  '../ai/prompt/ai.prompt-data.schema';
import { AiController } from './ai.controller';
import { AgentModule } from './agent/agent.modules';
import { AiPromptService } from './prompt/ai.prompt.service';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RobotsData.name, schema: RobotsDataSchema },
      { name: PromptData.name, schema: PromptDataSchema },
    ]),
    AgentModule
  ],
  providers: [AIService,SeoStrategy,
      {
      provide: 'seoServices',
      useFactory: (robotsService: RobotsService) => {
        const seoServices = new Map<string, SeoServiceInterface>();
        seoServices.set(SEOEnum.ROBOT, robotsService);
        return seoServices;
      },
      inject: [RobotsService],
    },
    RobotsService,
    AiPromptService],
    controllers: [AiController],
  exports: [AIService],
})
export class AIModule {
}
