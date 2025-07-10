import { environment } from '../../environments/environment';

export const isDevelopment = !environment.production; // Debug features enabled in development

// CONFIGURATION INFO FOR DEBUGGING
export const authConfigInfo = {
  environment: environment.production ? 'PRODUCTION' : 'DEVELOPMENT',
  provider: 'Azure AD B2C (Cloud)',
  clientId: environment.msal.clientId,
  authority: environment.msal.authority,
  isDevelopment: isDevelopment
};

// Log current configuration in development only
if (isDevelopment) {
  console.log('🔐 Authentication Configuration:', authConfigInfo);
}