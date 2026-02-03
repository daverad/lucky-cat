/**
 * Lucky Cat - Apple Search Ads Integration
 * Fetches ASA data and injects ROI columns into attribution tables
 */

const LCASAIntegration = {
  /**
   * Initialize ASA integration on attribution page
   * @returns {Promise<boolean>} Success status
   */
  async init() {
    // Check if ASA is configured
    const hasCredentials = await RCPStorage.hasASACredentials();
    if (!hasCredentials) {
      console.log('LC: ASA not configured, skipping integration');
      return false;
    }

    // Check if enabled in settings
    const settings = await RCPStorage.getSettings();
    if (!settings.asaEnabled) {
      console.log('LC: ASA integration disabled in settings');
      return false;
    }

    // Find the attribution table
    const table = LCDOMParser.findAttributionTable();
    if (!table) {
      console.log('LC: Could not find attribution table');
      return false;
    }

    // Get date range from page
    const dateRange = LCDOMParser.getDateRangeFromPage();
    if (!dateRange) {
      console.log('LC: Could not determine date range');
      // Use last 30 days as fallback
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateRange = {
        start: thirtyDaysAgo.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0]
      };
    }

    // Extract keywords from table
    const keywords = LCDOMParser.extractKeywordsFromTable(table);
    if (keywords.length === 0) {
      console.log('LC: No keywords found in table');
      return false;
    }

    try {
      // Fetch ASA data via background script
      const asaData = await this.fetchASAData(dateRange, keywords.map(k => k.keyword));

      if (!asaData || Object.keys(asaData).length === 0) {
        console.log('LC: No ASA data returned');
        return false;
      }

      // Inject columns
      const success = LCUIInjector.injectASAColumns(table, asaData);

      if (success) {
        console.log('LC: ASA columns injected successfully');
      }

      return success;
    } catch (error) {
      console.error('LC: Error fetching ASA data', error);
      return false;
    }
  },

  /**
   * Fetch ASA data via background script
   * @param {{start: string, end: string}} dateRange - Date range
   * @param {string[]} keywords - Keywords to fetch data for
   * @returns {Promise<Object|null>} ASA data keyed by keyword
   */
  async fetchASAData(dateRange, keywords) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'FETCH_ASA_DATA',
          dateRange,
          keywords
        },
        response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (response && response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || 'Unknown error'));
          }
        }
      );
    });
  },

  /**
   * Test ASA connection with stored credentials
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async testConnection() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'TEST_ASA_CONNECTION' },
        response => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              message: chrome.runtime.lastError.message
            });
            return;
          }

          resolve(response || { success: false, message: 'No response' });
        }
      );
    });
  },

  /**
   * Refresh ASA data and update table
   * @returns {Promise<boolean>}
   */
  async refresh() {
    const table = LCDOMParser.findAttributionTable();
    if (!table) return false;

    // Remove existing columns first
    LCUIInjector.removeASAColumns(table);

    // Re-init
    return await this.init();
  },

  /**
   * Match RevenueCat keywords to ASA keywords
   * @param {string[]} rcKeywords - RevenueCat keywords
   * @param {Object} asaData - ASA data
   * @returns {Object} Matched data
   */
  matchKeywords(rcKeywords, asaData) {
    const matched = {};
    const asaKeywords = Object.keys(asaData);

    for (const rcKw of rcKeywords) {
      const rcNormalized = rcKw.toLowerCase().trim();

      // Try exact match
      if (asaData[rcNormalized]) {
        matched[rcKw] = asaData[rcNormalized];
        continue;
      }

      // Try fuzzy match
      let bestMatch = null;
      let bestScore = 0;

      for (const asaKw of asaKeywords) {
        const asaNormalized = asaKw.toLowerCase().trim();
        const score = this.calculateMatchScore(rcNormalized, asaNormalized);

        if (score > bestScore && score >= 0.85) {
          bestScore = score;
          bestMatch = asaKw;
        }
      }

      if (bestMatch) {
        matched[rcKw] = asaData[bestMatch];
      }
    }

    return matched;
  },

  /**
   * Calculate match score between two keywords
   * @param {string} kw1 - First keyword
   * @param {string} kw2 - Second keyword
   * @returns {number} Score 0-1
   */
  calculateMatchScore(kw1, kw2) {
    // Exact match
    if (kw1 === kw2) return 1;

    // Contains match
    if (kw1.includes(kw2) || kw2.includes(kw1)) {
      const longer = kw1.length > kw2.length ? kw1 : kw2;
      const shorter = kw1.length > kw2.length ? kw2 : kw1;
      return shorter.length / longer.length;
    }

    // Word-based match
    const words1 = new Set(kw1.split(/\s+/));
    const words2 = new Set(kw2.split(/\s+/));
    const intersection = [...words1].filter(w => words2.has(w));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;
    return intersection.length / union.size;
  },

  /**
   * Calculate summary stats for ASA data
   * @param {Element} table - Attribution table
   * @param {Object} asaData - ASA data
   * @returns {Object} Summary stats
   */
  calculateSummary(table, asaData) {
    const keywords = LCDOMParser.extractKeywordsFromTable(table);
    let totalRevenue = 0;
    let totalSpend = 0;
    let matchedKeywords = 0;

    for (const { keyword, revenue } of keywords) {
      totalRevenue += revenue;

      const normalized = keyword.toLowerCase().trim();
      if (asaData[normalized]) {
        totalSpend += asaData[normalized].spend || 0;
        matchedKeywords++;
      }
    }

    return {
      totalRevenue,
      totalSpend,
      overallROI: totalSpend > 0 ? totalRevenue / totalSpend : null,
      matchedKeywords,
      totalKeywords: keywords.length,
      matchRate: keywords.length > 0 ? matchedKeywords / keywords.length : 0
    };
  }
};

// Make available globally for content scripts
if (typeof window !== 'undefined') {
  window.LCASAIntegration = LCASAIntegration;
}
