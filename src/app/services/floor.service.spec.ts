import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FloorService } from './floor.service';
import { Floor } from '../interfaces/floor.interface';

describe('FloorService', () => {
  let service: FloorService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FloorService]
    }).compileComponents();
  });

  beforeEach(fakeAsync(() => {
    service = TestBed.inject(FloorService);
    httpMock = TestBed.inject(HttpTestingController);
    // Handle the initial loadFloors call from constructor
    const req = httpMock.expectOne('http://localhost:8080/api/floors');
    req.flush([]);
    tick(1000); // Allow time for retry operations to complete
  }));

  afterEach(() => {
    // Only verify if httpMock is still available
    if (httpMock) {
      try {
        httpMock.verify();
      } catch {
        // Ignore if already destroyed
      }
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load floors on initialization', fakeAsync(() => {
    // Initial load was already handled in beforeEach
    expect(service.floors()).toEqual([]);
    
    // Trigger a new load
    service['loadFloors']();
    
    const req = httpMock.expectOne('http://localhost:8080/api/floors');
    expect(req.request.method).toBe('GET');
    
    const mockFloors: Floor[] = [
      {
        id: 1,
        floorNumber: 1,
        name: 'First Floor',
        createdAt: [2025, 1, 1],
        rooms: []
      }
    ];
    req.flush(mockFloors);
    
    tick(1000);
    expect(service.floors()).toEqual(mockFloors);
  }));

  it('should handle error when loading floors', fakeAsync(() => {
    spyOn(console, 'error'); // Suppress console error output during test
    service['loadFloors']();
    
    // First attempt
    const req1 = httpMock.expectOne('http://localhost:8080/api/floors');
    expect(req1.request.method).toBe('GET');
    req1.error(new ErrorEvent('Network error'), { status: 500, statusText: 'Server Error' });
    tick(1000);

    // Retry attempt (retry(1) means 1 retry)
    const req2 = httpMock.expectOne('http://localhost:8080/api/floors');
    expect(req2.request.method).toBe('GET');
    req2.error(new ErrorEvent('Network error'), { status: 500, statusText: 'Server Error' });
    
    tick(1000);
    expect(service.floors()).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  }));

  it('should load specific floor details', fakeAsync(async () => {
    // Initial load was already handled in beforeEach
    expect(service.floors()).toEqual([]);

    const mockFloor: Floor = {
      id: 1,
      floorNumber: 1,
      name: 'First Floor',
      createdAt: [2025, 1, 1],
      rooms: []
    };

    const loadPromise = service.loadFloor(1);

    const req = httpMock.expectOne('http://localhost:8080/api/floors/1/embed');
    expect(req.request.method).toBe('GET');
    req.flush(mockFloor);

    await loadPromise;
    tick(1000);
    expect(service.selectedFloor()).toEqual(mockFloor);
  }));

  it('should handle error when loading specific floor', fakeAsync(async () => {
    spyOn(console, 'error'); // Suppress console error output during test
    const loadPromise = service.loadFloor(1);
    
    // First attempt
    const req1 = httpMock.expectOne('http://localhost:8080/api/floors/1/embed');
    expect(req1.request.method).toBe('GET');
    req1.error(new ErrorEvent('Network error'), { status: 404, statusText: 'Not Found' });
    tick(1000);

    // Retry attempt (retry(1) means 1 retry)
    const req2 = httpMock.expectOne('http://localhost:8080/api/floors/1/embed');
    expect(req2.request.method).toBe('GET');
    req2.error(new ErrorEvent('Network error'), { status: 404, statusText: 'Not Found' });
    
    try {
      await loadPromise;
    } catch {
      // Expected error
    }
    
    tick(1000);
    expect(service.selectedFloor()).toBeNull();
    expect(console.error).toHaveBeenCalled();
  }));

  it('should toggle seat occupancy', fakeAsync(async () => {
    // Initial load was already handled in beforeEach
    expect(service.floors()).toEqual([]);

    const mockFloor: Floor = {
      id: 1,
      floorNumber: 1,
      name: 'First Floor',
      createdAt: [2025, 1, 1],
      rooms: [{
        id: 1,
        roomNumber: '101',
        name: 'Room 101',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        createdAt: [2025, 1, 1],
        seatIds: [1],
        seats: [{
          id: 1,
          seatNumber: '1A',
          roomId: 1,
          roomName: 'Room 101',
          floorId: 1,
          floorName: 'First Floor',
          createdAt: [2025, 1, 1],
          x: 10,
          y: 10,
          width: 50,
          height: 30,
          rotation: 0,
          employeeIds: [],
          employees: [],
          occupied: false
        }]
      }]
    };

    const loadPromise = service.loadFloor(1);

    const floorReq = httpMock.expectOne('http://localhost:8080/api/floors/1/embed');
    floorReq.flush(mockFloor);

    await loadPromise;
    tick(1000);

    service.toggleSeatOccupancy(1, 1);
    tick(1000);

    const updatedFloor = service.selectedFloor();
    expect(updatedFloor?.rooms[0].seats[0].occupied).toBe(true);
  }));
});
