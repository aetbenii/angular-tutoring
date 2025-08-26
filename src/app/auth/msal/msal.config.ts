import { LogLevel, Configuration, BrowserCacheLocation, InteractionType } from '@azure/msal-browser';
import { isDevelopment } from '../auth.config';
import { environment } from '../../../environments/environment';

const isIE = window.navigator.userAgent.indexOf("MSIE ") > -1 || window.navigator.userAgent.indexOf("Trident/") > -1;

// Azure B2C Configuration
export const b2cPolicies = {
  names: {
    signUpSignIn: 'B2C_1A_SIGNUP_SIGNIN_SPID',
  },
  authorities: {
    signUpSignIn: {
      authority: environment.msal.authority,
    },
  },
  authorityDomain: environment.msal.authorityDomain,
};

/**
 * MSAL Configuration for Azure AD B2C
 * 
 * For more details, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/configuration.md
 */
export const msalConfig: Configuration = {
  auth: {
    clientId: environment.msal.clientId,
    authority: b2cPolicies.authorities.signUpSignIn.authority,
    knownAuthorities: [b2cPolicies.authorityDomain],
    redirectUri: environment.msal.redirectUri,
    postLogoutRedirectUri: environment.msal.postLogoutRedirectUri,
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage, // This is more persistent
    storeAuthStateInCookie: isIE, // Set to true for IE11
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii && !isDevelopment) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
        }
      },
      logLevel: isDevelopment ? LogLevel.Verbose : LogLevel.Error,
      piiLoggingEnabled: isDevelopment,
    }
  }
};

export const apiScope = environment.msal.apiScope;

/**
 * Scopes you want to request for auth
 * For more details, see:
 * https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent#scopes
 */
export const protectedResources = {
  api: {
    endpoint: environment.msal.apiEndpoint,
    scopes: [apiScope],
  }
};

/**
 * Login Request configuration
 * Following MSAL B2C best practices:
 * - 'openid' for ID tokens
 * - 'profile' for user profile info
 * - 'offline_access' for refresh tokens
 * - API scope for access tokens
 */
export const loginRequest = {
  scopes: [
    'openid',
    'profile',
    'offline_access',
    apiScope
  ],
};

/**
 * Access Token Request configuration for API calls
 */
export const accessTokenRequest = {
  scopes: [apiScope],
  account: null as unknown
};

/**
 * Add here the endpoints for which you want to acquire a token.
 */
export const msalInterceptorConfig = {
  interactionType: InteractionType.Redirect, // or 'popup'
  protectedResourceMap: new Map([
    [protectedResources.api.endpoint + '/*', protectedResources.api.scopes]
  ])
}; 