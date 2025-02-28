import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FloorService } from './floor.service';
import { HttpErrorResponse } from '@angular/common/http';
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
    httpMock.verify();
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
    service['loadFloors']();
    
    // First attempt
    const req1 = httpMock.expectOne('http://localhost:8080/api/floors');
    expect(req1.request.method).toBe('GET');
    req1.error(new ErrorEvent('Network error'));
    tick(1000);

    // Retry attempt
    const req2 = httpMock.expectOne('http://localhost:8080/api/floors');
    expect(req2.request.method).toBe('GET');
    const mockErrorResponse = new HttpErrorResponse({
      error: 'Error loading floors',
      status: 404,
      statusText: 'Not Found'
    });
    req2.flush(mockErrorResponse.error, {
      status: mockErrorResponse.status,
      statusText: mockErrorResponse.statusText
    });
    
    tick(1000);
    expect(service.floors()).toEqual([]);
  }));

  it('should load specific floor details', fakeAsync(() => {
    // Initial load was already handled in beforeEach
    expect(service.floors()).toEqual([]);

    const mockFloor: Floor = {
      id: 1,
      floorNumber: 1,
      name: 'First Floor',
      createdAt: [2025, 1, 1],
      rooms: []
    };

    service.loadFloor(1);

    const req = httpMock.expectOne('http://localhost:8080/api/floors/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockFloor);

    tick(1000);
    expect(service.selectedFloor()).toEqual(mockFloor);
  }));

  it('should handle error when loading specific floor', fakeAsync(() => {
    service.loadFloor(1);
    
    // First attempt
    const req1 = httpMock.expectOne('http://localhost:8080/api/floors/1');
    expect(req1.request.method).toBe('GET');
    req1.error(new ErrorEvent('Network error'));
    tick(1000);

    // Retry attempt
    const req2 = httpMock.expectOne('http://localhost:8080/api/floors/1');
    expect(req2.request.method).toBe('GET');
    const mockErrorResponse = new HttpErrorResponse({
      error: 'Floor not found',
      status: 404,
      statusText: 'Not Found'
    });
    req2.flush(mockErrorResponse.error, {
      status: mockErrorResponse.status,
      statusText: mockErrorResponse.statusText
    });
    
    tick(1000);
    expect(service.selectedFloor()).toBeNull();
  }));

  it('should toggle seat occupancy', fakeAsync(() => {
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
        createdAt: [2025, 1, 1],
        seats: [{
          id: 1,
          room: {
            id: 1,
            floor: {
              id: 1,
              floorNumber: 1,
              name: 'First Floor',
              createdAt: [2025, 1, 1]
            },
            roomNumber: '101',
            name: 'Room 101',
            createdAt: [2025, 1, 1]
          },
          seatNumber: '1A',
          occupied: false,
          createdAt: [2025, 1, 1]
        }]
      }]
    };

    service.loadFloor(1);

    const floorReq = httpMock.expectOne('http://localhost:8080/api/floors/1');
    floorReq.flush(mockFloor);

    tick(1000);

    service.toggleSeatOccupancy(1, 1);
    tick(1000);

    const updatedFloor = service.selectedFloor();
    expect(updatedFloor?.rooms[0].seats[0].occupied).toBe(true);
  }));
});
