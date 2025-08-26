import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FloorPlansComponent } from './floor-plans.component';
import { FloorService } from '../../services/floor.service';
import { EmployeeService } from '../../services/employee.service';
import { AuthService } from '../../auth/auth.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { Room } from '../../interfaces/room.interface';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { environment } from '../../../environments/environment';

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
    createdAt: [2023, 1, 1],
    rooms: [
      {
        id: 1,
        name: 'Room A',
        roomNumber: 'A001',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        createdAt: [2023, 1, 1],
        seatIds: [1, 2],
        seats: [
          {
            id: 1,
            seatNumber: 'A001-01',
            roomId: 1,
            roomName: 'Room A',
            floorId: 1,
            floorName: 'Ground Floor',
            createdAt: [2023, 1, 1],
            x: 10,
            y: 10,
            width: 50,
            height: 30,
            rotation: 0,
            employeeIds: [1, 2],
            employees: [],
            occupied: true
          },
          {
            id: 2,
            seatNumber: 'A001-02',
            roomId: 1,
            roomName: 'Room A',
            floorId: 1,
            floorName: 'Ground Floor',
            createdAt: [2023, 1, 1],
            x: 70,
            y: 10,
            width: 50,
            height: 30,
            rotation: 0,
            employeeIds: [3],
            employees: [],
            occupied: true
          }
        ]
      }
    ]
  };

  const mockEmployees = [
    { id: 1, fullName: 'John Doe', occupation: 'Developer', createdAt: [2023, 1, 1], seats: [], seatIds: [1] },
    { id: 2, fullName: 'Jane Smith', occupation: 'Designer', createdAt: [2023, 1, 1], seats: [], seatIds: [1] },
    { id: 3, fullName: 'Bob Johnson', occupation: 'Manager', createdAt: [2023, 1, 1], seats: [], seatIds: [2] }
  ];

  beforeEach(async () => {
    const floorServiceSpy = jasmine.createSpyObj('FloorService', ['loadFloor'], {
      floors: signal([mockFloor]),
      selectedFloor: signal(mockFloor)
    });

    const employeeServiceSpy = jasmine.createSpyObj('EmployeeService', ['getEmployeesByIds']);
    
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isAdmin']);
    authServiceSpy.isAdmin.and.returnValue(true); // Mock as admin for testing
    
    // Create dialog spy with required properties
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open'], {
      openDialogs: [],
      afterAllClosed: of(undefined),
      _afterOpenedSubject: { next: jasmine.createSpy('next') }
    });
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [
        FloorPlansComponent,
        NoopAnimationsModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'dashboard', component: FloorPlansComponent },
          { path: '**', redirectTo: 'dashboard' }
        ]),
        { provide: FloorService, useValue: floorServiceSpy },
        { provide: EmployeeService, useValue: employeeServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MAT_DIALOG_DATA, useValue: {} }
      ]
    })
    .overrideComponent(FloorPlansComponent, {
      remove: { imports: [MatDialogModule, MatSnackBarModule] },
      add: { 
        providers: [
          { provide: MatDialog, useValue: dialogSpy },
          { provide: MatSnackBar, useValue: snackBarSpy }
        ]
      }
    })
    .compileComponents();

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

  it('should load floor when floor is selected', async () => {
    floorService.loadFloor.and.returnValue(Promise.resolve());

    // Initialize component
    await component.ngOnInit();
    
    // Reset spy calls before setting floor value
    floorService.loadFloor.calls.reset();

    // Set floor selection to trigger loading
    component.selectedFloorControl.setValue(1);

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify that floor was loaded
    expect(floorService.loadFloor).toHaveBeenCalledWith(1);
  });



  it('should open unassign seat dialog when employee is clicked', () => {
    const mockEvent = new Event('click');
    spyOn(mockEvent, 'stopPropagation');
    
    const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed'], {
      componentInstance: {},
      id: 'test-dialog-id'
    });
    // Return false so it doesn't trigger the unassign API call
    dialogRef.afterClosed.and.returnValue(of(false));
    
    // Simplified mock
    dialogSpy.open.and.returnValue(dialogRef);

    component.onEmployeeClick(mockEvent, 1, 'John Doe', 1);

    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(dialogSpy.open).toHaveBeenCalled();
  });

  it('should unassign seat when dialog confirms', (done) => {
    const mockEvent = new Event('click');
    
    const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed'], {
      componentInstance: {},
      id: 'test-dialog-id'
    });
    dialogRef.afterClosed.and.returnValue(of(true));
    
    // Simplified mock
    dialogSpy.open.and.returnValue(dialogRef);

    floorService.loadFloor.and.returnValue(Promise.resolve());
    employeeService.getEmployeesByIds.and.returnValue(of(mockEmployees));

    component.onEmployeeClick(mockEvent, 1, 'John Doe', 1);

    // Verify unassign request
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/employees/1/seats/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});

    // Wait for async operations to complete
    setTimeout(() => {
      expect(snackBarSpy.open).toHaveBeenCalledWith('Seat unassigned successfully', 'Close', { duration: 3000 });
      done();
    }, 0);
  });

  it('should delete seat when delete dialog confirms', (done) => {
    const mockEvent = new Event('click');
    
    const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed'], {
      componentInstance: {},
      id: 'test-dialog-id'
    });
    dialogRef.afterClosed.and.returnValue(of(true));
    
    // Simplified mock
    dialogSpy.open.and.returnValue(dialogRef);

    floorService.loadFloor.and.returnValue(Promise.resolve());
    employeeService.getEmployeesByIds.and.returnValue(of(mockEmployees));

    component.onDeleteClick(mockEvent, 1, 'A001-01');

    // Verify delete request
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/seats/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});

    // Wait for async operations to complete
    setTimeout(() => {
      expect(snackBarSpy.open).toHaveBeenCalledWith('Seat deleted successfully', 'Close', { duration: 3000 });
      done();
    }, 0);
  });

  it('should create seat when add dialog confirms', (done) => {
    const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed'], {
      componentInstance: {},
      id: 'test-dialog-id'
    });
    dialogRef.afterClosed.and.returnValue(of('A001-03'));
    
    // Simplified mock
    dialogSpy.open.and.returnValue(dialogRef);

    floorService.loadFloor.and.returnValue(Promise.resolve());
    employeeService.getEmployeesByIds.and.returnValue(of(mockEmployees));
    component.selectedFloorControl.setValue(1);

    component.onAddClick(1);

    // Verify create request
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/seats`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      seatNumber: 'A001-03',
      room: { id: 1 }
    });
    req.flush({});

    // Wait for async operations to complete
    setTimeout(() => {
      expect(snackBarSpy.open).toHaveBeenCalledWith('Seat created successfully', 'Close', { duration: 3000 });
      done();
    }, 0);
  });

  it('should check if room is empty correctly', () => {
    const emptyRoom: Room = {
      ...mockFloor.rooms[0],
      seats: [
        { ...mockFloor.rooms[0].seats[0], occupied: false, employees: [] },
        { ...mockFloor.rooms[0].seats[1], occupied: false, employees: [] }
      ]
    } as Room;

    expect(component.isRoomEmpty(emptyRoom)).toBe(true);
    expect(component.isRoomEmpty(mockFloor.rooms[0])).toBe(false);
  });

  // Error scenario tests
  it('should handle error when unassigning seat fails', (done) => {
    spyOn(console, 'error'); // Spy on console.error to prevent error output in tests
    
    const mockEvent = new Event('click');
    
    const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed'], {
      componentInstance: {},
      id: 'test-dialog-id'
    });
    dialogRef.afterClosed.and.returnValue(of(true));
    
    dialogSpy.open.and.returnValue(dialogRef);

    component.onEmployeeClick(mockEvent, 1, 'John Doe', 1);

    // Verify unassign request and respond with error
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/employees/1/seats/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Unassign failed' }, { status: 500, statusText: 'Server Error' });

    // Wait for async operations to complete
    setTimeout(() => {
      expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to unassign seat', 'Close', {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      expect(console.error).toHaveBeenCalled();
      done();
    }, 0);
  });

  it('should handle error when deleting seat fails', (done) => {
    const mockEvent = new Event('click');
    
    const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed'], {
      componentInstance: {},
      id: 'test-dialog-id'
    });
    dialogRef.afterClosed.and.returnValue(of(true));
    
    dialogSpy.open.and.returnValue(dialogRef);
    
    component.onDeleteClick(mockEvent, 1, 'A001-01');

    // Verify delete request and respond with error
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/seats/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Delete failed' }, { status: 500, statusText: 'Server Error' });

    // Wait for async operations to complete
    setTimeout(() => {
      expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to delete seat', 'Close', {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      done();
    }, 0);
  });

  it('should handle error when creating seat fails', (done) => {
    const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed'], {
      componentInstance: {},
      id: 'test-dialog-id'
    });
    dialogRef.afterClosed.and.returnValue(of('A001-03'));
    
    dialogSpy.open.and.returnValue(dialogRef);
    
    component.onAddClick(1);

    // Verify create request and respond with error
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/seats`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      seatNumber: 'A001-03',
      room: { id: 1 }
    });
    req.flush({ message: 'Create failed' }, { status: 500, statusText: 'Server Error' });

    // Wait for async operations to complete
    setTimeout(() => {
      expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to create seat', 'Close', {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      done();
    }, 0);
  });

  it('should handle error when floor loading fails', async () => {
    // Spy on console.error to verify error handling
    spyOn(console, 'error');
    
    // Set up component with initial value
    component.selectedFloorControl.setValue(null);
    fixture.detectChanges();

    // Mock floor service to reject
    const error = new Error('Failed to load floor');
    floorService.loadFloor.and.returnValue(Promise.reject(error));

    // Trigger floor selection change
    component.selectedFloorControl.setValue(1);

    // Wait for async operations
    await fixture.whenStable();

    // Verify that loadFloor was called
    expect(floorService.loadFloor).toHaveBeenCalledWith(1);
    
    // Verify that loading is set to false after error
    expect(component.loading).toBe(false);
    
    // Verify that error was logged to console
    expect(console.error).toHaveBeenCalledWith('Error loading floor:', error);
  });

});