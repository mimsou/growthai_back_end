import { Injectable } from '@nestjs/common';

@Injectable()
export class ExternalAPIService {
  async fetchData(apiUrl: string, params: any): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return "voila ";
  }
}
