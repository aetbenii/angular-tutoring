import { LogLevel, Configuration, BrowserCacheLocation, RedirectRequest, SilentRequest } from '@azure/msal-browser';
import { isDevelopment } from '../auth.config';
import { environment } from '../../../environments/environment';

const isIE = window.navigator.userAgent.indexOf("MSIE ") > -1 || window.navigator.userAgent.indexOf("Trident/") > -1;

// Azure B2C Configuration - Now fully environment-driven
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

// MSAL Configuration - All values now come from environment
export const msalConfig: Configuration = {
  auth: {
    clientId: environment.msal.clientId,
    authority: b2cPolicies.authorities.signUpSignIn.authority,
    knownAuthorities: [b2cPolicies.authorityDomain],
    redirectUri: environment.msal.redirectUri,
    postLogoutRedirectUri: environment.msal.postLogoutRedirectUri,
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage,
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
            if (isDevelopment) console.info(message);
            return;
          case LogLevel.Verbose:
            if (isDevelopment) console.debug(message);
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

// Login Request Configuration
export const loginRequest: RedirectRequest = {
  scopes: ['openid', 'profile'],
  extraScopesToConsent: ['openid', 'profile'],
};

// Silent Request Configuration
export const silentRequest: SilentRequest = {
  scopes: ['openid', 'profile'],
  forceRefresh: false,
};

// API Configuration
export const apiConfig = {
  scopes: ['openid', 'profile'],
  uri: environment.production ? environment.msal.apiEndpoint : 'http://localhost:8080/api',
};