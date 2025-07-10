import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmployeesComponent } from './employees.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MatDialog, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ElementRef } from '@angular/core';

describe('EmployeesComponent', () => {
  let component: EmployeesComponent;
  let fixture: ComponentFixture<EmployeesComponent>;
  let httpMock: HttpTestingController;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    // Mock ResizeObserver
    class MockResizeObserver implements ResizeObserver {
      observe = jasmine.createSpy('observe');
      unobserve = jasmine.createSpy('unobserve');
      disconnect = jasmine.createSpy('disconnect');
    }
    window.ResizeObserver = MockResizeObserver;

    const dialogRefSpyObj = jasmine.createSpyObj('MatDialogRef', ['close', 'afterClosed']);
    dialogRefSpyObj.afterClosed.and.returnValue(of(true));

    dialogSpy = jasmine.createSpyObj('MatDialog', ['open'], {
      openDialogs: [],
      getDialogById: () => null,
      afterOpened: of({}),
      afterAllClosed: of({})
    });
    dialogSpy.open.and.returnValue(dialogRefSpyObj);

    await TestBed.configureTestingModule({
      imports: [
        EmployeesComponent,
        MatDialogModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimations(),
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MAT_DIALOG_DATA, useValue: {} }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EmployeesComponent);
    component = fixture.componentInstance;

    // Set up ViewChild before any change detection
    const mockGrid = document.createElement('div');
    component.employeesGrid = new ElementRef(mockGrid);
    spyOnProperty(mockGrid, 'clientHeight', 'get').and.returnValue(500);
    spyOnProperty(mockGrid, 'scrollHeight', 'get').and.returnValue(1000);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load initial employees on ngOnInit', () => {
    const mockResponse = {
      content: [
        { id: 1, fullName: 'John Doe', occupation: 'Developer', createdAt: '2023-01-01', seatIds: [] }
      ],
      totalElements: 1,
      totalPages: 1,
      currentPage: 0,
      size: 5
    };

    component.ngOnInit();
    
    const req = httpMock.expectOne('http://localhost:8080/api/employees/search?page=0&size=5');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);

    expect(component.employees()).toEqual(mockResponse.content);
    expect(component.totalElements()).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('should handle search with debouncing', (done) => {
    const mockResponse = {
      content: [
        { id: 1, fullName: 'Jane Smith', occupation: 'Designer', createdAt: '2023-01-01', seatIds: [] }
      ],
      totalElements: 1,
      totalPages: 1,
      currentPage: 0,
      size: 5
    };

    component.ngOnInit();
    
    // Clear initial request
    const initialReq = httpMock.expectOne('http://localhost:8080/api/employees/search?page=0&size=5');
    initialReq.flush({ content: [], totalElements: 0, totalPages: 0, currentPage: 0, size: 5 });

    // Set search term
    component.searchControl.setValue('Jane');

    // Wait for debounce
    setTimeout(() => {
      const req = httpMock.expectOne('http://localhost:8080/api/employees/search?page=0&size=5&search=Jane');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      expect(component.employees()).toEqual(mockResponse.content);
      expect(component.currentPage()).toBe(0);
      done();
    }, 350); // Wait for 300ms debounce + buffer
  });

  it('should load more employees on scroll', () => {
    component.ngOnInit();
    
    // Initial load
    const initialReq = httpMock.expectOne('http://localhost:8080/api/employees/search?page=0&size=5');
    initialReq.flush({
      content: [{ id: 1, fullName: 'User 1', occupation: 'Dev', createdAt: '2023-01-01', seatIds: [] }],
      totalElements: 10,
      totalPages: 2,
      currentPage: 0,
      size: 5
    });

    // Simulate scroll event
    component.onScroll();

    const secondReq = httpMock.expectOne('http://localhost:8080/api/employees/search?page=1&size=5');
    secondReq.flush({
      content: [{ id: 2, fullName: 'User 2', occupation: 'Designer', createdAt: '2023-01-01', seatIds: [] }],
      totalElements: 10,
      totalPages: 2,
      currentPage: 1,
      size: 5
    });

    expect(component.employees().length).toBe(2);
    expect(component.currentPage()).toBe(1);
  });

  it('should handle error when loading employees fails', () => {
    spyOn(console, 'error');
    
    component.ngOnInit();
    
    const req = httpMock.expectOne('http://localhost:8080/api/employees/search?page=0&size=5');
    req.error(new ErrorEvent('Network error'), { status: 500, statusText: 'Server Error' });

    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('Failed to load employees');
    expect(console.error).toHaveBeenCalled();
  });

  it('should open create employee dialog', () => {
    component.createEmployee();
    expect(dialogSpy.open).toHaveBeenCalled();
  });

  it('should check if more data can be loaded', () => {
    component.totalPages.set(3);
    component.currentPage.set(1);
    
    expect(component.canLoadMore()).toBe(true);
    
    component.currentPage.set(2);
    expect(component.canLoadMore()).toBe(false);
  });

  it('should prevent loading more when already loading', () => {
    component.loading.set(true);
    component.totalPages.set(3);
    component.currentPage.set(1);
    
    expect(component.canLoadMore()).toBe(false);
  });

  it('should reset pagination on new search', () => {
    component.currentPage.set(2);
    component.employees.set([
      { id: 1, fullName: 'User 1', occupation: 'Dev', createdAt: '2023-01-01', seatIds: [] }
    ]);

    component.ngOnInit();
    
    // Clear initial request
    const initialReq = httpMock.expectOne('http://localhost:8080/api/employees/search?page=0&size=5');
    initialReq.flush({ content: [], totalElements: 0, totalPages: 0, currentPage: 0, size: 5 });

    component.searchControl.setValue('new search');

    setTimeout(() => {
      expect(component.currentPage()).toBe(0);
      expect(component.employees().length).toBe(0);
    }, 350);
  });
});
