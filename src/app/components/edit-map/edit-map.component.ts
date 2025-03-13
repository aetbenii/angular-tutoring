import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { FloorService } from '../../services/floor.service';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import * as d3 from 'd3';

@Component({
  selector: 'app-edit-map',
  imports: [],
  templateUrl: './edit-map.component.html',
  styleUrl: './edit-map.component.scss'
})
export class EditMapComponent {
  floorId: string | null = null;
  roomId: string | null = null;
  

  @ViewChild('canvasContainer', { static: false }) canvasContainer!: ElementRef;
  
    private svg: any;
    private g: any;
    private seat: any;
    private zoom: any;
    private apiUrl = 'http://localhost:8080/api';
  
    // Signals for reactive state management
    loading = signal<boolean>(false);
    error = signal<string | null>(null);
  
    constructor(private route: ActivatedRoute) {}
  
    ngOnInit(): void {
      this.floorId = this.route.snapshot.paramMap.get('floorId');
      this.roomId = this.route.snapshot.paramMap.get('roomId');
      console.log('Floor ID:', this.floorId);
      console.log('Room ID:', this.roomId);
    }
  
    ngAfterViewInit(): void {
      this.initializeSvg(Number(this.floorId));
    }
  
    /**
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
    */
  
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
  
        const room = this.g.append('g')
        .attr('class', 'room-group')
        .attr('transform', 'translate(100,100)'); // Startposition

        
        const resizer = room.append('rect')
    .attr('x', 150)  // Position an der unteren rechten Ecke des großen Rechtecks
    .attr('y', 200)
    .attr('width', 10)  // Größe des Resizers
    .attr('height', 10)
    .attr('fill', 'blue')  // Farbe des Resizers
    .style('cursor', 's-resize');  // Cursor anzeigen, dass der Bereich vergrößert/verkleinert werden kann

// Resizing-Funktion hinzufügen
resizer.call(d3.drag()
    .on('start', function (event) {
        // Offset für das Dragging berechnen
        const rectElement = d3.select(largeRect);
        console.log(largeRect.attr('x'));
        event.subject.offsetX = event.x - parseFloat(rectElement.attr('x'));
        event.subject.offsetY = event.y - parseFloat(rectElement.attr('y'));
    })
    .on('drag', function (event) {
        // Berechne die neue Breite und Höhe basierend auf der Mausbewegung
        const rectElement = d3.select(largeRect);
        
        let newWidth = event.x - parseFloat(rectElement.attr('x'));
        let newHeight = event.y - parseFloat(rectElement.attr('y'));
        
        // Verhindere, dass die Größe negativ wird
        newWidth = Math.max(newWidth, 10);  // Mindestbreite
        newHeight = Math.max(newHeight, 10);  // Mindesthöhe
        
        // Setze die neue Größe des Rechtecks
        rectElement.attr('width', newWidth).attr('height', newHeight);

        // Positioniere den Resizer neu (immer an der unteren rechten Ecke)
        resizer.attr('x', newWidth).attr('y', newHeight);
    })
);

    // Großes Rechteck (Hintergrund)
    const largeRect = room.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 300)
        .attr('height', 200)
        .attr('fill', 'rgba(223, 223, 223, 0.57)')
        .attr('stroke', 'green')
        .attr('stroke-width', 2);
    
        room.call(d3.drag()
        .on('start', function (event) {
            const transform = d3.select(this).attr('transform');
            const translate = transform.match(/translate\(([^,]+),([^)]+)\)/);
            if (translate) {
                event.subject.offsetX = event.x - parseFloat(translate[1]);
                event.subject.offsetY = event.y - parseFloat(translate[2]);
            }
        })
        .on('drag', function (event) {
            const newX = event.x - event.subject.offsetX;
            const newY = event.y - event.subject.offsetY;
            d3.select(this).attr('transform', `translate(${newX}, ${newY})`);
        })
    );

    // Kleines Rechteck hinzufügen
    function createSmallRect(x: number, y: number) {
        room.append('rect')
            .attr('x', x)
            .attr('y', y)
            .attr('width', 60)
            .attr('height', 40)
            .attr('fill', 'red')
            .attr('stroke', 'black')
            .attr('stroke-width', 2)
            .call(d3.drag()
                .on('start', function (event) {
                    event.subject.offsetX = event.x - parseFloat(d3.select(this).attr('x'));
                    event.subject.offsetY = event.y - parseFloat(d3.select(this).attr('y'));
                })
                .on('drag', function (event) {
                    const rectElement = d3.select(this);
    
                    // Begrenzungen aus dem großen Rechteck holen
                    const largeX = 0;
                    const largeY = 0;
                    const largeWidth = parseFloat(largeRect.attr('width'));
                    const largeHeight = parseFloat(largeRect.attr('height'));
    
                    // Neue Position berechnen
                    let newX = event.x - event.subject.offsetX;
                    let newY = event.y - event.subject.offsetY;
    
                    // Begrenzung einhalten
                    newX = Math.max(largeX, Math.min(newX, largeX + largeWidth - 60));
                    newY = Math.max(largeY, Math.min(newY, largeY + largeHeight - 40));
    
                    rectElement.attr('x', newX).attr('y', newY);
                })
            );
    }
    
    // Drei kleine Rechtecke erstellen
    createSmallRect.call(this, 20, 20);
    createSmallRect.call(this, 100, 50);
    createSmallRect.call(this, 200, 100);


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
