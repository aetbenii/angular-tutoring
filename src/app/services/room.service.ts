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

    loadRoom(roomId: number){
        this.http.get<Room>(`${this.apiUrl}/rooms/${roomId}`, {
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
            next: (room) => {
                console.log('Received room data:', room);

                const sortedRoom = {
                    ...room,
                    seats: [...room.seats].sort((a, b) => {
                        const aNum = parseInt(a.seatNumber);
                        const bNum = parseInt(b.seatNumber);
                        return aNum - bNum;
                    })
                };
                this.selectedRoomSignal.set(sortedRoom);
            },
            error: (error) => {
                console.error('Error loading room:', error);
                this.selectedRoomSignal.set(null);
            }
        });
    }

    updateRoom(id: number, updates: any){
        return this.http.patch(`${this.apiUrl}/rooms/${id}/geometry`, updates, {
          headers: { 'Content-Type': 'application/json' }
        }).pipe(
          catchError(error => {
            console.error('Error updating room:', error);
            return throwError(() => new Error('Update fehlgeschlagen'));
          })
        ).subscribe({
            next: (response) => {
              console.log('Room updated successfully:', response);
            },
            error: (error) => {
              console.error('Update failed:', error);
            }
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

