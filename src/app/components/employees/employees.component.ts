import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EmployeeSeatsDialogComponent } from './employee-seats-dialog/employee-seats-dialog.component';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { EmployeeService, Employee } from '../../services/employee.service';
import { debounceTime, distinctUntilChanged, catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatDialogModule
  ],
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.scss']
})
export class EmployeesComponent implements AfterViewInit {
  @ViewChild('employeesGrid') employeesGrid!: ElementRef;
  @ViewChild('searchInput') searchInput!: ElementRef;

  employees: Employee[] = [];
  loading = false;
  currentPage = 0;
  pageSize = 24;
  totalElements = 0;
  totalPages = 0;
  searchControl = new FormControl('');
  error: string | null = null;

  constructor(
    private employeeService: EmployeeService,
    private dialog: MatDialog
  ) {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.resetAndSearch();
    });
  }

  ngAfterViewInit() {
    this.loadEmployees();
    
    // Create a ResizeObserver to watch for container size changes
    const resizeObserver = new ResizeObserver(() => {
      // Debounce the resize callback to prevent multiple rapid calls
      if (this.resizeTimeout) {
        window.clearTimeout(this.resizeTimeout);
      }
      this.resizeTimeout = window.setTimeout(() => {
        this.checkAndLoadMore();
      }, 100);
    });
    
    // Start observing the employees grid
    resizeObserver.observe(this.employeesGrid.nativeElement);
  }

  private resizeTimeout: number | null = null;

  private resetAndSearch(): void {
    this.employees = [];
    this.currentPage = 0;
    this.totalElements = 0;
    this.totalPages = 0;
    this.error = null;
    this.loadEmployees();
  }

  private checkAndLoadMore(): void {
    if (!this.employeesGrid) return;
    
    const element = this.employeesGrid.nativeElement;
    // Add a small buffer to account for rounding differences across browsers
    const hasRoomForMore = element.scrollHeight <= (element.clientHeight + 1);
    
    // Only load more if we have room, not currently loading, no errors, and more pages available
    if (hasRoomForMore && 
        !this.loading &&
        !this.error && 
        this.currentPage < this.totalPages && 
        this.employees.length > 0) {
      // Add a small delay to ensure DOM has settled
      setTimeout(() => {
        this.loadEmployees();
      }, 0);
    }
  }

  private loadEmployees(): void {
    if (this.currentPage >= this.totalPages && this.totalPages !== 0) return;
    if (this.loading) return;

    this.loading = true;
    this.error = null;

    this.employeeService.getEmployees(
      this.searchControl.value || '',
      this.currentPage,
      this.pageSize
    ).pipe(
      catchError(error => {
        this.error = error.message;
        this.loading = false;
        return EMPTY;
      })
    ).subscribe(response => {
      this.employees = [...this.employees, ...response.content];
      this.totalElements = response.totalElements;
      this.totalPages = response.totalPages;
      this.currentPage = response.currentPage + 1;
      this.pageSize = response.size;
      this.loading = false;
      
      // Check if we need to load more after the current batch is loaded
      this.checkAndLoadMore();
    });
  }

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const nearBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 100;

    if (nearBottom && !this.loading && !this.error && this.currentPage < this.totalPages) {
      this.loadEmployees();
    }
  }

  openSeatsDialog(employee: Employee): void {
    this.dialog.open(EmployeeSeatsDialogComponent, {
      data: employee,
      width: '500px'
    });
  }
}
