import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { Room } from '../interfaces/room.interface';
import { Seat } from '../interfaces/seat.interface';

export interface D3MapConfig {
  width: string;
  height: string;
  borderStyle?: string;
  borderRadius?: string;
  boxShadow?: string;
  background?: string;
  zoomExtent?: [number, number];
  initialTransform?: {
    translateX: number;
    translateY: number;
    scale: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class D3MapService {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private backgroundGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private interactiveGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private zoom: d3.ZoomBehavior<Element, unknown> | null = null;

  /**
   * Initialize SVG with container and basic setup
   */
  initializeSvg(
    container: HTMLElement,
    config: D3MapConfig = this.getDefaultConfig()
  ): void {
    this.svg = d3.select(container)
      .append('svg')
      .attr('width', config.width)
      .attr('height', config.height)
      .style('border', config.borderStyle || '1px solid #e0e0e0')
      .style('border-radius', config.borderRadius || '8px')
      .style('box-shadow', config.boxShadow || '0 2px 8px rgba(0, 0, 0, 0.1)')
      .style('background', config.background || 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)');

    this.backgroundGroup = this.svg.append('g')
      .attr('class', 'background-layer');

    this.interactiveGroup = this.svg.append('g')
      .attr('class', 'interactive-layer');

    this.configureZoom(config.zoomExtent || [0.1, 4], config.initialTransform);
  }

  /**
   * Configure zoom behavior
   */
  private configureZoom(
    scaleExtent: [number, number],
    initialTransform?: { translateX: number; translateY: number; scale: number }
  ): void {
    this.zoom = d3.zoom()
      .scaleExtent(scaleExtent)
      .on('zoom', (event) => {
        this.backgroundGroup.attr('transform', event.transform);
        this.interactiveGroup.attr('transform', event.transform);
      });

    this.svg.call(this.zoom);

    if (initialTransform) {
      const transform = d3.zoomIdentity
        .translate(initialTransform.translateX, initialTransform.translateY)
        .scale(initialTransform.scale);
      this.svg.call(this.zoom.transform, transform);
    }
  }

  /**
   * Load and set background SVG
   */
  setBackgroundSvg(svgContent: string, viewBox?: string): void {
    if (!this.backgroundGroup) return;

    // Clear existing background
    this.backgroundGroup.selectAll('*').remove();

    // Parse and append the SVG
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    const backgroundSvg = svgDoc.documentElement;

    if (viewBox) {
      this.svg.attr('viewBox', viewBox);
    } else {
      const extractedViewBox = backgroundSvg.getAttribute('viewBox');
      if (extractedViewBox) {
        this.svg.attr('viewBox', extractedViewBox);
      }
    }

    this.backgroundGroup.node().appendChild(backgroundSvg);
  }

  /**
   * Draw rooms with D3 enter/update/exit pattern
   */
  drawRooms(rooms: Room[], enrichedSeats: Map<number, Seat>): void {
    if (!this.interactiveGroup) return;

    // Use D3's enter/update/exit pattern
    const roomSelection = this.interactiveGroup.selectAll('.room-group')
      .data(rooms, (d) => (d as Room).id);

    // Remove old rooms with exit transition
    roomSelection.exit()
      .transition()
      .duration(300)
      .style('opacity', 0)
      .remove();

    // Add new rooms with enter transition
    const enteringRooms = roomSelection.enter()
      .append('g')
      .attr('class', 'room-group')
      .attr('id', (d) => 'room-group-' + d.id)
      .style('opacity', 0);

    // Merge entering and updating selections
    const allRooms = enteringRooms.merge(roomSelection);

    // Draw room containers and seats
    allRooms.each((room: Room, i: number, nodes: ArrayLike<Element>) => {
      const roomGroup = d3.select(nodes[i]);
      
      // Clear existing content
      roomGroup.selectAll('*').remove();
      
      if (room.x !== 0 && room.y !== 0) {
        this.drawRoomContainer(roomGroup, room);
        this.drawRoomSeats(roomGroup, room.seats || [], enrichedSeats);
      }
    });

    // Animate new rooms into view
    enteringRooms
      .transition()
      .duration(500)
      .style('opacity', 1);
  }

  /**
   * Draw individual room container
   */
  private drawRoomContainer(roomGroup: d3.Selection<SVGGElement, Room, null, undefined>, room: Room): void {
    roomGroup.attr('transform', `translate(${room.x}, ${room.y})`);
    
    roomGroup.append('rect')
      .attr('width', room.width)
      .attr('height', room.height)
      .attr('fill', 'rgba(255, 255, 255, 0.3)');

    roomGroup.append('text')
      .attr('x', room.width / 2)
      .attr('y', room.height / 2)
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .attr('fill', 'black');

    this.createRoomInfoBox(roomGroup, room);
  }

  /**
   * Create room info box
   */
  private createRoomInfoBox(roomGroup: d3.Selection<SVGGElement, Room, null, undefined>, room: Room): void {
    const infoBox = roomGroup.append('rect')
      .attr('x', 10)
      .attr('y', room.y > 200 ? room.height : -75)
      .attr('width', room.width - 20)
      .attr('height', 75)
      .attr('fill', 'rgb(254, 243, 205)')
      .attr('stroke', 'black')
      .attr('stroke-width', 2);

    const foreignObject = roomGroup.append('foreignObject')
      .attr('x', 10)
      .attr('y', infoBox.attr('y'))
      .attr('width', infoBox.attr('width'))
      .attr('height', 75);

    foreignObject.append('xhtml:div')
      .style('height', '100%')
      .style('padding', '0 10px 0 10px')
      .style('font-size', '14px')
      .style('font-family', 'Arial, sans-serif')
      .html(`
        <div style="display: flex; flex-direction: column; gap: 0; height: 100%; justify-content: center;">
          <div style="text-align: center;">
            <b>${room.name}</b><br/>
            <b>${room.roomNumber}</b>
          </div>
        </div>
      `);
  }

  /**
   * Draw seats for a room
   */
  private drawRoomSeats(roomGroup: d3.Selection<SVGGElement, Room, null, undefined>, seats: Seat[], enrichedSeats: Map<number, Seat>): void {
    seats.forEach((seat) => {
      const enrichedSeat = enrichedSeats.get(seat.id) || seat;
      this.drawSeat(roomGroup, enrichedSeat);
    });
  }

  /**
   * Draw individual seat
   */
  private drawSeat(roomGroup: d3.Selection<SVGGElement, Room, null, undefined>, seat: Seat): void {
    const seatGroup = roomGroup.append('g')
      .attr('transform', `translate(${seat.x}, ${seat.y})`);

    seatGroup.append('rect')
      .attr('width', seat.width)
      .attr('height', seat.height)
      .attr('fill', seat.employees && seat.employees.length > 0 ? 'rgb(255, 99, 132)' : 'rgb(123, 184, 148)')
      .attr('stroke', seat.employees && seat.employees.length > 0 ? 'rgb(220, 53, 69)' : 'rgb(29, 112, 61)')
      .attr('stroke-width', 2);

    // Add seat content
    const text = seatGroup.append('foreignObject')
      .attr('width', seat.width)
      .attr('height', seat.height)
      .attr('x', 0)
      .attr('y', 0);

    const htmlContent = this.generateSeatContent(seat);
    text.append('xhtml:div')
      .style('width', '100%')
      .style('height', '100%')
      .style('padding', '0px')
      .style('font-family', 'Arial')
      .html(htmlContent);
  }

  /**
   * Generate HTML content for seat
   */
  private generateSeatContent(seat: Seat): string {
    if (!seat.employees || seat.employees.length === 0) {
      return `
        <div style="
          display: flex; align-items: center; justify-content: center; 
          height: 100%; width: 100%; text-align: center;
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

    const employee = seat.employees[0];
    return `
      <div style="
        display: flex; align-items: center; justify-content: center; 
        height: 100%; width: 100%; text-align: center;
        transform: rotate(-90deg);
        transform-origin: center;
      ">
        <div style="
          width: 100%; text-align: center;
          font-weight: bold; font-size: 9px; 
        ">
          ${employee.fullName}
        </div>
      </div>
    `;
  }

  /**
   * Zoom to specific location
   */
  zoomTo(x: number, y: number, scale = 1.5, duration = 750): void {
    if (!this.svg || !this.zoom) return;

    this.svg.transition()
      .duration(duration)
      .call(this.zoom.transform, 
        d3.zoomIdentity.translate(x, y).scale(scale));
  }

  /**
   * Clear all content
   */
  clearAll(): void {
    if (this.backgroundGroup) {
      this.backgroundGroup.selectAll('*').remove();
    }
    if (this.interactiveGroup) {
      this.interactiveGroup.selectAll('*').remove();
    }
  }

  /**
   * Destroy SVG and clean up
   */
  destroy(): void {
    if (this.svg) {
      this.svg.remove();
      this.svg = null;
      this.backgroundGroup = null;
      this.interactiveGroup = null;
      this.zoom = null;
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): D3MapConfig {
    return {
      width: '100%',
      height: '100%',
      borderStyle: '1px solid #e0e0e0',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      zoomExtent: [0.1, 4],
      initialTransform: {
        translateX: -50,
        translateY: 0,
        scale: 0.8
      }
    };
  }

  /**
   * Get current SVG element (for external access if needed)
   */
  getSvg(): d3.Selection<SVGSVGElement, unknown, null, undefined> | null {
    return this.svg;
  }
}