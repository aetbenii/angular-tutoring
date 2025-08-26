import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, inject, OnInit, Signal, signal, ViewChild, DestroyRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import * as d3 from 'd3';
import { Room } from '../../interfaces/room.interface';
import { RoomService } from '../../services/room.service';
import { HttpClient } from '@angular/common/http';
import { Seat } from '../../interfaces/seat.interface';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-edit-map',
  standalone: true,
  imports: [
    MatButtonModule,
    MatSnackBarModule,
    RouterModule
  ],
  templateUrl: './edit-map.component.html',
  styleUrls: ['./edit-map.component.scss']
})
export class EditMapComponent implements OnInit, AfterViewInit{
  selectedRoomControl = new FormControl<number | null>(null);
  selectedRoom!: Signal<Room | null>;
  floorId: string | null;
  private destroyRef = inject(DestroyRef);
  roomId: string | null;
  

  @ViewChild('canvasContainer', { static: false }) canvasContainer!: ElementRef;
    private roomObj: Room | null = null;
    //SVG
    private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private g!: d3.Selection<SVGGElement, unknown, null, undefined>;
    private roomGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
    private room!: d3.Selection<SVGRectElement, unknown, null, undefined>;
    private seat!: d3.Selection<SVGRectElement, unknown, null, undefined>;
    private seatGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
    private text!: d3.Selection<SVGTextElement, unknown, null, undefined>;
    private seatsGeometry = new Set<d3.Selection<SVGRectElement, unknown, null, undefined>>();
    private zoom!: d3.ZoomBehavior<Element, unknown>;
    private seats: Seat[] = [];
    private infoBox!: d3.Selection<SVGRectElement, unknown, null, undefined>;
    private foreignObject!: d3.Selection<SVGForeignObjectElement, unknown, null, undefined>;
    private apiUrl = environment.apiBaseUrl;
    
    // Signals for reactive state management
    loading = signal<boolean>(false);
    error = signal<string | null>(null);
  
    constructor(
      private route: ActivatedRoute,
      private roomService: RoomService,
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
        // Sort seats by ID for consistent ordering
        this.seats = this.seats.sort((a, b) => a.id - b.id);
        
        if (this.selectedRoom()) {
          this.initializeSvg(Number(this.floorId));
          this.loading.set(false);
      }
    }
  }

  ngAfterViewInit(): void {
    // Initialize view after component is ready
    this.initializeView();
  }
  
  private initializeView(): void {
    // View initialization logic will be added here if needed
  }
  


    onSaveClick(): void{
      // Use DOM API to get transform values reliably
      const roomElement = this.roomGroup.node() as SVGGElement;
      let x = 0, y = 0;
      
      // Try to get transform from transform list
      const transformList = roomElement.transform.baseVal;
      if (transformList.numberOfItems > 0) {
        for (let i = 0; i < transformList.numberOfItems; i++) {
          const transform = transformList.getItem(i);
          if (transform.type === SVGTransform.SVG_TRANSFORM_TRANSLATE) {
            x = transform.matrix.e;
            y = transform.matrix.f;
            break;
          }
        }
      }
      
      const roomData = {
        x: x,
        y: y,
        width: parseFloat(this.room.attr('width')),
        height: parseFloat(this.room.attr('height')),
      };
      const seatsData: Partial<Seat>[] = [];
      this.seatsGeometry.forEach((seat) => {
        // Use DOM API to get transform values
        const seatElement = seat.node() as SVGElement;
        let x = 0, y = 0;
        
        // Get transform from transform list
        const transformList = (seatElement as SVGGraphicsElement & { transform?: { baseVal?: SVGTransformList } }).transform?.baseVal;
        if (transformList && transformList.numberOfItems > 0) {
          for (let i = 0; i < transformList.numberOfItems; i++) {
            const transform = transformList.getItem(i);
            if (transform.type === SVGTransform.SVG_TRANSFORM_TRANSLATE) {
              x = transform.matrix.e;
              y = transform.matrix.f;
              break;
            }
          }
        }
        
        const seatData = {
          rotation: parseFloat(seat.attr('rotation') || '0'),
          x: x,
          y: y,
          width: parseFloat(seat.attr('width')),
          height: parseFloat(seat.attr('height'))
       };
       seatsData.push(seatData);
      });

      console.log('Room data to be saved:', roomData);
      console.log('Seats data to be saved:', seatsData);
      
      this.roomService.updateRoom(Number(this.roomId), roomData)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
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
        this.roomService.updateSeat(Number(this.roomId), Number(seat.id), seatsData[index])
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
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
        .style('border', '1px solid #e0e0e0')
        .style('border-radius', '8px')
        .style('box-shadow', '0 2px 8px rgba(0, 0, 0, 0.1)')
        .style('background', 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)');
  
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
      .attr('transform', `translate(${this.selectedRoom()?.x ?? 0}, ${this.selectedRoom()?.y ?? 0})`);
     
      this.room = this.roomGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', this.selectedRoom()?.width || 0)
        .attr('height', this.selectedRoom()?.height || 0)
        .attr('fill', 'rgba(223, 223, 223, 0.57)')
        .attr('stroke', 'black')
        .attr('stroke-width', 2);

        this.createInfoBox.call(this, this.roomGroup, this.selectedRoom()!);
        
       
const INFOBOX_Y_THRESHOLD = this.floorId == '2' ? 750 : 250;
const INFOBOX_Y_OFFSET = -75;
const HANDLE_RADIUS = 5;

const getInfoBoxY = (newY: number, roomHeight: number) =>
  newY > INFOBOX_Y_THRESHOLD ? roomHeight : INFOBOX_Y_OFFSET;

this.roomGroup.call(
  d3.drag<SVGGElement, unknown>()
    .on('start', (event) => {
      // Get current transform using DOM API
      const roomElement = this.roomGroup.node() as SVGGElement;
      let currentX = 0, currentY = 0;
      
      const transformList = roomElement.transform.baseVal;
      if (transformList.numberOfItems > 0) {
        const transform = transformList.getItem(0);
        if (transform.type === SVGTransform.SVG_TRANSFORM_TRANSLATE) {
          currentX = transform.matrix.e;
          currentY = transform.matrix.f;
        }
      }
      
      event.subject.offsetX = event.x - currentX;
      event.subject.offsetY = event.y - currentY;
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

handle.call(d3.drag<SVGCircleElement, unknown>()
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
        
        // Get room Y position using DOM API
        const roomElement = this.roomGroup.node() as SVGGElement;
        let roomY = 0;
        const transformList = roomElement.transform.baseVal;
        if (transformList.numberOfItems > 0) {
          const transform = transformList.getItem(0);
          if (transform.type === SVGTransform.SVG_TRANSFORM_TRANSLATE) {
            roomY = transform.matrix.f;
          }
        }
        
        rectElement.attr('width', newWidth).attr('height', newHeight);
        this.infoBox.attr('y', (roomY ?? 0) > (this.floorId == '2' ? 400 : 250) ? newHeight : -75);
        this.infoBox.attr('width', newWidth - 20);
        this.foreignObject.attr('width', this.infoBox.attr('width'));
        this.foreignObject.attr('y', (roomY ?? 0) > (this.floorId == '2' ? 400 : 250) ? newHeight : -75);
        console.log('roomY:', roomY);
        handle.attr('cx', newWidth).attr('cy', newHeight);
    })
  );

    this.seatGroup = this.roomGroup.append('g')
      .attr('class', 'seat-group'); // Startposition

    this.seats.forEach((seat: Seat) => {
      const seatItemGroup = this.seatGroup.append('g')
        .attr('class', 'seat-item')
        .attr('id', seat.id);
      this.createSmallRect.call(this, seat, this.selectedRoom()!, seatItemGroup, this.seatsGeometry);
    });
      // Load the background SVG using Angular HttpClient (which goes through auth interceptor)
      console.log(`Loading SVG from: ${this.apiUrl}/floors/${floorNumber}/svg`);
      this.http.get(`${this.apiUrl}/floors/${floorNumber}/svg`, { 
        responseType: 'text',
        headers: { 'Accept': 'image/svg+xml' }
      }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (svgText) => {
          this.loading.set(false);
          
          // Parse the SVG text into a DOM element
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
          const backgroundSvg = svgDoc.documentElement;
          
          // Extract the viewBox from the original SVG to maintain proportions
          const viewBox = backgroundSvg.getAttribute('viewBox');
          
          console.log('SVG loaded successfully, viewBox:', viewBox);
          
          // Set the viewBox on our main SVG to match the background
          if (viewBox) {
            this.svg.attr('viewBox', viewBox);
          }
          
          // Append the background SVG content to our background layer
          (backgroundGroup.node() as Element).appendChild(backgroundSvg);
          
          if(this.floorId == '2'){
            d3.select(backgroundSvg)
              .attr('width', 3300)
              .attr('height', 1325);
          }
          
          // Configure D3 zoom behavior for pan and zoom functionality
          this.configureZoom(backgroundGroup);
        },
        error: (error) => {
          this.loading.set(false);
          this.error.set('Error loading floor plan SVG');
          console.error('Error loading background SVG:', error);
        }
      });
    }
    
    private configureZoom(backgroundGroup: d3.Selection<SVGGElement, unknown, null, undefined>): void {
      // Configure D3 zoom behavior for pan and zoom functionality
      this.zoom = d3.zoom()
        .scaleExtent([0.1, 4]) // Limit zoom scale between 0.1x and 4x
        .on('zoom', (event) => {
          // Apply the same transform to both layers to keep them in sync
          backgroundGroup.attr('transform', event.transform);
          this.g.attr('transform', event.transform);
        });
  
      // Apply zoom behavior to the SVG
      this.svg.call(this.zoom as any);
      
      // Set initial zoom transform for better initial view
      const initialTransform = d3.zoomIdentity.translate(100, 100).scale(0.8);
      this.svg.call(this.zoom.transform as any, initialTransform);
    }

    private createSmallRect(seat: Seat, room: Room, seatItemGroup: d3.Selection<SVGGElement, unknown, null, undefined>, seats: Set<d3.Selection<SVGRectElement, unknown, null, undefined>>): void {
    const rect = seatItemGroup.append('rect')
    .attr('id', seat.id)
    .attr('transform', `translate(${seat.x}, ${seat.y}) rotate(${seat.rotation}, ${seat.width / 2}, ${seat.height / 2})`)
    .attr('width', seat.width)
    .attr('height', seat.height)
    .attr('fill', 'rgb(221, 235, 247)')
    .attr('stroke', 'rgb(34, 74, 144)')
    .attr('stroke-width', 2)
    .attr('rotation', seat.rotation)
    .call(
      d3.drag<SVGRectElement, unknown>()
        .on('start', function (event) {
          d3.select(this);
          // Get current transform using DOM API
          const element = this as SVGElement;
          let currentX = 0, currentY = 0;
          
          const transformList = (element as SVGGraphicsElement).transform?.baseVal;
          if (transformList && transformList.numberOfItems > 0) {
            const transform = transformList.getItem(0);
            if (transform.type === SVGTransform.SVG_TRANSFORM_TRANSLATE) {
              currentX = transform.matrix.e;
              currentY = transform.matrix.f;
            }
          }
          
          event.subject.offsetX = event.x - currentX;
          event.subject.offsetY = event.y - currentY;
        })
        .on('drag', function (event) {
          const rectElement = d3.select(this) as d3.Selection<SVGRectElement, unknown, null, undefined>;
          const currentRotation = parseInt(rectElement.attr('rotation') || '0');
          const largeX = 0;
          const largeY = 0;
          const largeWidth = room.width;
          const largeHeight = room.height;
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
          const group = d3.select(seatItemGroup.node());
          group.select('foreignObject').attr('transform', `translate(${newX}, ${newY}) rotate(${currentRotation}, ${centerX}, ${centerY})`);
        })
    )
    .on('click', (event: MouseEvent) => {
      const rectElement = d3.select(event.currentTarget as SVGRectElement);
      // Get transform using DOM API
      const element = event.currentTarget as SVGElement;
      let x = 0, y = 0;
      
      const transformList = (element as SVGGraphicsElement).transform?.baseVal;
      if (transformList && transformList.numberOfItems > 0) {
        const transform = transformList.getItem(0);
        if (transform.type === SVGTransform.SVG_TRANSFORM_TRANSLATE) {
          x = transform.matrix.e;
          y = transform.matrix.f;
        }
      }
      
      const bbox = rectElement.node()!.getBBox();
      const centerX = bbox.x + bbox.width / 2;
      const centerY = bbox.y + bbox.height / 2;
      
      let newRotation = parseInt(rectElement.attr('rotation')) + 90;
      
      if (newRotation == 180) newRotation = 0;
      rectElement.attr("transform", `translate(${x}, ${y}) rotate(${newRotation}, ${centerX}, ${centerY})`);
      rectElement.attr('rotation', newRotation);
      const seatItem = d3.select(seatItemGroup.node());
      seatItem.select('foreignObject').attr('transform', `translate(${x}, ${y}) rotate(${newRotation}, ${centerX}, ${centerY})`);
    });

    this.createText(seat, seatItemGroup);
    console.log(seatItemGroup.node())
    seats.add(rect);
  }

  private createText(seat: Seat, seatItemGroup: d3.Selection<SVGGElement, unknown, null, undefined>): d3.Selection<SVGForeignObjectElement, unknown, null, undefined> {
    const text = seatItemGroup.append('foreignObject')
      .attr('transform', `translate(${seat.x}, ${seat.y})`)
      .attr('transform', seat.rotation === 0 ? `
        translate(${seat.x}, ${seat.y})` : 
        `translate(${seat.x} , ${seat.y}) rotate(${seat.rotation}, ${seat.width / 2}, ${seat.height / 2})`)
      .attr('width', seat.width)
      .attr('height', seat.height)
      .attr('stroke', 'black')
      .attr('fill', 'none')
      .style('pointer-events', 'none');
      
    let htmlContent = '';
    if (seat.employees && seat.employees.length > 0) {
      htmlContent = `
        <div style="
          width: 100%; height: 100%;
          display: flex; 
          justify-content: center; 
          align-items: center;
        ">
          <div style="
            text-align: center; 
            font-size: 9px;
            writing-mode: sideways-lr; 
          ">
            ${seat.employees.map((e) => e.fullName).join('<br/>')}
          </div>
        </div>
      `;
    } else {
      htmlContent = `
        <div style="
          width: 100%; height: 100%;
          display: flex; flex-direction: column; justify-content: center; align-items: stretch;
          transform: rotate(-90deg);
          transform-origin: center;
        ">
          <div style="
            width: 100%; text-align: center;
            font-weight: bold; font-size: 9px; 
          ">
            Empty
          </div>
        </div>
      `;
    }

    text.append('xhtml:div')
      .style('width', '100%')
      .style('height', '100%')
      .style('padding', '0px')
      .style('font-size', '12px')
      .style('font-family', 'Arial, sans-serif')
      .html(htmlContent);

    return text;
  }

 private createInfoBox(roomGroup: d3.Selection<SVGGElement, unknown, null, undefined>, room: Room): void {
    this.infoBox = roomGroup.append('rect')
      .attr('x', 10)
      .attr('y', (this.selectedRoom()?.y ?? 0) > 900 ? room.height : -75)
      .attr('width', room.width - 20)
      .attr('height', 75)
      .attr('fill', 'rgb(254, 243, 205)')
      .attr('stroke', 'black')
      .attr('stroke-width', 2);

    this.foreignObject = roomGroup.append('foreignObject')
      .attr('x', 10)
      .attr('y', this.infoBox.attr('y'))
      .attr('width', this.infoBox.attr('width'))
      .attr('height', 75)
  
    this.foreignObject.append('xhtml:div')
      .style('height', '100%')
      .style('padding', '0px')
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
