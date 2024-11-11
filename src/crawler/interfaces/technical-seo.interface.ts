export interface MobileFriendlinessAnalysis {
  viewport: {
    hasViewport: boolean;
    isResponsive: boolean;
    viewportContent: string;
    issues: string[];
  };
  touchElements: {
    elementsWithSmallTargets: {
      selector: string;
      size: number;
      spacing: number;
    }[];
    totalIssues: number;
  };
  fontSize: {
    tooSmallElements: {
      selector: string;
      size: number;
    }[];
    totalIssues: number;
  };
  contentWidth: {
    exceedsViewport: boolean;
    horizontalScrolling: boolean;
    contentWidth: number;
    viewportWidth: number;
  };
  mediaQueries: {
    hasResponsiveImages: boolean;
    responsiveBreakpoints: number[];
    missingBreakpoints: string[];
  };
  score: number;
  recommendations: string[];
}

export interface AmpAnalysis {
  isAmpPage: boolean;
  ampVersion: string;
  ampComponents: {
    name: string;
    valid: boolean;
    errors?: string[];
  }[];
  canonicalRelation: {
    hasCanonical: boolean;
    canonicalUrl: string;
    isValid: boolean;
  };
  ampSize: {
    size: number;
    exceedsLimit: boolean;
  };
  score: number;
  recommendations: string[];
}

export interface ResourceUsageAnalysis {
  iframes: {
    count: number;
    elements: {
      src: string;
      hasSandbox: boolean;
      securityAttributes: {
        sandbox?: string;
        allowScripts?: boolean;
        allowSameOrigin?: boolean;
      };
      loading: string;
    }[];
    exceedsLimit: boolean;
    securityIssues: string[];
  };
  flash: {
    detected: boolean;
    elements: {
      type: string;
      src: string;
      hasAlternative: boolean;
    }[];
    alternatives: string[];
  };
  score: number;
  recommendations: string[];
}

export interface CookieAnalysis {
  cookies: {
    name: string;
    domain: string;
    value: string;
    size: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: string;
    category?: string;
  }[];
  statistics: {
    totalCount: number;
    totalSize: number;
    categoryCounts: Record<string, number>;
    exceedsLimit: boolean;
  };
  gdprCompliance: {
    hasConsentManager: boolean;
    necessaryOnly: boolean;
    issues: string[];
  };
  score: number;
  recommendations: string[];
}
