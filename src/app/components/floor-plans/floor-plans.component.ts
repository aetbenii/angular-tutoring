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
import { RouterModule } from '@angular/router';
import { EmployeeService } from '../../services/employee.service';
import { DeleteSeatDialogComponent } from './delete-seat-dialog/delete-seat-dialog.component';
import { AddSeatDialogComponent } from './add-seat-dialog/add-seat-dialog.component';

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
    MatSnackBarModule,
    RouterModule
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
    private snackBar: MatSnackBar,
    private employeeService: EmployeeService
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
        console.log(this.selectedFloor()?.rooms)
      }
    });
  }

  onDeleteClick(event: Event, seatId: number, seatNumber: string){
    event.stopPropagation();
    const dialogRef = this.dialog.open(DeleteSeatDialogComponent, {
      width: '400px',
      data: {
        seatId,
        seatNumber
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if(result){
        this.deleteSeat(seatId);
      }
    });
  }

  onAddClick(roomId: number){
    const dialogRef = this.dialog.open(AddSeatDialogComponent, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if(result){
        this.createSeat(result, roomId)
        console.log(result, roomId);
      }
    })
  }

  private createSeat(seatNumber: string, roomId: number): void {
  const seatData = {
    seatNumber: seatNumber,
    room: { id: roomId }
  };

  this.http.post('http://localhost:8080/api/seats', seatData)
    .subscribe({
      next: async () => {
        const currentFloor = this.selectedFloorControl.value;
        if (currentFloor !== null) {
          await this.floorService.loadFloor(currentFloor);
          const floor = this.selectedFloor();
          if (floor) {
            for (const room of floor.rooms) {
              room.seats = await this.enrichSeatsWithEmployees(room.seats);
            }
          }
        }
        this.snackBar.open('Seat created successfully', 'Close', {
          duration: 3000
        });
      },
      error: (error) => {
        console.error('Error creating seat:', error);
        this.snackBar.open('Failed to create seat', 'Close', {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
}


  private deleteSeat(seatId:number):void{
    this.http.delete(`http://localhost:8080/api/seats/${seatId}`)
      .subscribe({
        next: async () => {
          const currentFloor = this.selectedFloorControl.value;
          if (currentFloor !== null) {
            await this.floorService.loadFloor(currentFloor);
            const floor = this.selectedFloor();
            if (floor) {
              for (const room of floor.rooms) {
                room.seats = await this.enrichSeatsWithEmployees(room.seats);
              }
            }
          }
          this.snackBar.open('Seat deleted successfully', 'Close', {
            duration: 3000,
          });
        },
        error: (error) => {
          console.error('Error deleting seat:', error);
          this.snackBar.open('Failed to delete seat', 'Close', {
            duration: 5000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  private unassignSeat(employeeId: number, seatId: number): void {
    this.http.delete(`http://localhost:8080/api/employees/${employeeId}/seats/${seatId}`)
      .subscribe({
        next: async () => {
          // Refresh the floor data
          const currentFloor = this.selectedFloorControl.value;
          if (currentFloor !== null) {
            await this.floorService.loadFloor(currentFloor);
            const floor = this.selectedFloor();
            if (floor) {
              for (const room of floor.rooms) {
                room.seats = await this.enrichSeatsWithEmployees(room.seats);
              }
            }
          }
          this.snackBar.open('Seat unassigned successfully', 'Close', {
            duration: 3000,
            
            
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

  async ngOnInit(): Promise<void> {
    // Handle floor selection changes
    this.selectedFloorControl.valueChanges.subscribe(async floorNumber => {
      if (floorNumber !== null) {
        this.loading = true;
        this.error = null;
        await this.floorService.loadFloor(floorNumber);
        const floor = this.selectedFloor();
        if (floor) {
          for(const room of floor.rooms) {
            room.seats = await this.enrichSeatsWithEmployees(room.seats);
            room.seats = room.seats.sort((a, b) => a.id - b.id);
          }
          console.log('Enriched seats with employees:', floor.rooms);
        } 
        this.loading = false;
      }
    });

    // Set initial floor selection
    const currentFloors = this.floors();
    if (currentFloors.length > 0 && this.selectedFloorControl.value === null) {
      this.selectedFloorControl.setValue(currentFloors[0].floorNumber);
    }
  }

  private enrichSeatsWithEmployees(seats: any[]): Promise<any[]> {
  return Promise.all(seats.map(async seat => {
    if (seat.employeeIds && seat.employeeIds.length > 0) {
      const employees = await Promise.all(
        seat.employeeIds.map((id: number) => this.employeeService.getEmployeeById(id).toPromise())
      );
      return { ...seat, employees };
    } else {
      return { ...seat, employees: [] };
    }
  }));
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