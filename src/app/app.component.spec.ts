import { TestBed, ComponentFixture } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthService } from './auth/auth.service';
import { of } from 'rxjs';
import { Component } from '@angular/core';

// Mock dashboard component for routing
@Component({ 
  selector: 'app-mock-dashboard',
  template: '',
  standalone: true 
})
class MockDashboardComponent { }

describe('AppComponent', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['waitForInitialization', 'isLoggedIn', 'refreshAuthState'], {
      loginStatus$: of(false)
    });
    authServiceSpy.waitForInitialization.and.returnValue(Promise.resolve());
    authServiceSpy.isLoggedIn.and.returnValue(false);
    authServiceSpy.refreshAuthState.and.stub();

    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'dashboard', component: MockDashboardComponent },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          { path: '**', redirectTo: 'dashboard' }
        ]),
        HttpClientTestingModule,
        AppComponent,
        MockDashboardComponent
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    if (fixture) {
      fixture.destroy();
    }
  });

  it('should create the app', () => {
    fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'Office Management' title`, () => {
    fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('Office Management');
  });

  it('should implement ngOnInit', () => {
    fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const initializeAppSpy = spyOn<AppComponent>(app as AppComponent, 'initializeApp' as never);
    app.ngOnInit();
    expect(initializeAppSpy).toHaveBeenCalled();
  });

  it('should handle authentication status changes', async () => {
    // Create a new auth service spy with different loginStatus$
    const authServiceSpyTrue = jasmine.createSpyObj('AuthService', ['waitForInitialization', 'isLoggedIn', 'refreshAuthState'], {
      loginStatus$: of(true)
    });
    authServiceSpyTrue.waitForInitialization.and.returnValue(Promise.resolve());
    authServiceSpyTrue.isLoggedIn.and.returnValue(true);
    authServiceSpyTrue.refreshAuthState.and.stub();
    
    // Create a new TestBed configuration for this specific test
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'dashboard', component: MockDashboardComponent },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          { path: '**', redirectTo: 'dashboard' }
        ]),
        HttpClientTestingModule,
        AppComponent,
        MockDashboardComponent
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpyTrue }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    
    await app.ngOnInit();
    
    expect(app.isAuthenticated).toBe(true);
  });
});
