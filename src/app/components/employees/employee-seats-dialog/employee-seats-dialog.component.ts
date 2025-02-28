import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { Employee, EmployeeService } from '../../../services/employee.service';
import { Seat } from '../../../interfaces/seat.interface';

@Component({
  selector: 'app-employee-seats-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './employee-seats-dialog.component.html',
  styleUrls: ['./employee-seats-dialog.component.scss']
})
export class EmployeeSeatsDialogComponent {
  seats: Seat[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private dialogRef: MatDialogRef<EmployeeSeatsDialogComponent>,
    private employeeService: EmployeeService,
    private router: Router,
    @Inject(MAT_DIALOG_DATA) public employee: Employee
  ) {
    this.loadEmployeeSeats();
  }

  private loadEmployeeSeats(): void {
    this.employeeService.getEmployeeSeats(this.employee.id)
      .subscribe({
        next: (seats) => {
          this.seats = seats;
          this.loading = false;
        },
        error: (error) => {
          this.error = error.message;
          this.loading = false;
        }
      });
  }

  close(): void {
    this.dialogRef.close();
  }

  reserveSeat(): void {
    this.dialogRef.close();
    this.router.navigate(['/offices'], { 
      queryParams: { 
        employeeId: this.employee.id,
        employeeName: this.employee.fullName
      } 
    });
  }
}
