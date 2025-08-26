import { Component, OnInit, OnDestroy, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RoomGridComponent } from '../room-grid/room-grid.component';
import { FloorService } from '../../services/floor.service';
import { EmployeeService } from '../../services/employee.service';
import { SeatInfoDialogComponent } from './seat-info-dialog/seat-info-dialog.component';
import { catchError, map, switchMap } from 'rxjs/operators';
import { EMPTY, forkJoin, of } from 'rxjs';
import { Employee } from '../../interfaces/employee.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-offices',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    ReactiveFormsModule,
    RoomGridComponent
  ],
  templateUrl: './offices.component.html',
  styleUrls: ['./offices.component.scss']
})
export class OfficesComponent implements OnInit, OnDestroy {
  loading = false;
  error: string | null = null;
  selectedFloorControl = new FormControl<number | null>(null);
  floors;
  reservingForEmployee: { id: number; name: string } | null = null;
  employees: Employee[] = [];
  private destroyRef = inject(DestroyRef);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private floorService: FloorService,
    private employeeService: EmployeeService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.floors = floorService.floors;
  }

  ngOnInit() {
    // Check if we're reserving a seat for an employee
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
      if (params['employeeId'] && params['employeeName']) {
        this.reservingForEmployee = {
          id: parseInt(params['employeeId']),
          name: params['employeeName']
        };
        console.log('Employee context set:', this.reservingForEmployee);
      }
    });

    // Handle floor selection changes
    this.selectedFloorControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(async floorNumber => {
      if (floorNumber !== null) {
        console.log('Loading floor:', floorNumber);
        this.loading = true;
        this.error = null;
        try {
          await this.floorService.loadFloor(floorNumber);
          console.log('Floor loaded successfully');
        } catch (error) {
          console.error('Error loading floor:', error);
          this.error = 'Error loading floor data';
        } finally {
          this.loading = false;
        }
      }
    });

    // Set initial floor selection when floors are loaded
    // Use an effect to react to floors changes
    const checkFloorsAndSetInitial = () => {
      const currentFloors = this.floors();
      console.log('Available floors:', currentFloors);
      if (currentFloors.length > 0 && this.selectedFloorControl.value === null) {
        console.log('Setting initial floor to:', currentFloors[0].floorNumber);
        this.selectedFloorControl.setValue(currentFloors[0].floorNumber);
      } else if (currentFloors.length === 0) {
        console.warn('No floors available yet');
      }
    };

    // Check immediately and then watch for changes
    checkFloorsAndSetInitial();
    
    // Watch for floors signal changes and retry if floors become available
    this.intervalId = setInterval(() => {
      if (this.floors().length > 0 && this.selectedFloorControl.value === null) {
        checkFloorsAndSetInitial();
        clearInterval(this.intervalId!);
        this.intervalId = null;
      }
    }, 250);

    // Clean up the interval after 10 seconds to avoid memory leaks
    setTimeout(() => {
      if (this.intervalId) {
        clearInterval(this.intervalId!);
        this.intervalId = null;
      }
    }, 10000);
  }

  ngOnDestroy() {
    // Clean up interval if still running
    if (this.intervalId) {
      clearInterval(this.intervalId!);
      this.intervalId = null;
    }
  }

  onSeatSelected(seatId: number) {
    console.log('Seat selected:', seatId);
    console.log('Current employee context:', this.reservingForEmployee);
    
    if (this.reservingForEmployee) {
      this.loading = true;
      console.log('Making API call to assign seat:', {
        employeeId: this.reservingForEmployee.id,
        seatId: seatId
      });
      
      this.employeeService.assignSeat(this.reservingForEmployee.id, seatId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            console.log('Seat assignment successful');
            this.snackBar.open(
              `Seat assigned to ${this.reservingForEmployee?.name}`,
              'Close',
              { duration: 5000 }
            );
            // Reload the current floor to update the seat status
            const currentFloor = this.selectedFloorControl.value;
            if (currentFloor !== null) {
              this.floorService.loadFloor(currentFloor);
            }
            this.loading = false;
            this.reservingForEmployee = null;
          },
          error: (error) => {
            console.error('Seat assignment failed:', error);
            this.snackBar.open(
              `Failed to assign seat: ${error.message}`,
              'Close',
              { duration: 5000 }
            );
            this.loading = false;
          }
        });
    } else {
      // Show seat info dialog without triggering loading state
      this.floorService.getSeatInfo(seatId).pipe(
        catchError((error: Error) => {
          this.snackBar.open(
            `Failed to fetch seat information: ${error.message}`,
            'Close',
            { duration: 5000 }
          );
          this.employees = [];
          return EMPTY;
        }),
        switchMap(seat => {
          if(!seat){
            return of({seat: null, employees:[]})
          }
          if(seat.employeeIds.length > 0){
            const employeeObservables = seat.employeeIds.map(id =>
              this.employeeService.getEmployeeById(id).pipe(
                catchError(err => {
                  console.warn(`Could not fetch employee with ID ${id}: `, err);
                  return of(null);
                })
              )
            );
            if(employeeObservables.length === 0){
              return of({seat:seat, employees: []});
            }
            return forkJoin(employeeObservables).pipe(
              map(employeesArray => {
                const validEmployees = employeesArray.filter(employee => 
                  employee !== null);
                  
                  return {seat: seat, employees: validEmployees};
              }),
              catchError(err => {
                console.error(`Èrror during forkJoin for employees:`, err);
                this.snackBar.open(
                  `Could not load some employee details.`,
                  `Close`,
                  {duration: 3000}
                );
                return of({seat: seat, employees: []});
              })
            );
          } else {
            return of({seat:seat, employees: []});
          }
        })
      ).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        console.log(result);
        if (result && result.seat) {
          this.employees = result.employees;
          this.dialog.open(SeatInfoDialogComponent, {
            data: result,
            width: '400px',
            panelClass: 'seat-info-dialog',
            autoFocus: false,
            restoreFocus: false
          });
        } else if (result && result == null) {
          console.warn(`Seat with ID ${seatId} not found or initial fetch failed.`);
            this.employees = []; // Sicherstellen, dass Array leer ist
        }
      });
    }
  }
}
