import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FloorService } from '../../services/floor.service';
import { MatButtonModule } from '@angular/material/button';
import { jsPDF } from 'jspdf';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { UnassignSeatDialogComponent } from '../unassign-seat-dialog/unassign-seat-dialog.component';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Floor } from '../../interfaces/floor.interface';
import { Room } from '../../interfaces/room.interface';
import { Signal } from '@angular/core';

@Component({
  selector: 'app-floor-plans',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './floor-plans.component.html',
  styleUrls: ['./floor-plans.component.scss']
})
export class FloorPlansComponent implements OnInit {
  loading = false;
  error: string | null = null;
  selectedFloorControl = new FormControl<number | null>(null);
  floors: Signal<Floor[]>;
  selectedFloor: Signal<Floor | null>;

  constructor(
    private floorService: FloorService,
    private dialog: MatDialog,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    this.floors = floorService.floors;
    this.selectedFloor = floorService.selectedFloor;
  }

  isRoomEmpty(room: Room): boolean {
    return !room.seats.some(seat => seat.occupied);
  }

  onEmployeeClick(event: Event, employeeId: number, employeeName: string, seatId: number): void {
    event.stopPropagation();
    const dialogRef = this.dialog.open(UnassignSeatDialogComponent, {
      width: '400px',
      data: { employeeId, employeeName }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.unassignSeat(employeeId, seatId);
      }
    });
  }

  private unassignSeat(employeeId: number, seatId: number): void {
    this.http.delete(`http://localhost:8080/api/employees/${employeeId}/unassign-seat/${seatId}`)
      .subscribe({
        next: () => {
          // Refresh the floor data
          const currentFloor = this.selectedFloorControl.value;
          if (currentFloor !== null) {
            this.floorService.loadFloor(currentFloor);
          }
          this.snackBar.open('Seat unassigned successfully', 'Close', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
        },
        error: (error) => {
          console.error('Error unassigning seat:', error);
          this.snackBar.open('Failed to unassign seat', 'Close', {
            duration: 5000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  ngOnInit(): void {
    // Handle floor selection changes
    this.selectedFloorControl.valueChanges.subscribe(floorNumber => {
      if (floorNumber !== null) {
        this.loading = true;
        this.error = null;
        this.floorService.loadFloor(floorNumber);
        this.loading = false;
      }
    });

    // Set initial floor selection
    const currentFloors = this.floors();
    if (currentFloors.length > 0 && this.selectedFloorControl.value === null) {
      this.selectedFloorControl.setValue(currentFloors[0].floorNumber);
    }
  }

  printRoomLabel(room: Room): void {
    // Create a new PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Add room header
    doc.setFontSize(20);
    doc.text(`${room.name} (Room ${room.roomNumber})`, pageWidth / 2, yPosition, { align: 'center' });

    // Add floor name
    yPosition += 10;
    doc.setFontSize(14);
    const floor = this.selectedFloor();
    if (floor) {
      doc.text(floor.name, pageWidth / 2, yPosition, { align: 'center' });
    }

    // Add employees list
    yPosition += 20;
    doc.setFontSize(12);

    room.seats.forEach(seat => {
      if (seat.employees) {
        seat.employees.forEach(employee => {
          const text = `${seat.seatNumber}: ${employee.fullName} - ${employee.occupation}`;
          doc.text(text, 20, yPosition);
          yPosition += 10;
        })
      }
    });

    // Save the PDF
    doc.save(`room-${room.roomNumber}-label.pdf`);
  }
} 