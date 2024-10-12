import { Injectable } from '@nestjs/common';

export interface Rule {
    pattern: string;
    isRegex: boolean;
  }
  
@Injectable()
export class InclusionExclusionService {
  private inclusionRules: Rule[] = [];
  private exclusionRules: Rule[] = [];

  addInclusionRule(pattern: string, isRegex: boolean = false): void {
    this.inclusionRules.push({ pattern, isRegex });
  }

  addExclusionRule(pattern: string, isRegex: boolean = false): void {
    this.exclusionRules.push({ pattern, isRegex });
  }

  removeInclusionRule(pattern: string): void {
    this.inclusionRules = this.inclusionRules.filter(rule => rule.pattern !== pattern);
  }

  removeExclusionRule(pattern: string): void {
    this.exclusionRules = this.exclusionRules.filter(rule => rule.pattern !== pattern);
  }

  isUrlAllowed(url: string): boolean {
    if (this.inclusionRules.length > 0) {
      const isIncluded = this.inclusionRules.some(rule => this.matchRule(url, rule));
      if (!isIncluded) return false;
    }

    return !this.exclusionRules.some(rule => this.matchRule(url, rule));
  }

  private matchRule(url: string, rule: Rule): boolean {
    if (rule.isRegex) {
      const regex = new RegExp(rule.pattern);
      return regex.test(url);
    } else {
      return url.includes(rule.pattern);
    }
  }

  getInclusionRules(): Rule[] {
    return [...this.inclusionRules];
  }

  getExclusionRules(): Rule[] {
    return [...this.exclusionRules];
  }
}
