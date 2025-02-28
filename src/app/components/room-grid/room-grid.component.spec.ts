import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomGridComponent } from './room-grid.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('RoomGridComponent', () => {
  let component: RoomGridComponent;
  let fixture: ComponentFixture<RoomGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        RoomGridComponent
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RoomGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
