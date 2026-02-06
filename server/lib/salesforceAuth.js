/**
 * Shared Salesforce Authentication Module
 * Centralizes OAuth token caching to avoid duplicate implementations
 * and potential cache inconsistencies between routes.
 */

// Single token cache shared across all routes
let cachedToken = null;

/**
 * Get a valid Salesforce access token.
 * Caches the token and refreshes it when expired (with 60s buffer).
 * @returns {Promise<string>} The access token
 * @throws {Error} If credentials are not configured or token request fails
 */
export async function getSalesforceToken() {
  const now = Date.now();
  
  // Return cached token if still valid (with 60s buffer before expiry)
  if (cachedToken && cachedToken.expires_at > now + 60000) {
    return cachedToken.access_token;
  }

  const orgDomain = process.env.SALESFORCE_ORG_DOMAIN;
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;

  if (!orgDomain || !clientId || !clientSecret) {
    throw new Error('Salesforce credentials not configured');
  }

  const tokenUrl = `${orgDomain}/services/oauth2/token`;
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Salesforce token error:', response.status, errorText);
    throw new Error(`Failed to get Salesforce token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  cachedToken = {
    access_token: data.access_token,
    expires_at: now + (data.expires_in ? data.expires_in * 1000 : 3600000),
  };

  return data.access_token;
}

/**
 * Get the Salesforce API host.
 * Defaults to https://api.salesforce.com if not configured.
 * @returns {string} The API host URL
 */
export function getSfApiHost() {
  return process.env.SALESFORCE_API_HOST || 'https://api.salesforce.com';
}

/**
 * Clear the cached token (useful for testing or forced refresh).
 */
export function clearTokenCache() {
  cachedToken = null;
}
