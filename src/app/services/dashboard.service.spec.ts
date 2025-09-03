import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DashboardService } from './dashboard.service';
import { environment } from '../../environments/environment';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DashboardService],
    });

    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch dashboard stats from API', (done) => {
    const mockResponse = { totalEmployees: 1, totalFloors: 1, totalOffices: 1, totalSeats: 1, occupancyRate: 50, officesPerFloor: [], seatsPerFloor: [] };

    service.getDashboardStats().subscribe((res) => {
      expect(res.totalEmployees).toBe(1);
      done();
    });

    const url = `${environment.apiBaseUrl}/stats`;
    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should fall back to mock data in development on error', (done) => {
    expect(environment.production).toBeFalse();

    service.getDashboardStats().subscribe((res) => {
      expect(res.totalEmployees).toBeGreaterThan(0);
      done();
    });

    const url = `${environment.apiBaseUrl}/stats`;
    // Due to retry(1), flush two errors so catchError executes
    const req1 = httpMock.expectOne(url);
    req1.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

    const req2 = httpMock.expectOne(url);
    req2.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
  });

  it('should cache the result and not refetch on subsequent subscriptions', (done) => {
    const mockResponse = { totalEmployees: 3, totalFloors: 2, totalOffices: 2, totalSeats: 10, occupancyRate: 30, officesPerFloor: [], seatsPerFloor: [] };

    const values: number[] = [];

    // Subscribe twice before flush to simulate multiple consumers
    service.getDashboardStats().subscribe((res) => values.push(res.totalEmployees));
    service.getDashboardStats().subscribe((res) => values.push(res.totalEmployees));

    const url = `${environment.apiBaseUrl}/stats`;
    const req = httpMock.expectOne(url);
    req.flush(mockResponse);

    // No further HTTP requests should be made
    expect(values).toEqual([3, 3]);
    done();
  });
});
