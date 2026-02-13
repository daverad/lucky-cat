/**
 * Lucky Cat - DOM Parser for RevenueCat Pages
 * Extracts data from RevenueCat's dashboard UI
 */

const LCDOMParser = {
  /**
   * Detected data granularity (daily, weekly, monthly)
   */
  detectedGranularity: 'daily',
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

    // Charts/Revenue view - check URL and page content
    if (path.includes('/charts')) {
      // Check if it's a revenue chart by looking at page content
      const h1 = document.querySelector('h1');
      const pageText = h1?.textContent?.toLowerCase() || '';

      if (pageText.includes('revenue') || url.toLowerCase().includes('revenue')) {
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
   * Get the current project ID from URL or page
   * @returns {string|null} Project ID
   */
  getProjectId() {
    // Try URL path first: /projects/[id]/...
    const pathMatch = window.location.pathname.match(/\/projects\/([^/]+)/);
    if (pathMatch) return pathMatch[1];

    // Try URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const projectParam = urlParams.get('project') || urlParams.get('project_id');
    if (projectParam) return projectParam;

    // Try to find project selector in page - look for selected project
    const projectSelectors = [
      '[data-testid="project-selector"] [data-testid="selected-item"]',
      '[class*="ProjectSelector"] [class*="selected"]',
      '[class*="project-dropdown"] [class*="active"]',
      '[aria-label*="project"]',
      '[data-project-id]'
    ];

    for (const selector of projectSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const projectId = el.getAttribute('data-project-id') || el.getAttribute('data-value');
        if (projectId) return projectId;
      }
    }

    // Fallback: use hostname + app path as a stable identifier
    // This ensures data is cached per RevenueCat account
    const hostname = window.location.hostname;
    if (hostname.includes('revenuecat.com')) {
      // Use a default project ID for single-project accounts
      // or derive from any visible project name
      const projectNameEl = document.querySelector('[class*="ProjectName"], [class*="project-name"], header [class*="Title"]');
      if (projectNameEl && projectNameEl.textContent) {
        // Create a simple hash from project name
        const name = projectNameEl.textContent.trim();
        return 'rc_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
      }

      // Last fallback: use a generic identifier for this account
      return 'rc_default_project';
    }

    return null;
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
        return element;
      }
    }

    // Fallback: look for any SVG that looks like a chart
    const svgs = document.querySelectorAll('svg');
    for (const svg of svgs) {
      if (svg.querySelector('path') && svg.clientHeight > 200) {
        return svg.parentElement;
      }
    }

    return null;
  },

  /**
   * Parse revenue data from the page
   * This attempts multiple strategies to extract data
   * @returns {Promise<Array|null>} Array of {date, revenue} objects
   */
  async parseRevenueData() {
    // Strategy 1: Parse from the visible data table (RevenueCat shows this below the chart)
    const tableData = await this.extractRevenueCatTableData();
    if (tableData && tableData.length > 0) {
      return tableData;
    }

    // Strategy 2: Try to extract from React component state
    const reactData = this.extractReactData();
    if (reactData && reactData.length > 0) {
      return reactData;
    }

    // Strategy 3: Try to extract from window globals
    const windowData = this.extractWindowData();
    if (windowData && windowData.length > 0) {
      return windowData;
    }

    return null;
  },

  /**
   * Extract data from RevenueCat's data table
   * The table has date columns as headers and Revenue/Transactions as rows
   * @returns {Array|null}
   */
  async extractRevenueCatTableData() {
    // Wait for table to appear with retries (RevenueCat loads data async)
    const maxAttempts = 10;
    const delayBetweenAttempts = 500; // ms

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Wait before checking
      await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));

      // Find all tables on the page
      const tables = document.querySelectorAll('table');

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
    }

    return null;
  },

  /**
   * Parse RevenueCat's specific table format
   * Headers are dates, first column is metric name, cells are values
   * V3 compatible: explicitly looks for "Revenue" row, ignores others like "Ad Impressions"
   * @param {Element} table
   * @returns {Array|null}
   */
  parseRevenueCatTable(table) {
    // Try both thead and direct th elements (some tables may not use thead)
    let headers = table.querySelectorAll('thead th, thead td');
    if (headers.length < 2) {
      // Try getting headers from first row or direct th elements
      headers = table.querySelectorAll('th');
    }

    // Try both tbody rows and direct tr elements
    let rows = table.querySelectorAll('tbody tr');
    if (rows.length === 0) {
      // Some tables don't use tbody
      rows = table.querySelectorAll('tr');
      // Skip header row if we're getting all tr elements
      if (rows.length > 0 && rows[0].querySelector('th')) {
        rows = Array.from(rows).slice(1);
      }
    }

    if (headers.length < 2 || rows.length === 0) {
      return null;
    }

    // Check if headers look like dates (e.g., "Jan 25 '26")
    const headerTexts = Array.from(headers).map(h => h.textContent.trim());

    // Verify this looks like a data table with date headers
    const dateHeaderCount = headerTexts.filter(h => this.parseRevenueCatDate(h)).length;

    if (dateHeaderCount < 2) {
      // Continue anyway in case it's a valid table
    }

    // Detect data granularity from headers
    this.detectedGranularity = this.detectGranularity(headerTexts);

    // Find the Revenue row
    // RevenueCat V3 charts may not have labels IN the table - the label might be external
    // In that case, identify revenue row by: first row with currency values ($)
    let revenueRow = null;

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];

      // Get ALL text from the entire row
      const rowText = row.textContent.replace(/\s+/g, ' ').trim();
      const rowTextLower = rowText.toLowerCase();

      // Get first cell for analysis
      const firstCell = row.querySelector('td, th');
      let cellText = firstCell ? firstCell.textContent.trim() : '';

      // Check if this row contains currency values (has $ signs)
      const hasCurrencyValues = rowText.includes('$');

      // Strategy 1: Look for explicit "Revenue" label
      if (cellText.toLowerCase().includes('revenue') ||
          rowTextLower.includes('revenue')) {
        revenueRow = row;
        break;
      }

      // Strategy 2: If no label but has currency values, assume it's the revenue row
      // (RevenueCat V3 charts have revenue as first row with $ values)
      if (hasCurrencyValues && !revenueRow) {
        revenueRow = row;
        // Don't break - keep looking for explicit label
      }
    }

    // If no revenue row found, DO NOT fall back to first row - that could give us wrong data
    if (!revenueRow) {
      return null;
    }

    // Extract dates from headers and revenue from cells
    const data = [];
    const cells = revenueRow.querySelectorAll('td, th');

    // Determine if first cell is a label or data
    // If first cell contains currency ($), it's data; otherwise it might be a label
    const firstCellText = cells[0]?.textContent.trim() || '';
    const firstCellIsData = firstCellText.includes('$') || /^\d+$/.test(firstCellText);
    const startIndex = firstCellIsData ? 0 : 1;

    // Also check if first header is a label column (empty or non-date)
    const firstHeaderIsLabel = !this.parseRevenueCatDate(headerTexts[0]);
    const headerOffset = firstHeaderIsLabel ? 1 : 0;

    // Match cells to headers
    for (let cellIdx = startIndex; cellIdx < cells.length; cellIdx++) {
      // Calculate corresponding header index
      const headerIdx = cellIdx - startIndex + headerOffset;

      if (headerIdx >= headers.length) break;

      const dateText = headerTexts[headerIdx];
      const revenueText = cells[cellIdx].textContent.trim();

      // Skip "Row Average" or similar summary columns
      if (dateText.toLowerCase().includes('average') ||
          dateText.toLowerCase().includes('total') ||
          dateText.toLowerCase().includes('sum')) {
        continue;
      }

      const date = this.parseRevenueCatDate(dateText);
      const revenue = this.parseCurrencyValue(revenueText);

      if (date && revenue !== null) {
        data.push({ date, revenue, granularity: this.detectedGranularity });
      }
    }

    return data.length > 0 ? data : null;
  },

  /**
   * Detect data granularity from date headers
   * @param {Array<string>} headers - Array of header texts
   * @returns {string} 'daily', 'weekly', or 'monthly'
   */
  detectGranularity(headers) {
    // Need at least 2 date headers to determine granularity
    const dateHeaders = headers.slice(1).filter(h => this.parseRevenueCatDate(h));

    if (dateHeaders.length < 2) {
      return 'daily'; // Default assumption
    }

    // Parse first two dates
    const date1 = new Date(this.parseRevenueCatDate(dateHeaders[0]));
    const date2 = new Date(this.parseRevenueCatDate(dateHeaders[1]));

    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
      return 'daily';
    }

    const diffDays = Math.abs((date2 - date1) / (1000 * 60 * 60 * 24));

    if (diffDays >= 28 && diffDays <= 31) {
      return 'monthly';
    } else if (diffDays >= 6 && diffDays <= 8) {
      return 'weekly';
    } else {
      return 'daily';
    }
  },

  /**
   * Get the detected data granularity
   * @returns {string}
   */
  getGranularity() {
    return this.detectedGranularity;
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
          // Silent fail
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
          return container;
        }
      }
    }

    // Fallback: find the chart and inject before it
    const chartContainer = this.findChartContainer();
    if (chartContainer) {
      return chartContainer;
    }

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
