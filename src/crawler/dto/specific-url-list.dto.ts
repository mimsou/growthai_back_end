import { IsArray, IsUrl, ArrayMinSize } from 'class-validator';

export class SpecificUrlListDto {
  urls: string[];
}
