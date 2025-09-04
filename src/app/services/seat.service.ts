import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { FloorService } from './floor.service';
import { Seat } from '../interfaces/seat.interface';

@Injectable({ providedIn: 'root' })
export class SeatService {
  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient, private floorService: FloorService) {}

  /**
   * Create a new seat in a room and update state
   */
  createSeat(roomId: number, seatNumber: string): Observable<Seat> {
    const payload = { seatNumber, room: { id: roomId } } as const;
    return this.http.post<Seat>(`${this.apiUrl}/seats`, payload, {
      withCredentials: true,
      headers: { 'Accept': 'application/json' }
    }).pipe(
      catchError(this.handleError),
      tap((seat) => {
        this.floorService.addSeatToRoom(roomId, seat);
      })
    );
  }

  /**
   * Delete a seat and update state
   */
  deleteSeat(roomId: number, seatId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/seats/${seatId}`, {
      withCredentials: true,
      headers: { 'Accept': 'application/json' }
    }).pipe(
      catchError(this.handleError),
      tap(() => this.floorService.deleteSeatFromRoom(roomId, seatId))
    );
  }

  /**
   * Unassign an employee from a seat and update state
   */
  unassignSeat(employeeId: number, seatId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/employees/${employeeId}/seats/${seatId}`, {
      withCredentials: true,
      headers: { 'Accept': 'application/json' }
    }).pipe(
      catchError(this.handleError),
      tap(() => {
        // Update seat's employees to empty without reload; need roomId to target correctly
        const currentFloor = this.floorService.selectedFloor();
        if (!currentFloor) return;
        for (const room of currentFloor.rooms) {
          const seat = room.seats.find(s => s.id === seatId);
          if (seat) {
            this.floorService.updateSeatInRoom(room.id, seatId, { 
              employees: [], 
              employeeIds: [],
              occupied: false 
            });
            break;
          }
        }
      })
    );
  }

  private handleError(error: unknown) {
    console.error('SeatService error:', error);
    return throwError(() => error);
  }
}


