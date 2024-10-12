import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RobotsModule } from './robots/robots.module';
import { SitemapModule } from './sitemap/sitemap.module';
import { RobotsData, RobotsDataSchema } from './robots/robots-data.schema';
import { SitemapData, SitemapDataSchema } from './sitemap/sitemap-data.schema';

@Module({
  imports: [
    RobotsModule,
    SitemapModule,
    MongooseModule.forFeature([
      { name: RobotsData.name, schema: RobotsDataSchema },
      { name: SitemapData.name, schema: SitemapDataSchema },
    ]),
  ],
  exports: [RobotsModule, SitemapModule],
})
export class SEOModule {}