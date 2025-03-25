import { AfterViewInit, Component, ElementRef, inject, OnInit, Signal, signal, ViewChild } from '@angular/core';
import { FloorService } from '../../services/floor.service';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import * as d3 from 'd3';
import { Room } from '../../interfaces/room.interface';
import { RoomService } from '../../services/room.service';
import { HttpClient } from '@angular/common/http';
import { Seat } from '../../interfaces/seat.interface';

@Component({
  selector: 'app-edit-map',
  imports: [],
  templateUrl: './edit-map.component.html',
  styleUrl: './edit-map.component.scss'
})
export class EditMapComponent implements OnInit, AfterViewInit{
  floorId: string | null = null;
  roomId: string | null = null;
  selectedRoomControl = new FormControl<number | null>(null);
  selectedRoom!: Signal<Room | null>;
  

  @ViewChild('canvasContainer', { static: false }) canvasContainer!: ElementRef;
    private roomObj: any;
    //SVG
    private svg: any;
    private g: any;
    private roomGroup: any;
    private room: any;
    private seats: Set<d3.Selection<SVGRectElement, any, null, undefined>> = new Set();
    private zoom: any;
    private apiUrl = 'http://localhost:8080/api';
  
    // Signals for reactive state management
    loading = signal<boolean>(false);
    error = signal<string | null>(null);
  
    constructor(
      private route: ActivatedRoute,
      private roomService: RoomService,
      private http: HttpClient) {}
  
    ngOnInit(): void {
      this.floorId = this.route.snapshot.paramMap.get('floorId');
      this.roomId = this.route.snapshot.paramMap.get('roomId');

      if(this.roomId){
        this.roomService.loadRoom(parseInt(this.roomId));
        this.selectedRoom = this.roomService.selectedRoom;
        const interval = setInterval(() => {
          if (this.selectedRoom()) {
            clearInterval(interval);
            this.initializeSvg(Number(this.floorId));
            this.loading.set(false);
          }
        }, 50);
  
      }
  }
  
    ngAfterViewInit(): void {}

    onSaveClick(): void{
      let transform = this.roomGroup.attr('transform');
      const translate = transform.match(/translate\(([^,]+),([^)]+)\)/);
      const roomData = {
        x: parseFloat(translate[1]),
        y: parseFloat(translate[2]),
        width: parseFloat(this.room.attr('width')),
        height: parseFloat(this.room.attr('height')),
      
        seats: Object.fromEntries(
          Array.from(this.seats).map(seat => {
            const id = seat.attr('id');
            return [
              id,
              {
                x: parseFloat(seat.attr('x')),
                y: parseFloat(seat.attr('y')),
                width: parseFloat(seat.attr('width')),
                height: parseFloat(seat.attr('height')),
                rotation: parseFloat(seat.attr('rotation'))
              }
            ];
          })
        )
      };
      this.roomService.updateRoom(Number(this.roomId), roomData);
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
  
      this.roomGroup = this.g.append('g')
      .attr('class', 'room-group')
      .attr('transform', `translate(${this.selectedRoom()?.x}, ${this.selectedRoom()?.y})`); // Startposition
      // Großes Rechteck (Hintergrund)
      this.room = this.roomGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', this.selectedRoom()?.width)
        .attr('height', this.selectedRoom()?.height)
        .attr('fill', 'rgba(223, 223, 223, 0.57)')
        .attr('stroke', 'black')
        .attr('stroke-width', 2);

        this.roomGroup.call(d3.drag() 
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

    const handle = this.roomGroup.append('circle')
    .attr('cx', this.selectedRoom()?.width)  // Mittelpunkt des Kreises (x = 150 + radius)
    .attr('cy', this.selectedRoom()?.height)  // Mittelpunkt des Kreises (y = 200 + radius)
    .attr('r', 5)  // Radius des Kreises (statt width/height)
    .attr('fill', 'blue')  // Farbe des Resizers
    .style('cursor', 'pointer'); // Cursor anzeigen, dass der Bereich vergrößert/verkleinert werden kann

// Resizing-Funktion hinzufügen
    handle.call(d3.drag()
    .on('start', (event) => {
        // Offset für das Dragging berechnen
        const rectElement = this.room;
        event.subject.offsetX = event.x - parseFloat(rectElement.attr('x'));
        event.subject.offsetY = event.y - parseFloat(rectElement.attr('y'));
    })
    .on('drag', (event) => {
        // Berechne die neue Breite und Höhe basierend auf der Mausbewegung
        const rectElement = this.room;
        
        let newWidth = event.x - parseFloat(rectElement.attr('x'));
        let newHeight = event.y - parseFloat(rectElement.attr('y'));
        
        // Verhindere, dass die Größe negativ wird
        newWidth = Math.max(newWidth, 10);  // Mindestbreite
        newHeight = Math.max(newHeight, 10);  // Mindesthöhe
        
        // Setze die neue Größe des Rechtecks
        rectElement.attr('width', newWidth).attr('height', newHeight);

        // Positioniere den Resizer neu (immer an der unteren rechten Ecke)
        handle.attr('cx', newWidth).attr('cy', newHeight);
    })
);

    // Kleines Rechteck hinzufügen
    function createSmallRect(seat: Seat, room: any, roomGroup: any, seats: any) {
      const rect = roomGroup.append('rect')
      .attr('id', seat.id)
      .attr('x', seat.x)
      .attr('y', seat.y)
      .attr('width', seat.width)
      .attr('height', seat.height)
      .attr('fill', 'rgb(63, 81, 181)')
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
              const largeWidth = parseFloat(room.attr('width'));
              const largeHeight = parseFloat(room.attr('height'));

              // Neue Position berechnen
              let newX = event.x - event.subject.offsetX;
              let newY = event.y - event.subject.offsetY;

              // Begrenzung einhalten
              newX = Math.max(largeX, Math.min(newX, largeX + largeWidth - seat.width));
              newY = Math.max(largeY, Math.min(newY, largeY + largeHeight - seat.height));

              text.attr('x', newX + seat.width / 2)
                  .attr('y', newY + seat.height / 2);

              rectElement.attr('x', newX).attr('y', newY);
          })

          
      ).attr('rotation', 0)
      // .on("click", (event: { target: SVGRectElement; }) => {
      //   angle+=45;
      //   const bbox = (event.target as SVGRectElement).getBBox();
      //   const cx = bbox.x + bbox.width/2;
      //   const cy = bbox.y + bbox.height/2;

      //   d3.select(event.target)
      //     .attr("transform", `rotate(${angle}, ${cx}, ${cy})`)
      // })
      
      ;

      const text = roomGroup.append('text')
      .attr('x', seat.x + seat.width / 2)  // Text in der Mitte des Rechtecks positionieren
      .attr('y', seat.y + seat.height / 2)
      .attr('dy', '.35em')  // Vertikale Ausrichtung des Textes
      .attr('text-anchor', 'middle')  // Horizontale Ausrichtung des Textes
      .attr('fill', 'white')  // Textfarbe
      .text(seat.seatNumber);
      seats.add(rect);
    }
    console.log(this.selectedRoom());
    this.selectedRoom()?.seats.forEach((seat, index) => {
      console.log(seat.id);
      createSmallRect.call(this,seat, this.room, this.roomGroup, this.seats);
    });



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
