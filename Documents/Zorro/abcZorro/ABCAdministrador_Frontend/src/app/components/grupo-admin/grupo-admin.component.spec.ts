import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GrupoAdminComponent } from './grupo-admin.component';

describe('GrupoAdminComponent', () => {
  let component: GrupoAdminComponent;
  let fixture: ComponentFixture<GrupoAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrupoAdminComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GrupoAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
