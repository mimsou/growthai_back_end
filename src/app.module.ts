import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { SEOModule } from './seo/seo.module';
import { AuditSessionModule } from './audit/audit-session.module';
import { AIModule } from './ai/ai.module';
import { CrawlerModule } from './crawler/core/crawler.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: configService.get<number>('MONGO_POOL_SIZE', 10),
        maxIdleTimeMS: configService.get<number>('MONGO_MAX_IDLE_TIME_MS', 30000),
        connectTimeoutMS: configService.get<number>('MONGO_CONNECT_TIMEOUT_MS', 30000),
      }),
      inject: [ConfigService],
    }),
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
