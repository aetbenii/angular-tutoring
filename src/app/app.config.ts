import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { MsalModule, MsalRedirectComponent, MsalGuard } from '@azure/msal-angular';
import { InteractionType, PublicClientApplication } from '@azure/msal-browser';

import { routes } from './app.routes';
import { msalConfig, loginRequest } from './auth/msal/msal.config';
import { AuthInterceptor } from './auth/auth-interceptor';
import { HttpErrorInterceptor } from './interceptors/http-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(MsalModule.forRoot(new PublicClientApplication(msalConfig),
      {
        interactionType: InteractionType.Redirect,
        authRequest: loginRequest,
      },
      {
        interactionType: InteractionType.Redirect,
        protectedResourceMap: new Map()
      }
    )),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpErrorInterceptor,
      multi: true
    },
    MsalGuard,
    MsalRedirectComponent,
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations()
  ]
};
