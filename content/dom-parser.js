/**
 * Lucky Cat - DOM Parser for RevenueCat Pages
 * Extracts data from RevenueCat's dashboard UI
 */

const LCDOMParser = {
  /**
   * Wait for the page to be fully loaded
   * @returns {Promise<void>}
   */
  async waitForPageLoad() {
    return new Promise(resolve => {
      if (document.readyState === 'complete') {
        // Give React a moment to render
        setTimeout(resolve, 1000);
      } else {
        window.addEventListener('load', () => {
          setTimeout(resolve, 1000);
        });
      }
    });
  },

  /**
   * Wait for a specific element to appear
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in ms
   * @returns {Promise<Element|null>}
   */
  async waitForElement(selector, timeout = 10000) {
    return new Promise(resolve => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const el = document.querySelector(selector);
        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  },

  /**
   * Detect the current page type
   * @returns {string} Page type identifier
   */
  detectPageType() {
    const url = window.location.href;
    const path = window.location.pathname;
    const pageTitle = document.title.toLowerCase();

    console.log('LC: Detecting page type, path:', path, 'url:', url);

    // Charts/Revenue view - check URL and page content
    if (path.includes('/charts')) {
      // Check if it's a revenue chart by looking at page content
      const h1 = document.querySelector('h1');
      const pageText = h1?.textContent?.toLowerCase() || '';

      if (pageText.includes('revenue') || url.toLowerCase().includes('revenue')) {
        console.log('LC: Detected charts-revenue page');
        return 'charts-revenue';
      }
      return 'charts-other';
    }

    // Attribution/Keywords
    if (path.includes('/attribution') || path.includes('/keywords') || path.includes('/campaigns')) {
      return 'attribution-keywords';
    }

    // Overview/Dashboard
    if (path.includes('/overview') || path.endsWith('/apps/') || path.match(/\/projects\/[^/]+$/)) {
      return 'overview';
    }

    return 'unknown';
  },

  /**
   * Get the current project ID from URL
   * @returns {string|null} Project ID
   */
  getProjectId() {
    const match = window.location.pathname.match(/\/projects\/([^/]+)/);
    return match ? match[1] : null;
  },

  /**
   * Find the main chart container
   * @returns {Element|null}
   */
  findChartContainer() {
    // Look for the SVG chart area - RevenueCat uses recharts
    const selectors = [
      '.recharts-wrapper',
      '[class*="recharts"]',
      'svg.recharts-surface',
      '[class*="ChartContainer"]',
      '[class*="chart-container"]',
      '[class*="Chart"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log('LC: Found chart container with selector:', selector);
        return element;
      }
    }

    // Fallback: look for any SVG that looks like a chart
    const svgs = document.querySelectorAll('svg');
    for (const svg of svgs) {
      if (svg.querySelector('path') && svg.clientHeight > 200) {
        console.log('LC: Found chart via SVG fallback');
        return svg.parentElement;
      }
    }

    console.log('LC: Could not find chart container');
    return null;
  },

  /**
   * Parse revenue data from the page
   * This attempts multiple strategies to extract data
   * @returns {Promise<Array|null>} Array of {date, revenue} objects
   */
  async parseRevenueData() {
    console.log('LC: Starting to parse revenue data...');

    // Strategy 1: Parse from the visible data table (RevenueCat shows this below the chart)
    const tableData = await this.extractRevenueCatTableData();
    if (tableData && tableData.length > 0) {
      console.log('LC: Successfully extracted', tableData.length, 'rows from table');
      return tableData;
    }

    // Strategy 2: Try to extract from React component state
    const reactData = this.extractReactData();
    if (reactData && reactData.length > 0) {
      console.log('LC: Successfully extracted', reactData.length, 'rows from React');
      return reactData;
    }

    // Strategy 3: Try to extract from window globals
    const windowData = this.extractWindowData();
    if (windowData && windowData.length > 0) {
      console.log('LC: Successfully extracted', windowData.length, 'rows from window');
      return windowData;
    }

    console.log('LC: Could not extract revenue data');
    return null;
  },

  /**
   * Extract data from RevenueCat's data table
   * The table has date columns as headers and Revenue/Transactions as rows
   * @returns {Array|null}
   */
  async extractRevenueCatTableData() {
    // Wait a bit for the table to load
    await new Promise(resolve => setTimeout(resolve, 500));

    // Find all tables on the page
    const tables = document.querySelectorAll('table');
    console.log('LC: Found', tables.length, 'tables on page');

    for (const table of tables) {
      const data = this.parseRevenueCatTable(table);
      if (data && data.length > 0) {
        return data;
      }
    }

    // Also try to find data in div-based tables (some dashboards use divs)
    const gridData = this.parseGridBasedData();
    if (gridData && gridData.length > 0) {
      return gridData;
    }

    return null;
  },

  /**
   * Parse RevenueCat's specific table format
   * Headers are dates, first column is metric name, cells are values
   * @param {Element} table
   * @returns {Array|null}
   */
  parseRevenueCatTable(table) {
    const headers = table.querySelectorAll('thead th, thead td');
    const rows = table.querySelectorAll('tbody tr');

    if (headers.length < 2 || rows.length === 0) {
      console.log('LC: Table has', headers.length, 'headers and', rows.length, 'rows');
      return null;
    }

    // Check if headers look like dates (e.g., "Jan 25 '26")
    const headerTexts = Array.from(headers).map(h => h.textContent.trim());
    console.log('LC: Table headers:', headerTexts.slice(0, 5));

    // Find the Revenue row - be flexible about matching
    let revenueRow = null;
    for (const row of rows) {
      const firstCell = row.querySelector('td');
      if (firstCell) {
        // Get all text content, normalize whitespace
        const cellText = firstCell.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
        console.log('LC: Checking row with first cell:', cellText);

        if (cellText === 'revenue' || cellText.includes('revenue')) {
          revenueRow = row;
          console.log('LC: ✓ Found revenue row');
          break;
        }
      }
    }

    // If no revenue row found, try the first row (maybe it's the data we want)
    if (!revenueRow && rows.length > 0) {
      console.log('LC: No explicit revenue row, trying first row');
      revenueRow = rows[0];
    }

    if (!revenueRow) {
      console.log('LC: No revenue row found in table');
      return null;
    }

    // Extract dates from headers and revenue from cells
    const data = [];
    const cells = revenueRow.querySelectorAll('td');

    // Skip first cell (it's the "Revenue" label), match remaining cells to headers
    for (let i = 1; i < cells.length && i < headers.length; i++) {
      const dateText = headerTexts[i];
      const revenueText = cells[i].textContent.trim();

      const date = this.parseRevenueCatDate(dateText);
      const revenue = this.parseCurrencyValue(revenueText);

      if (date && revenue !== null) {
        data.push({ date, revenue });
      }
    }

    console.log('LC: Extracted', data.length, 'data points from table');
    return data.length > 0 ? data : null;
  },

  /**
   * Parse RevenueCat date format like "Jan 25 '26" or "Feb 01 '26"
   * @param {string} text
   * @returns {string|null} ISO date string
   */
  parseRevenueCatDate(text) {
    if (!text) return null;

    const trimmed = text.trim();

    // Pattern: "Jan 25 '26" or "Feb 01 '26"
    const shortYearMatch = trimmed.match(/^(\w{3})\s+(\d{1,2})\s+'(\d{2})$/);
    if (shortYearMatch) {
      const [, month, day, shortYear] = shortYearMatch;
      const year = parseInt(shortYear) < 50 ? 2000 + parseInt(shortYear) : 1900 + parseInt(shortYear);
      const dateStr = `${month} ${day}, ${year}`;
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    // Pattern: "Jan 25, 2026"
    const fullMatch = trimmed.match(/^(\w{3,9})\s+(\d{1,2}),?\s*(\d{4})$/);
    if (fullMatch) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    // Try standard date parsing
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    return null;
  },

  /**
   * Parse currency value like "$552" or "$1,234"
   * @param {string} text
   * @returns {number|null}
   */
  parseCurrencyValue(text) {
    if (!text) return null;

    // Remove currency symbols, commas, and whitespace
    const cleaned = text.replace(/[$,\s]/g, '');
    const value = parseFloat(cleaned);

    return isNaN(value) ? null : value;
  },

  /**
   * Try to parse data from grid/div-based layouts
   * @returns {Array|null}
   */
  parseGridBasedData() {
    // Look for elements that might contain chart data
    const dataContainers = document.querySelectorAll('[class*="data"], [class*="grid"], [class*="table"]');

    for (const container of dataContainers) {
      // Look for date-value pairs
      const dateElements = container.querySelectorAll('[class*="date"], [class*="Date"]');
      const valueElements = container.querySelectorAll('[class*="value"], [class*="Value"], [class*="revenue"], [class*="Revenue"]');

      if (dateElements.length > 0 && dateElements.length === valueElements.length) {
        const data = [];
        for (let i = 0; i < dateElements.length; i++) {
          const date = this.parseRevenueCatDate(dateElements[i].textContent);
          const revenue = this.parseCurrencyValue(valueElements[i].textContent);
          if (date && revenue !== null) {
            data.push({ date, revenue });
          }
        }
        if (data.length > 10) {
          return data;
        }
      }
    }

    return null;
  },

  /**
   * Try to extract data from React component state
   * @returns {Array|null}
   */
  extractReactData() {
    // Find elements that might have React fiber
    const candidates = document.querySelectorAll('[class*="chart"], [class*="Chart"], [class*="recharts"], main, [role="main"]');

    for (const el of candidates) {
      const fiberKey = Object.keys(el).find(key =>
        key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')
      );

      if (fiberKey) {
        try {
          let fiber = el[fiberKey];
          let attempts = 0;
          const maxAttempts = 100;

          while (fiber && attempts < maxAttempts) {
            const memoizedProps = fiber.memoizedProps;
            const memoizedState = fiber.memoizedState;

            // Check props for data
            if (memoizedProps) {
              const data = this.findDataInObject(memoizedProps);
              if (data) return data;
            }

            // Check state for data
            if (memoizedState) {
              const data = this.findDataInObject(memoizedState);
              if (data) return data;
            }

            fiber = fiber.return;
            attempts++;
          }
        } catch (e) {
          console.log('LC: Error extracting React data:', e.message);
        }
      }
    }

    return null;
  },

  /**
   * Find revenue data in an object
   * @param {Object} obj
   * @param {number} depth
   * @returns {Array|null}
   */
  findDataInObject(obj, depth = 0) {
    if (depth > 8 || !obj || typeof obj !== 'object') return null;

    // Check if this looks like revenue data array
    if (Array.isArray(obj) && obj.length > 10) {
      const first = obj[0];
      if (first && typeof first === 'object') {
        // Look for date/value patterns
        const hasDate = 'date' in first || 'timestamp' in first || 'day' in first || 'x' in first;
        const hasValue = 'revenue' in first || 'value' in first || 'amount' in first || 'y' in first;

        if (hasDate && hasValue) {
          return this.normalizeRevenueData(obj);
        }
      }
    }

    // Search nested properties
    const keysToSearch = ['data', 'chartData', 'revenueData', 'values', 'series', 'points', 'rows'];

    for (const key of Object.keys(obj)) {
      if (keysToSearch.includes(key) || key.toLowerCase().includes('data')) {
        const result = this.findDataInObject(obj[key], depth + 1);
        if (result) return result;
      }
    }

    return null;
  },

  /**
   * Extract from window global variables
   * @returns {Array|null}
   */
  extractWindowData() {
    const globalKeys = [
      '__INITIAL_DATA__',
      '__PRELOADED_STATE__',
      '__NUXT__',
      '__NEXT_DATA__',
      'initialData',
      'pageData',
      '__remixContext'
    ];

    for (const key of globalKeys) {
      if (window[key]) {
        const data = this.findDataInObject(window[key]);
        if (data) return data;
      }
    }

    return null;
  },

  /**
   * Normalize revenue data to consistent format
   * @param {Array} data - Raw data
   * @returns {Array|null} Normalized data
   */
  normalizeRevenueData(data) {
    if (!Array.isArray(data) || data.length === 0) return null;

    try {
      const normalized = data.map(item => {
        // Extract date
        let date = item.date || item.timestamp || item.day || item.x || item.time;
        if (date instanceof Date) {
          date = date.toISOString().split('T')[0];
        } else if (typeof date === 'number') {
          date = new Date(date).toISOString().split('T')[0];
        } else if (typeof date === 'string') {
          date = this.parseRevenueCatDate(date) || date;
        }

        // Extract revenue
        let revenue = item.revenue || item.amount || item.value || item.y || item.total || 0;
        if (typeof revenue === 'string') {
          revenue = this.parseCurrencyValue(revenue);
        }

        return { date, revenue: parseFloat(revenue) || 0 };
      }).filter(item => item.date && item.date.match(/^\d{4}-\d{2}-\d{2}$/));

      return normalized.length > 0 ? normalized : null;
    } catch (e) {
      console.log('LC: Error normalizing data:', e.message);
      return null;
    }
  },

  /**
   * Get a suitable injection point for the forecast panel
   * @returns {Element|null}
   */
  findInjectionPoint() {
    // Look for the main content area before the chart
    const selectors = [
      'h1', // Usually the page title like "Revenue All Time By Month"
      '[class*="PageHeader"]',
      '[class*="page-header"]',
      '[class*="ChartHeader"]',
      'main > div:first-child'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        // Return the element's parent container or the element itself
        const container = element.closest('[class*="container"]') || element.parentElement;
        if (container) {
          console.log('LC: Found injection point via:', selector);
          return container;
        }
      }
    }

    // Fallback: find the chart and inject before it
    const chartContainer = this.findChartContainer();
    if (chartContainer) {
      console.log('LC: Using chart container as injection point');
      return chartContainer;
    }

    console.log('LC: Could not find injection point');
    return null;
  },

  /**
   * Find the attribution/keywords table
   * @returns {Element|null}
   */
  findAttributionTable() {
    const tables = document.querySelectorAll('table');
    for (const table of tables) {
      const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.toLowerCase());
      if (headers.some(h => h.includes('keyword') || h.includes('campaign') || h.includes('source') || h.includes('attribution'))) {
        return table;
      }
    }
    return null;
  },

  /**
   * Extract keywords from attribution table
   * @param {Element} table - Table element
   * @returns {Array<{keyword: string, revenue: number, row: Element}>}
   */
  extractKeywordsFromTable(table) {
    if (!table) return [];

    const keywords = [];
    const rows = table.querySelectorAll('tbody tr');

    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const keyword = cells[0].textContent.trim();
        const revenue = this.parseCurrencyValue(cells[1].textContent);

        if (keyword && revenue !== null) {
          keywords.push({ keyword, revenue, row });
        }
      }
    });

    return keywords;
  },

  /**
   * Parse the date range from the page
   * @returns {{start: string, end: string}|null} Date range
   */
  getDateRangeFromPage() {
    // Try URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const startDate = urlParams.get('start_date') || urlParams.get('startDate') || urlParams.get('from');
    const endDate = urlParams.get('end_date') || urlParams.get('endDate') || urlParams.get('to');

    if (startDate && endDate) {
      return { start: startDate, end: endDate };
    }

    // Try to find date picker or date range text
    const dateElements = document.querySelectorAll('[class*="date"], [class*="Date"], button');
    for (const el of dateElements) {
      const text = el.textContent;
      // Look for patterns like "Jul 11 '20 - Feb 03 '26"
      const rangeMatch = text.match(/(\w{3}\s+\d{1,2}\s+'\d{2})\s*[-–]\s*(\w{3}\s+\d{1,2}\s+'\d{2})/);
      if (rangeMatch) {
        const start = this.parseRevenueCatDate(rangeMatch[1]);
        const end = this.parseRevenueCatDate(rangeMatch[2]);
        if (start && end) {
          return { start, end };
        }
      }
    }

    return null;
  }
};

// Make available globally for content scripts
if (typeof window !== 'undefined') {
  window.LCDOMParser = LCDOMParser;
}
