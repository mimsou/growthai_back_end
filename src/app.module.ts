import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { mongooseConfig } from './config/mongoose.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes environment variables available globally
    }),
    MongooseModule.forRoot("mongodb://localhost:27017/seopt"),
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}