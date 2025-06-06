import { Component, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
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
import * as d3 from 'd3';
import { RoomService } from '../../services/room.service';
import { Seat } from '../../interfaces/seat.interface';
import { SeatInfoDialogComponent } from '../offices/seat-info-dialog/seat-info-dialog.component';
import { EmployeeService } from '../../services/employee.service';
import { setActiveConsumer } from '@angular/core/primitives/signals';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { catchError, EMPTY, Observable, BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-floor-map',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './floor-map.component.html',
  styleUrls: ['./floor-map.component.scss']
})
export class FloorMapComponent implements OnInit {
  @ViewChild('canvasContainer', { static: false }) canvasContainer!: ElementRef;

  private floorService = inject(FloorService);
  private svg: any;
  private g: any;
  private zoom: any;
  private apiUrl = 'http://localhost:8080/api';

  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  searchControl = new FormControl<string>('');
  selectedFloorControl = new FormControl<number | null>(null);
  floors = this.floorService.floors;
  options: string[] = [];
  filteredNames = new BehaviorSubject<{id: number, fullName: string}[]>([]);
  selectedFloor = this.floorService.selectedFloor;

  constructor(
    private employeeService: EmployeeService,
  ) {}

  ngOnInit(): void {
    this.selectedFloorControl.valueChanges.subscribe(floorNumber => {
      if (floorNumber !== null) {
        this.loading.set(true);

        this.floorService.loadFloor(floorNumber).then(() => {
          this.loadFloorPlan(floorNumber);
          this.loading.set(false);
        }).catch(error => {
          this.loading.set(false);
          this.error.set('Fehler beim Laden des Floors');
          console.error('Error loading floor:', error);
        });
      }
    });

    const currentFloors = this.floors();
    if (currentFloors.length > 0) {
      this.selectedFloorControl.setValue(currentFloors[0].floorNumber);
    }

    this.searchControl.valueChanges.subscribe(searchTerm => {
      if(searchTerm){
        this.employeeService.getEmployees(
          this.searchControl.value || '',
          0,
          50
        ).pipe(
          catchError(error => {
            this.error.set(error.message);
            this.loading.set(false);
            return EMPTY;
          })
        ).subscribe(response => {
          console.log('Search results:', response);
          this.filteredNames.next(response.content.map(employee => ({
            id: employee.id,
            fullName: employee.fullName
          })));

          // Check if we need to load more after the current batch is loaded
          
        });
      }
    });
  }

  ngAfterViewInit(): void {}

  displayFn(employee: { id: number; fullName: string }): string {
    return employee ? employee.fullName : '';
  }

  async onOptionClicked(object: { id: number; fullName: string }): Promise<void> {
    console.log('Selected employee:', object);
        this.employeeService.getEmployeeSeats(object.id).subscribe(response => {
          this.selectedFloorControl.setValue(response.map(seat => seat.floorId)[0]);
        });
  }

  async onOptionSelected(event: MatAutocompleteSelectedEvent) {
    const selectedEmployee = event.option.value;
    await this.onOptionClicked(selectedEmployee);
    const seats = await this.employeeService.getEmployeeSeats(selectedEmployee.id).toPromise();
    console.log('Selected employee seats:', seats);
    // this.employeeService.getEmployeeSeats(selectedEmployee.id).subscribe(employee => {
    //   console.log('Selected employees seats:', employee);
    //   this.zoomOnEmployee(employee);
    // });
    setTimeout(() => {
      this.zoomOnEmployee(seats);
    }, 500);
  }

  private loadFloorPlan(floorNumber: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.clearSvgContainer();
    this.initializeSvg(floorNumber);
  }

  private clearSvgContainer(): void {
    if (!this.canvasContainer) return;
    const container = this.canvasContainer.nativeElement;
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }

  private initializeSvg(floorNumber: number): void {
    console.log('Initializing SVG for floor', floorNumber);
    const container = this.canvasContainer.nativeElement;
    this.svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .style('border', '1px solid red');

    const backgroundGroup = this.svg.append('g')
      .attr('class', 'background-layer');

    

    this.g = this.svg.append('g')
      .attr('class', 'interactive-layer');

    d3.xml(`${this.apiUrl}/floors/${floorNumber}/svg`).then((data) => {
      this.loading.set(false);
      const backgroundSvg = data.documentElement;
      const viewBox = backgroundSvg.getAttribute('viewBox');
      if (viewBox) {
        this.svg.attr('viewBox', viewBox);
      }
      backgroundGroup.node().appendChild(backgroundSvg);
      this.configureZoom(backgroundGroup);
      this.drawRooms(this.g);
    }).catch(error => {
      this.loading.set(false);
      this.error.set('Error loading floor plan SVG');
      console.error('Error loading background SVG:', error);
    });

    
  }

  private configureZoom(backgroundGroup: any): void {
    this.zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        backgroundGroup.attr('transform', event.transform);
        this.g.attr('transform', event.transform);
      });
    this.svg.call(this.zoom);
    const initialTransform = d3.zoomIdentity.translate(-50, 0).scale(0.8);
    this.svg.call(this.zoom.transform, initialTransform);
  }

  private zoomOnEmployee(seat: any): void {
    const container = this.canvasContainer.nativeElement;
    if (!container) {
      console.error('Canvas container not found');
      return;
    }

    const rectNode = d3.select('#room-group-' + seat[0].roomId).node() as SVGRectElement;
    if (!rectNode) {
      console.error('No rectangle found for room ID:', seat[0].roomId);
      return;
    }
    const x = rectNode.transform.baseVal.getItem(0).matrix.e;
    const y = rectNode.transform.baseVal.getItem(0).matrix.f;
    this.svg.transition()
      .duration(750)
      .call(this.zoom.transform, d3.zoomIdentity.translate((x*-1.5 + 820) - rectNode.getBBox().width/2, y*-1.5 + 150).scale(1.5));
    
  }

  private drawRooms(g: any):void {
    this.selectedFloor()?.rooms.forEach(room => {
      const roomGroup = g.append('g')
      .attr('id', 'room-group-'+ room.id);
      if(room.x !== 0 && room.y !== 0){
        this.drawRoom(roomGroup, room);
      }
    })
  }

  private async drawRoom(roomGroup: any, room: Room){
    roomGroup.attr('transform', `translate(${room.x}, ${room.y})`);
    const rect = roomGroup.append('rect')
      .attr('width', room.width)
      .attr('height', room.height)
      .attr('fill', 'rgba(255, 255, 255, 0.3)');

    const text = roomGroup.append('text')
    .attr('x', room.width/2)
    .attr('y', room.height/2)
    .attr('dy', '.35em')
    .attr('text-anchor', 'middle')
    .attr('fill', 'black')

    this.createInfoBox(roomGroup, rect, room);

    room.seats = await this.enrichSeatsWithEmployees(room.seats);

    room.seats.forEach((seat) => {
      this.drawSeat(roomGroup, seat);
    })
  }

  private drawSeat(roomGroup: any, seat: Seat){
    const group = roomGroup.append('g')
    .attr('class', 'room-group');

    const rect = group.append('rect')
      .attr('id', `rect-${seat.id}`)
      .attr('transform', `translate(${seat.x}, ${seat.y}), rotate(${seat.rotation}, ${seat.width/2}, ${seat.height/2})`)
      .attr('width', seat.width)
      .attr('height', seat.height)
      .attr('stroke', 'rgb(34, 74, 144)')
      .attr('stroke-width', 2)
      .attr('rotation', seat.rotation)
      .attr('fill', 'rgb(221, 235, 247)');

    const text = roomGroup.append('text')
      .attr('transform', seat.rotation === 0 ? `
        translate(${seat.x + seat.width / 2}, ${seat.y + seat.height / 2})` : 
        `translate(${seat.x + seat.width / 2} , ${seat.y + seat.height / 2}) rotate(${seat.rotation})`)
      .attr('text-anchor', 'middle')
      .attr('fill', 'black')
      .attr('alignment-baseline', 'middle') 
      .style('writing-mode', 'sideways-lr')
      .style('font-size', '12px')
      .style('pointer-events', 'none');
      
    if (seat.employees && seat.employees.length > 1) {
      text.append('tspan')
        .text(seat.employees[0].fullName)
        .attr('x', '-0.8em');
      for (let i = 1; i < seat.employees.length; i++) {
        text.append('tspan')
          .attr('y', 0)
          .attr('dx', '1.2em')
          .text(seat.employees[i].fullName);
      }
    }  else {
      if (seat.employees && seat.employees.length === 1) {
        text.append('tspan')
          .attr('dx', '0.2em')
          .text(seat.employees[0].fullName);
      } else {
        text.append('tspan')
          .attr('dx', '0.2em')
          .text("Empty");

        rect
          .attr('fill', 'rgb(123, 184, 148)')
          .attr('stroke', 'rgb(29, 112, 61)');
      }
    }
  }

  private enrichSeatsWithEmployees(seats: Seat[]): Promise<any[]> {
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

  private createInfoBox(roomGroup: any, rect: any, room: any): void {

    const infoBox = roomGroup.append('rect')
      .attr('x', 10)
      .attr('y', room.y > 200 ? rect.attr('height') : -75)
      .attr('width', rect.attr('width') - 20)
      .attr('height', 75)
      .attr('fill', 'rgb(254, 243, 205)')
      .attr('stroke', 'black')
      .attr('stroke-width', 2);

      const foreignObject = roomGroup.append('foreignObject')
      .attr('x', 10)
      .attr('y', infoBox.attr('y'))
      .attr('width', infoBox.attr('width'))
      .attr('height', 75)

    const htmlContent = foreignObject.append('xhtml:div')
      .style('height', '100%')
      .style('padding', '0 10px 0 10px')
      .style('font-size', '14px')
      .style('font-family', 'Arial, sans-serif')
      .html(`
        <div style="display: flex; flex-direction: column; gap: 0; height: 100%; justify-content: center;">
        <div style="text-align: center;">
          <b>${room.name}</b> 
          <br/>
          <b>${room.roomNumber}</b>
        </div>
      </div>
      `)
  }
}


