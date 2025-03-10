import { Injectable, Logger } from '@nestjs/common';
import { ContentExtractor } from './extraction/content-extractor';
import { SEOAnalyzer } from './analysis/seo-analyzer';
import { UrlExtractor } from './extraction/url-extractor';
import { CrawlingDataRepository } from '../repository/crawling-data.repository';
import { CrawlerConfigService } from '../config/crawler-config.service';
import { RobotsTxtService } from './robot/robots-txt.service';
import { InclusionExclusionService } from '../config/inclusion-exclusion.service';
import { DirectoryTreeAnalyzer } from './analysis/directory-tree-analyzer';
import { DirectoryTreeCrawlerService } from './directory-tree/directory-tree-crawler.service';
import { AsyncHttpService } from './async-http.service';
import * as cheerio from 'cheerio';
import { RateLimitExceededException, CrawlerNetworkException, CrawlerParsingException } from '../exceptions/crawler.exceptions';
import { UrlAnalyzerService } from './analysis/url-analyzer.service';
import { HttpHeaderService } from './analysis/http-header.service';
import { ContentTypeAnalyzerService } from './analysis/content-type-analyzer.service';
import { OnPageElementService } from './analysis/on-page-element.service';
import { CrawlingSessionService } from './crawling-session.service';
import { ContentAnalysisService } from './analysis/content-analysis.service';
import { ImageAnalysisService } from './analysis/image-analysis.service';
import { JavaScriptRenderingService } from './javascript-rendering.service';
import { JavaRenderingScriptAnalysisService } from './analysis/java-rendering-script-analysis.service';
import { StructuredDataAnalysisService } from './analysis/structured-data-analysis.service';



@Injectable()
export class CrawlerWorker {
  private contentExtractor: ContentExtractor;
  private seoAnalyzer: SEOAnalyzer;
  private urlExtractor: UrlExtractor;
  private readonly logger = new Logger(CrawlerWorker.name);

  constructor(
    private crawlingDataRepository: CrawlingDataRepository,
    private crawlerConfigService: CrawlerConfigService,
    private robotsTxtService: RobotsTxtService,
    private inclusionExclusionService: InclusionExclusionService,
    private directoryTreeAnalyzer: DirectoryTreeAnalyzer,
    private directoryTreeCrawlerService: DirectoryTreeCrawlerService,
    private asyncHttpService: AsyncHttpService,
    private urlAnalyzerService: UrlAnalyzerService,
    private httpHeaderService: HttpHeaderService,
    private contentTypeAnalyzerService: ContentTypeAnalyzerService,
    private onPageElementService: OnPageElementService,
    private crawlingSessionService: CrawlingSessionService,
    private contentAnalysisService: ContentAnalysisService,
    private imageAnalysisService: ImageAnalysisService,
    private javaRenderingScriptAnalysisService: JavaRenderingScriptAnalysisService,
    private javascriptRenderingService: JavaScriptRenderingService,
    private structuredDataAnalysisService: StructuredDataAnalysisService,

  ) {
    this.contentExtractor = new ContentExtractor();
    this.seoAnalyzer = new SEOAnalyzer(this.directoryTreeAnalyzer, crawlerConfigService);
    this.urlExtractor = new UrlExtractor(crawlerConfigService, robotsTxtService, inclusionExclusionService);
  }

  async crawlAndExtract(crawlingId: string, url: string, depth: number, crawlConfig: any): Promise<any> {
    try {
     
      const { $, loadTime, statusCode, contentTypeAnalysis, mimeTypeAnalysis, xRobotsTagAnalysis, headers, technicalSeoAnalysis  } = await this.fetchPageWithStatus(url);
     
      if (statusCode >= 400) {
        this.logger.warn(`Broken link detected: ${url} (Status: ${statusCode})`);
        return { 
          crawlingId,
          pageUrlRelative: url,
          isBroken: true,
          statusCode,
          depth,
          newUrls: []
        };
      }
     
      const urlAnalysis = this.urlAnalyzerService.analyzeUrl(url);
      const urlParameterAnalysis = this.urlAnalyzerService.analyzeUrlParameters(url);
      const urlLengthAnalysis = this.urlAnalyzerService.analyzeUrlLength(url);
      const httpStatusCodeAnalysis = this.httpHeaderService.analyzeHttpStatusCode(statusCode);
      const securityHeaderAnalysis = this.httpHeaderService.analyzeSecurityHeaders(headers);
      const securityHeaderScore = this.seoAnalyzer.calculateSecurityHeaderScore(securityHeaderAnalysis);
      const titleTagAnalysis = this.onPageElementService.analyzeTitleTag($);
      const titleTagScore = this.seoAnalyzer.calculateTitleTagScore(titleTagAnalysis);
      const siteKeywords = await this.crawlingSessionService.getExtractedKeywords(crawlingId);
      const metaDescriptionAnalysis = this.onPageElementService.analyzeMetaDescription($, siteKeywords);
      const metaDescriptionScore = this.seoAnalyzer.calculateMetaDescriptionScore(metaDescriptionAnalysis);
      const headingAnalysis = this.onPageElementService.analyzeHeadings($);
      const headingAnalysisScore = this.seoAnalyzer.calculateHeadingScore(headingAnalysis);
      const metaKeywordsAnalysis = this.onPageElementService.analyzeMetaKeywords($);
      const metaRobotsTagAnalysis = this.onPageElementService.analyzeMetaRobotsTag($);
      const metaRobotsTagScore =this.seoAnalyzer.calculateMetaRobotsTagScore(metaRobotsTagAnalysis);
      const canonicalTagAnalysis = this.onPageElementService.analyzeCanonicalTag($, url);
      const relLinkAnalysis = this.onPageElementService.analyzeRelLinks($);
      const relLinkScore = this.seoAnalyzer.calculateRelLinkScore(relLinkAnalysis);
      const openGraphAnalysis = this.onPageElementService.analyzeOpenGraphTags($);
      const twitterCardAnalysis = this.onPageElementService.analyzeTwitterCardTags($);
      const viewportAnalysis = this.onPageElementService.analyzeViewportMetaTag($);
      const openGraphScore = this.seoAnalyzer.calculateOpenGraphScore(openGraphAnalysis);
      const twitterCardScore = this.seoAnalyzer.calculateTwitterCardScore(twitterCardAnalysis);
      const viewportScore = this.seoAnalyzer.calculateViewportScore(viewportAnalysis);
      const detectedLanguage = await this.contentAnalysisService.detectLanguage($);
      const keywordDensity = this.contentAnalysisService.calculateKeywordDensity($, siteKeywords);
      const keywordUsage = this.contentAnalysisService.analyzeKeywordUsage($, siteKeywords);
      const textContent = this.contentAnalysisService.extractTextContent($);
      const contentToHtmlRatio = this.contentAnalysisService.calculateContentToHtmlRatio($);
      const contentHash = this.contentAnalysisService.generateContentHash(textContent);
      const wordCount = this.contentAnalysisService.countWords(textContent);
      const wordCountScore = this.seoAnalyzer.calculateWordCountScore(wordCount);
      const characterCount = textContent.length;
      const sentenceCount = this.contentAnalysisService.countSentences(textContent);
      const paragraphCount = this.contentAnalysisService.countParagraphs($);
      const topKeywords = this.contentAnalysisService.extractTopKeywords(textContent);
      const htmlContent = $.html();
      const thinContentAnalysis = this.contentAnalysisService.analyzeThinContent(htmlContent);
      const readabilityAnalysis = this.contentAnalysisService.calculateReadabilityScore(textContent);
      const imageAnalysisResults = await this.imageAnalysisService.analyzeImages($, url, siteKeywords);
      
      // Aggregate image analysis results
      const totalImages = imageAnalysisResults.length;
      const brokenImages = imageAnalysisResults.filter(img => img.isBroken).length;
      const imagesWithoutAlt = imageAnalysisResults.filter(img => !img.altText.present).length;
      const imagesWithoutTitle = imageAnalysisResults.filter(img => !img.titleAttribute.present).length;
      const oversizedImages = imageAnalysisResults.filter(img => img.fileSize > crawlConfig.maxImageSizeBytes).length;
      const imagesWithTextContent = imageAnalysisResults.filter(img => img.textInImage?.hasText).length;
      const imageAnalysisScore = this.seoAnalyzer.calculateImageSEOScore(imageAnalysisResults);
      const imageFormatDistribution = imageAnalysisResults.reduce((acc, img) => {
        acc[img.fileFormat] = (acc[img.fileFormat] || 0) + 1;
        return acc;
      }, {});

      const uniqueImageUrls = [...new Set(imageAnalysisResults.map(img => img.url))];

      const nonRenderedHtml = $.html();
      const renderedHtml = await this.javascriptRenderingService.renderPage(url);

      // Add JavaScript rendering
      await this.javascriptRenderingService.init();
      const renderedContent = await this.javascriptRenderingService.renderPage(url);
      const jsRenderingAnalysis = this.javaRenderingScriptAnalysisService.analyzeRenderedVsNonRendered(nonRenderedHtml, renderedHtml);

      const pageData = await this.contentExtractor.extractPageData($, url, loadTime);
      pageData.headingAnalysis = headingAnalysis;
      const seoScores = await this.seoAnalyzer.calculateSEOScores($, pageData);
      const newUrls = await this.urlExtractor.extractLinks($, url, depth, crawlConfig);

      const structuredDataAnalysis = await this.structuredDataAnalysisService.analyzeStructuredData($, url);


      return { 
        pageData: {
          ...pageData,
          crawlingId,
          seoScores: {
            ...seoScores,
            titleTag: titleTagScore,
            securityHeader: securityHeaderScore,
            metaDescription: metaDescriptionScore,
            metaRobotsTag: metaRobotsTagScore,
            heading: headingAnalysisScore,
            relLink: relLinkScore,
            openGraph: openGraphScore,
            twitterCard: twitterCardScore,
            viewport: viewportScore,
            wordCountScore,
            imageAnalysisScore,
            technical: technicalSeoAnalysis.performanceMetrics.performanceScore,
            compression: technicalSeoAnalysis.compressionAnalysis.compressionScore,
            http2: technicalSeoAnalysis.http2Analysis.http2Score,
            pageSize: technicalSeoAnalysis.pageSizeAnalysis.pageSizeScore,
            structuredData: this.seoAnalyzer.calculateStructuredDataScore(structuredDataAnalysis)
          },
          depth,
          statusCode,
          isBroken: false,
          urlAnalysis,
          urlParameterAnalysis,
          urlLengthAnalysis,
          httpStatusCodeAnalysis,
          contentTypeAnalysis,
          mimeTypeAnalysis,
          xRobotsTagAnalysis,
          securityHeaderAnalysis,
          metaDescriptionAnalysis,
          headingAnalysis,
          metaKeywordsAnalysis,
          metaRobotsTagAnalysis,
          canonicalTagAnalysis,
          relLinkAnalysis,
          openGraphAnalysis,
          twitterCardAnalysis,
          viewportAnalysis,
          wordCount,
          detectedLanguage,
          keywordDensity,
          keywordUsage,
          contentToHtmlRatio,
          contentHash,
          characterCount,
          sentenceCount,
          paragraphCount,
          topKeywords,
          thinContentAnalysis,
          readabilityAnalysis,
          imageAnalysis: imageAnalysisResults,
          totalImages,
          brokenImages,
          imagesWithoutAlt,
          imagesWithoutTitle,
          oversizedImages,
          imagesWithTextContent,
          imageFormatDistribution,
          uniqueImageUrls,
          jsRenderingAnalysis,
          renderedContent,
          technicalSeoAnalysis,
          structuredDataAnalysis
        },
        newUrls 
      };

    } catch (error) {
      if (error instanceof RateLimitExceededException) {
        this.logger.warn(`Rate limit exceeded for URL: ${url}. Skipping.`);
      } else if (error instanceof CrawlerNetworkException) {
        this.logger.error(`Network error crawling ${url}: ${error.message}`);
      } else if (error instanceof CrawlerParsingException) {
        this.logger.error(`Parsing error crawling ${url}: ${error.message}`);
      } else {
        this.logger.error(`Unexpected error crawling ${url}: ${error.message}`);
      }

      return { 
        crawlingId,
        pageUrlRelative: url,
        isBroken: true,
        error: error.message,
        depth,
        newUrls: []
      };
    }
  }

  private async fetchPageWithStatus(url: string): Promise<{ $: cheerio.CheerioAPI; loadTime: number; statusCode: number; contentTypeAnalysis: any; mimeTypeAnalysis: any, xRobotsTagAnalysis: any;headers: Record<string, string>;technicalSeoAnalysis: any }> {
    const startTime = Date.now();
    try {
      const response = await this.asyncHttpService.get(url);
      const loadTime = Date.now() - startTime;
      const $ = cheerio.load(response.data);
      return { 
        $, 
        loadTime, 
        statusCode: response.status,
        contentTypeAnalysis: response.contentTypeAnalysis,
        mimeTypeAnalysis: response.mimeTypeAnalysis,
        xRobotsTagAnalysis: response.xRobotsTagAnalysis,
        headers: response.headers as Record<string, string>,
        technicalSeoAnalysis : response.technicalSeoAnalysis
      };
    } catch (error) {
      if (error instanceof CrawlerNetworkException) {
        throw error;
      }
      const loadTime = Date.now() - startTime;
      return { 
        $: cheerio.load(''), 
        loadTime, 
        statusCode: error.response?.status || 0,
        contentTypeAnalysis: null,
        mimeTypeAnalysis: null,
        xRobotsTagAnalysis : null,
        headers: null,
        technicalSeoAnalysis : null
      };
    }
  }

  async crawlDirectoryTree(crawlingId: string, rootPath: string, crawlConfig: any): Promise<any> {
    const directoryTree = await this.directoryTreeCrawlerService.crawlDirectoryTree(rootPath);
    const analysis = await this.directoryTreeAnalyzer.analyzeDirectoryTree(directoryTree);
    await this.crawlingDataRepository.bulkUpdateCrawlingData([{
      crawlingId,
      directoryTree,
      directoryTreeAnalysis: analysis,
    }]);
    return { directoryTree, analysis };
  }
}
