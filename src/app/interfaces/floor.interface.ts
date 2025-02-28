import { Room } from './room.interface';

export interface Floor {
  id: number;
  floorNumber: number;
  name: string;
  createdAt: number[];
  rooms: Room[];
}
