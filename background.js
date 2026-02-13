/**
 * Lucky Cat - Background Service Worker
 * Handles API calls and cross-origin requests
 */

// ============================================
// Message Handlers
// ============================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'OPEN_OPTIONS':
      chrome.runtime.openOptionsPage();
      sendResponse({ success: true });
      break;

    case 'FETCH_ASA_DATA':
      handleFetchASAData(request.dateRange, request.keywords)
        .then(data => sendResponse({ success: true, data }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Async response

    case 'TEST_ASA_CONNECTION':
      handleTestASAConnection()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, message: error.message }));
      return true;

    case 'GET_ASA_TOKEN':
      handleGetASAToken()
        .then(token => sendResponse({ success: true, token }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
  }
});


// ============================================
// ASA API Functions
// ============================================

/**
 * Fetch ASA keyword spend data
 * @param {{start: string, end: string}} dateRange - Date range
 * @param {string[]} keywords - Keywords to query
 * @returns {Promise<Object>} Keyword spend data
 */
async function handleFetchASAData(dateRange, keywords) {
  const credentials = await getASACredentials();
  if (!credentials) {
    throw new Error('ASA credentials not configured');
  }

  const accessToken = await getASAAccessToken(credentials);

  // Fetch keyword report from ASA API
  const response = await fetch(
    'https://api.searchads.apple.com/api/v5/reports/campaigns/keywords',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-AP-Context': `orgId=${credentials.orgId}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startTime: dateRange.start,
        endTime: dateRange.end,
        selector: {
          orderBy: [
            { field: 'localSpend', sortOrder: 'DESCENDING' }
          ],
          pagination: {
            offset: 0,
            limit: 1000
          }
        },
        groupBy: ['countryOrRegion'],
        timeZone: 'UTC',
        returnRowTotals: true,
        returnRecordsWithNoMetrics: false
      })
    }
  );

  if (!response.ok) {
    throw new Error(`ASA API error: ${response.status}`);
  }

  const data = await response.json();

  // Transform to keyword -> spend mapping
  const keywordSpend = {};

  if (data.data?.reportingDataResponse?.row) {
    for (const row of data.data.reportingDataResponse.row) {
      const keyword = row.metadata?.keyword || row.metadata?.keywordText;
      const spend = row.total?.localSpend?.amount || row.granularity?.[0]?.localSpend?.amount || 0;

      if (keyword) {
        const normalizedKeyword = keyword.toLowerCase().trim();
        keywordSpend[normalizedKeyword] = {
          spend: parseFloat(spend) || 0,
          impressions: row.total?.impressions || 0,
          taps: row.total?.taps || 0,
          installs: row.total?.installs || 0
        };
      }
    }
  }

  return keywordSpend;
}

/**
 * Test ASA connection
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function handleTestASAConnection() {
  const credentials = await getASACredentials();
  if (!credentials) {
    return { success: false, message: 'No credentials configured' };
  }

  try {
    const accessToken = await getASAAccessToken(credentials);

    // Test with a simple campaigns list request
    const response = await fetch(
      'https://api.searchads.apple.com/api/v5/campaigns',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-AP-Context': `orgId=${credentials.orgId}`
        }
      }
    );

    if (response.ok) {
      return { success: true, message: 'Connected successfully' };
    } else {
      const errorText = await response.text();
      return { success: false, message: `API error: ${response.status}` };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Get ASA access token (with caching)
 * @param {Object} credentials - ASA credentials
 * @returns {Promise<string>} Access token
 */
async function getASAAccessToken(credentials) {
  // Check for cached token
  const cached = await chrome.storage.session.get('asa_token');
  if (cached.asa_token && cached.asa_token.expiresAt > Date.now()) {
    return cached.asa_token.accessToken;
  }

  // Request new token using client credentials
  const response = await fetch(
    'https://appleid.apple.com/auth/oauth2/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        scope: 'searchadsorg'
      })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get ASA access token');
  }

  const tokenData = await response.json();

  // Cache token (with 1 minute buffer before expiry)
  await chrome.storage.session.set({
    asa_token: {
      accessToken: tokenData.access_token,
      expiresAt: Date.now() + (tokenData.expires_in * 1000) - 60000
    }
  });

  return tokenData.access_token;
}

/**
 * Handle getting cached token
 * @returns {Promise<string|null>}
 */
async function handleGetASAToken() {
  const credentials = await getASACredentials();
  if (!credentials) {
    throw new Error('No credentials configured');
  }

  return await getASAAccessToken(credentials);
}


// ============================================
// Storage Helpers
// ============================================

/**
 * Get ASA credentials from storage
 * @returns {Promise<Object|null>}
 */
async function getASACredentials() {
  const result = await chrome.storage.local.get('asa_credentials');
  const creds = result.asa_credentials;

  if (!creds || !creds.configured) {
    return null;
  }

  return {
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    orgId: creds.orgId
  };
}


// ============================================
// Extension Lifecycle
// ============================================

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.local.set({
      settings: {
        asaEnabled: false,
        confidenceRange: 'standard',
        cacheDuration: 12 * 60 * 60 * 1000 // 12 hours
      }
    });
  }
});

/**
 * Handle extension icon click - toggle the sidebar or navigate to revenue chart
 */
chrome.action.onClicked.addListener((tab) => {
  // All-time daily revenue chart URL
  const revenueChartUrl = 'https://app.revenuecat.com/charts/revenue?range=All+time&resolution=0&chart_type=Stacked+area';

  if (tab.url && tab.url.includes('app.revenuecat.com')) {
    // On RevenueCat - send message to toggle sidebar
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' })
      .catch(() => {
        // If content script not loaded, navigate to revenue chart
        chrome.tabs.update(tab.id, { url: revenueChartUrl });
      });
  } else {
    // Not on RevenueCat - open revenue chart directly
    chrome.tabs.create({ url: revenueChartUrl });
  }
});


// ============================================
// Alarm for periodic tasks (if needed)
// ============================================

// Clear expired cache periodically
chrome.alarms.create('clearExpiredCache', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'clearExpiredCache') {
    await clearExpiredCache();
  }
});

/**
 * Clear expired cache entries
 */
async function clearExpiredCache() {
  const all = await chrome.storage.local.get(null);
  const keysToRemove = [];

  for (const [key, value] of Object.entries(all)) {
    if (key.startsWith('cache_') && value.expiresAt && value.expiresAt < Date.now()) {
      keysToRemove.push(key);
    }
  }

  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
  }
}
