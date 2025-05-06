import { Employee } from "./employee.interface";

export interface Seat {
  id: number;
  seatNumber: string;
  roomId: number;
  roomName: string;
  floorId: number;
  floorName: string;
  createdAt: number[];
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  employeeIds: number[];
  employees: Employee[];
  occupied: boolean;
}
