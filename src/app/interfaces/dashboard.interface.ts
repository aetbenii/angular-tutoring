export interface DashboardStats {
  totalEmployees: number;
  totalFloors: number;
  totalOffices: number;
  totalSeats: number;
  occupancyRate: number;
  officesPerFloor: { floorNumber: number; officeCount: number }[];
  seatsPerFloor: { floorNumber: number; seatCount: number }[];
} 