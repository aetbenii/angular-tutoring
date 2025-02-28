import { Component, OnInit } from '@angular/core';
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
import { catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

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
export class OfficesComponent implements OnInit {
  loading = false;
  error: string | null = null;
  selectedFloorControl = new FormControl<number | null>(null);
  floors;
  reservingForEmployee: { id: number; name: string } | null = null;

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
    this.route.queryParams.subscribe(params => {
      if (params['employeeId'] && params['employeeName']) {
        this.reservingForEmployee = {
          id: parseInt(params['employeeId']),
          name: params['employeeName']
        };
        console.log('Employee context set:', this.reservingForEmployee);
      }
    });

    // Handle floor selection changes
    this.selectedFloorControl.valueChanges.subscribe(floorNumber => {
      if (floorNumber !== null) {
        this.floorService.loadFloor(floorNumber);
      }
    });

    // Set initial floor selection
    const currentFloors = this.floors();
    if (currentFloors.length > 0 && this.selectedFloorControl.value === null) {
      this.selectedFloorControl.setValue(currentFloors[0].floorNumber);
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
          return EMPTY;
        })
      ).subscribe(seat => {
        if (seat) {
          this.dialog.open(SeatInfoDialogComponent, {
            data: seat,
            width: '400px',
            panelClass: 'seat-info-dialog',
            autoFocus: false,
            restoreFocus: false
          });
        }
      });
    }
  }
}
