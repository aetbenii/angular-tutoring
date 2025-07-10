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
import { catchError, EMPTY, Observable, BehaviorSubject, firstValueFrom } from 'rxjs';

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
  svgNotAvailable = signal<boolean>(false);
  searchControl = new FormControl<string>('');
  selectedFloorControl = new FormControl<number | null>(null);
  floors = this.floorService.floors;
  options: string[] = [];
  filteredNames = new BehaviorSubject<{id: number, fullName: string, floorName: string}[]>([]);
  selectedFloor = this.floorService.selectedFloor;

  constructor(
    private employeeService: EmployeeService,
    private snackBar: MatSnackBar,
    private http: HttpClient
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
        ).subscribe(async response => {
          const expandedList: { id: number; fullName: string; floorName: string; seatId: number }[] = [];
          
          // Collect all seat IDs that need floor info
          const seatIds = response.content.flatMap(employee => 
            employee.seatIds.length > 1 ? employee.seatIds : []
          );
          
          // Batch fetch seat info if there are any multi-seat employees
          let seatFloorMap = new Map<number, string>();
          if (seatIds.length > 0) {
            try {
              const seatInfoPromises = seatIds.map(id => 
                this.floorService.getSeatInfo(id).toPromise()
              );
              const seatInfos = await Promise.all(seatInfoPromises);
              seatFloorMap = new Map(
                seatInfos.filter(seat => seat != null).map(seat => [seat.id, seat.floorName])
              );
            } catch (error) {
              console.error('Error fetching seat floor info:', error);
            }
          }
          
          // Build expanded list with cached floor info
          response.content.forEach(employee => {
            if (employee.seatIds.length > 1) {
              employee.seatIds.forEach(seatId => {
                expandedList.push({
                  id: employee.id,
                  fullName: employee.fullName,
                  floorName: seatFloorMap.get(seatId) || "",
                  seatId: seatId
                });
              });
            } else {
              expandedList.push({
                id: employee.id,
                fullName: employee.fullName,
                floorName: "",
                seatId: employee.seatIds[0]
              });
            }
          });
          
          this.filteredNames.next(expandedList);
        });
      }
    });
  }

  ngAfterViewInit(): void {}

  displayFn(employee: { id: number; fullName: string }): string {
    return employee ? employee.fullName : '';
  }

  async onEmployeeSelected(event: MatAutocompleteSelectedEvent) {
    const selectedEmployee = event.option.value;
    console.log('Selected employee:', selectedEmployee);
    this.employeeService.getEmployeeSeats(selectedEmployee.id).subscribe({
      next: async (response) => {
        console.log('Employee seats response:', response);
        if(!response){
          this.error.set('Unexpected response format.');
          return;
        }
        if( response.length === 0){
          console.error('No seats found for employee:', selectedEmployee);
          this.snackBar.open('No seat found for employee: ' + selectedEmployee.fullName, 'Close', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
          return;
        }
        if(response[0].x === 0 && response[0].y === 0){
          this.error.set('No Room or Seat created yet');
          this.snackBar.open('No Room or Seat created yet', 'Close', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
          return;
        }
        this.error.set(null);
        response.map(seat => {
          if(seat.id == event.option.value.seatId){
            if( this.selectedFloorControl.value !== seat.floorId){
              this.selectedFloorControl.setValue(seat.floorId);
            }
            setTimeout(() => {
              this.zoomOnEmployee(seat);
            }, 250);
            return;
          }
        });
      },
      error: (error) => {
        console.error('Error loading employee seats:', error);
      }
    });
  }

  private loadFloorPlan(floorNumber: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.svgNotAvailable.set(false);
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
      .style('border', '1px solid #e0e0e0')
      .style('border-radius', '8px')
      .style('box-shadow', '0 2px 8px rgba(0, 0, 0, 0.1)')
      .style('background', 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)');

    const backgroundGroup = this.svg.append('g')
      .attr('class', 'background-layer');

    

    this.g = this.svg.append('g')
      .attr('class', 'interactive-layer');

    // Load the background SVG using Angular HttpClient (which goes through auth interceptor)
    console.log(`Loading SVG from: ${this.apiUrl}/floors/${floorNumber}/svg`);
    this.http.get(`${this.apiUrl}/floors/${floorNumber}/svg`, { 
      responseType: 'text',
      headers: { 'Accept': 'image/svg+xml' }
    }).subscribe({
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
        backgroundGroup.node().appendChild(backgroundSvg);
        
        if(floorNumber == 2){
          d3.select(backgroundSvg)
            .attr('width', 3300)
            .attr('height', 1325);
        }
        
        // Configure D3 zoom behavior for pan and zoom functionality
        this.configureZoom(backgroundGroup);
        this.drawRooms(this.g).catch(error => {
          console.error('Error drawing rooms:', error);
          this.error.set('Error loading floor data');
        });
      },
      error: (error) => {
        this.loading.set(false);
        this.svgNotAvailable.set(true);
        this.error.set('Floor plan not available');
        console.error('Error loading background SVG:', error);
      }
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

    const rectNode = d3.select('#room-group-' + seat.roomId).node() as SVGRectElement;
    if (!rectNode) {
      console.error('No rectangle found for room ID:', seat.roomId);
      return;
    }
    const x = rectNode.transform.baseVal.getItem(0).matrix.e;
    const y = rectNode.transform.baseVal.getItem(0).matrix.f;
    this.svg.transition()
      .duration(750)
      .call(this.zoom.transform, d3.zoomIdentity.translate((x*-1.5 + 820) - rectNode.getBBox().width/2, y*-1.5 + 150).scale(1.5));
    
  }

  private async drawRooms(g: any): Promise<void> {
    const rooms = this.selectedFloor()?.rooms || [];
    
    // First, draw all room containers immediately for visual feedback
    const roomGroups = rooms.map(room => {
      const roomGroup = g.append('g').attr('id', 'room-group-' + room.id);
      if (room.x !== 0 && room.y !== 0) {
        this.drawRoomContainer(roomGroup, room);
      }
      return { roomGroup, room };
    });

    // Then, batch load all employee data for all rooms
    const allSeats = rooms.flatMap(room => room.seats || []);
    const enrichedSeats = await this.enrichSeatsWithEmployees(allSeats);
    
    // Create a map of seat ID to enriched seat data
    const seatMap = new Map(enrichedSeats.map(seat => [seat.id, seat]));

    // Finally, draw seats for each room using the pre-loaded data
    roomGroups.forEach(({ roomGroup, room }) => {
      if (room.x !== 0 && room.y !== 0) {
        const roomSeats = (room.seats || []).map(seat => seatMap.get(seat.id) || seat);
        this.drawRoomSeats(roomGroup, roomSeats);
      }
    });
  }

  private drawRoomContainer(roomGroup: any, room: Room): void {
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
      .attr('fill', 'black');

    this.createInfoBox(roomGroup, rect, room);
  }

  private drawRoomSeats(roomGroup: any, seats: any[]): void {
    seats.forEach((seat) => {
      this.drawSeat(roomGroup, seat);
    });
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

    const text = group.append('foreignObject')
      .attr('transform', seat.rotation === 0
        ? `translate(${seat.x}, ${seat.y})`
        : `translate(${seat.x}, ${seat.y}) rotate(${seat.rotation}, ${seat.width / 2}, ${seat.height / 2})`)
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
            font-size: 10px;
            writing-mode: sideways-lr;
          ">
            ${seat.employees.map((e: any) => e.fullName).join('<br/>')}
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
      .style('font-family', 'Arial')
      .html(htmlContent);

    if (!seat.employees || seat.employees.length === 0) {
      rect
        .attr('fill', 'rgb(123, 184, 148)')
        .attr('stroke', 'rgb(29, 112, 61)');
    }
  }

  private async enrichSeatsWithEmployees(seats: Seat[]): Promise<any[]> {
    // Collect all unique employee IDs from all seats
    const allEmployeeIds = seats.reduce((ids: number[], seat) => {
      if (seat.employeeIds && seat.employeeIds.length > 0) {
        ids.push(...seat.employeeIds);
      }
      return ids;
    }, []);

    // Remove duplicates
    const uniqueEmployeeIds = [...new Set(allEmployeeIds)];

    if (uniqueEmployeeIds.length === 0) {
      return seats.map(seat => ({ ...seat, employees: [] }));
    }

    try {
      // Fetch all employees in one batch request
      const allEmployees = await this.employeeService.getEmployeesByIds(uniqueEmployeeIds).toPromise();
      
      // Create a map for quick lookup
      const employeeMap = new Map(allEmployees?.map(emp => [emp.id, emp]) || []);

      // Map employees to their respective seats
      return seats.map(seat => {
        if (seat.employeeIds && seat.employeeIds.length > 0) {
          const employees = seat.employeeIds.map(id => employeeMap.get(id)).filter(Boolean);
          return { ...seat, employees };
        } else {
          return { ...seat, employees: [] };
        }
      });
    } catch (error) {
      console.error('Error fetching employees in batch:', error);
      // Fallback to empty employees if batch fails
      return seats.map(seat => ({ ...seat, employees: [] }));
    }
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


