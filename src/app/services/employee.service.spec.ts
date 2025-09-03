import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EmployeeService, EmployeeResponse } from './employee.service';
import { environment } from '../../environments/environment';

interface Employee { id: number; firstName: string; lastName: string; }

describe('EmployeeService', () => {
  let service: EmployeeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EmployeeService],
    });

    service = TestBed.inject(EmployeeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch employees with search and pagination', (done) => {
    const mockResponse: EmployeeResponse = {
      content: [],
      totalElements: 0,
      totalPages: 0,
      currentPage: 0,
      size: 5,
    };

    service.getEmployees('john', 2, 5).subscribe((res) => {
      expect(res).toEqual(mockResponse);
      done();
    });

    const url = `${environment.apiBaseUrl}/employees/search?page=2&size=5&search=john`;
    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should propagate error on failure', (done) => {
    const url = `${environment.apiBaseUrl}/employees/search?page=0&size=5`;

    service.getEmployees().subscribe({
      next: () => done.fail('expected error'),
      error: (err) => {
        expect(err.status).toBe(500);
        done();
      },
    });

    // Due to retry(1), we expect two requests and flush both with error
    const req1 = httpMock.expectOne(url);
    req1.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

    const req2 = httpMock.expectOne(url);
    req2.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
  });

  it('getEmployeesByIds([]) should return empty array without HTTP', (done) => {
    service.getEmployeesByIds([]).subscribe((res) => {
      expect(res).toEqual([]);
      done();
    });
    httpMock.expectNone(() => true);
  });

  it('getEmployeesByIds should call batch endpoint and return employees', (done) => {
    const employees: Employee[] = [
      { id: 1, firstName: 'Ada', lastName: 'Lovelace' },
      { id: 2, firstName: 'Alan', lastName: 'Turing' },
    ];

    service.getEmployeesByIds([1, 2]).subscribe((res) => {
      expect(res.length).toBe(2);
      expect(res[0].id).toBe(1);
      expect(res[1].id).toBe(2);
      done();
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/employees/batch?ids=1&ids=2`);
    expect(req.request.method).toBe('GET');
    req.flush(employees);
  });

  it('getEmployeesByIds should fall back to individual requests when batch fails (with retry)', (done) => {
    const employees: Employee[] = [
      { id: 1, firstName: 'Ada', lastName: 'Lovelace' },
      // id 2 will fail and be filtered out
    ];

    service.getEmployeesByIds([1, 2]).subscribe((res) => {
      expect(res.length).toBe(1);
      expect(res[0].id).toBe(1);
      done();
    });

    // First attempt to batch -> error
    const batchUrl = `${environment.apiBaseUrl}/employees/batch?ids=1&ids=2`;
    const batchReq1 = httpMock.expectOne(batchUrl);
    batchReq1.flush({ message: 'not implemented' }, { status: 501, statusText: 'Not Implemented' });

    // Retry attempt to batch -> error again
    const batchReq2 = httpMock.expectOne(batchUrl);
    batchReq2.flush({ message: 'not implemented again' }, { status: 501, statusText: 'Not Implemented' });

    // Fallback: individual requests for each id
    const req1 = httpMock.expectOne(`${environment.apiBaseUrl}/employees/1`);
    expect(req1.request.method).toBe('GET');
    req1.flush(employees[0]);

    const req2 = httpMock.expectOne(`${environment.apiBaseUrl}/employees/2`);
    expect(req2.request.method).toBe('GET');
    req2.flush({ message: 'fail' }, { status: 500, statusText: 'Server Error' });

    // retry(1) on getEmployeeById will trigger a second request for id 2
    const req2Retry = httpMock.expectOne(`${environment.apiBaseUrl}/employees/2`);
    expect(req2Retry.request.method).toBe('GET');
    req2Retry.flush({ message: 'fail' }, { status: 500, statusText: 'Server Error' });
  });

  it('getEmployeeById should fetch single employee', (done) => {
    const emp: Employee = { id: 3, firstName: 'Grace', lastName: 'Hopper' };

    service.getEmployeeById(3).subscribe((res) => {
      expect(res.id).toBe(3);
      done();
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/employees/3`);
    expect(req.request.method).toBe('GET');
    req.flush(emp);
  });

  it('createEmployee should POST and return employee', (done) => {
    const payload = { firstName: 'New', lastName: 'User' } as any;
    const created = { id: 10, firstName: 'New', lastName: 'User' } as Employee;

    service.createEmployee(payload).subscribe((res) => {
      expect(res.id).toBe(10);
      done();
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/employees`);
    expect(req.request.method).toBe('POST');
    req.flush(created);
  });

  it('updateEmployee should PUT and return employee', (done) => {
    const payload = { firstName: 'Upd', lastName: 'User' } as any;
    const updated = { id: 7, firstName: 'Upd', lastName: 'User' } as Employee;

    service.updateEmployee(7, payload).subscribe((res) => {
      expect(res.id).toBe(7);
      done();
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/employees/7`);
    expect(req.request.method).toBe('PUT');
    req.flush(updated);
  });

  it('deleteEmployee should DELETE', (done) => {
    service.deleteEmployee(5).subscribe(() => {
      expect(true).toBeTrue();
      done();
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/employees/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('getEmployeeSeats should GET seats', (done) => {
    const seats = [ { id: 1 }, { id: 2 } ];

    service.getEmployeeSeats(4).subscribe((res) => {
      expect(res.length).toBe(2);
      done();
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/employees/4/seats`);
    expect(req.request.method).toBe('GET');
    req.flush(seats);
  });

  it('assignSeat should PUT to assignment endpoint', (done) => {
    service.assignSeat(11, 22).subscribe(() => {
      expect(true).toBeTrue();
      done();
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/employees/11/seats/22`);
    expect(req.request.method).toBe('PUT');
    req.flush(null);
  });
});
