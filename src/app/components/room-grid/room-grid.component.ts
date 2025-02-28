import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FloorService } from '../../services/floor.service';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-room-grid',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule
  ],
  templateUrl: './room-grid.component.html',
  styleUrls: ['./room-grid.component.scss']
})
export class RoomGridComponent {
  @Input() floorNumber!: number;
  @Output() seatSelected = new EventEmitter<number>();
  selectedFloor;

  constructor(private floorService: FloorService) {
    this.selectedFloor = this.floorService.selectedFloor;
  }

  onSeatClick(roomId: number, seatId: number) {
    this.seatSelected.emit(seatId);
  }
}
