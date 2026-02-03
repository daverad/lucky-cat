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
   * @param {string} projectId - RevenueCat project ID
   * @param {Array} data - Daily revenue data
   * @returns {Promise<void>}
   */
  async saveRevenueHistory(projectId, data) {
    try {
      await chrome.storage.local.set({
        [`revenue_history_${projectId}`]: {
          data,
          updatedAt: Date.now()
        }
      });
    } catch (e) {
      console.error('RCP: Error saving revenue history', e);
    }
  },

  /**
   * Get historical revenue data
   * @param {string} projectId - RevenueCat project ID
   * @returns {Promise<Array|null>} Revenue data or null
   */
  async getRevenueHistory(projectId) {
    try {
      const result = await chrome.storage.local.get(`revenue_history_${projectId}`);
      return result[`revenue_history_${projectId}`]?.data || null;
    } catch (e) {
      console.error('RCP: Error getting revenue history', e);
      return null;
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
