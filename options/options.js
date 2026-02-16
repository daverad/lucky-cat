/**
 * Lucky Cat - Options Page Script
 */

/**
 * Debounce helper for text input autosave
 */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  // Load saved settings
  await loadSettings();

  // Setup event listeners
  setupEventListeners();
});

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    // Load general settings
    const settingsResult = await chrome.storage.local.get('settings');
    const settings = settingsResult.settings || {};

    // Apply settings to form
    document.getElementById('confidenceRange').value = settings.confidenceRange || 'standard';
    document.getElementById('asaEnabled').checked = settings.asaEnabled === true;
    document.getElementById('cacheDuration').value = settings.cacheDuration || 43200000; // Default to 12 hours

    // Load ASA credentials
    const credsResult = await chrome.storage.local.get('asa_credentials');
    const creds = credsResult.asa_credentials;

    if (creds && creds.configured) {
      document.getElementById('asaClientId').value = creds.clientId || '';
      document.getElementById('asaClientSecret').value = creds.clientSecret || '';
      document.getElementById('asaOrgId').value = creds.orgId || '';
    }

    // Toggle ASA credentials visibility
    toggleASACredentials(settings.asaEnabled === true);
  } catch (error) {
    // console.error('Error loading settings:', error);
    showStatus('saveStatus', 'Error loading settings', 'error');
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Autosave for dropdowns
  ['confidenceRange', 'cacheDuration'].forEach(id => {
    document.getElementById(id).addEventListener('change', autoSave);
  });

  // ASA enabled toggle with autosave
  document.getElementById('asaEnabled').addEventListener('change', (e) => {
    toggleASACredentials(e.target.checked);
    autoSave();
  });

  // Toggle password visibility
  document.getElementById('toggleSecret').addEventListener('click', () => {
    const input = document.getElementById('asaClientSecret');
    const button = document.getElementById('toggleSecret');

    if (input.type === 'password') {
      input.type = 'text';
      button.textContent = 'Hide';
    } else {
      input.type = 'password';
      button.textContent = 'Show';
    }
  });

  // Autosave for text inputs with debounce
  const debouncedAutoSave = debounce(autoSave, 500);
  ['asaClientId', 'asaClientSecret', 'asaOrgId'].forEach(id => {
    document.getElementById(id).addEventListener('input', debouncedAutoSave);
  });

  // Test connection button
  document.getElementById('testConnection').addEventListener('click', testASAConnection);

  // Clear cache button
  document.getElementById('clearCache').addEventListener('click', clearCache);
}

/**
 * Toggle ASA credentials form visibility
 */
function toggleASACredentials(show) {
  const form = document.getElementById('asaCredentials');
  form.style.display = show ? 'block' : 'none';
}

/**
 * Test ASA connection
 */
async function testASAConnection() {
  const button = document.getElementById('testConnection');
  const status = document.getElementById('connectionStatus');

  // Get current credential values
  const clientId = document.getElementById('asaClientId').value.trim();
  const clientSecret = document.getElementById('asaClientSecret').value.trim();
  const orgId = document.getElementById('asaOrgId').value.trim();

  if (!clientId || !clientSecret || !orgId) {
    showStatus('connectionStatus', 'Please fill in all credentials', 'error');
    return;
  }

  // Validate client ID format
  if (!clientId.startsWith('SEARCHADS.')) {
    showStatus('connectionStatus', 'Client ID should start with SEARCHADS.', 'error');
    return;
  }

  button.disabled = true;
  showStatus('connectionStatus', 'Testing...', 'loading');

  try {
    // Save credentials temporarily for test
    await chrome.storage.local.set({
      asa_credentials: {
        clientId,
        clientSecret,
        orgId,
        configured: true,
        configuredAt: Date.now()
      }
    });

    // Send test request to background
    const response = await chrome.runtime.sendMessage({ type: 'TEST_ASA_CONNECTION' });

    if (response.success) {
      showStatus('connectionStatus', '✓ Connected successfully', 'success');
    } else {
      showStatus('connectionStatus', response.message || 'Connection failed', 'error');
    }
  } catch (error) {
    showStatus('connectionStatus', error.message || 'Connection failed', 'error');
  } finally {
    button.disabled = false;
  }
}

/**
 * Clear cached data
 */
async function clearCache() {
  const button = document.getElementById('clearCache');
  const status = document.getElementById('cacheStatus');

  button.disabled = true;
  showStatus('cacheStatus', 'Clearing...', 'loading');

  try {
    // Get all storage keys
    const all = await chrome.storage.local.get(null);
    const cacheKeys = Object.keys(all).filter(k => k.startsWith('cache_') || k.startsWith('revenue_history_'));

    if (cacheKeys.length > 0) {
      await chrome.storage.local.remove(cacheKeys);
      showStatus('cacheStatus', `✓ Cleared ${cacheKeys.length} cached items`, 'success');
    } else {
      showStatus('cacheStatus', 'No cached data to clear', 'success');
    }
  } catch (error) {
    showStatus('cacheStatus', 'Error clearing cache', 'error');
  } finally {
    button.disabled = false;
  }
}

/**
 * Save all settings
 */
async function saveSettings() {
  const button = document.getElementById('saveSettings');
  const status = document.getElementById('saveStatus');

  button.disabled = true;
  showStatus('saveStatus', 'Saving...', 'loading');

  try {
    // Gather settings
    const settings = {
      confidenceRange: document.getElementById('confidenceRange').value,
      asaEnabled: document.getElementById('asaEnabled').checked,
      cacheDuration: parseInt(document.getElementById('cacheDuration').value)
    };

    // Save settings
    await chrome.storage.local.set({ settings });

    // Save ASA credentials if enabled
    if (settings.asaEnabled) {
      const clientId = document.getElementById('asaClientId').value.trim();
      const clientSecret = document.getElementById('asaClientSecret').value.trim();
      const orgId = document.getElementById('asaOrgId').value.trim();

      if (clientId && clientSecret && orgId) {
        // Validate format
        if (!clientId.startsWith('SEARCHADS.')) {
          showStatus('saveStatus', 'Client ID should start with SEARCHADS.', 'error');
          button.disabled = false;
          return;
        }

        await chrome.storage.local.set({
          asa_credentials: {
            clientId,
            clientSecret,
            orgId,
            configured: true,
            configuredAt: Date.now()
          }
        });
      }
    } else {
      // Clear ASA credentials if disabled
      await chrome.storage.local.remove('asa_credentials');
    }

    showStatus('saveStatus', '✓ Settings saved', 'success');

    // Clear status after delay
    setTimeout(() => {
      status.textContent = '';
      status.className = 'save-status';
    }, 2000);
  } catch (error) {
    // console.error('Error saving settings:', error);
    showStatus('saveStatus', 'Error saving settings', 'error');
  } finally {
    button.disabled = false;
  }
}

/**
 * Auto-save settings on change
 */
async function autoSave() {
  try {
    // Gather settings
    const settings = {
      confidenceRange: document.getElementById('confidenceRange').value,
      asaEnabled: document.getElementById('asaEnabled').checked,
      cacheDuration: parseInt(document.getElementById('cacheDuration').value)
    };

    // Save settings
    await chrome.storage.local.set({ settings });

    // Save ASA credentials if enabled
    if (settings.asaEnabled) {
      const clientId = document.getElementById('asaClientId').value.trim();
      const clientSecret = document.getElementById('asaClientSecret').value.trim();
      const orgId = document.getElementById('asaOrgId').value.trim();

      if (clientId && clientSecret && orgId) {
        // Only save if client ID format is valid
        if (clientId.startsWith('SEARCHADS.')) {
          await chrome.storage.local.set({
            asa_credentials: {
              clientId,
              clientSecret,
              orgId,
              configured: true,
              configuredAt: Date.now()
            }
          });
        }
      }
    } else {
      // Clear ASA credentials if disabled
      await chrome.storage.local.remove('asa_credentials');
    }

    // Show brief saved indicator
    showStatus('saveStatus', '✓ Saved', 'success');
    setTimeout(() => {
      const status = document.getElementById('saveStatus');
      status.textContent = '';
      status.className = 'save-status';
    }, 1500);
  } catch (error) {
    showStatus('saveStatus', 'Error saving', 'error');
  }
}

/**
 * Show status message
 */
function showStatus(elementId, message, type) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = `${elementId.replace('Status', '-status')} ${type}`;
}
