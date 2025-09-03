import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProfileService, UserProfile } from './profile.service';
import { environment } from '../../environments/environment';

describe('ProfileService', () => {
  let service: ProfileService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProfileService],
    });

    service = TestBed.inject(ProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch user profile', (done) => {
    const mock: UserProfile = {
      firstName: 'Ada', lastName: 'Lovelace', subject: 'sub', roles: ['user'], isAdmin: false,
      workingEmail: 'ada@example.com', userId: 'uid', email: 'ada@example.com', username: 'ada'
    };

    service.getUserProfile().subscribe((res) => {
      expect(res.username).toBe('ada');
      done();
    });

    const req = httpMock.expectOne(`${environment.msal.apiEndpoint}/auth/profile`);
    expect(req.request.method).toBe('GET');
    req.flush(mock);
  });
});
