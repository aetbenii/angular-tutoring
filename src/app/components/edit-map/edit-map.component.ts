import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, inject, OnInit, Signal, signal, ViewChild } from '@angular/core';
import { FloorService } from '../../services/floor.service';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import * as d3 from 'd3';
import { Room } from '../../interfaces/room.interface';
import { RoomService } from '../../services/room.service';
import { HttpClient } from '@angular/common/http';
import { Seat } from '../../interfaces/seat.interface';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom, forkJoin } from 'rxjs';
import { EmployeeService } from '../../services/employee.service';

@Component({
  selector: 'app-edit-map',
  imports: [
    MatButtonModule,
    MatSnackBarModule,
    RouterModule
  ],
  templateUrl: './edit-map.component.html',
  styleUrl: './edit-map.component.scss'
})
export class EditMapComponent implements OnInit, AfterViewInit{
  selectedRoomControl = new FormControl<number | null>(null);
  selectedRoom!: Signal<Room | null>;
  isDeleteModeActive = signal<boolean>(false);
  floorId: string | null;
  roomId: string | null;
  

  @ViewChild('canvasContainer', { static: false }) canvasContainer!: ElementRef;
    private roomObj: any;
    //SVG
    private svg: any;
    private g: any;
    private roomGroup: any;
    private room: any;
    private seatsGeometry: Set<d3.Selection<SVGRectElement, any, null, undefined>> = new Set();
    private zoom: any;
    private seats: any[] = [];
    private infoBox: any;
    private foreignObject: any;
    private apiUrl = 'http://localhost:8080/api';
    
  
    // Signals for reactive state management
    loading = signal<boolean>(false);
    error = signal<string | null>(null);
  
    constructor(
      private route: ActivatedRoute,
      private roomService: RoomService,
      private EmployeeService: EmployeeService,
      private snackBar: MatSnackBar,
      private http: HttpClient,
      private cdRef: ChangeDetectorRef
      ) {
        this.floorId = this.route.snapshot.paramMap.get('floorId');
        this.roomId = this.route.snapshot.paramMap.get('roomId');
        this.selectedRoom = this.roomService.selectedRoom;
      }
  
    async ngOnInit() {
      if (this.roomId) {
        await firstValueFrom(this.roomService.loadRoom(parseInt(this.roomId)));
        
        const seatIds = this.selectedRoom()?.seatIds || [];
        const seatPromises = seatIds.map(seatId => {
          return firstValueFrom(this.roomService.getSeatInfo(seatId));
        });

        this.seats = await Promise.all(seatPromises);
        this.seats = await this.enrichSeatsWithEmployees(this.seats);

        // console.log(this.seats);
        // console.log(this.selectedRoom())
        
        if (this.selectedRoom()) {
          this.initializeSvg(Number(this.floorId));
          this.loading.set(false);
      }
    }
  }

  ngAfterViewInit(): void {
    
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

    onSaveClick(): void{
      const transform = this.roomGroup.attr('transform');
      const translate = transform.match(/translate\(([^,]+),([^)]+)\)/);
      const roomData = {
        x: parseFloat(translate[1]),
        y: parseFloat(translate[2]),
        width: parseFloat(this.room.attr('width')),
        height: parseFloat(this.room.attr('height')),
      };
      const seatsData: any[] = [];
      this.seatsGeometry.forEach((seat: any) => {
        const transform = seat.attr('transform');
        const translate = transform.match(/translate\(([^,]+),([^)]+)\)/) || "0";
        const seatData = {
          rotation: parseFloat(seat.attr('rotation')),
          x: parseFloat(translate[1]),
          y: parseFloat(translate[2]),
          width: parseFloat(seat.attr('width')),
          height: parseFloat(seat.attr('height'))
       };
       seatsData.push(seatData);
      });

      console.log('Room data to be saved:', roomData);
      console.log('Seats data to be saved:', seatsData);
      
      this.roomService.updateRoom(Number(this.roomId), roomData).subscribe({
        next: (response) => {
          console.log('Room updated successfully:', response);
          this.snackBar.open('Room updated successfully', 'Close', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
        },
        error: (error) => {
          console.error('Update failed:', error);
          this.snackBar.open('Update failed!', 'Close', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
        }
      });
      this.seats.forEach((seat: Seat, index: number) => {
        this.roomService.updateSeat(Number(this.roomId), Number(seat.id), seatsData[index]).subscribe({
          next: (response) => {
            console.log('Seat updated successfully:', response);
          },
          error: (error) => {
            console.error('Update failed:', error);
          }
        })
      });
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
      .attr('transform', `translate(${this.selectedRoom()?.x ?? 0}, ${this.selectedRoom()?.y ?? 0})`); // Startposition
     
      this.room = this.roomGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', this.selectedRoom()?.width)
        .attr('height', this.selectedRoom()?.height)
        .attr('fill', 'rgba(223, 223, 223, 0.57)')
        .attr('stroke', 'black')
        .attr('stroke-width', 2);

        this.createInfoBox.call(this, this.roomGroup, this.room);
        
       
const INFOBOX_Y_THRESHOLD = this.floorId == '2' ? 400 : 250;
const INFOBOX_Y_OFFSET = -75;
const HANDLE_RADIUS = 5;

const getInfoBoxY = (newY: number, roomHeight: number) =>
  newY > INFOBOX_Y_THRESHOLD ? roomHeight : INFOBOX_Y_OFFSET;

this.roomGroup.call(
  d3.drag()
    .on('start', (event) => {
      const transform = d3.select(this.roomGroup.node()).attr('transform');
      const translate = transform.match(/translate\(([^,]+),([^)]+)\)/);
      if (translate) {
        event.subject.offsetX = event.x - parseFloat(translate[1]);
        event.subject.offsetY = event.y - parseFloat(translate[2]);
      }
    })
    .on('drag', (event) => {
      const newX = event.x - event.subject.offsetX;
      const newY = event.y - event.subject.offsetY;
      const roomHeight = parseFloat(this.room.attr('height')) || 0;
      const infoBoxY = getInfoBoxY(newY, roomHeight);

      d3.select(this.roomGroup.node()).attr('transform', `translate(${newX}, ${newY})`);
      d3.select(this.infoBox.node()).attr('y', infoBoxY);
      d3.select(this.foreignObject.node()).attr('y', infoBoxY);
    })
);

const handle = this.roomGroup.append('circle')
  .attr('cx', this.selectedRoom()?.width ?? 0)
  .attr('cy', this.selectedRoom()?.height ?? 0)
  .attr('r', HANDLE_RADIUS)
  .attr('fill', 'blue')
  .style('cursor', 'pointer');

handle.call(d3.drag()
    .on('start', (event) => {
        const rectElement = this.room;
        event.subject.offsetX = event.x - parseFloat(rectElement.attr('x'));
        event.subject.offsetY = event.y - parseFloat(rectElement.attr('y'));
    })
    .on('drag', (event) => {
        const rectElement = this.room;
        
        let newWidth = event.x - parseFloat(rectElement.attr('x'));
        let newHeight = event.y - parseFloat(rectElement.attr('y'));
        
        
        newWidth = Math.max(newWidth, 10); 
        newHeight = Math.max(newHeight, 10);   
        
        let roomY = parseFloat(this.roomGroup.attr('transform').split(',')[1].split(')')[0]);
        
        rectElement.attr('width', newWidth).attr('height', newHeight);
        this.infoBox.attr('y', (roomY ?? 0) > (this.floorId == '2' ? 400 : 250) ? newHeight : -75);
        this.infoBox.attr('width', newWidth - 20);
        this.foreignObject.attr('width', this.infoBox.attr('width'));
        this.foreignObject.attr('y', (roomY ?? 0) > (this.floorId == '2' ? 400 : 250) ? newHeight : -75);
        console.log('roomY:', roomY);
        handle.attr('cx', newWidth).attr('cy', newHeight);
    })
);

    this.seats.forEach((seat: Seat) => {
      this.createSmallRect.call(this,seat, this.room, this.roomGroup, this.seatsGeometry);
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

    private createSmallRect(seat: Seat, room: any, roomGroup: any, seats: Set<any>): void {
    const rect = roomGroup.append('rect')
    .attr('id', seat.id)
    .attr('transform', `translate(${seat.x}, ${seat.y}) rotate(${seat.rotation}, ${seat.width / 2}, ${seat.height / 2})`)
    .attr('width', seat.width)
    .attr('height', seat.height)
    .attr('fill', 'rgb(221, 235, 247)')
    .attr('stroke', 'rgb(34, 74, 144)')
    .attr('stroke-width', 2)
    .attr('rotation', seat.rotation)
    .call(
      d3.drag()
        .on('start', function (event) {
          const rectElement = d3.select(this);
          const transform = rectElement.attr('transform');
          const translate = transform.match(/translate\(([^,]+),([^)]+)\)/);
          if (translate) {
            const currentX = parseFloat(translate[1]);
            const currentY = parseFloat(translate[2]);
            event.subject.offsetX = event.x - currentX;
            event.subject.offsetY = event.y - currentY;
          }
        })
        .on('drag', function (event) {
          const rectElement = d3.select(this);
          const currentRotation = parseInt(rectElement.attr('rotation') || '0');
          const largeX = 0;
          const largeY = 0;
          const largeWidth = parseFloat(room.attr('width'));
          const largeHeight = parseFloat(room.attr('height'));
          let newX = event.x - event.subject.offsetX;
          let newY = event.y - event.subject.offsetY;
          newX = Math.max(
            currentRotation === 0 ? largeX : largeX + seat.width / 2,
            Math.min(
              newX,
              currentRotation === 0 ? largeX + largeWidth - seat.width : largeX + largeWidth - 1.5 * seat.width
            )
          );
          newY = Math.max(
            currentRotation === 0 ? largeY : largeY - seat.width / 2,
            Math.min(
              newY,
              currentRotation === 0 ? largeY + largeHeight - seat.height : largeY + largeHeight - 1.5 * seat.width
            )
          );
          const centerX = seat.width / 2;
          const centerY = seat.height / 2;
          rectElement.attr('transform', `translate(${newX}, ${newY}) rotate(${currentRotation}, ${centerX}, ${centerY})`);
          const textRotation = text.attr('rotation');
          text.attr('transform', `translate(${newX + seat.width / 2}, ${newY + seat.height / 2}) rotate(${textRotation})`);
        })
    )
    .on('click', (event: any) => {
      const rectElement = d3.select(event.currentTarget);
      const transform = d3.select(event.currentTarget).attr('transform');
      const translate = transform.match(/translate\(([^,]+),([^)]+)\)/);
      if (translate) {
        const bbox = rectElement.node().getBBox();
        const centerX = bbox.x + bbox.width / 2;
        const centerY = bbox.y + bbox.height / 2;
        const x = parseFloat(translate[1]);
        const y = parseFloat(translate[2]);
        let newRotation = parseInt(rectElement.attr('rotation')) + 90;
        if (newRotation == 180) newRotation = 0;
        rectElement.attr("transform", `translate(${x}, ${y}) rotate(${newRotation}, ${centerX}, ${centerY})`);
        rectElement.attr('rotation', newRotation);
        text.attr("transform", `translate(${x + seat.width / 2}, ${y + seat.height / 2}) rotate(${newRotation})`);
        text.attr('rotation', newRotation);
      }
    });

  // Text-Element mit transform erstellen statt mit x/y
  const text = roomGroup.append('text')
    .attr('transform',
      seat.rotation === 0
        ? `translate(${seat.x + seat.width / 2}, ${seat.y + seat.height / 2})`
        : `translate(${seat.x + seat.width / 2}, ${seat.y + seat.height / 2}) rotate(${seat.rotation})`
    )
    .attr('text-anchor', 'middle')
    .attr('alignment-baseline', 'middle')
    .attr('rotation', seat.rotation)
    .style('writing-mode', 'sideways-lr')
    .attr('fill', 'black')
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
    } else if (seat.employees && seat.employees.length === 1) {
      text.append('tspan')
        .text(seat.employees[0].fullName)
        .attr('dx', '0.2em');
    } else {
      text.append('tspan')
        .text("Empty")
        .attr('dx', '0.2em');
        rect
        .attr('fill', 'rgb(123, 184, 148)')
        .attr('stroke', 'rgb(29, 112, 61)');
    }
  seats.add(rect);
  }

 private createInfoBox(roomGroup: any, room: any): void {

    this.infoBox = roomGroup.append('rect')
      .attr('x', 10)
      .attr('y', (this.selectedRoom()?.y ?? 0) > 300 ? room.attr('height') : -75)
      .attr('width', room.attr('width') - 20)
      .attr('height', 75)
      .attr('fill', 'rgb(254, 243, 205)')
      .attr('stroke', 'black')
      .attr('stroke-width', 2);

    this.foreignObject = roomGroup.append('foreignObject')
      .attr('x', 10)
      .attr('y', this.infoBox.attr('y'))
      .attr('width', this.infoBox.attr('width'))
      .attr('height', 75)
  
    const htmlContent = this.foreignObject.append('xhtml:div')
      .style('height', '100%')
      .style('padding', '0 10px 0 10px')
      .style('font-size', '14px')
      .style('font-family', 'Arial, sans-serif')
      .html(`
        <div style="display: flex; flex-direction: column; gap: 0; height: 100%; justify-content: center;">
        <div style="text-align: center;">
          <b>${this.selectedRoom()?.name}</b> 
          <br/>
          <b>${this.selectedRoom()?.roomNumber}</b>
        </div>
      </div>
      `)
  }
}
