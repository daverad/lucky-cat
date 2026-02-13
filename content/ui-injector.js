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
   * Lucky Cat button reference
   */
  luckyCatButton: null,

  /**
   * Lucky Cat SVG icon (simplified for inline use)
   */
  catIconSVG: `<svg width="16" height="16" viewBox="0 0 871 887" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M126.097 0.100883C130.694 -0.292916 139.349 0.531939 143.993 1.43741C201.046 12.5584 255.722 54.2387 295.892 94.2765C313.163 111.491 334.22 137.95 348.252 157.84C357.142 156.119 370.841 154.847 379.94 154.018C417.797 150.483 455.898 150.563 493.743 154.255C501.185 154.957 515.255 156.292 522.223 157.979C529.895 146.54 538.179 135.519 547.029 124.964C586.89 77.0511 637.888 33.0233 696.504 9.98769C724.419 -0.982616 755.746 -6.57477 780.523 14.8358C795.303 27.6038 806.325 47.3677 813.451 65.5869C839.703 132.721 842.52 207.144 837.768 278.315C836.979 289.923 835.964 301.049 834.75 312.615C833.5 324.484 830.236 339.331 831.42 351.009C832.051 357.293 837.344 368.887 839.875 375.086C843.432 383.559 846.696 392.151 849.67 400.843C861.943 437.705 867.171 470.387 870.224 508.968C816.737 505.98 753.367 516.025 701.131 527.975C691.231 530.239 671.237 533.432 664.002 539.488C660.323 542.541 658.071 546.984 657.786 551.754C657.507 556.579 659.164 561.307 662.387 564.906C671.2 574.725 687.291 568.505 698.605 565.907C710.551 563.098 722.521 560.396 734.515 557.799C777.41 548.786 827.334 543.141 871 544.731C869.173 578.517 866.934 598.832 858.127 631.975C851.159 628.91 842.374 626.173 835.108 623.861C785.943 608.209 734.204 603.007 682.841 601.49C676.887 601.314 669.865 600.519 664.196 602.521C659.158 604.305 655.114 608.147 653.062 613.087C651.229 617.396 651.304 622.287 653.27 626.542C658.982 639.141 673.949 637.164 685.579 637.51C694.944 637.771 704.304 638.195 713.657 638.796C756.461 641.855 804.942 649.987 845.069 665.353C831.224 697.398 811.929 726.803 788.038 752.257C677.889 867.792 501.561 902.136 348.122 879.918C213.241 860.388 77.196 790.194 23.754 657.914C33.873 654.169 43.935 649.83 54.3307 646.905C96.4228 635.058 140.73 627.604 184.525 626.827C189.688 626.736 194.082 626.185 198.989 624.68C213.408 620.243 214.25 597.873 200.551 592.307C190.127 588.253 176.732 591.099 165.84 591.512C113.212 594.516 60.6205 604.439 11.7525 624.588C3.10179 594.565 1.37239 565.718 0 534.778C46.1786 531.835 86.9107 536.545 132.207 545.776C142.494 547.888 152.744 550.176 162.953 552.634C174.07 555.243 190.049 561.3 199.341 552.562C202.801 549.272 204.759 544.708 204.755 539.932C204.834 524.686 189.116 521.203 177.235 518.46C137.586 509.302 97.8151 501.834 57.1166 499.311C38.6064 498.163 20.664 498.393 2.15556 498.754C5.01991 463.922 12.0538 429.559 23.1081 396.404C28.0247 381.687 36.847 365.036 39.6756 350.641C40.7427 345.211 37.7373 327.565 36.8353 321.261C35.8307 313.856 34.9833 306.43 34.2925 298.989C27.2893 228.266 29.0242 150.69 50.7025 82.561C56.9428 62.949 66.3025 41.2962 79.5808 25.4755C92.8525 9.66263 105.7 1.97621 126.097 0.100883ZM501.406 523.734C486.857 511.972 451.239 508.639 433.121 509.81C432.69 509.841 432.258 509.871 431.827 509.908C412.652 511.352 368.784 513.853 373.265 542.286C378.484 575.404 427.759 577.796 423.189 616.394C418.194 658.61 362.968 673.279 330.163 653.33C321.085 647.808 312.997 624.753 299.192 625.65C291.001 626.961 283.381 635.306 285.241 643.687C288.21 657.063 301.368 671.968 312.39 679.421C354.403 707.83 407.342 694.224 440.519 659.455L444.725 663.976C466.127 684.477 490.364 694.988 520.349 694.381C542.031 694.175 564.18 686.273 579.197 670.341C588.053 660.946 603.232 641.982 590.049 630.172C576.441 617.979 566.431 634.34 559.554 643.644C550.68 655.655 538.783 661.161 524.186 661.822C506.401 663.042 486.704 658.751 473.096 646.704C463.305 638.062 457.412 625.837 456.744 612.795C456.241 603.692 459.185 595.208 465.546 588.654C481.103 572.601 507.634 561.991 507.482 535.907C507.457 531.495 504.701 526.398 501.406 523.734ZM615.799 359.236C610.676 358.864 598.699 358.613 593.716 359.38C586.754 360.032 580.691 360.986 573.966 362.611C542.287 370.272 513.45 394.472 507.793 427.669C506.943 432.631 505.911 447.39 514.536 445.789C524.745 442.89 533.31 431.752 541.158 424.621C561.443 406.037 588.74 397.072 616.097 400.011C640.418 403.49 658.289 412.658 675.569 430.101C680.133 434.705 685.079 440.428 690.639 443.612C697.692 447.652 702.457 446.626 703.131 437.951C704.405 421.597 696.515 405.388 686.312 393.058C668.691 372.112 642.731 361.189 615.799 359.236ZM264.609 358.827C236.056 359.579 210.611 367.653 189.096 389.165C179.547 398.713 161.887 428.526 171.723 444.35C172.339 445.339 175.097 446.016 176.182 445.758C188.224 442.318 198.703 426.32 209.491 418.677C229.042 404.825 246.649 399.321 270.074 399.359C293.5 401.163 312.79 407.98 330.241 424.086C336.526 429.486 342.503 436.552 349.021 441.521C351.188 443.614 359.612 447.365 361.907 444.106C372.068 429.679 356.495 402.292 346.713 391.624C324.134 366.998 296.938 359.276 264.609 358.827ZM140.674 64.8632C128.689 67.7362 121.547 72.8822 114.974 83.5512C108.258 94.4536 103.614 110.003 100.378 122.447C88.313 168.833 87.4512 217.434 90.6991 265C91.5361 277.262 92.8487 289.568 93.6153 301.722C111.056 272.476 135.202 248.879 162.44 228.842C204.62 200.234 237.066 185.33 285.891 172.149C260.641 137.659 186.129 63.5368 140.674 64.8632ZM768.858 118.486C763.104 96.3988 752.189 61.605 723.466 64.906C673.731 75.6235 613.549 132.232 584.602 172.173C626.605 182.865 679.024 205.64 713.13 232.4C734.277 248.974 752.603 265.879 768.245 287.931C770.636 291.3 775.114 297.395 776.875 300.931C778.344 294.336 778.872 287.031 779.449 280.256C784.05 226.389 782.533 170.995 768.858 118.486Z" fill="currentColor"/>
  </svg>`,

  /**
   * Current view: 'forecast' or 'settings'
   */
  currentView: 'forecast',

  /**
   * Cached forecasts data for view switching
   */
  cachedForecasts: null,

  /**
   * Cached scenario for display
   */
  cachedScenario: 'better',

  /**
   * Format month and year as abbreviated caps (e.g., "JAN '26")
   */
  formatMonthAbbrev(monthName, year) {
    const abbrev = monthName.substring(0, 3).toUpperCase();
    const shortYear = String(year).slice(-2);
    return `${abbrev} '${shortYear}`;
  },

  /**
   * Calculate YTD progress percentage
   */
  getYTDProgress() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    const totalDays = (end - start) / (1000 * 60 * 60 * 24);
    const daysPassed = (now - start) / (1000 * 60 * 60 * 24);
    return Math.round((daysPassed / totalDays) * 100);
  },

  /**
   * Setup event listeners for settings link and back button
   */
  setupPanelListeners() {
    if (!this.forecastPanel) return;

    // Settings link
    const settingsLink = this.forecastPanel.querySelector('#lc-open-settings');
    if (settingsLink) {
      settingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.showSettingsView();
      });
    }

    // Back button (in settings view)
    const backBtn = this.forecastPanel.querySelector('#lc-back-to-forecast');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showForecastView();
      });
    }
  },

  /**
   * Show the settings view in the sidebar
   */
  async showSettingsView() {
    if (!this.forecastPanel) return;

    this.currentView = 'settings';

    // Load current settings
    const settings = await RCPStorage.getSettings();

    // Default variance is 0 (use calculated variance)
    const currentVariance = settings.varianceOverride || 0;

    this.forecastPanel.innerHTML = `
      <div class="lc-card-header">
        <a href="#" class="lc-back-link" id="lc-back-to-forecast">
          ← Back
        </a>
        <span class="lc-card-title">Settings</span>
      </div>

      <div class="lc-settings-content">
        <div class="lc-settings-section">
          <div class="lc-settings-label">Forecast range variance</div>
          <select id="lc-variance-override" class="lc-select">
            <option value="0" ${currentVariance === 0 ? 'selected' : ''}>Auto (based on history)</option>
            <option value="10" ${currentVariance === 10 ? 'selected' : ''}>±10%</option>
            <option value="20" ${currentVariance === 20 ? 'selected' : ''}>±20%</option>
            <option value="30" ${currentVariance === 30 ? 'selected' : ''}>±30%</option>
            <option value="40" ${currentVariance === 40 ? 'selected' : ''}>±40%</option>
            <option value="50" ${currentVariance === 50 ? 'selected' : ''}>±50%</option>
          </select>
          <div class="lc-settings-help">Controls the range shown for forecasts</div>
        </div>

        <div class="lc-settings-section">
          <button class="lc-button lc-button--secondary" id="lc-refresh-data">
            Refresh revenue data
          </button>
          <span id="lc-refresh-status" class="lc-status-text"></span>
          <div class="lc-settings-help">Clears cache and fetches fresh data from the revenue chart</div>
        </div>

        <div class="lc-settings-section">
          <button class="lc-button lc-button--secondary" id="lc-clear-cache">
            Clear all cached data
          </button>
          <span id="lc-cache-status" class="lc-status-text"></span>
        </div>

        <div class="lc-settings-section lc-calc-info">
          <div class="lc-settings-label">How forecasts are calculated</div>
          <div class="lc-calc-explanation">
            <p><strong>Current month:</strong> Takes your daily average from the last 15 days (excluding today) and multiplies by remaining days, then adds your actual revenue so far.</p>
            <p><strong>Next month:</strong> Uses the higher of your recent 15-day average or last year's same month adjusted for growth.</p>
            <p><strong>Range:</strong> Based on historical variance in your monthly revenue, or your selected variance setting.</p>
          </div>
        </div>

        <div class="lc-settings-section">
          <div class="lc-settings-label">Feedback & Feature Requests</div>
          <div class="lc-settings-help">Have an idea or found a bug? We'd love to hear from you.</div>
          <a href="mailto:meow@luckycat.tools?subject=Lucky%20Cat%20Feedback" class="lc-button lc-button--secondary lc-mt-sm" style="text-decoration: none; display: inline-block;">
            Contact Us
          </a>
        </div>
      </div>

      <div class="lc-panel-footer">
        <button class="lc-button lc-button--primary" id="lc-save-settings">
          Save Settings
        </button>
        <span id="lc-save-status" class="lc-status-text"></span>
      </div>
    `;

    this.setupSettingsListeners();
  },

  /**
   * Setup listeners for settings view
   */
  setupSettingsListeners() {
    if (!this.forecastPanel) return;

    // Back button
    const backBtn = this.forecastPanel.querySelector('#lc-back-to-forecast');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showForecastView();
      });
    }

    // Save settings button
    const saveBtn = this.forecastPanel.querySelector('#lc-save-settings');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const varianceOverride = parseInt(this.forecastPanel.querySelector('#lc-variance-override')?.value || '0');

        await RCPStorage.saveSettings({
          varianceOverride
        });

        const statusEl = this.forecastPanel.querySelector('#lc-save-status');
        if (statusEl) {
          statusEl.textContent = 'Saved!';
          setTimeout(() => { statusEl.textContent = ''; }, 2000);
        }
      });
    }

    // Refresh data button
    const refreshDataBtn = this.forecastPanel.querySelector('#lc-refresh-data');
    if (refreshDataBtn) {
      refreshDataBtn.addEventListener('click', async () => {
        const statusEl = this.forecastPanel.querySelector('#lc-refresh-status');
        if (statusEl) {
          statusEl.textContent = 'Refreshing...';
        }

        // Clear revenue history cache for current project
        const projectId = LCDOMParser?.getProjectId();
        if (projectId) {
          await RCPStorage.clearRevenueHistory(projectId);
        }

        // Clear the redirect state to ensure fresh start
        RCPStorage.clearRedirectState();

        // Trigger the data gathering flow
        // This will show gathering loading and redirect to revenue chart
        this.showGatheringLoading();

        // Store return URL and initiate redirect
        const currentUrl = window.location.href;
        RCPStorage.setRedirectState({
          returnUrl: currentUrl,
          isGathering: true,
          isReturning: false,
          projectId: projectId
        });

        // Redirect to revenue chart
        const REVENUE_CHART_URL = 'https://app.revenuecat.com/charts/revenue?range=All+time&resolution=0&chart_type=Stacked+area';
        const pageType = LCDOMParser?.detectPageType();

        if (pageType === 'charts-revenue') {
          // Already on revenue chart, just refresh the data
          window.location.reload();
        } else {
          window.location.href = REVENUE_CHART_URL;
        }
      });
    }

    // Clear cache button
    const clearCacheBtn = this.forecastPanel.querySelector('#lc-clear-cache');
    if (clearCacheBtn) {
      clearCacheBtn.addEventListener('click', async () => {
        await RCPStorage.clearAllCache();
        const projectId = LCDOMParser?.getProjectId();
        if (projectId) {
          await RCPStorage.clearRevenueHistory(projectId);
        }
        const statusEl = this.forecastPanel.querySelector('#lc-cache-status');
        if (statusEl) {
          statusEl.textContent = 'Cache cleared';
          setTimeout(() => { statusEl.textContent = ''; }, 2000);
        }
      });
    }
  },

  /**
   * Show the forecast view in the sidebar
   */
  showForecastView() {
    if (!this.forecastPanel || !this.cachedForecasts) return;

    this.currentView = 'forecast';

    // Generate the forecast panel HTML content
    const tempPanel = document.createElement('div');
    const forecasts = this.cachedForecasts;
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    const currentMonthValue = forecasts.currentMonth.projected;
    const nextMonthValue = forecasts.nextMonth.projected;

    // Get last month's year for formatting
    let lastMonthNum = new Date().getMonth() - 1;
    let lastMonthYear = currentYear;
    if (lastMonthNum < 0) {
      lastMonthNum = 11;
      lastMonthYear = currentYear - 1;
    }

    tempPanel.innerHTML = `
      <div class="lc-card-header lc-card-header--no-border">
        <span class="lc-card-title">Forecast</span>
        <a href="#" class="lc-settings-link" id="lc-open-settings">Settings</a>
      </div>

      <div class="lc-forecast-grid">
        <!-- Current Month Forecast -->
        <div class="lc-forecast-item">
          <div class="lc-metric-label">${forecasts.currentMonth.name} ${currentYear} Forecast</div>
          <div class="lc-metric">${RCPFormat.currency(currentMonthValue)}</div>
          <div class="lc-forecast-range">
            Range: ${RCPFormat.currencyRange(forecasts.currentMonth.low, forecasts.currentMonth.high)}
          </div>
          <div class="lc-comparison-row">
            ${forecasts.currentMonth.vsMoM !== null ? `
              <span class="lc-change lc-change--hoverable ${forecasts.currentMonth.vsMoM >= 0 ? 'lc-change--positive' : 'lc-change--negative'}" title="${this.formatMonthAbbrev(forecasts.currentMonth.lastMonthName, lastMonthYear)}: ${RCPFormat.currency(forecasts.currentMonth.lastMonthAmount)}">
                ${forecasts.currentMonth.vsMoM >= 0 ? '↑' : '↓'} ${Math.abs(Math.round(forecasts.currentMonth.vsMoM))}% MoM
              </span>
            ` : ''}
            ${forecasts.currentMonth.vsLastYear !== null ? `
              <span class="lc-change lc-change--hoverable ${forecasts.currentMonth.vsLastYear >= 0 ? 'lc-change--positive' : 'lc-change--negative'}" title="${this.formatMonthAbbrev(forecasts.currentMonth.name, lastYear)}: ${RCPFormat.currency(forecasts.currentMonth.lastYearAmount)}">
                ${forecasts.currentMonth.vsLastYear >= 0 ? '↑' : '↓'} ${Math.abs(Math.round(forecasts.currentMonth.vsLastYear))}% YoY
              </span>
            ` : ''}
          </div>
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
          <div class="lc-metric">${RCPFormat.currency(nextMonthValue)}</div>
          <div class="lc-forecast-range">
            Range: ${RCPFormat.currencyRange(forecasts.nextMonth.low, forecasts.nextMonth.high)}
          </div>
        </div>

        <!-- YTD Comparison -->
        <div class="lc-forecast-item">
          <div class="lc-metric-label">Year to Date</div>
          <div class="lc-metric">${RCPFormat.currency(forecasts.ytd.current)}</div>
          <div class="lc-comparison-row">
            ${forecasts.ytd.pctChange !== null ? `
              <span class="lc-change lc-change--hoverable ${forecasts.ytd.pctChange >= 0 ? 'lc-change--positive' : 'lc-change--negative'}" title="${forecasts.ytd.lastYearLabel}: ${RCPFormat.currency(forecasts.ytd.lastYear)}">
                ${forecasts.ytd.pctChange >= 0 ? '↑' : '↓'} ${Math.abs(Math.round(forecasts.ytd.pctChange))}% YoY
              </span>
            ` : ''}
          </div>
          <div class="lc-progress-container">
            <div class="lc-progress-bar">
              <div class="lc-progress-fill" style="width: ${this.getYTDProgress()}%"></div>
            </div>
            <div class="lc-progress-label">
              <span>As of ${forecasts.ytd.asOf}</span>
              <span>${Math.round((365 - this.getYTDProgress() * 3.65))} days left</span>
            </div>
          </div>
        </div>
      </div>

      ${forecasts.granularity === 'monthly' ? `
        <div class="lc-insight" style="margin-top: 8px; background: rgba(245, 158, 11, 0.1); border-left-color: #F59E0B;">
          <span class="lc-insight-icon">📊</span>
          <span>Viewing monthly data. For more accurate forecasts, switch to daily view.</span>
        </div>
      ` : ''}

      <div class="lc-panel-footer">
        <span class="lc-powered-by">Powered by <a href="https://luckycat.tools" target="_blank">Lucky Cat</a></span>
      </div>
    `;

    // Replace the current panel's innerHTML
    this.forecastPanel.innerHTML = tempPanel.innerHTML;
    this.setupPanelListeners();
  },

  /**
   * Create and inject the forecast panel
   * @param {Object} forecasts - Forecast data from LCForecasting
   * @param {string} scenario - Initial scenario (kept for compatibility, uses 'better')
   * @returns {Element} The created panel element
   */
  createForecastPanel(forecasts, scenario = 'better') {
    if (!forecasts) return null;

    // Cache forecasts for settings view switching
    this.cachedForecasts = forecasts;
    this.cachedScenario = scenario;

    const panel = document.createElement('div');
    panel.className = 'lc-forecast-panel lc-card';
    panel.id = 'lucky-cat-forecast-panel';

    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    // Get last month's year for formatting
    let lastMonthNum = new Date().getMonth() - 1;
    let lastMonthYear = currentYear;
    if (lastMonthNum < 0) {
      lastMonthNum = 11;
      lastMonthYear = currentYear - 1;
    }

    // Use projected (better) values for display
    const currentMonthValue = forecasts.currentMonth.projected;
    const nextMonthValue = forecasts.nextMonth.projected;

    panel.innerHTML = `
      <div class="lc-card-header lc-card-header--no-border">
        <span class="lc-card-title">Forecast</span>
        <a href="#" class="lc-settings-link" id="lc-open-settings">Settings</a>
      </div>

      <div class="lc-forecast-grid">
        <!-- Current Month Forecast -->
        <div class="lc-forecast-item">
          <div class="lc-metric-label">${forecasts.currentMonth.name} ${currentYear} Forecast</div>
          <div class="lc-metric">${RCPFormat.currency(currentMonthValue)}</div>
          <div class="lc-forecast-range">
            Range: ${RCPFormat.currencyRange(forecasts.currentMonth.low, forecasts.currentMonth.high)}
          </div>
          <div class="lc-comparison-row">
            ${forecasts.currentMonth.vsMoM !== null ? `
              <span class="lc-change lc-change--hoverable ${forecasts.currentMonth.vsMoM >= 0 ? 'lc-change--positive' : 'lc-change--negative'}" title="${this.formatMonthAbbrev(forecasts.currentMonth.lastMonthName, lastMonthYear)}: ${RCPFormat.currency(forecasts.currentMonth.lastMonthAmount)}">
                ${forecasts.currentMonth.vsMoM >= 0 ? '↑' : '↓'} ${Math.abs(Math.round(forecasts.currentMonth.vsMoM))}% MoM
              </span>
            ` : ''}
            ${forecasts.currentMonth.vsLastYear !== null ? `
              <span class="lc-change lc-change--hoverable ${forecasts.currentMonth.vsLastYear >= 0 ? 'lc-change--positive' : 'lc-change--negative'}" title="${this.formatMonthAbbrev(forecasts.currentMonth.name, lastYear)}: ${RCPFormat.currency(forecasts.currentMonth.lastYearAmount)}">
                ${forecasts.currentMonth.vsLastYear >= 0 ? '↑' : '↓'} ${Math.abs(Math.round(forecasts.currentMonth.vsLastYear))}% YoY
              </span>
            ` : ''}
          </div>
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
          <div class="lc-metric">${RCPFormat.currency(nextMonthValue)}</div>
          <div class="lc-forecast-range">
            Range: ${RCPFormat.currencyRange(forecasts.nextMonth.low, forecasts.nextMonth.high)}
          </div>
        </div>

        <!-- YTD Comparison -->
        <div class="lc-forecast-item">
          <div class="lc-metric-label">Year to Date</div>
          <div class="lc-metric">${RCPFormat.currency(forecasts.ytd.current)}</div>
          <div class="lc-comparison-row">
            ${forecasts.ytd.pctChange !== null ? `
              <span class="lc-change lc-change--hoverable ${forecasts.ytd.pctChange >= 0 ? 'lc-change--positive' : 'lc-change--negative'}" title="${forecasts.ytd.lastYearLabel}: ${RCPFormat.currency(forecasts.ytd.lastYear)}">
                ${forecasts.ytd.pctChange >= 0 ? '↑' : '↓'} ${Math.abs(Math.round(forecasts.ytd.pctChange))}% YoY
              </span>
            ` : ''}
          </div>
          <div class="lc-progress-container">
            <div class="lc-progress-bar">
              <div class="lc-progress-fill" style="width: ${this.getYTDProgress()}%"></div>
            </div>
            <div class="lc-progress-label">
              <span>As of ${forecasts.ytd.asOf}</span>
              <span>${Math.round((365 - this.getYTDProgress() * 3.65))} days left</span>
            </div>
          </div>
        </div>
      </div>

      ${forecasts.granularity === 'monthly' ? `
        <div class="lc-insight" style="margin-top: 8px; background: rgba(245, 158, 11, 0.1); border-left-color: #F59E0B;">
          <span class="lc-insight-icon">📊</span>
          <span>Viewing monthly data. For more accurate forecasts, switch to daily view.</span>
        </div>
      ` : ''}

      <div class="lc-panel-footer">
        <span class="lc-powered-by">Powered by <a href="https://luckycat.tools" target="_blank">Lucky Cat</a></span>
      </div>
    `;

    this.forecastPanel = panel;
    return panel;
  },

  /**
   * Show navigation prompt when not on revenue chart page
   */
  showNavigationPrompt() {
    this.removeForecastPanel();

    const revenueChartUrl = 'https://app.revenuecat.com/charts/revenue?range=All+time&resolution=0&chart_type=Stacked+area';

    const panel = document.createElement('div');
    panel.className = 'lc-forecast-panel lc-card';
    panel.id = 'lucky-cat-forecast-panel';

    panel.innerHTML = `
      <div class="lc-card-header">
        <span class="lc-card-title">Forecast</span>
        <button class="lc-close-btn" id="lc-close-sidebar" title="Close sidebar">✕</button>
      </div>

      <div class="lc-navigation-prompt">
        <div class="lc-prompt-icon">📊</div>
        <div class="lc-prompt-text">
          This forecasting tool only works on the <strong>All-Time Daily Revenue Chart</strong>.
        </div>
        <a href="${revenueChartUrl}" class="lc-button lc-button--primary lc-prompt-button">
          Go to Revenue Chart →
        </a>
        <button class="lc-button lc-button--secondary lc-prompt-button" id="lc-close-prompt">
          Close Sidebar
        </button>
      </div>

      <div class="lc-panel-footer">
        <span class="lc-powered-by">Powered by <a href="https://luckycat.tools" target="_blank">Lucky Cat</a></span>
      </div>
    `;

    this.forecastPanel = panel;

    // Shift main content
    this.shiftPageContent();

    // Append to body
    document.body.appendChild(panel);

    // Animate in and setup listeners
    requestAnimationFrame(() => {
      setTimeout(() => {
        panel.classList.add('lc-panel--visible');
        this.setupNavigationPromptListeners();
      }, 50);
    });
  },

  /**
   * Setup listeners for navigation prompt
   */
  setupNavigationPromptListeners() {
    if (!this.forecastPanel) return;

    // Close button in header
    const closeBtn = this.forecastPanel.querySelector('#lc-close-sidebar');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.removeForecastPanel());
    }

    // Close button in prompt
    const closePromptBtn = this.forecastPanel.querySelector('#lc-close-prompt');
    if (closePromptBtn) {
      closePromptBtn.addEventListener('click', () => this.removeForecastPanel());
    }

    // Settings link
    const settingsLink = this.forecastPanel.querySelector('#lc-open-settings');
    if (settingsLink) {
      settingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
      });
    }
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
      return mainContent;
    }
    return null;
  },

  /**
   * Remove the shift from page content
   */
  unshiftPageContent() {
    const shifted = document.querySelector('.lc-page-shifted');
    if (shifted) {
      shifted.classList.remove('lc-page-shifted');
    }
  },

  /**
   * Inject the forecast panel into the page (as fixed sidebar on right)
   * @param {Object} forecasts - Forecast data
   * @param {string} scenario - Initial scenario: 'good', 'better', or 'best'
   * @returns {boolean} Success status
   */
  injectForecastPanel(forecasts, scenario = 'better') {
    // Check if panel already exists (e.g., from loading state)
    const existingPanel = document.getElementById('lucky-cat-forecast-panel');

    if (existingPanel) {
      // Panel exists - just replace its content (no flicker)
      const newPanel = this.createForecastPanel(forecasts, scenario);
      if (!newPanel) {
        return false;
      }
      existingPanel.innerHTML = newPanel.innerHTML;
      this.forecastPanel = existingPanel;
      this.setupPanelListeners();
      this.updateLuckyCatButtonState(true);
      return true;
    }

    // No existing panel - create new one
    const panel = this.createForecastPanel(forecasts, scenario);
    if (!panel) {
      return false;
    }

    // Shift main content to make room for sidebar
    this.shiftPageContent();

    // Append to body for fixed positioning (right sidebar)
    try {
      document.body.appendChild(panel);
    } catch (e) {
      return false;
    }

    // Animate in and setup event listeners
    requestAnimationFrame(() => {
      setTimeout(() => {
        panel.classList.add('lc-panel--visible');
        // Setup panel listeners after panel is visible
        this.setupPanelListeners();
        this.updateLuckyCatButtonState(true);
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
      existing.remove();
    }
    // Also un-shift the page content
    this.unshiftPageContent();
    this.forecastPanel = null;
    // Update button state
    this.updateLuckyCatButtonState(false);
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
      <div class="lc-card-header lc-card-header--no-border">
        <span class="lc-card-title">Forecast</span>
      </div>
      <div class="lc-loading">
        <div class="lc-spinner"></div>
        <span>Analyzing revenue data...</span>
      </div>
    `;

    return panel;
  },

  /**
   * Show loading state in sidebar
   */
  showLoading() {
    this.removeForecastPanel();

    const panel = this.createLoadingPanel();
    this.forecastPanel = panel;

    // Shift page content
    this.shiftPageContent();

    document.body.appendChild(panel);

    requestAnimationFrame(() => {
      panel.classList.add('lc-panel--visible');
    });
  },

  /**
   * Show gathering data loading state
   * Used when redirecting to gather fresh data
   */
  showGatheringLoading() {
    // Check if panel already exists
    const existingPanel = document.getElementById('lucky-cat-forecast-panel');

    const loadingContent = `
      <div class="lc-card-header lc-card-header--no-border">
        <span class="lc-card-title">Forecast</span>
      </div>
      <div class="lc-loading">
        <span><div class="lc-spinner"></div>Gathering revenue data...</span>
        <span class="lc-loading-subtext">This may take a few seconds</span>
      </div>
    `;

    if (existingPanel) {
      // Update existing panel content
      existingPanel.innerHTML = loadingContent;
      this.forecastPanel = existingPanel;
    } else {
      // Create new panel
      const panel = document.createElement('div');
      panel.className = 'lc-forecast-panel lc-card';
      panel.id = 'lucky-cat-forecast-panel';
      panel.innerHTML = loadingContent;
      this.forecastPanel = panel;

      // Shift page content
      this.shiftPageContent();

      document.body.appendChild(panel);

      requestAnimationFrame(() => {
        panel.classList.add('lc-panel--visible');
      });
    }
  },

  /**
   * Show error state in sidebar
   * @param {string} message - Error message to display
   */
  showError(message) {
    // Check if panel already exists
    const existingPanel = document.getElementById('lucky-cat-forecast-panel');

    const errorContent = `
      <div class="lc-card-header lc-card-header--no-border">
        <span class="lc-card-title">Forecast</span>
        <a href="#" class="lc-settings-link" id="lc-open-settings">Settings</a>
      </div>
      <div class="lc-error-state">
        <div class="lc-error-icon">⚠️</div>
        <div class="lc-error-message">${message}</div>
        <button class="lc-button lc-button--primary" id="lc-retry-button">
          Try Again
        </button>
      </div>
      <div class="lc-panel-footer">
        <span class="lc-powered-by">Powered by <a href="https://luckycat.tools" target="_blank">Lucky Cat</a></span>
      </div>
    `;

    if (existingPanel) {
      existingPanel.innerHTML = errorContent;
      this.forecastPanel = existingPanel;
    } else {
      const panel = document.createElement('div');
      panel.className = 'lc-forecast-panel lc-card';
      panel.id = 'lucky-cat-forecast-panel';
      panel.innerHTML = errorContent;
      this.forecastPanel = panel;

      this.shiftPageContent();
      document.body.appendChild(panel);

      requestAnimationFrame(() => {
        panel.classList.add('lc-panel--visible');
      });
    }

    // Setup retry button listener
    const retryBtn = this.forecastPanel.querySelector('#lc-retry-button');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        // Clear cache and trigger data gathering
        const projectId = LCDOMParser?.getProjectId();
        if (projectId) {
          RCPStorage.clearRevenueHistory(projectId).then(() => {
            // Trigger toggle sidebar to initiate fresh data gathering
            chrome.runtime.sendMessage({ type: 'TOGGLE_SIDEBAR' });
          });
        }
      });
    }

    // Setup settings link
    const settingsLink = this.forecastPanel.querySelector('#lc-open-settings');
    if (settingsLink) {
      settingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.showSettingsView();
      });
    }
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
          Forecast
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
   * Inject Lucky Cat button into RevenueCat Charts header
   * @returns {boolean} Success status
   */
  injectLuckyCatButton() {
    // Don't inject if already exists
    if (document.getElementById('lucky-cat-header-button')) {
      return false;
    }

    // Strategy: Find the Share button - it's directly in the container (not wrapped in span or anchor)
    const allButtons = Array.from(document.querySelectorAll('button'));

    // Find Share button - most reliable since it's not wrapped
    const shareButton = allButtons.find(btn => {
      const text = btn.textContent.trim();
      return text === 'Share';
    });

    // Find Save chart button as fallback
    const saveChartButton = allButtons.find(btn => {
      const text = btn.textContent.trim();
      return text.includes('Save chart');
    });

    // Use Share first, then Save chart
    const referenceButton = shareButton || saveChartButton;

    if (!referenceButton) {
      return false;
    }

    // Get the parent container - should be the MuiStack-root div
    let targetContainer = referenceButton.parentElement;

    // If the parent is a span (like Save chart's wrapper), go up one more level
    if (targetContainer && targetContainer.tagName === 'SPAN') {
      targetContainer = targetContainer.parentElement;
    }

    if (!targetContainer) {
      return false;
    }

    // Create the Lucky Cat button matching MUI styling
    const button = document.createElement('button');
    button.id = 'lucky-cat-header-button';
    button.className = referenceButton.className; // Copy exact classes from reference button
    button.type = 'button';
    button.tabIndex = 0;
    button.title = 'Toggle Lucky Cat Forecast Panel';
    button.setAttribute('aria-disabled', 'false');

    button.innerHTML = `
      <span class="MuiButton-icon MuiButton-startIcon MuiButton-iconSizeMedium css-lds0xd">
        ${this.catIconSVG}
      </span>Lucky Cat
    `;

    // Add click handler to toggle sidebar
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Dispatch a custom event that content.js listens for
      window.dispatchEvent(new CustomEvent('luckyCatToggleSidebar'));
    });

    // Insert at the beginning of the container
    targetContainer.insertBefore(button, targetContainer.firstChild);
    this.luckyCatButton = button;

    return true;
  },

  /**
   * Remove the Lucky Cat button from header
   */
  removeLuckyCatButton() {
    const button = document.getElementById('lucky-cat-header-button');
    if (button) {
      button.remove();
    }
    this.luckyCatButton = null;
  },

  /**
   * Update Lucky Cat button state (active/inactive)
   * @param {boolean} isActive - Whether sidebar is open
   */
  updateLuckyCatButtonState(isActive) {
    const button = document.getElementById('lucky-cat-header-button');
    if (!button) return;

    if (isActive) {
      button.classList.add('lc-button-active');
      button.style.backgroundColor = 'rgba(99, 102, 241, 0.2)';
      button.style.borderColor = '#6366F1';
    } else {
      button.classList.remove('lc-button-active');
      button.style.backgroundColor = '';
      button.style.borderColor = '';
    }
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
