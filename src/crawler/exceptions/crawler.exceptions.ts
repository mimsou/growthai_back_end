export class RateLimitExceededException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitExceededException';
  }
}

export class CrawlerNetworkException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrawlerNetworkException';
  }
}

export class CrawlerParsingException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrawlerParsingException';
  }
}
