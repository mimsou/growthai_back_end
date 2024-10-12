import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RobotsService } from './robots.service';
import { RobotsController } from './robots.controller';
import { RobotsData, RobotsDataSchema } from './robots-data.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: RobotsData.name, schema: RobotsDataSchema }])],
  controllers: [RobotsController],
  providers: [RobotsService],
})
export class RobotsModule {}
