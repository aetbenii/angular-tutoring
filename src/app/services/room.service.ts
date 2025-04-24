import { Injectable, Signal, signal } from "@angular/core";
import { Room } from "../interfaces/room.interface";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { catchError, Observable, retry, throwError } from "rxjs";
import { Seat } from "../interfaces/seat.interface";

@Injectable({
    providedIn: 'root'
})
export class RoomService {

    private apiUrl = 'http://localhost:8080/api';

    private selectedRoomSignal = signal<Room | null>(null);

    private roomSignal = signal<Room[]>([]);

    constructor(private http: HttpClient) {
        
    }

    get selectedRoom(){
        return this.selectedRoomSignal.asReadonly();
    }

    get rooms() {
        return this.roomSignal.asReadonly();
    }

    private handleError(error: HttpErrorResponse){
        console.error('An error occurred:', error);
        if(error.status === 0) {
            console.error('Client-side error: ', error.error);
        } else {
            console.error(`Backend returned code ${error.status}, body was:`, error.error);
        }
        return throwError(() => new Error('Something went wrong; please try again later'));
    }

    private loadRooms() {
        this.http.get<Room[]>(`${this.apiUrl}/rooms`, {
            headers: {
                'Accept': 'application/json'
            },
            withCredentials: true
        })
        .pipe(
            retry(1),
            catchError(this.handleError)
        )
        .subscribe({
            next:(rooms) => {
                console.log('Received rooms data:', rooms);
                this.roomSignal.set(rooms);
            },
            error: (error) => {
                console.error('Error loading rooms', error);
                this.roomSignal.set([]);
            }
        });
    }

    loadRoom(roomId: number): Observable<any> {
        return this.http.get<Room>(`${this.apiUrl}/rooms/${roomId}`, {
            headers: {
                'Accept': 'application/json'
            },
            withCredentials: true
        })
        .pipe(
            retry(1),
            catchError(this.handleError)
        )
    }

    updateRoom(id: number, updates: any): Observable<any> {
  return this.http.patch(`${this.apiUrl}/rooms/${id}/geometry`, updates, {
    headers: { 'Content-Type': 'application/json' }
  }).pipe(
    catchError(error => {
      console.error('Error updating room:', error);
      return throwError(() => new Error('Update fehlgeschlagen'));
    })
  );
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

    getSeatsByRoomId(roomId: number): Observable<Seat[]> {
        return this.http.get<Seat[]>(`${this.apiUrl}/rooms/${roomId}/seats`).pipe(
            retry(1),
            catchError((error) => {
                console.error('Error fetching seats:', error);
                return throwError(() => error);
            })
        );
    }
}

