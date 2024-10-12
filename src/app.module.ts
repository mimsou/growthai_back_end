import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { SEOModule } from './seo/seo.module';
import { ConfigModule } from '@nestjs/config';
import { mongooseConfig } from './config/mongoose.config';
import { AuditSessionModule } from './audit/audit-session.module';
import { AIModule } from './ai/ai.module';
import { CrawlerModule } from './crawler/core/crawler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot("mongodb://localhost:27017/seopt"),
    AuthModule,
    SEOModule,
    AuditSessionModule,
    AIModule,
    CrawlerModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
