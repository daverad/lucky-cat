/**
 * Lucky Cat - Main Content Script
 * Initializes and coordinates all features on RevenueCat pages
 */

(async function() {
  'use strict';

  // Prevent multiple initializations
  if (window.__LUCKY_CAT_INITIALIZED__) {
    console.log('🐱 Lucky Cat already initialized, skipping');
    return;
  }
  window.__LUCKY_CAT_INITIALIZED__ = true;

  console.log('🐱 Lucky Cat initializing...');
  console.log('🐱 Current URL:', window.location.href);
  console.log('🐱 Current pathname:', window.location.pathname);

  /**
   * Main initialization
   */
  async function init() {
    console.log('LC: Starting init...');

    // Wait for page to fully load
    console.log('LC: Waiting for page to load...');
    await LCDOMParser.waitForPageLoad();
    console.log('LC: Page loaded');

    // Get settings
    console.log('LC: Getting settings...');
    const settings = await RCPStorage.getSettings();
    console.log('LC: Settings:', JSON.stringify(settings));

    // Determine which page we're on
    const pageType = LCDOMParser.detectPageType();
    console.log('LC: Page type detected:', pageType);

    switch (pageType) {
      case 'charts-revenue':
        console.log('LC: On revenue charts page, forecastingEnabled:', settings.forecastingEnabled);
        if (settings.forecastingEnabled) {
          await initForecastingPanel();
        } else {
          console.log('LC: Forecasting is disabled in settings');
        }
        break;

      case 'attribution-keywords':
        if (settings.asaEnabled) {
          await initASAIntegration();
        }
        break;

      case 'overview':
        console.log('LC: On overview page - no enhancements yet');
        break;

      default:
        console.log('LC: Unknown page type, no enhancements applied');
        break;
    }
  }

  /**
   * Initialize the forecasting panel
   */
  async function initForecastingPanel() {
    console.log('LC: ========== INITIALIZING FORECASTING PANEL ==========');

    // Show loading state
    console.log('LC: Showing loading state...');
    LCUIInjector.showLoading();

    try {
      // Parse revenue data from the page
      console.log('LC: Parsing revenue data from page...');
      const revenueData = await LCDOMParser.parseRevenueData();

      console.log('LC: Revenue data result:', revenueData ? `${revenueData.length} records` : 'null');

      if (revenueData && revenueData.length > 0) {
        console.log('LC: First 3 records:', JSON.stringify(revenueData.slice(0, 3)));
        console.log('LC: Last 3 records:', JSON.stringify(revenueData.slice(-3)));
      }

      if (!revenueData || revenueData.length < 5) {
        console.log('LC: ❌ Not enough data for forecasting (need 5+ days, got', revenueData?.length || 0, ')');
        LCUIInjector.removeForecastPanel();
        return;
      }

      // Warn if less than ideal amount of data
      if (revenueData.length < 30) {
        console.log('LC: ⚠️ Limited data available (', revenueData.length, 'days). Forecasts may be less accurate.');
      }

      console.log('LC: ✓ Found', revenueData.length, 'days of revenue data');

      // Calculate forecasts
      console.log('LC: Calculating forecasts...');
      const forecasts = LCForecasting.calculateForecasts(revenueData);

      if (!forecasts) {
        console.log('LC: ❌ Could not calculate forecasts');
        LCUIInjector.removeForecastPanel();
        return;
      }

      console.log('LC: ✓ Forecasts calculated:', JSON.stringify({
        currentMonth: forecasts.currentMonth?.projected,
        nextMonth: forecasts.nextMonth?.projected,
        ytd: forecasts.ytd?.current
      }));

      // Find injection point
      console.log('LC: Finding injection point...');
      const injectionPoint = LCDOMParser.findInjectionPoint();
      console.log('LC: Injection point found:', injectionPoint ? 'yes' : 'no');

      // Inject the forecast panel
      console.log('LC: Injecting forecast panel...');
      const success = LCUIInjector.injectForecastPanel(forecasts);

      if (success) {
        console.log('LC: ✓ Forecast panel injected successfully!');

        // Store project data for popup access
        const projectId = LCDOMParser.getProjectId();
        console.log('LC: Project ID:', projectId);
        if (projectId) {
          await RCPStorage.saveRevenueHistory(projectId, revenueData);
          await RCPStorage.setCache(`forecast_${projectId}`, forecasts, 5 * 60 * 1000);
        }
      } else {
        console.log('LC: ❌ Failed to inject forecast panel');
      }
    } catch (error) {
      console.error('LC: ❌ Error initializing forecasting:', error);
      console.error('LC: Stack trace:', error.stack);
      LCUIInjector.removeForecastPanel();
    }

    console.log('LC: ========== FORECASTING INIT COMPLETE ==========');
  }

  /**
   * Initialize ASA integration
   */
  async function initASAIntegration() {
    console.log('LC: Initializing ASA integration...');

    try {
      const success = await LCASAIntegration.init();

      if (success) {
        console.log('LC: ASA integration initialized successfully');
      } else {
        console.log('LC: ASA integration skipped or failed');
      }
    } catch (error) {
      console.error('LC: Error initializing ASA integration', error);
    }
  }

  /**
   * Handle navigation changes (SPA)
   */
  function handleNavigation() {
    console.log('LC: Navigation detected, reinitializing...');

    // Reset initialization flag for new page
    window.__LUCKY_CAT_INITIALIZED__ = false;

    // Clean up existing UI
    LCUIInjector.removeForecastPanel();

    // Reinitialize with a small delay for page to render
    setTimeout(() => {
      window.__LUCKY_CAT_INITIALIZED__ = true;
      init();
    }, 1000);
  }

  /**
   * Observe for SPA navigation
   */
  function observeNavigation() {
    let lastUrl = window.location.href;
    let lastPathname = window.location.pathname;

    // Method 1: URL change detection via MutationObserver
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        console.log('LC: URL changed from', lastUrl, 'to', window.location.href);
        lastUrl = window.location.href;
        lastPathname = window.location.pathname;
        handleNavigation();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Method 2: History API interception
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      if (window.location.pathname !== lastPathname) {
        lastPathname = window.location.pathname;
        lastUrl = window.location.href;
        handleNavigation();
      }
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      if (window.location.pathname !== lastPathname) {
        lastPathname = window.location.pathname;
        lastUrl = window.location.href;
        handleNavigation();
      }
    };

    // Method 3: Popstate event
    window.addEventListener('popstate', () => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        lastPathname = window.location.pathname;
        handleNavigation();
      }
    });
  }

  /**
   * Listen for messages from popup/background
   */
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'GET_FORECAST_DATA':
          handleGetForecastData(sendResponse);
          return true; // Async response

        case 'REFRESH_FORECASTS':
          handleRefreshForecasts(sendResponse);
          return true;

        case 'REFRESH_ASA':
          handleRefreshASA(sendResponse);
          return true;

        case 'GET_PAGE_INFO':
          sendResponse({
            pageType: LCDOMParser.detectPageType(),
            projectId: LCDOMParser.getProjectId(),
            url: window.location.href
          });
          break;

        case 'DEBUG_INFO':
          // Return debug info
          sendResponse({
            initialized: window.__LUCKY_CAT_INITIALIZED__,
            url: window.location.href,
            pageType: LCDOMParser.detectPageType(),
            hasChart: !!LCDOMParser.findChartContainer(),
            tables: document.querySelectorAll('table').length
          });
          break;
      }
    });
  }

  /**
   * Handle request for forecast data from popup
   */
  async function handleGetForecastData(sendResponse) {
    const projectId = LCDOMParser.getProjectId();

    if (!projectId) {
      sendResponse({ success: false, error: 'No project ID' });
      return;
    }

    // Try to get cached forecast
    const cached = await RCPStorage.getCache(`forecast_${projectId}`);
    if (cached) {
      sendResponse({ success: true, data: cached });
      return;
    }

    // Parse and calculate
    const revenueData = await LCDOMParser.parseRevenueData();
    if (!revenueData || revenueData.length < 30) {
      sendResponse({ success: false, error: 'Not enough data' });
      return;
    }

    const forecasts = LCForecasting.calculateForecasts(revenueData);
    sendResponse({ success: true, data: forecasts });
  }

  /**
   * Handle request to refresh forecasts
   */
  async function handleRefreshForecasts(sendResponse) {
    await initForecastingPanel();
    sendResponse({ success: true });
  }

  /**
   * Handle request to refresh ASA data
   */
  async function handleRefreshASA(sendResponse) {
    const success = await LCASAIntegration.refresh();
    sendResponse({ success });
  }

  // ============================================
  // Start initialization
  // ============================================

  // Setup message listener
  setupMessageListener();

  // Observe navigation changes
  observeNavigation();

  // Initial setup
  try {
    await init();
    console.log('🐱 Lucky Cat ready!');
  } catch (error) {
    console.error('🐱 LC: Initialization error', error);
    console.error('🐱 LC: Stack:', error.stack);
  }
})();
