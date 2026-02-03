/**
 * Lucky Cat - UI Injector
 * Creates and injects the forecast panel and other UI components
 */

const LCUIInjector = {
  /**
   * Panel element reference
   */
  forecastPanel: null,

  /**
   * Create and inject the forecast panel
   * @param {Object} forecasts - Forecast data from LCForecasting
   * @returns {Element} The created panel element
   */
  createForecastPanel(forecasts) {
    if (!forecasts) return null;

    const panel = document.createElement('div');
    panel.className = 'lc-forecast-panel lc-card';
    panel.id = 'lucky-cat-forecast-panel';

    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    panel.innerHTML = `
      <div class="lc-card-header">
        <span class="lc-card-title">
          <span style="font-size: 16px;">🐱</span>
          Revenue Forecast
        </span>
        <span class="lc-badge lc-badge--primary">Lucky Cat</span>
      </div>

      <div class="lc-forecast-grid">
        <!-- Current Month Forecast -->
        <div class="lc-forecast-item">
          <div class="lc-metric-label">${forecasts.currentMonth.name} ${currentYear} Forecast</div>
          <div class="lc-metric">${RCPFormat.currency(forecasts.currentMonth.projected)}</div>
          <div class="lc-forecast-range">
            Range: ${RCPFormat.currencyRange(forecasts.currentMonth.low, forecasts.currentMonth.high)}
          </div>
          ${forecasts.currentMonth.vsLastYear !== null ? `
            <div class="lc-change ${forecasts.currentMonth.vsLastYear >= 0 ? 'lc-change--positive' : 'lc-change--negative'}">
              ${forecasts.currentMonth.vsLastYear >= 0 ? '↑' : '↓'}
              ${Math.abs(forecasts.currentMonth.vsLastYear).toFixed(1)}% vs ${forecasts.currentMonth.name} ${lastYear}
            </div>
          ` : ''}
          ${forecasts.currentMonth.daysRemaining > 0 ? `
            <div class="lc-progress-container">
              <div class="lc-progress-bar">
                <div class="lc-progress-fill" style="width: ${this.getMonthProgress()}%"></div>
              </div>
              <div class="lc-progress-label">
                <span>${RCPFormat.currency(forecasts.currentMonth.mtdActual)} actual</span>
                <span>${forecasts.currentMonth.daysRemaining} days left</span>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Next Month Forecast -->
        <div class="lc-forecast-item">
          <div class="lc-metric-label">${forecasts.nextMonth.name} ${forecasts.nextMonth.year} Forecast</div>
          <div class="lc-metric">${RCPFormat.currency(forecasts.nextMonth.projected)}</div>
          <div class="lc-forecast-range">
            Range: ${RCPFormat.currencyRange(forecasts.nextMonth.low, forecasts.nextMonth.high)}
          </div>
          <div class="lc-text-secondary lc-mt-sm">
            Based on: ${forecasts.nextMonth.basedOn}
          </div>
        </div>

        <!-- YTD Comparison -->
        <div class="lc-forecast-item">
          <div class="lc-metric-label">Year to Date</div>
          <div class="lc-metric">${RCPFormat.currency(forecasts.ytd.current)}</div>
          <div class="lc-ytd-comparison">
            <div class="lc-text-secondary">
              ${forecasts.ytd.lastYearLabel}: ${RCPFormat.currency(forecasts.ytd.lastYear)}
            </div>
            ${forecasts.ytd.pctChange !== null ? `
              <div class="lc-change ${forecasts.ytd.pctChange >= 0 ? 'lc-change--positive' : 'lc-change--negative'}">
                ${forecasts.ytd.pctChange >= 0 ? '↑' : '↓'} ${Math.abs(forecasts.ytd.pctChange).toFixed(1)}% YoY
              </div>
            ` : ''}
          </div>
          <div class="lc-text-secondary lc-mt-sm" style="font-size: 11px;">
            As of ${forecasts.ytd.asOf}
          </div>
        </div>
      </div>

      ${forecasts.insight ? `
        <div class="lc-insight">
          <span class="lc-insight-icon">💡</span>
          <span>${forecasts.insight}</span>
        </div>
      ` : ''}

      ${forecasts.granularity === 'monthly' ? `
        <div class="lc-insight" style="margin-top: 8px; background: rgba(245, 158, 11, 0.1); border-left-color: #F59E0B;">
          <span class="lc-insight-icon">📊</span>
          <span>Viewing monthly data. For more accurate forecasts, switch to daily view.</span>
        </div>
      ` : ''}

      ${forecasts.note ? `
        <div class="lc-text-secondary lc-mt-sm" style="font-size: 11px; opacity: 0.7;">
          ${forecasts.note}
        </div>
      ` : ''}
    `;

    this.forecastPanel = panel;
    return panel;
  },

  /**
   * Find the main content container to shift
   * @returns {Element|null}
   */
  findMainContentContainer() {
    // Try various selectors that might match RevenueCat's main content area
    const selectors = [
      'main',
      '[class*="main-content"]',
      '[class*="MainContent"]',
      '[class*="page-content"]',
      '[class*="PageContent"]',
      '[class*="content-area"]',
      '[class*="ContentArea"]',
      '[role="main"]',
      '#root > div > div:last-child', // Common React app structure
      '#__next > div', // Next.js
      '.app-content',
      '[class*="AppContent"]'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.offsetWidth > 500) { // Make sure it's a substantial container
        console.log('LC UI: Found main content container with selector:', selector);
        return el;
      }
    }

    // Fallback: find the largest direct child of body that's not our panel
    const bodyChildren = Array.from(document.body.children).filter(el =>
      !el.id?.includes('lucky-cat') &&
      !el.classList?.contains('lc-') &&
      el.offsetWidth > 500
    );

    if (bodyChildren.length > 0) {
      // Sort by width and return the largest
      bodyChildren.sort((a, b) => b.offsetWidth - a.offsetWidth);
      console.log('LC UI: Using largest body child as main content');
      return bodyChildren[0];
    }

    return null;
  },

  /**
   * Shift the main page content to make room for sidebar
   */
  shiftPageContent() {
    const mainContent = this.findMainContentContainer();
    if (mainContent) {
      mainContent.classList.add('lc-page-shifted');
      console.log('LC UI: ✓ Page content shifted');
      return mainContent;
    }
    console.log('LC UI: Could not find main content to shift');
    return null;
  },

  /**
   * Remove the shift from page content
   */
  unshiftPageContent() {
    const shifted = document.querySelector('.lc-page-shifted');
    if (shifted) {
      shifted.classList.remove('lc-page-shifted');
      console.log('LC UI: Page content un-shifted');
    }
  },

  /**
   * Inject the forecast panel into the page (as fixed sidebar on right)
   * @param {Object} forecasts - Forecast data
   * @returns {boolean} Success status
   */
  injectForecastPanel(forecasts) {
    console.log('LC UI: injectForecastPanel called');

    // Remove existing panel if present
    this.removeForecastPanel();

    console.log('LC UI: Creating panel with forecasts:', forecasts ? 'yes' : 'no');
    const panel = this.createForecastPanel(forecasts);
    if (!panel) {
      console.log('LC UI: ❌ Failed to create panel');
      return false;
    }
    console.log('LC UI: ✓ Panel created');

    // Shift main content to make room for sidebar
    this.shiftPageContent();

    // Append to body for fixed positioning (right sidebar)
    try {
      document.body.appendChild(panel);
      console.log('LC UI: ✓ Panel appended to body');
    } catch (e) {
      console.log('LC UI: ❌ Failed to append panel:', e.message);
      return false;
    }

    // Animate in
    requestAnimationFrame(() => {
      setTimeout(() => {
        panel.classList.add('lc-panel--visible');
        console.log('LC UI: ✓ Panel animation triggered');
      }, 50);
    });

    return true;
  },

  /**
   * Remove the forecast panel
   */
  removeForecastPanel() {
    const existing = document.getElementById('lucky-cat-forecast-panel');
    if (existing) {
      console.log('LC UI: Removing existing forecast panel');
      existing.remove();
    }
    // Also un-shift the page content
    this.unshiftPageContent();
    this.forecastPanel = null;
  },

  /**
   * Update forecast panel with new data
   * @param {Object} forecasts - New forecast data
   */
  updateForecastPanel(forecasts) {
    if (this.forecastPanel) {
      this.removeForecastPanel();
    }
    this.injectForecastPanel(forecasts);
  },

  /**
   * Create a loading state for the panel
   * @returns {Element}
   */
  createLoadingPanel() {
    const panel = document.createElement('div');
    panel.className = 'lc-forecast-panel lc-card';
    panel.id = 'lucky-cat-forecast-panel';

    panel.innerHTML = `
      <div class="lc-card-header">
        <span class="lc-card-title">
          <span style="font-size: 16px;">🐱</span>
          Revenue Forecast
        </span>
        <span class="lc-badge lc-badge--primary">Lucky Cat</span>
      </div>
      <div class="lc-loading">
        <div class="lc-spinner"></div>
        <span>Analyzing revenue data...</span>
      </div>
    `;

    return panel;
  },

  /**
   * Show loading state
   */
  showLoading() {
    this.removeForecastPanel();

    const panel = this.createLoadingPanel();
    document.body.appendChild(panel);

    requestAnimationFrame(() => {
      panel.classList.add('lc-panel--visible');
    });
  },

  /**
   * Create error message panel
   * @param {string} message - Error message
   * @returns {Element}
   */
  createErrorPanel(message) {
    const panel = document.createElement('div');
    panel.className = 'lc-forecast-panel lc-card';
    panel.id = 'lucky-cat-forecast-panel';

    panel.innerHTML = `
      <div class="lc-card-header">
        <span class="lc-card-title">
          <span style="font-size: 16px;">🐱</span>
          Revenue Forecast
        </span>
        <span class="lc-badge">Lucky Cat</span>
      </div>
      <div class="lc-error-message">
        ${message}
      </div>
    `;

    return panel;
  },

  /**
   * Calculate current month progress percentage
   * @returns {number}
   */
  getMonthProgress() {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.round((now.getDate() / daysInMonth) * 100);
  },

  /**
   * Inject ASA columns into the attribution table
   * @param {Element} table - The table element
   * @param {Object} asaData - ASA data keyed by keyword
   * @returns {boolean} Success status
   */
  injectASAColumns(table, asaData) {
    if (!table || !asaData) return false;

    // Check if already injected
    if (table.querySelector('.lc-injected-header')) {
      return false;
    }

    // Add header columns
    const headerRow = table.querySelector('thead tr');
    if (headerRow) {
      const spendHeader = document.createElement('th');
      spendHeader.className = 'lc-injected-header';
      spendHeader.textContent = 'Spend';
      spendHeader.title = 'Apple Search Ads spend (via Lucky Cat)';

      const roiHeader = document.createElement('th');
      roiHeader.className = 'lc-injected-header';
      roiHeader.textContent = 'ROI';
      roiHeader.title = 'Return on investment (Revenue / Spend)';

      headerRow.appendChild(spendHeader);
      headerRow.appendChild(roiHeader);
    }

    // Add data columns to each row
    const bodyRows = table.querySelectorAll('tbody tr');
    bodyRows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 2) return;

      const keyword = cells[0].textContent.trim().toLowerCase();
      const revenue = RCPFormat.parseCurrency(cells[1].textContent);

      // Try to find matching ASA data
      const asaKeywordData = this.findMatchingASAData(keyword, asaData);

      // Spend column
      const spendCell = document.createElement('td');
      spendCell.className = 'lc-injected-column';

      if (asaKeywordData && asaKeywordData.spend !== null && asaKeywordData.spend !== undefined) {
        spendCell.textContent = RCPFormat.currency(asaKeywordData.spend);
      } else {
        spendCell.textContent = '—';
        spendCell.title = 'No ASA data found for this keyword';
      }

      // ROI column
      const roiCell = document.createElement('td');
      roiCell.className = 'lc-injected-column';

      if (asaKeywordData && asaKeywordData.spend > 0) {
        const roi = revenue / asaKeywordData.spend;
        roiCell.textContent = RCPFormat.multiplier(roi);

        if (roi >= 2.0) {
          roiCell.classList.add('lc-roi-good');
          roiCell.textContent += ' ✓';
          roiCell.title = 'Good ROI (≥2x)';
        } else if (roi >= 1.0) {
          roiCell.classList.add('lc-roi-okay');
          roiCell.title = 'Moderate ROI (1-2x)';
        } else {
          roiCell.classList.add('lc-roi-bad');
          roiCell.textContent += ' ✗';
          roiCell.title = 'Poor ROI (<1x)';
        }
      } else {
        roiCell.textContent = '—';
      }

      row.appendChild(spendCell);
      row.appendChild(roiCell);
    });

    return true;
  },

  /**
   * Find matching ASA data for a keyword
   * Tries exact match first, then fuzzy matching
   * @param {string} keyword - The keyword to match
   * @param {Object} asaData - ASA data object
   * @returns {Object|null}
   */
  findMatchingASAData(keyword, asaData) {
    const normalized = keyword.toLowerCase().trim();

    // Exact match
    if (asaData[normalized]) {
      return asaData[normalized];
    }

    // Try variations
    for (const asaKeyword of Object.keys(asaData)) {
      const asaNormalized = asaKeyword.toLowerCase().trim();

      // Check if one contains the other
      if (asaNormalized.includes(normalized) || normalized.includes(asaNormalized)) {
        return asaData[asaKeyword];
      }

      // Simple fuzzy: check similarity
      if (this.stringSimilarity(normalized, asaNormalized) > 0.85) {
        return asaData[asaKeyword];
      }
    }

    return null;
  },

  /**
   * Calculate string similarity (Dice coefficient)
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score 0-1
   */
  stringSimilarity(str1, str2) {
    if (str1 === str2) return 1;
    if (str1.length < 2 || str2.length < 2) return 0;

    const bigrams1 = new Map();
    for (let i = 0; i < str1.length - 1; i++) {
      const bigram = str1.substring(i, i + 2);
      const count = bigrams1.get(bigram) || 0;
      bigrams1.set(bigram, count + 1);
    }

    let intersectionSize = 0;
    for (let i = 0; i < str2.length - 1; i++) {
      const bigram = str2.substring(i, i + 2);
      const count = bigrams1.get(bigram) || 0;
      if (count > 0) {
        bigrams1.set(bigram, count - 1);
        intersectionSize++;
      }
    }

    return (2.0 * intersectionSize) / (str1.length + str2.length - 2);
  },

  /**
   * Remove ASA columns from table
   * @param {Element} table - The table element
   */
  removeASAColumns(table) {
    if (!table) return;

    table.querySelectorAll('.lc-injected-header, .lc-injected-column').forEach(el => {
      el.remove();
    });
  },

  /**
   * Create a tooltip element
   * @param {string} text - Tooltip text
   * @returns {Element}
   */
  createTooltip(text) {
    const tooltip = document.createElement('span');
    tooltip.className = 'lc-tooltip-content';
    tooltip.textContent = text;
    return tooltip;
  },

  /**
   * Show a temporary toast notification
   * @param {string} message - Message to show
   * @param {string} type - Type: 'success', 'error', 'info'
   */
  showToast(message, type = 'info') {
    // Remove existing toast
    const existing = document.querySelector('.lc-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `lc-toast lc-toast--${type}`;
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 12px 20px;
      background: ${type === 'error' ? '#EF4444' : type === 'success' ? '#10B981' : '#6366F1'};
      color: white;
      border-radius: 8px;
      font-size: 14px;
      font-family: Inter, -apple-system, sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.2s, transform 0.2s;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 200);
    }, 3000);
  }
};

// Make available globally for content scripts
if (typeof window !== 'undefined') {
  window.LCUIInjector = LCUIInjector;
}
