import { Module } from '@nestjs/common';
 import { OllamaService } from './ollama.agent.service';
import { HttpModule } from '@nestjs/axios';
 
 const agentProviders = [
        OllamaService,
 ];

 @Module({
   imports: [HttpModule],
   providers: [...agentProviders],
   exports: [...agentProviders],
 })
 export class AgentModule {}
