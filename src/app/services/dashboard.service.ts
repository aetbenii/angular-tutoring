import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, retry, shareReplay } from 'rxjs/operators';
import { DashboardStats } from '../interfaces/dashboard.interface';

const API_BASE_URL = 'http://localhost:8080/api';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = `${API_BASE_URL}/stats`;

  // Mock data - replace with actual API calls in production
  private mockStats: DashboardStats = {
    totalEmployees: 150,
    totalFloors: 4,
    totalOffices: 40,
    totalSeats: 200,
    occupancyRate: 75,
    officesPerFloor: [
      { floorNumber: 1, officeCount: 12 },
      { floorNumber: 2, officeCount: 10 },
      { floorNumber: 3, officeCount: 8 },
      { floorNumber: 4, officeCount: 10 }
    ],
    seatsPerFloor: [
      { floorNumber: 1, seatCount: 60 },
      { floorNumber: 2, seatCount: 50 },
      { floorNumber: 3, seatCount: 40 },
      { floorNumber: 4, seatCount: 50 }
    ]
  };

  // Cached stats observable
  private stats$: Observable<DashboardStats> | null = null;

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<DashboardStats> {
    // If we already have a cached observable, return it
    if (this.stats$) {
      return this.stats$;
    }

    // Otherwise, create a new observable with caching
    this.stats$ = this.http.get<DashboardStats>(this.apiUrl).pipe(
      retry(1),
      catchError((error) => {
        console.warn('Error fetching stats from server, using mock data:', error);
        return of(this.mockStats);
      }),
      // Cache the last emitted value and share it among all subscribers
      shareReplay(1)
    );

    return this.stats$;
  }
} 