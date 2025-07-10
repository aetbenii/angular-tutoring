# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Angular 19 application for HR seat management that allows employees to view and manage office seating arrangements across multiple floors. The application features interactive floor maps with SVG visualizations using D3.js, employee management with search and pagination, and seat assignment capabilities.

## Technology Stack

- **Frontend**: Angular 19 with Angular Material
- **Visualization**: D3.js for interactive floor maps
- **Testing**: Jasmine/Karma for unit tests, Playwright for E2E tests  
- **State Management**: Hybrid approach using Angular Signals (FloorService) and RxJS Observables (EmployeeService)
- **Backend API**: REST API at `http://localhost:8080/api`

## Development Commands

### Essential Commands
- `npm start` - Start development server on all interfaces (0.0.0.0) with polling
- `npm run build` - Build the application for production
- `npm run lint` - Run ESLint on the codebase
- `npm test` - Run unit tests (headless Chrome, single run)
- `npm run test:watch` - Run unit tests in watch mode

### Testing Commands
- `npm run test:e2e` - Run Playwright E2E tests (headless)
- `npm run test:e2e:ui` - Run E2E tests with Playwright UI
- `npm run test:e2e:debug` - Run E2E tests in debug mode

### Development Setup
The development server uses `--host 0.0.0.0 --poll=2000` for compatibility with development environments that require external access and file watching.

## Architecture

### Core Components Structure
- **Dashboard** - Main landing page with overview
- **Employees** - Employee management with search/pagination
- **Floor Plans** - Interactive floor map visualization and seat management
- **Floor Map** - SVG-based floor visualization with D3.js
- **Edit Map** - Seat editing interface for specific floor/room combinations
- **Offices** - Office/room management interface

### Service Architecture
The application uses two distinct state management patterns:

#### Signal-Based Services (FloorService)
- Uses Angular Signals for local state management
- Provides synchronous access to current state
- Best for frequently changing UI state
- Example: `floorService.selectedFloor()` returns current floor

#### Observable-Based Services (EmployeeService)  
- Uses RxJS Observables for HTTP requests
- Provides paginated responses with search functionality
- Best for server communication and data transformation
- Example: `employeeService.getEmployees(searchTerm, page, size)`

### Key Interfaces
- **Employee**: `{ id, fullName, occupation, createdAt, seats }`
- **Seat**: `{ id, seatNumber, roomId, floorId, x, y, width, height, rotation, employeeIds, occupied }`
- **EmployeeResponse**: Paginated wrapper with `{ content[], totalElements, totalPages, currentPage, size }`

### Routing Structure
- `/dashboard` - Dashboard component (default route)
- `/employees` - Employee management
- `/offices` - Office management  
- `/floor-plans` - Floor plan visualization
- `/floor-map` - Interactive floor map
- `/edit-map/:floorId/:roomId` - Seat editing for specific floor/room

## Development Guidelines

### State Management
- Use **Signals** for local component state and UI state sharing
- Use **Observables** for HTTP requests and complex data transformations
- Follow the hybrid pattern documented in `docs/state-management-patterns.md`

### API Integration
- Base API URL: `http://localhost:8080/api`
- All services include retry logic and error handling
- Employee service uses search endpoint: `/employees/search` with pagination
- Seat management through employee-seat assignment endpoints

### Testing Strategy
- Unit tests use Jasmine/Karma with headless Chrome
- E2E tests use Playwright with multi-browser support
- Test files: Unit tests alongside components, E2E tests in `/e2e` directory

### Documentation
Comprehensive service documentation is available in:
- `docs/employee-service-guide.md` - Detailed EmployeeService usage and RxJS patterns
- `docs/state-management-patterns.md` - Signals vs Observables comparison

### Component Development
- Follow lazy loading pattern for route components
- Use Angular Material for UI components
- SVG manipulation uses D3.js for floor map interactions
- Maintain responsive design patterns

## Important Implementation Notes

### Pagination
The EmployeeService implements server-side pagination:
```typescript
getEmployees(searchTerm = '', pageIndex = 0, pageSize = 5): Observable<EmployeeResponse>
```

### Floor Map Visualization
- Uses SVG with D3.js for interactive floor plans
- Seats have coordinates (x, y) and dimensions (width, height, rotation)
- Edit map component handles seat positioning and assignment

### Error Handling
- All HTTP services include comprehensive error handling
- Services use RxJS retry operators for resilience
- Error messages are logged and propagated to components