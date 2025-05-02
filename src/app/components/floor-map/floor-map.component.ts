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

@Component({
  selector: 'app-floor-map',
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

  // Signals for reactive state management
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  selectedFloorControl = new FormControl<number | null>(null);
  floors = this.floorService.floors;
  selectedFloor = this.floorService.selectedFloor;

  constructor(
    private EmployeeService: EmployeeService,
  ) {}

  ngOnInit(): void {
    // Handle floor selection changes
    this.selectedFloorControl.valueChanges.subscribe(floorNumber => {
      if (floorNumber !== null) {
        this.loading.set(true);

        this.floorService.loadFloor(floorNumber).then(() => {
          this.loadFloorPlan(floorNumber);
        
          // Setze den Loading-Zustand auf false, wenn der Ladevorgang abgeschlossen ist
          this.loading.set(false);
        }).catch(error => {
          // Im Falle eines Fehlers den Loading-Zustand auf false setzen
          this.loading.set(false);
          this.error.set('Fehler beim Laden des Floors');
          console.error('Error loading floor:', error);
        });
      }
    });

    // Set initial floor if available
    const currentFloors = this.floors();
    if (currentFloors.length > 0) {
      this.selectedFloorControl.setValue(currentFloors[0].floorNumber);
    }
  }

  ngAfterViewInit(): void {
    // Initial setup will happen when floor is selected via valueChanges
  }

  private loadFloorPlan(floorNumber: number): void {
    this.loading.set(true);
    this.error.set(null);
    
    // Clear existing SVG before loading new one
    this.clearSvgContainer();
    
    // Initialize the SVG container
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
    
    // Create the main SVG container with D3
    this.svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .style('border', '1px solid red');

    // Create a background group for the floor plan SVG
    // This layer will contain the imported background SVG
    const backgroundGroup = this.svg.append('g')
      .attr('class', 'background-layer');

    // Create the main group for interactive elements
    // This layer will contain rooms, seats, and handles
    this.g = this.svg.append('g')
      .attr('class', 'interactive-layer');

    // Load the background SVG using D3's XML loader
    // This demonstrates how to load external SVG content
    d3.xml(`${this.apiUrl}/floors/${floorNumber}/svg`).then((data) => {
      this.loading.set(false);
      
      const backgroundSvg = data.documentElement;
      // Extract the viewBox from the original SVG to maintain proportions
      const viewBox = backgroundSvg.getAttribute('viewBox');
      
      // Set the viewBox on our main SVG to match the background
      if (viewBox) {
        this.svg.attr('viewBox', viewBox);
      }
      
      // Append the background SVG content to our background layer
      backgroundGroup.node().appendChild(backgroundSvg);
      
      // Configure D3 zoom behavior for pan and zoom functionality
      this.configureZoom(backgroundGroup);
      this.drawRooms(this.g);
      
    }).catch(error => {
      this.loading.set(false);
      this.error.set('Error loading floor plan SVG');
      console.error('Error loading background SVG:', error);
    });
  }
  
  private configureZoom(backgroundGroup: any): void {
    // Configure D3 zoom behavior for pan and zoom functionality
    this.zoom = d3.zoom()
      .scaleExtent([0.1, 4]) // Limit zoom scale between 0.1x and 4x
      .on('zoom', (event) => {
        // Apply the same transform to both layers to keep them in sync
        backgroundGroup.attr('transform', event.transform);
        this.g.attr('transform', event.transform);
      });

    // Apply zoom behavior to the SVG
    this.svg.call(this.zoom);
    
    // Set initial zoom transform for better initial view
    const initialTransform = d3.zoomIdentity.translate(100, 100).scale(0.8);
    this.svg.call(this.zoom.transform, initialTransform);
  }

  private drawRooms(g: any):void {
    this.selectedFloor()?.rooms.forEach(room => {
      const roomGroup = g.append('g')
      .attr('class', 'room-group');
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
      .attr('fill', 'rgba(255, 255, 255, 0.3)')
      // .attr('stroke', 'black')
      // .attr('stroke-width', 2)
      //.append('title').text(`${room.roomNumber}`)
      ;

    const text = roomGroup.append('text')
    .attr('x', room.width/2)
    .attr('y', room.height/2)
    .attr('dy', '.35em')
    .attr('text-anchor', 'middle')
    .attr('fill', 'black')
    .text(room.name)
    ;

    room.seats = await this.enrichSeatsWithEmployees(room.seats);

    room.seats.forEach((seat) => {
      this.drawSeat(roomGroup, seat);
    })
  }

  private drawSeat(roomGroup: any, seat: Seat){
    const group = roomGroup.append('g')
    .attr('class', 'room-group');

    const rect = group.append('rect')
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
      // Erstes tspan ohne eigene Positionierung
      text.append('tspan')
        .text(seat.employees[0].fullName)
        .attr('x', '-0.8em');
      // Weitere tspans mit vertikalem Abstand
      // Da wir text-anchor="middle" verwenden, müssen wir x="0" setzen,
      // damit die Zeilen zentriert bleiben
      for (let i = 1; i < seat.employees.length; i++) {
        text.append('tspan')
          .attr('y', 0) // Wichtig: x=0 bedeutet zentriert relativ zum transformierten text-Element
          .attr('dx', '1.2em') // Vertikaler Abstand zum vorherigen tspan
          .text(seat.employees[i].fullName);
      }
    }  else {
      // Prüfe explizit, ob genau ein Mitarbeiter vorhanden ist
      if (seat.employees && seat.employees.length === 1) {
        text.append('tspan')
          .attr('dx', '0.2em')
          .text(seat.employees[0].fullName); // Sicher, da wir wissen, dass es existiert
      } else {
        // Fall für 0 Mitarbeiter oder undefined Array
        text.append('tspan')
          .attr('dx', '0.2em')
          .text("Empty");
      }
    }
  }

  private enrichSeatsWithEmployees(seats: Seat[]): Promise<any[]> {
      return Promise.all(seats.map(async seat => {
        if (seat.employeeIds && seat.employeeIds.length > 0) {
          const employees = await Promise.all(
            seat.employeeIds.map((id: number) => this.EmployeeService.getEmployeeById(id).toPromise())
          );
          return { ...seat, employees };
        } else {
          return { ...seat, employees: [] };
        }
      }));
    }
}


