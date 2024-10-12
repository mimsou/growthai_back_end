import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Injectable()
export class OllamaService {
  private readonly baseUrl: string;
  private readonly httpService: HttpService;

  constructor(private readonly configService: ConfigService, httpService: HttpService) {
    this.baseUrl = this.configService.get<string>('LOCAL_IA_AGENT_SERVICE'); // Base URL from environment variable
    this.httpService = httpService;
  }

  async streamResponse(prompt: string, context: string, res: Response): Promise<void> {
    const endpoint = `${this.baseUrl}/api/generate`;

    try {
      const response = await this.httpService.post(endpoint, {
        model: 'llama3.1:8b',
        prompt: `${prompt} ${context}`,
      }, { responseType: 'stream' }).toPromise();

      if (!response || !response.data) {
        throw new HttpException(`Error contacting the AI model`, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      response.data.on('data', (chunk) => {
        res.write(chunk);
      });

      response.data.on('end', () => {
        res.end();
      });
    } catch (error) {
      console.error(error);
      throw new HttpException(`Error contacting the AI model: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
