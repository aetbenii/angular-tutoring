import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Floor } from '../interfaces/floor.interface';
import { Observable } from 'rxjs';
import { catchError, retry, throwError, map, tap } from 'rxjs';
import { Seat } from '../interfaces/seat.interface';
import { Room } from '../interfaces/room.interface';
import { environment } from '../../environments/environment';

/**
 * Service responsible for managing floor data and seat occupancy state.
 * Uses Angular's signals for reactive state management and HttpClient for API communication.
 */
@Injectable({
  providedIn: 'root'
})
export class FloorService {
  /** Base URL for the API endpoints */
  private apiUrl = environment.apiBaseUrl;

  /** Signal holding the currently selected floor's data */
  private selectedFloorSignal = signal<Floor | null>(null);

  /** Signal holding the list of all available floors */
  private floorsSignal = signal<Floor[]>([]);

  constructor(private http: HttpClient) {
    // Load the list of floors when the service is initialized
    this.loadFloors();
  }

  /**
   * Returns a readonly signal of the currently selected floor
   * @returns A readonly signal containing the current floor data or null if no floor is selected
   */
  get selectedFloor() {
    return this.selectedFloorSignal.asReadonly();
  }

  /**
   * Returns a readonly signal of all available floors
   * @returns A readonly signal containing the array of all floors
   */
  get floors() {
    return this.floorsSignal.asReadonly();
  }

  /**
   * Handles HTTP errors and provides consistent error reporting
   * @param error The HTTP error response
   * @returns An observable that emits the error message
   */
  private handleError(error: HttpErrorResponse) {
    console.error('An error occurred:', error);
    if (error.status === 0) {
      // Client-side or network error occurred
      console.error('Client-side error:', error.error);
    } else {
      // Backend returned an unsuccessful response code
      console.error(`Backend returned code ${error.status}, body was:`, error.error);
    }
    return throwError(() => new Error('Something went wrong; please try again later.'));
  }

  /**
   * Fetches the list of all available floors from the API
   * Updates the floorsSignal with the retrieved data
   */
  private loadFloors() {
    this.getFloors$().subscribe({
      next: (floors) => this.floorsSignal.set(floors),
      error: () => this.floorsSignal.set([])
    });
  }

  /**
   * Exposes an Observable to fetch all floors
   */
  getFloors$(): Observable<Floor[]> {
    return this.http.get<Floor[]>(`${this.apiUrl}/floors`, {
      headers: { 'Accept': 'application/json' },
      withCredentials: true
    }).pipe(
      retry(1),
      catchError(this.handleError),
      map((floors) => [...floors].sort((a, b) => a.id - b.id))
    );
  }

  /**
   * Loads detailed information for a specific floor
   * @param floorNumber The number of the floor to load
   * Updates the selectedFloorSignal with the retrieved floor data
   */
  loadFloor(floorNumber: number): Promise<void> {
    // Deprecated shim: prefer selectFloor$(floorNumber).toPromise() pattern in components
    return new Promise((resolve, reject) => {
      this.selectFloor$(floorNumber).subscribe({
        next: () => resolve(),
        error: (error) => {
          this.selectedFloorSignal.set(null);
          reject(error);
        }
      });
    });
  }

  /**
   * Fetch a specific floor with embedded relations as an Observable
   */
  getFloor$(floorNumber: number): Observable<Floor> {
    return this.http.get<Floor>(`${this.apiUrl}/floors/${floorNumber}/embed`, {
      headers: { 'Accept': 'application/json' },
      withCredentials: true
    }).pipe(
      retry(1),
      catchError(this.handleError),
      map((floor) => this.normalizeFloor(floor))
    );
  }

  /**
   * Fetch and set selected floor as a side-effect; returns the stream for composition
   */
  selectFloor$(floorNumber: number): Observable<Floor> {
    return this.getFloor$(floorNumber).pipe(
      tap((floor) => this.selectedFloorSignal.set(floor))
    );
  }

  /**
   * Normalize incoming floor data (sorting, etc.)
   */
  private normalizeFloor(floor: Floor): Floor {
    const sortedRooms: Room[] = [...floor.rooms].sort((a, b) => {
      const aNum = parseInt(a.roomNumber as unknown as string);
      const bNum = parseInt(b.roomNumber as unknown as string);
      return aNum - bNum;
    });
    return { ...floor, rooms: sortedRooms };
  }

  /**
   * Toggles the occupancy status of a specific seat
   * @param roomId The ID of the room containing the seat
   * @param seatId The ID of the seat to toggle
   * Updates the selectedFloorSignal with the modified seat state
   */
  toggleSeatOccupancy(roomId: number, seatId: number) {
    this.selectedFloorSignal.update(floor => {
      if (!floor) return null;
      
      const updatedRooms = floor.rooms.map(room => {
        if (room.id === roomId) {
          const updatedSeats = room.seats.map(seat => {
            if (seat.id === seatId) {
              return { ...seat, occupied: !seat.occupied };
            }
            return seat;
          });
          return { ...room, seats: updatedSeats };
        }
        return room;
      });

      return { ...floor, rooms: updatedRooms };
    });
  }

  /**
   * Granular state update helpers for seats/rooms
   */
  updateSeatInRoom(roomId: number, seatId: number, seatPatch: Partial<Seat>): void {
    this.selectedFloorSignal.update(current => {
      if (!current) return null;
      const rooms = current.rooms.map(room => {
        if (room.id !== roomId) return room;
        const seats = room.seats.map(seat => seat.id === seatId ? { ...seat, ...seatPatch } : seat);
        return { ...room, seats };
      });
      return { ...current, rooms };
    });
  }

  deleteSeatFromRoom(roomId: number, seatId: number): void {
    this.selectedFloorSignal.update(current => {
      if (!current) return null;
      const rooms = current.rooms.map(room => {
        if (room.id !== roomId) return room;
        const seats = room.seats.filter(seat => seat.id !== seatId);
        return { ...room, seats };
      });
      return { ...current, rooms };
    });
  }

  addSeatToRoom(roomId: number, seat: Seat): void {
    this.selectedFloorSignal.update(current => {
      if (!current) return null;
      const rooms = current.rooms.map(room => {
        if (room.id !== roomId) return room;
        const seats = [...room.seats, seat].sort((a, b) => a.id - b.id);
        return { ...room, seats };
      });
      return { ...current, rooms };
    });
  }

  getSeatInfo(seatId: number): Observable<Seat> {
    return this.http.get<Seat>(`${this.apiUrl}/seats/${seatId}`).pipe(
      retry(1),
      catchError((error) => {
        console.error('Error fetching seat info:', error);
        return throwError(() => error);
      })
    );
  }
}
