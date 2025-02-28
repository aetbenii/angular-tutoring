import { Seat } from './seat.interface';

export interface Room {
  id: number;
  roomNumber: string;
  name: string;
  createdAt: number[];
  seats: Seat[];
}
