import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class CrawlerGateway {
  @WebSocketServer()
  server: Server;

  @OnEvent('crawling.progress')
  handleCrawlingProgress(payload: { crawlingId: string; percentage: number; currentUrl: string }) {
    this.server.emit('crawlingProgress', payload);
  }

  @OnEvent('crawling.completed')
  handleCrawlingCompleted(payload: { crawlingId: string; averageScores: Record<string, number> }) {
    this.server.emit('crawlingCompleted', payload);
  }
}

