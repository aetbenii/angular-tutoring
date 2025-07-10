export const environment = {
  production: true,
  apiBaseUrl: 'https://your-production-api-url', // Replace with your production API URL
  msal: {
    clientId: 'your-client-id', // Replace with your Azure B2C client ID
    apiScope: 'https://your-tenant.onmicrosoft.com/your-app-id/api.read', // Replace with your API scope
    apiEndpoint: 'https://your-production-api-url', // Replace with your production API URL
    authority: 'https://your-tenant.b2clogin.com/your-tenant.onmicrosoft.com/B2C_1A_SIGNUP_SIGNIN_SPID', // Replace with your authority
    authorityDomain: 'your-tenant.b2clogin.com', // Replace with your authority domain
    redirectUri: 'https://your-production-url', // Replace with your production URL
    postLogoutRedirectUri: 'https://your-production-url' // Replace with your production URL
  }
};