import { Seat } from './seat.interface';

export interface Room {
  id: number;
  roomNumber: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: number[];
  seats: Seat[];
  seatIds: number[];
}
