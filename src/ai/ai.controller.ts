import { Controller, Post, Body, Res } from '@nestjs/common';
import { AIService } from './ai.service';
import { OllamaService } from './agent/ollama.agent.service';
import { AiPromptService } from './prompt/ai.prompt.service';
import { Response } from 'express'; // Import Express Response

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AIService, private readonly ollamaService: OllamaService, private readonly aiPromptService: AiPromptService) {}

  @Post('ask')
  async Ask(@Body() data: { prompt: string; seoSubject: string, sessionId: string }, @Res() res: Response): Promise<any> {
    const content = await this.aiService.getData(data.seoSubject, data.sessionId);
    const prompt = await this.aiPromptService.getPromptBySeoSubject(data.seoSubject);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked'); // Important for streaming response

    // Call the service to stream the AI response
    await this.ollamaService.streamResponse(prompt, content, res);
  }
}
