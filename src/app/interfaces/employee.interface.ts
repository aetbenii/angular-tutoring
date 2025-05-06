import { Seat } from "./seat.interface";

export interface Employee {
  id: number;
  fullName: string;
  occupation: string;
  createdAt: number[];
  seats: Seat[];
} 