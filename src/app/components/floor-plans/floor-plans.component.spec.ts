import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FloorPlansComponent } from './floor-plans.component';
import { FloorService } from '../../services/floor.service';
import { EmployeeService } from '../../services/employee.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { signal } from '@angular/core';
import { of } from 'rxjs';

describe('FloorPlansComponent', () => {
  let component: FloorPlansComponent;
  let fixture: ComponentFixture<FloorPlansComponent>;
  let floorService: jasmine.SpyObj<FloorService>;
  let employeeService: jasmine.SpyObj<EmployeeService>;
  let httpMock: HttpTestingController;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  const mockFloor = {
    id: 1,
    floorNumber: 1,
    name: 'Ground Floor',
    rooms: [
      {
        id: 1,
        name: 'Room A',
        roomNumber: 'A001',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        seats: [
          {
            id: 1,
            seatNumber: 'A001-01',
            x: 10,
            y: 10,
            width: 50,
            height: 30,
            employeeIds: [1, 2],
            occupied: true
          },
          {
            id: 2,
            seatNumber: 'A001-02',
            x: 70,
            y: 10,
            width: 50,
            height: 30,
            employeeIds: [3],
            occupied: true
          }
        ]
      }
    ]
  };

  const mockEmployees = [
    { id: 1, fullName: 'John Doe', occupation: 'Developer', createdAt: '2023-01-01', seatIds: [1] },
    { id: 2, fullName: 'Jane Smith', occupation: 'Designer', createdAt: '2023-01-01', seatIds: [1] },
    { id: 3, fullName: 'Bob Johnson', occupation: 'Manager', createdAt: '2023-01-01', seatIds: [2] }
  ];

  beforeEach(async () => {
    const floorServiceSpy = jasmine.createSpyObj('FloorService', ['loadFloor'], {
      floors: signal([mockFloor]),
      selectedFloor: signal(mockFloor)
    });

    const employeeServiceSpy = jasmine.createSpyObj('EmployeeService', ['getEmployeesByIds']);
    
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [FloorPlansComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimations(),
        { provide: FloorService, useValue: floorServiceSpy },
        { provide: EmployeeService, useValue: employeeServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    floorService = TestBed.inject(FloorService) as jasmine.SpyObj<FloorService>;
    employeeService = TestBed.inject(EmployeeService) as jasmine.SpyObj<EmployeeService>;
    httpMock = TestBed.inject(HttpTestingController);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FloorPlansComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load floor and enrich seats with employees using batch request', async () => {
    // Setup employee service to return mock employees
    employeeService.getEmployeesByIds.and.returnValue(of(mockEmployees));
    floorService.loadFloor.and.returnValue(Promise.resolve());

    // Initialize component
    await component.ngOnInit();

    // Set floor selection to trigger loading
    component.selectedFloorControl.setValue(1);

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify that getEmployeesByIds was called once with all unique employee IDs
    expect(employeeService.getEmployeesByIds).toHaveBeenCalledTimes(1);
    expect(employeeService.getEmployeesByIds).toHaveBeenCalledWith([1, 2, 3]);

    // Verify that floor was loaded
    expect(floorService.loadFloor).toHaveBeenCalledWith(1);
  });

  it('should handle empty employee IDs gracefully', async () => {
    const mockFloorWithEmptySeats = {
      ...mockFloor,
      rooms: [{
        ...mockFloor.rooms[0],
        seats: [
          {
            id: 1,
            seatNumber: 'A001-01',
            x: 10,
            y: 10,
            width: 50,
            height: 30,
            employeeIds: [],
            occupied: false
          }
        ]
      }]
    };

    floorService.selectedFloor = signal(mockFloorWithEmptySeats);
    floorService.loadFloor.and.returnValue(Promise.resolve());

    await component.ngOnInit();
    component.selectedFloorControl.setValue(1);

    await new Promise(resolve => setTimeout(resolve, 0));

    // Should not call employee service when no employee IDs
    expect(employeeService.getEmployeesByIds).not.toHaveBeenCalled();
  });

  it('should handle employee service errors gracefully', async () => {
    employeeService.getEmployeesByIds.and.returnValue(of(null as any));
    floorService.loadFloor.and.returnValue(Promise.resolve());

    await component.ngOnInit();
    component.selectedFloorControl.setValue(1);

    await new Promise(resolve => setTimeout(resolve, 0));

    // Should handle null response gracefully
    expect(employeeService.getEmployeesByIds).toHaveBeenCalledTimes(1);
    expect(component.loading).toBe(false);
  });

  it('should open unassign seat dialog when employee is clicked', () => {
    const mockEvent = new Event('click');
    spyOn(mockEvent, 'stopPropagation');
    
    const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRef.afterClosed.and.returnValue(of(true));
    dialogSpy.open.and.returnValue(dialogRef);

    component.onEmployeeClick(mockEvent, 1, 'John Doe', 1);

    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(dialogSpy.open).toHaveBeenCalled();
  });

  it('should unassign seat when dialog confirms', () => {
    const mockEvent = new Event('click');
    
    const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRef.afterClosed.and.returnValue(of(true));
    dialogSpy.open.and.returnValue(dialogRef);

    floorService.loadFloor.and.returnValue(Promise.resolve());
    employeeService.getEmployeesByIds.and.returnValue(of(mockEmployees));

    component.onEmployeeClick(mockEvent, 1, 'John Doe', 1);

    // Verify unassign request
    const req = httpMock.expectOne('http://localhost:8080/api/employees/1/seats/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({});

    expect(snackBarSpy.open).toHaveBeenCalledWith('Seat unassigned successfully', 'Close', { duration: 3000 });
  });

  it('should delete seat when delete dialog confirms', () => {
    const mockEvent = new Event('click');
    
    const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRef.afterClosed.and.returnValue(of(true));
    dialogSpy.open.and.returnValue(dialogRef);

    floorService.loadFloor.and.returnValue(Promise.resolve());
    employeeService.getEmployeesByIds.and.returnValue(of(mockEmployees));

    component.onDeleteClick(mockEvent, 1, 'A001-01');

    // Verify delete request
    const req = httpMock.expectOne('http://localhost:8080/api/seats/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({});

    expect(snackBarSpy.open).toHaveBeenCalledWith('Seat deleted successfully', 'Close', { duration: 3000 });
  });

  it('should create seat when add dialog confirms', () => {
    const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRef.afterClosed.and.returnValue(of('A001-03'));
    dialogSpy.open.and.returnValue(dialogRef);

    floorService.loadFloor.and.returnValue(Promise.resolve());
    employeeService.getEmployeesByIds.and.returnValue(of(mockEmployees));
    component.selectedFloorControl.setValue(1);

    component.onAddClick(1);

    // Verify create request
    const req = httpMock.expectOne('http://localhost:8080/api/seats');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      seatNumber: 'A001-03',
      room: { id: 1 }
    });
    req.flush({});

    expect(snackBarSpy.open).toHaveBeenCalledWith('Seat created successfully', 'Close', { duration: 3000 });
  });

  it('should check if room is empty correctly', () => {
    const emptyRoom = {
      ...mockFloor.rooms[0],
      seats: [
        { ...mockFloor.rooms[0].seats[0], occupied: false },
        { ...mockFloor.rooms[0].seats[1], occupied: false }
      ]
    };

    expect(component.isRoomEmpty(emptyRoom)).toBe(true);
    expect(component.isRoomEmpty(mockFloor.rooms[0])).toBe(false);
  });

  it('should handle batch employee enrichment correctly with unique IDs', async () => {
    const seatsWithDuplicateEmployees = [
      { id: 1, employeeIds: [1, 2], seatNumber: 'A001-01' },
      { id: 2, employeeIds: [2, 3], seatNumber: 'A001-02' },
      { id: 3, employeeIds: [1], seatNumber: 'A001-03' }
    ];

    employeeService.getEmployeesByIds.and.returnValue(of(mockEmployees));

    const result = await component['enrichSeatsWithEmployees'](seatsWithDuplicateEmployees);

    // Should only call with unique employee IDs
    expect(employeeService.getEmployeesByIds).toHaveBeenCalledWith([1, 2, 3]);
    expect(result).toHaveLength(3);
    expect(result[0].employees).toHaveLength(2); // John and Jane
    expect(result[1].employees).toHaveLength(2); // Jane and Bob
    expect(result[2].employees).toHaveLength(1); // John
  });
});