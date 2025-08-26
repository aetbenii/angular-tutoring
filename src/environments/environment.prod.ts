export const environment = {
  production: true,
  apiBaseUrl: 'https://your-production-api-url',
  msal: {
    clientId: 'your-production-client-id',
    apiScope: 'https://your-production-tenant.onmicrosoft.com/your-production-api-id/api.read',
    apiEndpoint: 'https://your-production-api-url',
    authority: 'https://your-production-tenant.b2clogin.com/your-production-tenant.onmicrosoft.com/B2C_1A_SIGNUP_SIGNIN_SPID',
    authorityDomain: 'your-production-tenant.b2clogin.com',
    redirectUri: 'https://your-production-url',
    postLogoutRedirectUri: 'https://your-production-url'
  }
}; 