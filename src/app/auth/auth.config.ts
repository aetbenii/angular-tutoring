// =================================================================
// AUTHENTICATION CONFIGURATION
// =================================================================
// 
// This application now uses Azure AD B2C for authentication.
// The MSAL configuration is in 'msal/msal.config.ts'.
// =================================================================

import { environment } from '../../environments/environment';

export const isDevelopment = !environment.production; // Debug features enabled in development

// CONFIGURATION INFO FOR DEBUGGING
// ================================
export const authConfigInfo = {
  environment: environment.production ? 'PRODUCTION' : 'DEVELOPMENT',
  provider: 'Azure AD B2C (Cloud)',
  clientId: 'ad448f87-ef05-4adc-9fce-1d4d49e54a8c',
  authority: 'https://testb2c01siag.b2clogin.com/testb2c01siag.onmicrosoft.com/B2C_1A_SIGNUP_SIGNIN_SPID',
  isDevelopment: isDevelopment
};

// Log current configuration in development only
if (isDevelopment) {
  console.log('🔐 Authentication Configuration:', authConfigInfo);
} 