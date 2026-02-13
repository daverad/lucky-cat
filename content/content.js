/**
 * Lucky Cat - Main Content Script
 * Initializes and coordinates all features on RevenueCat pages
 */

(async function() {
  'use strict';

  // Constants
  const REVENUE_CHART_URL = 'https://app.revenuecat.com/charts/revenue?range=All+time&resolution=0&chart_type=Stacked+area';
  const CACHE_FRESHNESS_MS = 12 * 60 * 60 * 1000; // 12 hours

  // Check if extension context is valid (handles reload scenario)
  if (!chrome.runtime?.id) {
    return;
  }

  // Prevent multiple initializations
  if (window.__LUCKY_CAT_INITIALIZED__) {
    return;
  }
  window.__LUCKY_CAT_INITIALIZED__ = true;

  /**
   * Main initialization
   */
  async function init() {
    // Wait for page to fully load
    await LCDOMParser.waitForPageLoad();

    // Check for redirect state first (data gathering flow)
    const redirectState = RCPStorage.getRedirectState();
    if (redirectState) {
      await handleRedirectState(redirectState);
      return;
    }

    // Get settings
    const settings = await RCPStorage.getSettings();

    // Determine which page we're on
    const pageType = LCDOMParser.detectPageType();

    switch (pageType) {
      case 'charts-revenue':
        // Inject Lucky Cat button into header
        injectHeaderButton();
        break;

      case 'attribution-keywords':
        if (settings.asaEnabled) {
          await initASAIntegration();
        }
        break;

      default:
        // Try to inject button on any charts page
        if (window.location.pathname.includes('/charts')) {
          injectHeaderButton();
        }
        break;
    }
  }

  /**
   * Handle redirect state for data gathering flow
   */
  async function handleRedirectState(redirectState) {
    const pageType = LCDOMParser.detectPageType();

    if (redirectState.isGathering) {
      if (pageType === 'charts-revenue') {
        // We're on the revenue chart - gather the data
        await gatherAndCacheData();

        // Now redirect back to original URL
        if (redirectState.returnUrl && redirectState.returnUrl !== window.location.href) {
          RCPStorage.setRedirectState({
            ...redirectState,
            isGathering: false,
            isReturning: true
          });
          window.location.href = redirectState.returnUrl;
        } else {
          // Already on original URL or no return URL
          RCPStorage.clearRedirectState();
          await showForecastFromCache();
        }
      } else {
        // Not on revenue chart yet - redirect there
        LCUIInjector.showGatheringLoading();
        window.location.href = REVENUE_CHART_URL;
      }
    } else if (redirectState.isReturning) {
      RCPStorage.clearRedirectState();
      await showForecastFromCache();
    }
  }

  /**
   * Gather revenue data from current page and cache it
   */
  async function gatherAndCacheData() {
    try {
      // Parse revenue data from the page
      const revenueData = await LCDOMParser.parseRevenueData();
      const granularity = LCDOMParser.getGranularity();
      const projectId = LCDOMParser.getProjectId();

      if (projectId && revenueData && revenueData.length > 0) {
        // Save to history (this merges with existing data)
        await RCPStorage.saveRevenueHistory(projectId, revenueData, granularity);
      }
    } catch (error) {
      // Silent fail - will show error in UI
    }
  }

  /**
   * Show forecast panel using cached data
   */
  async function showForecastFromCache() {
    const projectId = LCDOMParser.getProjectId();
    if (!projectId) {
      LCUIInjector.showError('Could not determine project. Please try again.');
      return;
    }

    const history = await RCPStorage.getRevenueHistory(projectId);
    if (!history || !history.data || history.data.length < 5) {
      LCUIInjector.showError('Not enough revenue data. Please visit the Revenue chart page first.');
      return;
    }

    // Load variance override setting
    const settings = await RCPStorage.getSettings();
    if (settings.varianceOverride) {
      LCForecasting.setVarianceOverride(settings.varianceOverride);
    }

    // Calculate forecasts
    const forecasts = LCForecasting.calculateForecasts(history.data, history.granularity || 'daily');

    if (!forecasts) {
      LCUIInjector.showError('Could not calculate forecasts. Please try refreshing data.');
      return;
    }

    // Show the forecast panel
    const scenario = settings.forecastScenario || 'better';
    LCUIInjector.injectForecastPanel(forecasts, scenario);
    LCUIInjector.updateLuckyCatButtonState(true);
  }

  /**
   * Initiate data gathering flow
   */
  async function initiateDataGathering() {
    const currentUrl = window.location.href;
    const pageType = LCDOMParser.detectPageType();
    const projectId = LCDOMParser.getProjectId();

    // Store redirect state
    RCPStorage.setRedirectState({
      returnUrl: currentUrl,
      isGathering: true,
      isReturning: false,
      projectId: projectId
    });

    if (pageType === 'charts-revenue') {
      // Already on revenue chart - just gather data directly
      LCUIInjector.showGatheringLoading();

      // Small delay to let loading state render
      await new Promise(resolve => setTimeout(resolve, 100));

      await gatherAndCacheData();
      RCPStorage.clearRedirectState();
      await showForecastFromCache();
    } else {
      // Need to redirect to revenue chart
      LCUIInjector.showGatheringLoading();
      window.location.href = REVENUE_CHART_URL;
    }
  }

  /**
   * Initialize the forecasting panel (used when already on revenue chart)
   */
  async function initForecastingPanel() {
    // Show loading state
    LCUIInjector.showLoading();

    try {
      // Parse revenue data from the page
      const revenueData = await LCDOMParser.parseRevenueData();
      const granularity = LCDOMParser.getGranularity();
      const projectId = LCDOMParser.getProjectId();

      if (revenueData && revenueData.length > 0 && projectId) {
        // Save current data to build up history
        await RCPStorage.saveRevenueHistory(projectId, revenueData, granularity);
      }

      // Show forecast from cache (which now includes this data)
      await showForecastFromCache();

    } catch (error) {
      LCUIInjector.showError('Error loading forecast. Please try again.');
    }
  }

  /**
   * Initialize ASA integration
   */
  async function initASAIntegration() {
    try {
      await LCASAIntegration.init();
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Inject Lucky Cat button into header with retry logic
   */
  function injectHeaderButton() {
    // Try to inject immediately
    if (LCUIInjector.injectLuckyCatButton()) {
      return;
    }

    // If failed, retry a few times as page may still be loading
    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(() => {
      attempts++;
      if (LCUIInjector.injectLuckyCatButton() || attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 500);
  }

  /**
   * Handle navigation changes (SPA)
   */
  function handleNavigation() {
    // Check for redirect state first (data gathering flow takes priority)
    const redirectState = RCPStorage.getRedirectState();
    if (redirectState) {
      // Reset initialization flag and reinit to handle redirect
      window.__LUCKY_CAT_INITIALIZED__ = false;
      setTimeout(() => {
        window.__LUCKY_CAT_INITIALIZED__ = true;
        init();
      }, 500);
      return;
    }

    // Check if sidebar was open before navigation
    const sidebarWasOpen = !!document.getElementById('lucky-cat-forecast-panel');

    // Reset initialization flag for new page
    window.__LUCKY_CAT_INITIALIZED__ = false;

    // Reinitialize with a small delay for page to render
    setTimeout(async () => {
      window.__LUCKY_CAT_INITIALIZED__ = true;

      if (sidebarWasOpen) {
        // Sidebar was open - close it on navigation
        LCUIInjector.removeForecastPanel();
      }

      // Run normal init (won't auto-show sidebar)
      init();
    }, 500);
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
        case 'TOGGLE_SIDEBAR':
          handleToggleSidebar().then(() => {
            sendResponse({ success: true });
          }).catch(err => {
            sendResponse({ success: false, error: err.message });
          });
          return true; // Async response

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
   * Toggle sidebar visibility with smart data fetching
   */
  async function handleToggleSidebar() {
    const panel = document.getElementById('lucky-cat-forecast-panel');
    if (panel) {
      // Panel exists - remove it
      LCUIInjector.removeForecastPanel();
      LCUIInjector.updateLuckyCatButtonState(false);
      return;
    }

    // Check if we're in a redirect flow
    const redirectState = RCPStorage.getRedirectState();
    if (redirectState?.isGathering) {
      LCUIInjector.showGatheringLoading();
      return;
    }

    // Check cache freshness
    const projectId = LCDOMParser.getProjectId();

    if (projectId) {
      const isFresh = await RCPStorage.isRevenueHistoryFresh(projectId, CACHE_FRESHNESS_MS);

      if (isFresh) {
        // Fresh cache - show forecast immediately
        await showForecastFromCache();
        return;
      }
    }

    // No fresh cache - need to gather data
    await initiateDataGathering();
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

  // Listen for custom event from Lucky Cat header button
  window.addEventListener('luckyCatToggleSidebar', () => {
    handleToggleSidebar();
  });

  // Observe navigation changes
  observeNavigation();

  // Initial setup
  try {
    await init();
  } catch (error) {
    // Silent fail
  }
})();
