/**
 * Formatting utilities for RevenueCat Plus
 */

const RCPFormat = {
  /**
   * Format a number as currency
   * @param {number} amount - The amount to format
   * @param {string} currency - Currency code (default: USD)
   * @param {boolean} compact - Use compact notation for large numbers
   * @returns {string} Formatted currency string
   */
  currency(amount, currency = 'USD', compact = false) {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '—';
    }

    const options = {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    };

    if (compact && Math.abs(amount) >= 1000) {
      options.notation = 'compact';
      options.maximumFractionDigits = 1;
    }

    try {
      return new Intl.NumberFormat('en-US', options).format(amount);
    } catch (e) {
      // Fallback for unsupported currencies
      return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    }
  },

  /**
   * Format a currency range
   * @param {number} low - Lower bound
   * @param {number} high - Upper bound
   * @param {string} currency - Currency code
   * @returns {string} Formatted range string
   */
  currencyRange(low, high, currency = 'USD') {
    const formattedLow = this.currency(low, currency, true);
    const formattedHigh = this.currency(high, currency, true);
    return `${formattedLow} - ${formattedHigh}`;
  },

  /**
   * Parse a currency string to a number
   * @param {string} str - Currency string to parse
   * @returns {number} Parsed number
   */
  parseCurrency(str) {
    if (!str || typeof str !== 'string') return 0;

    // Remove currency symbols, commas, and whitespace
    const cleaned = str.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);

    return isNaN(parsed) ? 0 : parsed;
  },

  /**
   * Format a percentage
   * @param {number} value - The percentage value
   * @param {boolean} includeSign - Include + sign for positive values
   * @returns {string} Formatted percentage string
   */
  percentage(value, includeSign = false) {
    if (value === null || value === undefined || isNaN(value)) {
      return '—';
    }

    const sign = includeSign && value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  },

  /**
   * Format a multiplier (e.g., ROI)
   * @param {number} value - The multiplier value
   * @returns {string} Formatted multiplier string
   */
  multiplier(value) {
    if (value === null || value === undefined || isNaN(value)) {
      return '—';
    }

    return `${value.toFixed(1)}x`;
  },

  /**
   * Format a number with compact notation
   * @param {number} value - The number to format
   * @returns {string} Formatted number string
   */
  compactNumber(value) {
    if (value === null || value === undefined || isNaN(value)) {
      return '—';
    }

    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  },

  /**
   * Get month name from month number (0-indexed)
   * @param {number} monthIndex - Month index (0-11)
   * @param {boolean} short - Use abbreviated month name
   * @returns {string} Month name
   */
  monthName(monthIndex, short = false) {
    const date = new Date(2000, monthIndex, 1);
    return date.toLocaleDateString('en-US', {
      month: short ? 'short' : 'long'
    });
  },

  /**
   * Format a date for display
   * @param {Date|string} date - The date to format
   * @param {string} format - Format type: 'short', 'medium', 'long'
   * @returns {string} Formatted date string
   */
  date(date, format = 'medium') {
    const d = date instanceof Date ? date : new Date(date);

    if (isNaN(d.getTime())) {
      return '—';
    }

    const options = {
      short: { month: 'short', day: 'numeric' },
      medium: { month: 'short', day: 'numeric', year: 'numeric' },
      long: { month: 'long', day: 'numeric', year: 'numeric' }
    };

    return d.toLocaleDateString('en-US', options[format] || options.medium);
  }
};

// Make available globally for content scripts
if (typeof window !== 'undefined') {
  window.RCPFormat = RCPFormat;
}
