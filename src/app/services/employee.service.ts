import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { Seat } from '../interfaces/seat.interface';
import { Employee } from '../interfaces/employee.interface';

export interface EmployeeResponse {
  content: Employee[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
}

const API_BASE_URL = 'http://localhost:8080/api';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private apiUrl = `${API_BASE_URL}/employees`;
  
  constructor(private http: HttpClient) {}

  getEmployees(
    searchTerm = '',
    pageIndex = 0,
    pageSize = 5
  ): Observable<EmployeeResponse> {
    let params = new HttpParams()
      .set('page', pageIndex.toString())
      .set('size', pageSize.toString());

    if (searchTerm) {
      params = params.set('search', searchTerm);
    }

    // Use the search endpoint
    const url = `${this.apiUrl}/search`;
    
    return this.http.get<EmployeeResponse>(url, { params }).pipe(
      retry(1),
      catchError((error) => {
        console.warn('Error fetching employees:', error);
        return throwError(() => error);
      })
    );
  }

  getEmployeeById(id: number): Observable<Employee> {
    return this.http.get<Employee>(`${this.apiUrl}/${id}`).pipe(
      retry(1),
      catchError((error) => {
        console.error('Error fetching employee:', error);
        return throwError(() => error);
      })
    );
  }

  createEmployee(employee: Omit<Employee, 'id' | 'createdAt'>): Observable<Employee> {
    return this.http.post<Employee>(this.apiUrl, employee).pipe(
      catchError((error) => {
        console.error('Error creating employee:', error);
        return throwError(() => error);
      })
    );
  }

  updateEmployee(id: number, employee: Omit<Employee, 'id' | 'createdAt'>): Observable<Employee> {
    return this.http.put<Employee>(`${this.apiUrl}/${id}`, employee).pipe(
      catchError((error) => {
        console.error('Error updating employee:', error);
        return throwError(() => error);
      })
    );
  }

  deleteEmployee(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.error('Error deleting employee:', error);
        return throwError(() => error);
      })
    );
  }

  getEmployeeSeats(employeeId: number): Observable<Seat[]> {
    return this.http.get<Seat[]>(`${this.apiUrl}/${employeeId}/seats`).pipe(
      retry(1),
      catchError((error) => {
        console.error('Error fetching employee seats:', error);
        return throwError(() => error);
      })
    );
  }

  assignSeat(employeeId: number, seatId: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${employeeId}/seats/${seatId}`, {}).pipe(
      catchError((error) => {
        console.error('Error assigning seat:', error);
        return throwError(() => error);
      })
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
