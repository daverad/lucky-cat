/**
 * Date utilities for RevenueCat Plus
 */

const RCPDateUtils = {
  /**
   * Get the current date
   * @returns {Date} Current date
   */
  today() {
    return new Date();
  },

  /**
   * Get the current day of the month (1-indexed)
   * @returns {number} Day of month (1-31)
   */
  currentDayOfMonth() {
    return this.today().getDate();
  },

  /**
   * Get the total days in a given month
   * @param {number} year - The year
   * @param {number} month - The month (0-indexed)
   * @returns {number} Number of days in the month
   */
  daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  },

  /**
   * Get total days in the current month
   * @returns {number} Number of days
   */
  daysInCurrentMonth() {
    const now = this.today();
    return this.daysInMonth(now.getFullYear(), now.getMonth());
  },

  /**
   * Get the day of week (0 = Sunday, 6 = Saturday)
   * @param {Date|string} date - The date
   * @returns {number} Day of week
   */
  dayOfWeek(date) {
    const d = date instanceof Date ? date : new Date(date);
    return d.getDay();
  },

  /**
   * Check if a date is a weekend
   * @param {Date|string} date - The date
   * @returns {boolean} True if weekend
   */
  isWeekend(date) {
    const dow = this.dayOfWeek(date);
    return dow === 0 || dow === 6;
  },

  /**
   * Get the start of a month
   * @param {Date|number} dateOrYear - Date or year
   * @param {number} month - Month (0-indexed) if year provided
   * @returns {Date} First day of month
   */
  startOfMonth(dateOrYear, month) {
    if (dateOrYear instanceof Date) {
      return new Date(dateOrYear.getFullYear(), dateOrYear.getMonth(), 1);
    }
    return new Date(dateOrYear, month, 1);
  },

  /**
   * Get the end of a month
   * @param {Date|number} dateOrYear - Date or year
   * @param {number} month - Month (0-indexed) if year provided
   * @returns {Date} Last day of month
   */
  endOfMonth(dateOrYear, month) {
    if (dateOrYear instanceof Date) {
      return new Date(dateOrYear.getFullYear(), dateOrYear.getMonth() + 1, 0);
    }
    return new Date(dateOrYear, month + 1, 0);
  },

  /**
   * Get the start of a year
   * @param {number} year - The year
   * @returns {Date} First day of year
   */
  startOfYear(year) {
    return new Date(year, 0, 1);
  },

  /**
   * Get current month index (0-indexed)
   * @returns {number} Current month (0-11)
   */
  currentMonth() {
    return this.today().getMonth();
  },

  /**
   * Get current year
   * @returns {number} Current year
   */
  currentYear() {
    return this.today().getFullYear();
  },

  /**
   * Get next month index and year
   * @returns {{month: number, year: number}} Next month info
   */
  nextMonth() {
    const now = this.today();
    let month = now.getMonth() + 1;
    let year = now.getFullYear();

    if (month > 11) {
      month = 0;
      year += 1;
    }

    return { month, year };
  },

  /**
   * Get the same date from last year
   * @param {Date} date - The date
   * @returns {Date} Same date last year
   */
  sameTimeLastYear(date = null) {
    const d = date || this.today();
    return new Date(d.getFullYear() - 1, d.getMonth(), d.getDate());
  },

  /**
   * Format date as ISO string (YYYY-MM-DD)
   * @param {Date} date - The date
   * @returns {string} ISO date string
   */
  toISODateString(date) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().split('T')[0];
  },

  /**
   * Parse a date string
   * @param {string} str - Date string
   * @returns {Date|null} Parsed date or null
   */
  parseDate(str) {
    if (!str) return null;

    // Try ISO format first (YYYY-MM-DD)
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    }

    // Try common formats
    const date = new Date(str);
    return isNaN(date.getTime()) ? null : date;
  },

  /**
   * Get an array of dates between two dates
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Date[]} Array of dates
   */
  getDateRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  },

  /**
   * Get remaining days in the current month
   * @returns {number} Number of remaining days
   */
  remainingDaysInMonth() {
    return this.daysInCurrentMonth() - this.currentDayOfMonth();
  },

  /**
   * Calculate days between two dates
   * @param {Date} date1 - First date
   * @param {Date} date2 - Second date
   * @returns {number} Number of days between dates
   */
  daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Get the date range for the current month to date
   * @returns {{start: Date, end: Date}} Date range
   */
  currentMTDRange() {
    const now = this.today();
    return {
      start: this.startOfMonth(now),
      end: now
    };
  },

  /**
   * Get the date range for the current year to date
   * @returns {{start: Date, end: Date}} Date range
   */
  currentYTDRange() {
    const now = this.today();
    return {
      start: this.startOfYear(now.getFullYear()),
      end: now
    };
  },

  /**
   * Get the same YTD range from last year
   * @returns {{start: Date, end: Date}} Date range
   */
  lastYearYTDRange() {
    const now = this.today();
    const lastYear = now.getFullYear() - 1;
    return {
      start: this.startOfYear(lastYear),
      end: new Date(lastYear, now.getMonth(), now.getDate())
    };
  }
};

// Make available globally for content scripts
if (typeof window !== 'undefined') {
  window.RCPDateUtils = RCPDateUtils;
}
