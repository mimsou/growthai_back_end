import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Logger } from '@nestjs/common';
import * as os from 'os';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Configure WebSocket adapter with CORS
  app.useWebSocketAdapter(new IoAdapter(app));

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe());

  // Configure thread pool
  const numCPUs = os.cpus().length;
  const maxThreads = Math.min(numCPUs, parseInt(process.env.CRAWLER_MAX_THREADS) || 4);
  process.env.UV_THREADPOOL_SIZE = maxThreads.toString();
  app.useLogger(['log', 'error', 'warn', 'debug', 'verbose']);
  await app.listen(process.env.PORT || 5000);
}bootstrap();