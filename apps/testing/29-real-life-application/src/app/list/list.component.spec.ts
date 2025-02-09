import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelect } from '@angular/material/select';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { LetDirective } from '@ngrx/component';
import { provideComponentStore } from '@ngrx/component-store';
import { of, throwError } from 'rxjs';
import { BackendService } from '../backend.service';
import { DetailComponent } from '../detail/detail.component';
import { ListComponent } from './list.component';
import { TicketStore } from './ticket.store';
import { AddComponent } from './ui/add.component';
import { RowComponent } from './ui/row.component';

const USERS = [
  { id: 1, name: 'titi' },
  { id: 2, name: 'george' },
];
const TICKETS = [
  {
    id: 0,
    description: 'Install a monitor arm',
    assigneeId: 1,
    completed: false,
  },
  {
    id: 1,
    description: 'Fix the internet',
    assigneeId: 1,
    completed: false,
  },
];

describe('ListComponent', () => {
  let component: ListComponent;
  let fixture: ComponentFixture<ListComponent>;
  let ticketStore: TicketStore;
  let backendService: BackendService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ListComponent,
        ReactiveFormsModule,
        RouterTestingModule.withRoutes([
          {
            path: 'detail/:id',
            component: DetailComponent,
            pathMatch: 'full',
          },
        ]),
        NoopAnimationsModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressBarModule,
        LetDirective,
        AddComponent,
        RowComponent,
      ],
      providers: [
        {
          provide: BackendService,
          useValue: {
            users: () => of(USERS),
            tickets: () => of(TICKETS),
            newTicket: () =>
              of({
                id: 2,
                description: 'New Ticket',
                assigneeId: null,
                completed: false,
              }),
            assign: (ticketId: number, userId: number) =>
              of({ ...TICKETS[0], assigneeId: userId }),
            complete: () => of({ ...TICKETS[0], completed: true }),
          },
        },
        provideComponentStore(TicketStore),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListComponent);
    component = fixture.componentInstance;
    ticketStore = TestBed.inject(TicketStore);
    backendService = TestBed.inject(BackendService);
    fixture.detectChanges();
  });

  describe('Given Install inside the search input', () => {
    it('Then one row is visible', async () => {
      fixture.autoDetectChanges();

      const searchInput = fixture.nativeElement.querySelector(
        'input[testId="search-input"]',
      );
      searchInput.value = 'Install';
      searchInput.dispatchEvent(new Event('input', {}));
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('app-row');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Install a monitor arm');
    });
  });

  describe('When typing a description and clicking on add a new ticket', () => {
    describe('Given a success answer from API', () => {
      it('Then ticket with the description is added to the list with unassigned status', async () => {
        const addButton = fixture.nativeElement.querySelector('app-add button');
        const input = fixture.nativeElement.querySelector('app-add input');
        const addTicketSpy = jest.spyOn(component.ticketStore, 'addTicket');
        fixture.detectChanges();
        input.value = 'New Description';
        input.dispatchEvent(new Event('input', {}));
        addButton.click();
        fixture.detectChanges();
        const rows = fixture.nativeElement.querySelectorAll('app-row');
        expect(addTicketSpy).toHaveBeenCalled();
        expect(rows.length).toBe(3); // Assuming the new ticket is added to the list
        const newRow = rows[rows.length - 1];
        expect(newRow.textContent).toContain('Assignee:');
        expect(newRow.textContent.toLowerCase()).toContain('unassigned');
      });
    });

    describe('Given a failure answer from API', () => {
      it('Then an error is displayed at the bottom of the list', async () => {
        jest
          .spyOn(backendService, 'newTicket')
          .mockImplementationOnce(() =>
            throwError(() => new Error('Failed to add ticket')),
          );
        const addButton = fixture.nativeElement.querySelector('app-add button');
        const input = fixture.nativeElement.querySelector('app-add input');
        const addTicketSpy = jest.spyOn(component.ticketStore, 'addTicket');
        fixture.detectChanges();
        input.value = 'New Description';
        input.dispatchEvent(new Event('input', {}));
        addButton.click();
        fixture.detectChanges();
        expect(addTicketSpy).toHaveBeenCalled();
        fixture.detectChanges();
        const errorFooter = fixture.nativeElement.querySelector('footer');
        expect(errorFooter.textContent).toContain('Failed to add ticket');
      });
    });
  });

  describe('When assigning first ticket to george', () => {
    describe('Given a success answer from API', () => {
      it('Then first ticket is assigned to George', async () => {
        fixture.autoDetectChanges();
        const spy = jest
          .spyOn(backendService, 'assign')
          .mockImplementationOnce(() => of({ ...TICKETS[0], assigneeId: 2 }));
        await fixture.whenStable();
        const assignButtons = fixture.debugElement.queryAll(By.css('button'));
        const assignButtonDebugElement = assignButtons.filter((button) => {
          return button.nativeElement.textContent.trim() === 'Assign';
        });
        expect(assignButtonDebugElement.length).toBe(2);
        const dropdownTrigger = fixture.debugElement.queryAll(
          By.directive(MatSelect),
        );
        dropdownTrigger[0].nativeElement.click();

        const overlayContainerElement = fixture.debugElement.injector
          .get(OverlayContainer)
          .getContainerElement();
        const options = overlayContainerElement.querySelectorAll('mat-option');
        const assignSpy = jest.spyOn(component.ticketStore, 'assignTicket');
        options[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        // Assuming George is the second option
        assignButtonDebugElement[0].nativeElement.click();
        expect(assignSpy).toHaveBeenCalled();
        expect(spy).toHaveBeenCalled();

        const [ticket1] = fixture.nativeElement.querySelectorAll('app-row');
        expect(ticket1.textContent).toContain('george Done'); //TODO
      });
    });

    describe('Given a failure answer from API', () => {
      it('Then an error is displayed at the bottom of the list', async () => {
        fixture.autoDetectChanges();
        const spy = jest
          .spyOn(backendService, 'assign')
          .mockImplementationOnce(() =>
            throwError(() => new Error('Failed to assign ticket')),
          );
        await fixture.whenStable();
        const assignButtons = fixture.debugElement.queryAll(By.css('button'));
        const assignButtonDebugElement = assignButtons.filter((button) => {
          return button.nativeElement.textContent.trim() === 'Assign';
        });
        expect(assignButtonDebugElement.length).toBe(2);
        const dropdownTrigger = fixture.debugElement.queryAll(
          By.directive(MatSelect),
        );
        dropdownTrigger[0].nativeElement.click();

        const overlayContainerElement = fixture.debugElement.injector
          .get(OverlayContainer)
          .getContainerElement();
        const options = overlayContainerElement.querySelectorAll('mat-option');
        const assignSpy = jest.spyOn(component.ticketStore, 'assignTicket');
        options[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));

        assignButtonDebugElement[0].nativeElement.click();
        expect(assignSpy).toHaveBeenCalled();
        expect(spy).toHaveBeenCalled();

        const errorFooter = fixture.nativeElement.querySelector('footer');
        expect(spy).toHaveBeenCalled();
        expect(errorFooter.textContent).toContain('Failed to assign ticket');
      });
    });
  });

  describe('When finishing first ticket', () => {
    describe('Given a success answer from API', () => {
      it('Then first ticket is done', async () => {
        // fixture.autoDetectChanges();
        fixture.autoDetectChanges();
        const completeSpy = jest
          .spyOn(backendService, 'complete')
          .mockImplementationOnce(() => of({ ...TICKETS[0], completed: true }));
        const doneSpy = jest.spyOn(component.ticketStore, 'done');

        const doneButtons = fixture.debugElement.queryAll(By.css('button'));
        const doneButtonDebugElement = doneButtons.filter((button) => {
          return button.nativeElement.textContent.trim() === 'Done';
        });
        expect(doneButtonDebugElement.length).toBe(2);

        //Click first ticket done button
        doneButtonDebugElement[0].nativeElement.click();

        expect(completeSpy).toHaveBeenCalledWith(TICKETS[0].id, true);
        expect(doneSpy).toHaveBeenCalledWith(0);

        //get ticket 1 and ticket 2 elements
        const [ticket1Element, ticket2Element] =
          fixture.nativeElement.querySelectorAll('li');
        expect(ticket1Element.classList).toContain('bg-green-200'); //since done ticket has bg-green-200 class
        expect(ticket2Element.classList).not.toContain('bg-green-200');
      });
    });

    describe('Given a failure answer from API', () => {
      it('Then an error is displayed at the bottom of the list', async () => {
        fixture.autoDetectChanges();
        const completeSpy = jest
          .spyOn(backendService, 'complete')
          .mockImplementationOnce(() =>
            throwError(() => new Error('Failed to complete ticket')),
          );
        const doneSpy = jest.spyOn(component.ticketStore, 'done');

        const doneButtons = fixture.debugElement.queryAll(By.css('button'));
        const doneButtonDebugElement = doneButtons.filter((button) => {
          return button.nativeElement.textContent.trim() === 'Done';
        });
        doneButtonDebugElement[0].nativeElement.click();
        expect(completeSpy).toHaveBeenCalledWith(TICKETS[0].id, true);
        expect(doneSpy).toHaveBeenCalledWith(0);
        const errorFooter = fixture.nativeElement.querySelector('footer');
        expect(errorFooter.textContent).toContain('Failed to complete ticket');
      });
    });
  });

  describe('When clicking on first ticket', () => {
    it('Then we navigate to detail/0', async () => {
      fixture.autoDetectChanges();
      const router = TestBed.inject(Router);

      expect(router.url).toBe('/');

      const buttons = fixture.nativeElement.querySelectorAll(
        'button[testId="link-button"]',
      );
      const spy = jest.spyOn(router, 'navigateByUrl');
      buttons[0].click();
      await fixture.whenRenderingDone();
      expect(spy).toHaveBeenCalled();
      expect(router.url).toBe('/detail/0');
    });
  });
});
