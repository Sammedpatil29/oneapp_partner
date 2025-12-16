import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NeedHelpPage } from './need-help.page';

describe('NeedHelpPage', () => {
  let component: NeedHelpPage;
  let fixture: ComponentFixture<NeedHelpPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NeedHelpPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
