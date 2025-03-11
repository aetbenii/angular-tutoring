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

  constructor() {}

  ngOnInit(): void {
    // Handle floor selection changes
    this.selectedFloorControl.valueChanges.subscribe(floorNumber => {
      if (floorNumber !== null) {
        this.loadFloorPlan(floorNumber);
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
}
