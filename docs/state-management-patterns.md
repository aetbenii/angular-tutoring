# State Management Patterns in Our Application

This document explains the two different approaches we use for state management in our services: Signals and Observables.

## Overview

Our application uses two different patterns for managing state and data flow:
1. **Signals** (used in `FloorService`)
2. **Observables** (used in `EmployeeService`)

Both approaches have their strengths, and understanding when to use each is important.

## Signal-Based Approach (FloorService)

### How It Works

```typescript
export class FloorService {
  private selectedFloorSignal = signal<Floor | null>(null);
  private floorsSignal = signal<Floor[]>([]);

  get selectedFloor() {
    return this.selectedFloorSignal.asReadonly();
  }

  get floors() {
    return this.floorsSignal.asReadonly();
  }

  loadFloor(floorNumber: number) {
    this.http.get<Floor>(`${this.apiUrl}/floors/${floorNumber}`)
      .subscribe({
        next: (floor) => this.selectedFloorSignal.set(floor),
        error: () => this.selectedFloorSignal.set(null)
      });
  }
}
```

### Characteristics

1. **Local State Management**
   - Uses Angular's new Signals API
   - State is stored locally in the service
   - Components access state through readonly signals
   - Synchronous access to current values

2. **Usage Pattern**
   ```typescript
   // In component
   constructor(private floorService: FloorService) {
     // Access current value
     console.log(this.floorService.floors());
   }
   ```

3. **Best For**
   - UI state that needs to be shared
   - Frequently changing data
   - When you need synchronous access to current values
   - When you want fine-grained reactivity

## Observable-Based Approach (EmployeeService)

### How It Works

```typescript
export class EmployeeService {
  getEmployees(searchTerm = '', pageIndex = 0, pageSize = 5): Observable<EmployeeResponse> {
    return this.http.get<EmployeeResponse>(`${this.apiUrl}/employees/search`, {
      params: new HttpParams()
        .set('search', searchTerm)
        .set('page', pageIndex.toString())
        .set('size', pageSize.toString())
    }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }
}
```

### Characteristics

1. **Stream-Based Data Flow**
   - Uses RxJS Observables
   - Data is streamed directly from HTTP calls to components
   - No local state storage
   - Asynchronous by nature

2. **Usage Pattern**
   ```typescript
   // In component
   constructor(private employeeService: EmployeeService) {
     this.employeeService.getEmployees().subscribe(
       employees => console.log(employees)
     );
   }
   ```

3. **Best For**
   - HTTP requests
   - Data that needs transformation
   - When you need to combine multiple data sources
   - When you want to leverage RxJS operators

## When to Use Each

### Use Signals When:
- You need to maintain local state
- You want synchronous access to current values
- The state updates frequently
- You need fine-grained reactivity
- You want to avoid subscription management

### Use Observables When:
- You're working directly with HTTP responses
- You need complex data transformations
- You need to combine multiple data streams
- You want to leverage RxJS operators
- You need to handle cancellation

## Example: Combining Both Approaches

Sometimes you might want to combine both approaches. Here's an example:

```typescript
export class HybridService {
  // Signal for local state
  private dataSignal = signal<Data[]>([]);
  
  // Observable for HTTP requests
  getData(): Observable<Data[]> {
    return this.http.get<Data[]>('/api/data').pipe(
      tap(data => this.dataSignal.set(data))
    );
  }

  // Synchronous access to current state
  get currentData() {
    return this.dataSignal.asReadonly();
  }
}
```

## Best Practices

1. **Signals**
   - Always return readonly signals from getters
   - Keep signal updates close to the data source
   - Use computed signals for derived state
   - Consider using effects for side effects

2. **Observables**
   - Use appropriate error handling
   - Consider using shareReplay() for caching
   - Properly manage subscriptions
   - Use appropriate RxJS operators

## Migration Considerations

When deciding whether to migrate from one approach to another:

1. **Observable to Signal**
   - Consider if you need local state management
   - Evaluate if synchronous access would be beneficial
   - Check if subscription management is becoming complex

2. **Signal to Observable**
   - Consider if you need complex transformations
   - Evaluate if you need to combine multiple data sources
   - Check if you need advanced RxJS features

## Conclusion

Both Signals and Observables have their place in modern Angular applications. The choice between them depends on your specific use case:

- Use Signals for local state management and synchronous access
- Use Observables for HTTP requests and complex data transformations
- Consider combining both when appropriate

Remember that these patterns are not mutually exclusive, and you can use both in your application where they make the most sense. 