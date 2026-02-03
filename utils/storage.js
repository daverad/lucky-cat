/**
 * Chrome Storage utilities for RevenueCat Plus (Lucky Cat)
 */

const RCPStorage = {
  /**
   * Default settings
   */
  defaults: {
    forecastingEnabled: true,
    asaEnabled: false,
    confidenceRange: 'standard', // 'conservative', 'standard', 'aggressive'
    cacheDuration: 24 * 60 * 60 * 1000, // 24 hours in ms
  },

  /**
   * Get all settings
   * @returns {Promise<Object>} Settings object
   */
  async getSettings() {
    try {
      const result = await chrome.storage.local.get('settings');
      return { ...this.defaults, ...result.settings };
    } catch (e) {
      console.error('RCP: Error getting settings', e);
      return this.defaults;
    }
  },

  /**
   * Save settings
   * @param {Object} settings - Settings to save
   * @returns {Promise<void>}
   */
  async saveSettings(settings) {
    try {
      const current = await this.getSettings();
      await chrome.storage.local.set({
        settings: { ...current, ...settings }
      });
    } catch (e) {
      console.error('RCP: Error saving settings', e);
      throw e;
    }
  },

  /**
   * Validate ASA credential format
   * @param {Object} credentials - Credentials to validate
   * @returns {boolean} True if valid format
   */
  validateASACredentials(credentials) {
    if (!credentials) return false;

    const { clientId, clientSecret, orgId } = credentials;

    // Client ID should start with SEARCHADS.
    if (!clientId || !clientId.startsWith('SEARCHADS.')) {
      return false;
    }

    // Client secret should be present
    if (!clientSecret || clientSecret.length < 10) {
      return false;
    }

    // Org ID should be a number
    if (!orgId || isNaN(parseInt(orgId))) {
      return false;
    }

    return true;
  },

  /**
   * Save ASA credentials securely
   * @param {Object} credentials - Credentials to save
   * @returns {Promise<void>}
   */
  async saveASACredentials(credentials) {
    if (!this.validateASACredentials(credentials)) {
      throw new Error('Invalid credential format');
    }

    try {
      await chrome.storage.local.set({
        asa_credentials: {
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
          orgId: credentials.orgId,
          configured: true,
          configuredAt: Date.now()
        }
      });

      // Update settings to enable ASA
      await this.saveSettings({ asaEnabled: true });
    } catch (e) {
      console.error('RCP: Error saving ASA credentials', e);
      throw e;
    }
  },

  /**
   * Get ASA credentials
   * @returns {Promise<Object|null>} Credentials or null
   */
  async getASACredentials() {
    try {
      const result = await chrome.storage.local.get('asa_credentials');
      return result.asa_credentials || null;
    } catch (e) {
      console.error('RCP: Error getting ASA credentials', e);
      return null;
    }
  },

  /**
   * Check if ASA is configured
   * @returns {Promise<boolean>} True if configured
   */
  async hasASACredentials() {
    const creds = await this.getASACredentials();
    return creds?.configured === true;
  },

  /**
   * Clear ASA credentials
   * @returns {Promise<void>}
   */
  async clearASACredentials() {
    try {
      await chrome.storage.local.remove('asa_credentials');
      await this.saveSettings({ asaEnabled: false });
    } catch (e) {
      console.error('RCP: Error clearing ASA credentials', e);
      throw e;
    }
  },

  /**
   * Cache data with expiration
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in ms (optional)
   * @returns {Promise<void>}
   */
  async setCache(key, data, ttl = null) {
    try {
      const settings = await this.getSettings();
      const expiresAt = Date.now() + (ttl || settings.cacheDuration);

      await chrome.storage.local.set({
        [`cache_${key}`]: {
          data,
          expiresAt,
          cachedAt: Date.now()
        }
      });
    } catch (e) {
      console.error('RCP: Error setting cache', e);
    }
  },

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached data or null if expired/missing
   */
  async getCache(key) {
    try {
      const result = await chrome.storage.local.get(`cache_${key}`);
      const cached = result[`cache_${key}`];

      if (!cached) return null;

      // Check expiration
      if (cached.expiresAt < Date.now()) {
        await chrome.storage.local.remove(`cache_${key}`);
        return null;
      }

      return cached.data;
    } catch (e) {
      console.error('RCP: Error getting cache', e);
      return null;
    }
  },

  /**
   * Clear all cached data
   * @returns {Promise<void>}
   */
  async clearAllCache() {
    try {
      const all = await chrome.storage.local.get(null);
      const cacheKeys = Object.keys(all).filter(k => k.startsWith('cache_'));

      if (cacheKeys.length > 0) {
        await chrome.storage.local.remove(cacheKeys);
      }
    } catch (e) {
      console.error('RCP: Error clearing cache', e);
      throw e;
    }
  },

  /**
   * Store historical revenue data for forecasting
   * This MERGES new data with existing data to build a comprehensive history
   * @param {string} projectId - RevenueCat project ID
   * @param {Array} data - Daily revenue data
   * @param {string} granularity - Data granularity ('daily', 'weekly', 'monthly')
   * @returns {Promise<void>}
   */
  async saveRevenueHistory(projectId, data, granularity = 'daily') {
    try {
      // Get existing history
      const existingResult = await chrome.storage.local.get(`revenue_history_${projectId}`);
      const existing = existingResult[`revenue_history_${projectId}`];

      let mergedData = data;

      // If we have existing data with the same granularity, merge it
      if (existing && existing.data && existing.granularity === granularity) {
        mergedData = this.mergeRevenueData(existing.data, data);
        console.log('LC Storage: Merged', existing.data.length, 'existing +', data.length, 'new =', mergedData.length, 'total data points');
      }

      await chrome.storage.local.set({
        [`revenue_history_${projectId}`]: {
          data: mergedData,
          granularity: granularity,
          updatedAt: Date.now(),
          dataPoints: mergedData.length
        }
      });

      console.log('LC Storage: Saved', mergedData.length, granularity, 'data points for project', projectId);
    } catch (e) {
      console.error('RCP: Error saving revenue history', e);
    }
  },

  /**
   * Merge two revenue data arrays, keeping the most recent value for each date
   * @param {Array} existing - Existing data
   * @param {Array} newData - New data to merge
   * @returns {Array} Merged data
   */
  mergeRevenueData(existing, newData) {
    // Create a map keyed by date
    const dataMap = new Map();

    // Add existing data
    for (const item of existing) {
      if (item.date) {
        dataMap.set(item.date, item);
      }
    }

    // Add/overwrite with new data (new data takes precedence)
    for (const item of newData) {
      if (item.date) {
        dataMap.set(item.date, item);
      }
    }

    // Convert back to array and sort by date
    const merged = Array.from(dataMap.values());
    merged.sort((a, b) => new Date(a.date) - new Date(b.date));

    return merged;
  },

  /**
   * Get historical revenue data
   * @param {string} projectId - RevenueCat project ID
   * @returns {Promise<Object|null>} Object with data array and metadata, or null
   */
  async getRevenueHistory(projectId) {
    try {
      const result = await chrome.storage.local.get(`revenue_history_${projectId}`);
      const history = result[`revenue_history_${projectId}`];

      if (!history) return null;

      return {
        data: history.data || [],
        granularity: history.granularity || 'daily',
        updatedAt: history.updatedAt,
        dataPoints: history.dataPoints || history.data?.length || 0
      };
    } catch (e) {
      console.error('RCP: Error getting revenue history', e);
      return null;
    }
  },

  /**
   * Get just the revenue data array (for backward compatibility)
   * @param {string} projectId - RevenueCat project ID
   * @returns {Promise<Array|null>} Revenue data array or null
   */
  async getRevenueHistoryData(projectId) {
    const history = await this.getRevenueHistory(projectId);
    return history?.data || null;
  },

  /**
   * Get statistics about stored historical data
   * @param {string} projectId - RevenueCat project ID
   * @returns {Promise<Object|null>} Statistics about the stored data
   */
  async getHistoryStats(projectId) {
    const history = await this.getRevenueHistory(projectId);
    if (!history || !history.data || history.data.length === 0) {
      return null;
    }

    const data = history.data;
    const dates = data.map(d => new Date(d.date)).sort((a, b) => a - b);

    return {
      dataPoints: data.length,
      granularity: history.granularity,
      oldestDate: dates[0]?.toISOString().split('T')[0],
      newestDate: dates[dates.length - 1]?.toISOString().split('T')[0],
      lastUpdated: history.updatedAt ? new Date(history.updatedAt).toLocaleString() : 'Unknown',
      totalRevenue: data.reduce((sum, d) => sum + (d.revenue || 0), 0)
    };
  },

  /**
   * Clear historical data for a project
   * @param {string} projectId - RevenueCat project ID
   * @returns {Promise<void>}
   */
  async clearRevenueHistory(projectId) {
    try {
      await chrome.storage.local.remove(`revenue_history_${projectId}`);
      console.log('LC Storage: Cleared history for project', projectId);
    } catch (e) {
      console.error('RCP: Error clearing revenue history', e);
    }
  },

  /**
   * Get the confidence multiplier based on settings
   * @returns {Promise<number>} Multiplier for confidence range
   */
  async getConfidenceMultiplier() {
    const settings = await this.getSettings();

    const multipliers = {
      conservative: 2.0,
      standard: 1.5,
      aggressive: 1.0
    };

    return multipliers[settings.confidenceRange] || 1.5;
  }
};

// Make available globally for content scripts
if (typeof window !== 'undefined') {
  window.RCPStorage = RCPStorage;
}
