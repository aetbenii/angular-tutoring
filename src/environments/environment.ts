export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080/api',
  msal: {
    clientId: 'ad448f87-ef05-4adc-9fce-1d4d49e54a8c',
    apiScope: 'https://testb2c01siag.onmicrosoft.com/726df034-c31d-4e11-b504-b80f6500c080/api.read',
    apiEndpoint: 'http://localhost:8080/api',
    authority: 'https://testb2c01siag.b2clogin.com/testb2c01siag.onmicrosoft.com/B2C_1A_SIGNUP_SIGNIN_SPID',
    authorityDomain: 'testb2c01siag.b2clogin.com',
    redirectUri: 'http://localhost:4200',
    postLogoutRedirectUri: 'http://localhost:4200'
  }
}; 