/**
 * Lucky Cat - Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Setup event listeners
  setupEventListeners();

  // Load data
  await loadData();
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Settings button
  document.getElementById('openSettings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Open RevenueCat button
  document.getElementById('openRevenueCat').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://app.revenuecat.com' });
  });

  // Refresh button
  document.getElementById('refreshBtn').addEventListener('click', async () => {
    const btn = document.getElementById('refreshBtn');
    btn.disabled = true;
    btn.textContent = 'Refreshing...';

    await loadData();

    btn.disabled = false;
    btn.textContent = 'Refresh';
  });
}

/**
 * Load forecast data
 */
async function loadData() {
  showState('loading');

  try {
    // Check if we're on RevenueCat
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url || !tab.url.includes('app.revenuecat.com')) {
      showState('notOnRC');
      return;
    }

    // Try to get forecast data from content script
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_FORECAST_DATA' });

    if (response && response.success && response.data) {
      displayForecast(response.data);
      showState('forecast');
    } else {
      showState('noData');
    }
  } catch (error) {
    // console.error('Error loading data:', error);

    // If content script not loaded, show not on RC state
    if (error.message && error.message.includes('Could not establish connection')) {
      showState('notOnRC');
    } else {
      showState('noData');
    }
  }
}

/**
 * Show specific state
 */
function showState(state) {
  const states = ['loadingState', 'notOnRCState', 'noDataState', 'forecastState'];

  states.forEach(s => {
    const el = document.getElementById(s);
    if (el) {
      el.style.display = s === `${state}State` ? 'block' : 'none';
    }
  });
}

/**
 * Display forecast data
 */
function displayForecast(data) {
  if (!data || !data.currentMonth) return;

  const currentYear = new Date().getFullYear();

  // Current month
  document.getElementById('currentMonthLabel').textContent = data.currentMonth.name;

  // Progress bar
  const daysInMonth = new Date(currentYear, new Date().getMonth() + 1, 0).getDate();
  const currentDay = new Date().getDate();
  const progressPercent = Math.round((currentDay / daysInMonth) * 100);

  document.getElementById('monthProgress').style.width = `${progressPercent}%`;
  document.getElementById('progressPercent').textContent = `${progressPercent}%`;
  document.getElementById('mtdActual').textContent = formatCurrency(data.currentMonth.mtdActual);

  // Projected total
  document.getElementById('projectedTotal').textContent = formatCurrency(data.currentMonth.projected);

  // vs Last Month (calculated from next month's "last year" comparison)
  // For now, just show YoY comparison
  const vsLastMonth = document.getElementById('vsLastMonth');
  vsLastMonth.textContent = '—';
  vsLastMonth.className = 'comparison-value';

  // vs Last Year
  const vsLastYear = document.getElementById('vsLastYear');
  if (data.currentMonth.vsLastYear !== null) {
    const change = data.currentMonth.vsLastYear;
    vsLastYear.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
    vsLastYear.className = `comparison-value ${change >= 0 ? 'positive' : 'negative'}`;
  } else {
    vsLastYear.textContent = '—';
    vsLastYear.className = 'comparison-value';
  }

  // YTD
  if (data.ytd) {
    document.getElementById('ytdCurrentLabel').textContent = `${data.ytd.currentYear} YTD`;
    document.getElementById('ytdCurrent').textContent = formatCurrency(data.ytd.current);

    document.getElementById('ytdLastYearLabel').textContent = `${data.ytd.lastYearLabel} YTD`;
    document.getElementById('ytdLastYear').textContent = formatCurrency(data.ytd.lastYear);

    const ytdChange = document.getElementById('ytdChange');
    if (data.ytd.pctChange !== null) {
      const change = data.ytd.pctChange;
      ytdChange.textContent = `${change >= 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(1)}%`;
      ytdChange.className = `ytd-change ${change >= 0 ? 'positive' : 'negative'}`;
    } else {
      ytdChange.textContent = '—';
      ytdChange.className = 'ytd-change';
    }
  }
}

/**
 * Format currency
 */
function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}
