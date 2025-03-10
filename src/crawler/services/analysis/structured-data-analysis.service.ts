import { Injectable, Logger } from '@nestjs/common';
import { CrawlerConfigService } from '../../config/crawler-config.service';
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import * as jsonld from 'jsonld';
import * as schemaOrgTypes from 'schema-dts';
import { Element } from 'domhandler';

@Injectable()
export class StructuredDataAnalysisService {
  private readonly logger = new Logger(StructuredDataAnalysisService.name);

  constructor(
    private readonly crawlerConfigService: CrawlerConfigService,
  ) {}


  async analyzeStructuredData($: cheerio.CheerioAPI, url: string): Promise<StructuredDataAnalysis> {
    const config = this.crawlerConfigService.getStructuredDataConfig();
    
    const jsonLdData = config.jsonLd.enabled ? await this.extractJsonLd($) : [];
    const microdataResults = config.microdata.enabled ? this.extractMicrodata($) : [];
    const rdfaResults = config.rdfa.enabled ? this.extractRdfa($) : [];

    const allStructuredData = [...jsonLdData, ...microdataResults, ...rdfaResults];
    
    const schemaTypeAnalysis = this.analyzeSchemaTypes(allStructuredData, config.schemaTypes);
    const richSnippetAnalysis = config.richSnippets.checkEligibility ? 
      this.analyzeRichSnippetEligibility(allStructuredData, config.richSnippets) : null;
    
    const validationResults = this.validateStructuredData(allStructuredData, config.validation);
    const competitiveAnalysis = config.competitive.enabled ? 
      this.performCompetitiveAnalysis(allStructuredData, config.competitive) : null;

    return {
      jsonLd: {
        data: jsonLdData,
        count: jsonLdData.length,
        valid: this.validateJsonLd(jsonLdData, config.jsonLd),
        errors: this.getJsonLdErrors(jsonLdData, config.jsonLd)
      },
      microdata: {
        data: microdataResults,
        count: microdataResults.length,
        nestingValid: this.validateMicrodataNesting(microdataResults, config.microdata),
        errors: this.getMicrodataErrors(microdataResults, config.microdata)
      },
      rdfa: {
        data: rdfaResults,
        count: rdfaResults.length,
        prefixesValid: this.validateRdfaPrefixes(rdfaResults, config.rdfa),
        errors: this.getRdfaErrors(rdfaResults, config.rdfa)
      },
      schemaTypes: schemaTypeAnalysis,
      richSnippets: richSnippetAnalysis,
      validation: validationResults,
      competitive: competitiveAnalysis,
      recommendations: this.generateRecommendations(allStructuredData, config),
      implementationScore: this.calculateImplementationScore(allStructuredData, config)
    };
  }

  // Add to the StructuredDataAnalysisService class

private validateJsonLd(data: any[], config: any): boolean {
    return data.every(item => {
      const hasRequiredProps = config.requiredProperties.every(prop => 
        Object.prototype.hasOwnProperty.call(item, prop)
      );
      const isValidSize = JSON.stringify(item).length <= config.maxSize;
      return hasRequiredProps && isValidSize;
    });
  }
  
  private getJsonLdErrors(data: any[], config: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    data.forEach((item, index) => {
      if (!item['@context']) {
        errors.push({
          type: 'JSON_LD_ERROR',
          message: `Missing @context in JSON-LD block ${index}`,
          severity: 'ERROR'
        });
      }
  
      if (!item['@type']) {
        errors.push({
          type: 'JSON_LD_ERROR',
          message: `Missing @type in JSON-LD block ${index}`,
          severity: 'ERROR'
        });
      }
  
      const size = JSON.stringify(item).length;
      if (size > config.maxSize) {
        errors.push({
          type: 'JSON_LD_ERROR',
          message: `JSON-LD block ${index} exceeds maximum size of ${config.maxSize} bytes`,
          severity: 'WARNING'
        });
      }
    });
  
    return errors;
  }
  
  private validateMicrodataNesting(data: any[], config: any): boolean {
    return data.every(item => {
      const nestingDepth = this.calculateNestingDepth(item);
      return nestingDepth <= config.maxNestedDepth;
    });
  }
  
  private calculateNestingDepth(item: any): number {
    let maxDepth = 0;
    
    const traverse = (obj: any, depth: number) => {
      if (depth > maxDepth) maxDepth = depth;
      
      if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(value => {
          if (typeof value === 'object') {
            traverse(value, depth + 1);
          }
        });
      }
    };
  
    traverse(item, 0);
    return maxDepth;
  }
  
  private getMicrodataErrors(data: any[], config: any): ValidationError[] {
    const errors: ValidationError[] = [];
  
    data.forEach((item, index) => {
      if (!item.type) {
        errors.push({
          type: 'MICRODATA_ERROR',
          message: `Missing itemtype in microdata block ${index}`,
          severity: 'ERROR'
        });
      }
  
      const nestingDepth = this.calculateNestingDepth(item);
      if (nestingDepth > config.maxNestedDepth) {
        errors.push({
          type: 'MICRODATA_ERROR',
          message: `Microdata block ${index} exceeds maximum nesting depth of ${config.maxNestedDepth}`,
          severity: 'WARNING'
        });
      }
  
      if (Object.keys(item.properties || {}).length === 0) {
        errors.push({
          type: 'MICRODATA_ERROR',
          message: `No properties found in microdata block ${index}`,
          severity: 'WARNING'
        });
      }
    });
  
    return errors;
  }
  
  private validateRdfaPrefixes(data: any[], config: any): boolean {
    return data.every(item => {
      if (!item.prefix) return true;
      return config.requiredPrefixes.some(prefix => 
        item.prefix.includes(prefix)
      );
    });
  }
  
  private getRdfaErrors(data: any[], config: any): ValidationError[] {
    const errors: ValidationError[] = [];
  
    data.forEach((item, index) => {
      if (!item.property && !item.type) {
        errors.push({
          type: 'RDFA_ERROR',
          message: `Missing property or type in RDFa block ${index}`,
          severity: 'ERROR'
        });
      }
  
      if (item.prefix) {
        const hasRequiredPrefix = config.requiredPrefixes.some(prefix => 
          item.prefix.includes(prefix)
        );
        if (!hasRequiredPrefix) {
          errors.push({
            type: 'RDFA_ERROR',
            message: `Missing required prefix in RDFa block ${index}`,
            severity: 'WARNING'
          });
        }
      }
    });
  
    return errors;
  }
  
  private generateSnippetImprovements(eligibleSnippets: RichSnippetEligibility[], missingRequirements: RichSnippetRequirement[]): string[] {
    const improvements: string[] = [];
  
    // Suggest improvements for eligible snippets
    eligibleSnippets.forEach(snippet => {
      snippet.enhancementPossibilities.forEach(enhancement => {
        improvements.push(
          `Add ${enhancement.property} to ${snippet.type} to ${enhancement.recommendation}`
        );
      });
    });
  
    // Suggest fixes for missing requirements
    missingRequirements.forEach(requirement => {
      const missingProps = requirement.missing.join(', ');
      improvements.push(
        `Add required properties (${missingProps}) to make ${requirement.type} eligible for rich snippets`
      );
    });
  
    return improvements;
  }
  

  private async extractJsonLd($: cheerio.CheerioAPI): Promise<any[]> {
    const jsonLdScripts = $('script[type="application/ld+json"]');
    const results: any[] = [];
  
    for (let i = 0; i < jsonLdScripts.length; i++) {
      try {
        const content = $(jsonLdScripts[i]).html();
        if (content) {
          const parsed = JSON.parse(content);
          const expanded = await this.validateAndExpandJsonLd(parsed);
          if (expanded && this.validateSchemaType(expanded)) {
            results.push(expanded);
          }
        }
      } catch (error) {
        this.logger.warn(`Error parsing JSON-LD: ${error.message}`);
      }
    }
  
    return results;
  }

  private async validateAndExpandJsonLd(jsonLdData: any): Promise<any> {
    try {
      // Expand JSON-LD to normalize the data structure
      const expanded = await jsonld.expand(jsonLdData);
      // Compact against Schema.org context
      const compacted = await jsonld.compact(expanded, 'https://schema.org');
      return compacted;
    } catch (error) {
      this.logger.warn(`JSON-LD processing error: ${error.message}`);
      return null;
    }
  }
  
  private validateSchemaType(data: any): boolean {
    // Use schema-dts for type checking
    const type = data['@type'] as keyof typeof schemaOrgTypes;
    return type in schemaOrgTypes;
  }

  private extractMicrodata($: cheerio.CheerioAPI): any[] {
    const results: any[] = [];
    const itemscopes = $('[itemscope]');

    itemscopes.each((_, element) => {
      const itemtype = $(element).attr('itemtype');
      const properties = this.extractMicrodataProperties($, element);
      
      if (itemtype) {
        results.push({
          type: itemtype,
          properties: properties
        });
      }
    });

    return results;
  }

  private extractMicrodataProperties($: cheerio.CheerioAPI, element: Element): Record<string, any> {
    const properties: Record<string, any> = {};
    const itemprops = $(element).find('[itemprop]');

    itemprops.each((_, prop) => {
      const name = $(prop).attr('itemprop');
      if (name) {
        properties[name] = this.extractMicrodataValue($, prop);
      }
    });

    return properties;
  }

  private extractMicrodataValue($: cheerio.CheerioAPI, element: Element): any {
    const $element = $(element);
    
    if ($element.attr('itemscope') !== undefined) {
      return this.extractMicrodataProperties($, element);
    }

    if ($element.attr('content')) {
      return $element.attr('content');
    }

    if ($element.attr('datetime')) {
      return $element.attr('datetime');
    }

    return $element.text().trim();
  }

  private extractRdfa($: cheerio.CheerioAPI): any[] {
    const results: any[] = [];
    const rdfaElements = $('[typeof],[property]');

    rdfaElements.each((_, element) => {
      const type = $(element).attr('typeof');
      const property = $(element).attr('property');
      
      if (type || property) {
        results.push({
          type: type || null,
          property: property || null,
          content: $(element).attr('content') || $(element).text().trim(),
          resource: $(element).attr('resource'),
          prefix: this.extractRdfaPrefix($(element))
        });
      }
    });

    return results;
  }

  private extractRdfaPrefix($element: cheerio.Cheerio<Element>): string | null {
    let current = $element;
    while (current.length) {
      const prefix = current.attr('prefix');
      if (prefix) return prefix;
      current = current.parent();
    }
    return null;
  }

  private validateStructuredData(data: any[], config: any): ValidationResults {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    data.forEach(item => {
      // Validate against Schema.org
      if (config.validateAgainstSchemaOrg) {
        const schemaErrors = this.validateAgainstSchemaOrg(item);
        errors.push(...schemaErrors);
      }

      // Validate against Google requirements
      if (config.validateAgainstGoogleRequirements) {
        const googleErrors = this.validateAgainstGoogleRequirements(item);
        errors.push(...googleErrors);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      errorCount: errors.length,
      warningCount: warnings.length
    };
  }

  private validateAgainstSchemaOrg(item: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!item['@type']) {
      errors.push({
        type: 'SCHEMA_ERROR',
        message: 'Missing required @type property',
        severity: 'ERROR'
      });
    }

    // Add more Schema.org validation rules
    return errors;
  }

  private validateAgainstGoogleRequirements(item: any): ValidationError[] {
    const errors: ValidationError[] = [];
    const type = item['@type'];

    if (type) {
      switch (type) {
        case 'Product':
          if (!item.name || !item.offers) {
            errors.push({
              type: 'GOOGLE_REQUIREMENT',
              message: 'Product markup requires name and offers properties',
              severity: 'ERROR'
            });
          }
          break;
        // Add more Google-specific requirements for other types
      }
    }

    return errors;
  }

  private analyzeSchemaTypes(data: any[], config: any): SchemaTypeAnalysis {
    const types = new Set<string>();
    const deprecated = new Set<string>();
    const missing = new Set<string>(config.preferredTypes);
  
    data.forEach(item => {
      const type = item['@type'] || item.type;
      if (type) {
        types.add(type);
        missing.delete(type);
        if (this.isDeprecatedSchema(type)) {
          deprecated.add(type);
        }
      }
    });
  
    return {
      identifiedTypes: Array.from(types),
      deprecatedTypes: Array.from(deprecated),
      missingRecommendedTypes: Array.from(missing) as string[],
      coverage: this.calculateTypeCoverage(types, config.preferredTypes)
    };
  }

  private isDeprecatedSchema(type: string): boolean {
    // Add logic to check against a list of deprecated schema types
    const deprecatedTypes = ['Store', 'DataType'];
    return deprecatedTypes.includes(type);
  }

  private calculateTypeCoverage(found: Set<string>, preferred: string[]): number {
    const intersection = preferred.filter(type => found.has(type));
    return intersection.length / preferred.length;
  }

  private analyzeRichSnippetEligibility(data: any[], config: any): RichSnippetAnalysis {
    const eligibleSnippets: RichSnippetEligibility[] = [];
    const missingRequirements: RichSnippetRequirement[] = [];

    data.forEach(item => {
      const type = item['@type'] || item.type;
      if (type && config.types.includes(type)) {
        const requirements = this.checkRichSnippetRequirements(type, item);
        if (requirements.isEligible) {
          eligibleSnippets.push({
            type,
            confidence: requirements.confidence,
            enhancementPossibilities: requirements.enhancementPossibilities
          });
        } else {
          missingRequirements.push({
            type,
            missing: requirements.missing
          });
        }
      }
    });

    return {
      eligibleSnippets,
      missingRequirements,
      potentialImprovements: this.generateSnippetImprovements(eligibleSnippets, missingRequirements)
    };
  }

  private checkRichSnippetRequirements(type: string, data: any): RichSnippetRequirementCheck {
    const requirements: RichSnippetRequirementCheck = {
      isEligible: false,
      confidence: 0,
      missing: [],
      enhancementPossibilities: []
    };

    switch (type) {
      case 'Product':
        requirements.isEligible = this.checkProductRequirements(data, requirements);
        break;
      case 'Article':
        requirements.isEligible = this.checkArticleRequirements(data, requirements);
        break;
      // Add more type-specific requirement checks
    }

    return requirements;
  }

  private checkProductRequirements(data: any, requirements: RichSnippetRequirementCheck): boolean {
    let isEligible = true;
    const required = ['name', 'offers', 'image'];
    const recommended = ['description', 'review', 'aggregateRating'];

    required.forEach(prop => {
      if (!data[prop]) {
        isEligible = false;
        requirements.missing.push(prop);
      }
    });

    recommended.forEach(prop => {
      if (!data[prop]) {
        requirements.enhancementPossibilities.push({
          property: prop,
          impact: 'MEDIUM',
          recommendation: `Add ${prop} to improve rich snippet chances`
        });
      }
    });

    requirements.confidence = isEligible ? 0.8 : 0.4;
    return isEligible;
  }

  private checkArticleRequirements(data: any, requirements: RichSnippetRequirementCheck): boolean {
    // Similar to checkProductRequirements but for Article type
    return true;
  }

  private performCompetitiveAnalysis(data: any[], config: any): CompetitiveAnalysis {
    return {
      industryStandardsAlignment: this.calculateIndustryAlignment(data, config.industryStandards),
      comprehensivenessScore: this.calculateComprehensivenessScore(data),
      uniqueFeatures: this.identifyUniqueFeatures(data),
      improvements: this.suggestCompetitiveImprovements(data, config)
    };
  }

  private calculateIndustryAlignment(data: any[], standards: string[]): number {
    const implementedStandards = standards.filter(standard => 
      data.some(item => item['@type'] === standard || item.type === standard)
    );
    return implementedStandards.length / standards.length;
  }

  private calculateComprehensivenessScore(data: any[]): number {
    const maxPossibleProperties = {
      Product: 15,
      Article: 12,
      LocalBusiness: 20,
      Recipe: 18,
      // Add more type benchmarks
    };
  
    let totalScore = 0;
    data.forEach(item => {
      const type = item['@type'];
      if (type && maxPossibleProperties[type]) {
        const implementedProps = Object.keys(item).length;
        totalScore += implementedProps / maxPossibleProperties[type];
      }
    });
  
    return data.length > 0 ? totalScore / data.length : 0;
  }
  
  private identifyUniqueFeatures(data: any[]): string[] {
    const uniqueFeatures: string[] = [];
    const commonProperties = new Set(['@type', '@context', 'name', 'description']);
  
    data.forEach(item => {
      Object.keys(item).forEach(prop => {
        if (!commonProperties.has(prop) && this.isAdvancedProperty(prop)) {
          uniqueFeatures.push(`Advanced ${item['@type']} property: ${prop}`);
        }
      });
    });
  
    return [...new Set(uniqueFeatures)];
  }
  
  private isAdvancedProperty(prop: string): boolean {
    const advancedProps = [
      'aggregateRating',
      'review',
      'mainEntityOfPage',
      'potentialAction',
      'sameAs',
      'identifier'
    ];
    return advancedProps.includes(prop);
  }
  
  private suggestCompetitiveImprovements(data: any[], config: any): string[] {
    const improvements: string[] = [];
    const implementedTypes = new Set(data.map(item => item['@type']));
  
    // Check for missing industry standards
    config.industryStandards.forEach(standard => {
      if (!implementedTypes.has(standard)) {
        improvements.push(`Implement ${standard} schema to match industry standards`);
      }
    });
  
    // Check for advanced property opportunities
    data.forEach(item => {
      const type = item['@type'];
      const advancedFeatures = this.getAdvancedFeatures(type);
      advancedFeatures.forEach(feature => {
        if (!item[feature.property]) {
          improvements.push(`Add ${feature.property} to ${type} to gain competitive advantage: ${feature.benefit}`);
        }
      });
    });
  
    return improvements;
  }
  
  private getAdvancedFeatures(type: string): Array<{property: string, benefit: string}> {
    const features = {
      Product: [
        { property: 'aggregateRating', benefit: 'Show star ratings in search results' },
        { property: 'review', benefit: 'Display customer reviews in rich snippets' },
        { property: 'brand', benefit: 'Enhance product visibility with brand information' }
      ],
      Article: [
        { property: 'author', benefit: 'Establish content authority' },
        { property: 'dateModified', benefit: 'Show content freshness' },
        { property: 'speakable', benefit: 'Optimize for voice search' }
      ],
      // Add more type-specific advanced features
    };
  
    return features[type] || [];
  }

  private calculateImplementationScore(data: any[], config: any): number {
    const weights = {
      presence: 0.2,
      validity: 0.3,
      richSnippetEligibility: 0.3,
      competitiveness: 0.2
    };

    const presenceScore = data.length > 0 ? 1 : 0;
    const validityScore = this.calculateValidityScore(data);
    const richSnippetScore = this.calculateRichSnippetScore(data);
    const competitivenessScore = this.calculateCompetitivenessScore(data, config);

    return (
      presenceScore * weights.presence +
      validityScore * weights.validity +
      richSnippetScore * weights.richSnippetEligibility +
      competitivenessScore * weights.competitiveness
    );
  }

  private calculateValidityScore(data: any[]): number {
    let validItems = 0;
    data.forEach(item => {
      if (item['@type'] && item['@context']) validItems++;
    });
    return data.length > 0 ? validItems / data.length : 0;
  }

  private calculateRichSnippetScore(data: any[]): number {
    const eligibleTypes = ['Product', 'Article', 'Recipe', 'Review', 'Event'];
    let eligibleItems = 0;
    data.forEach(item => {
      if (eligibleTypes.includes(item['@type'])) eligibleItems++;
    });
    return data.length > 0 ? eligibleItems / data.length : 0;
  }

  private calculateCompetitivenessScore(data: any[], config: any): number {
    const implementedStandards = config.competitive.industryStandards.filter(standard =>
      data.some(item => item['@type'] === standard)
    );
    return implementedStandards.length / config.competitive.industryStandards.length;
  }

  private generateRecommendations(data: any[], config: any): StructuredDataRecommendation[] {
    const recommendations: StructuredDataRecommendation[] = [];

    // Check for missing essential schemas
    const implementedTypes = new Set(data.map(item => item['@type']));
    config.schemaTypes.preferredTypes.forEach(type => {
      if (!implementedTypes.has(type)) {
        recommendations.push({
          type: 'MISSING_SCHEMA',
          priority: 'HIGH',
          message: `Implement ${type} schema to improve search visibility`,
          impact: 'HIGH',
          implementation: this.getSchemaTemplate(type)
        });
      }
    });

    // Check for enhancement opportunities
    data.forEach(item => {
      const enhancements = this.findEnhancementOpportunities(item);
      recommendations.push(...enhancements);
    });

    // Add competitive recommendations
    if (config.competitive.enabled) {
      const competitiveRecs = this.generateCompetitiveRecommendations(data, config);
      recommendations.push(...competitiveRecs);
    }

    return recommendations;
  }

  private findEnhancementOpportunities(item: any): StructuredDataRecommendation[] {
    const opportunities: StructuredDataRecommendation[] = [];
    const type = item['@type'];

    if (type) {
      const template = this.getSchemaTemplate(type);
      const missingProperties = this.findMissingProperties(item, template);

      missingProperties.forEach(prop => {
        opportunities.push({
          type: 'ENHANCEMENT',
          priority: this.getPropertyPriority(type, prop),
          message: `Add ${prop} to ${type} schema for better search presentation`,
          impact: this.getPropertyImpact(type, prop),
          implementation: this.getPropertyTemplate(type, prop)
        });
      });
    }

    return opportunities;
  }

  private getSchemaTemplate(type: string): any {
    const templates: Record<string, any> = {
      Product: {
        '@type': 'Product',
        name: 'Product Name',
        description: 'Product Description',
        image: 'Product Image URL',
        offers: {
          '@type': 'Offer',
          price: 'Price',
          priceCurrency: 'Currency Code'
        }
      },
      // Add more templates for other types
    };

    return templates[type] || {};
  }

  private findMissingProperties(item: any, template: any): string[] {
    const missing: string[] = [];
    Object.keys(template).forEach(key => {
      if (!item[key]) missing.push(key);
    });
    return missing;
  }

  private getPropertyPriority(type: string, property: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    const highPriorityProps: Record<string, string[]> = {
      Product: ['name', 'offers', 'image'],
      Article: ['headline', 'author', 'datePublished'],
      // Add more type-specific priority properties
    };

    return highPriorityProps[type]?.includes(property) ? 'HIGH' : 'MEDIUM';
  }

  private getPropertyImpact(type: string, property: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    const highImpactProps: Record<string, string[]> = {
      Product: ['offers', 'aggregateRating'],
      Article: ['headline', 'datePublished'],
      // Add more type-specific impact properties
    };

    return highImpactProps[type]?.includes(property) ? 'HIGH' : 'MEDIUM';
  }

  private getPropertyTemplate(type: string, property: string): string {
    return `"${property}": "Add ${property} value here"`;
  }

  private generateCompetitiveRecommendations(data: any[], config: any): StructuredDataRecommendation[] {
    const recommendations: StructuredDataRecommendation[] = [];
    const implementedTypes = new Set(data.map(item => item['@type']));

    config.competitive.industryStandards.forEach(standard => {
      if (!implementedTypes.has(standard)) {
        recommendations.push({
          type: 'COMPETITIVE',
          priority: 'HIGH',
          message: `Implement ${standard} schema to match industry standards`,
          impact: 'HIGH',
          implementation: this.getSchemaTemplate(standard)
        });
      }
    });

    return recommendations;
  }
}

interface StructuredDataAnalysis {
  jsonLd: {
    data: any[];
    count: number;
    valid: boolean;
    errors: ValidationError[];
  };
  microdata: {
    data: any[];
    count: number;
    nestingValid: boolean;
    errors: ValidationError[];
  };
  rdfa: {
    data: any[];
    count: number;
    prefixesValid: boolean;
    errors: ValidationError[];
  };
  schemaTypes: SchemaTypeAnalysis;
  richSnippets: RichSnippetAnalysis | null;
  validation: ValidationResults;
  competitive: CompetitiveAnalysis | null;
  recommendations: StructuredDataRecommendation[];
  implementationScore: number;
}

interface SchemaTypeAnalysis {
  identifiedTypes: string[];
  deprecatedTypes: string[];
  missingRecommendedTypes: string[];
  coverage: number;
}

interface RichSnippetAnalysis {
  eligibleSnippets: RichSnippetEligibility[];
  missingRequirements: RichSnippetRequirement[];
  potentialImprovements: string[];
}

interface RichSnippetEligibility {
  type: string;
  confidence: number;
  enhancementPossibilities: EnhancementPossibility[];
}

interface RichSnippetRequirement {
  type: string;
  missing: string[];
}

interface RichSnippetRequirementCheck {
  isEligible: boolean;
  confidence: number;
  missing: string[];
  enhancementPossibilities: EnhancementPossibility[];
}

interface EnhancementPossibility {
  property: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
}

interface ValidationResults {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  errorCount: number;
  warningCount: number;
}

interface ValidationError {
  type: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

interface ValidationWarning {
  type: string;
  message: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface CompetitiveAnalysis {
  industryStandardsAlignment: number;
  comprehensivenessScore: number;
  uniqueFeatures: string[];
  improvements: string[];
}

interface StructuredDataRecommendation {
  type: 'MISSING_SCHEMA' | 'ENHANCEMENT' | 'COMPETITIVE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  implementation: string | any;
}