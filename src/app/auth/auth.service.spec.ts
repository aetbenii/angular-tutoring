import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { ProfileService } from '../services/profile.service';
import { MsalService } from '@azure/msal-angular';

class MockMsalInstance {
  initialize = jasmine.createSpy('initialize').and.returnValue(Promise.resolve());
  handleRedirectPromise = jasmine.createSpy('handleRedirectPromise').and.returnValue(Promise.resolve(null));
  getAllAccounts = jasmine.createSpy('getAllAccounts').and.returnValue([]);
  setActiveAccount = jasmine.createSpy('setActiveAccount');
  acquireTokenSilent = jasmine.createSpy('acquireTokenSilent').and.returnValue(Promise.resolve({ accessToken: 'token', scopes: [], expiresOn: new Date() }));
  acquireTokenRedirect = jasmine.createSpy('acquireTokenRedirect').and.returnValue(Promise.resolve());
  getConfiguration = jasmine.createSpy('getConfiguration').and.returnValue({ auth: { clientId: 'client-id', authority: 'https://example.com', knownAuthorities: [], redirectUri: 'http://localhost' } });
}

class MockMsalService {
  instance = new MockMsalInstance();
  loginRedirect = jasmine.createSpy('loginRedirect').and.returnValue(Promise.resolve());
  logoutRedirect = jasmine.createSpy('logoutRedirect').and.returnValue(Promise.resolve());
}

class MockProfileService {
  getUserProfile = jasmine.createSpy('getUserProfile').and.returnValue(of({
    firstName: 'Ada',
    lastName: 'Lovelace',
    subject: 'sub',
    roles: ['user'],
    isAdmin: false,
    workingEmail: 'ada@example.com',
    userId: 'uid',
    email: 'ada@example.com',
    username: 'ada'
  }));
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        AuthService,
        { provide: MsalService, useClass: MockMsalService },
        { provide: ProfileService, useClass: MockProfileService },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should report not logged in when no accounts', fakeAsync(() => {
    service.waitForInitialization();
    flushMicrotasks();
    expect(service.isLoggedIn()).toBeFalse();
  }));

  it('should decode a valid JWT payload', () => {
    const payload = { sub: '123', name: 'Test' };
    const base64url = (obj: unknown) => {
      const json = JSON.stringify(obj);
      return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };
    const token = `aaa.${base64url(payload)}.bbb`;
    const decoded = service.decodeJWT(token);
    expect(decoded).toBeTruthy();
    expect((decoded as any).sub).toBe('123');
  });

  it('should return null for invalid JWT', () => {
    const decoded = service.decodeJWT('invalid.token');
    expect(decoded).toBeNull();
  });

  it('isAdmin should reflect profile state', () => {
    expect(service.isAdmin()).toBeFalse();
    (service as any).userProfileSubject.next({
      firstName: 'A', lastName: 'B', subject: 's', roles: ['admin'], isAdmin: true,
      workingEmail: '', userId: 'u', email: '', username: ''
    });
    expect(service.isAdmin()).toBeTrue();
  });
});
