import { ConfigService } from '@nestjs/config';

export function getNumberConfig(configService: ConfigService, key: string, defaultValue: number): number {
  const value = configService.get<number>(key);
  return value !== undefined ? value : defaultValue;
}

export function getStringConfig(configService: ConfigService, key: string, defaultValue: string): string {
  const value = configService.get<string>(key);
  return value !== undefined ? value : defaultValue;
}

export function getBooleanConfig(configService: ConfigService, key: string, defaultValue: boolean): boolean {
  const value = configService.get<string>(key);
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

export function getArrayConfig(configService: ConfigService, key: string, defaultValue: string[]): string[] {
  const value = configService.get<string>(key);
  return value ? value.split(',').map(item => item.trim()) : defaultValue;
}
