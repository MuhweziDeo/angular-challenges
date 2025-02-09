import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { BackendService } from '../backend.service';
import { TicketState, TicketStore } from './ticket.store';

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

describe('TicketStore', () => {
  let backendService: BackendService;
  let store: TicketStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
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
        TicketStore,
      ],
    });
    backendService = TestBed.inject(BackendService);
    store = TestBed.inject(TicketStore);
    store.ngrxOnStoreInit();
  });

  describe('When init', () => {
    it('Then calls backend.users', fakeAsync(() => {
      const spy = jest
        .spyOn(backendService, 'users')
        .mockReturnValue(of([{ id: 1, name: 'test' }]));
      jest.spyOn(backendService, 'tickets').mockReturnValue(of([]));
      const loadUsersSpy = jest.spyOn(store, 'loadUsers');
      store.ngrxOnStateInit();
      tick();
      expect(loadUsersSpy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
    }));

    it('Then calls backend.tickets', fakeAsync(() => {
      jest
        .spyOn(backendService, 'users')
        .mockReturnValue(of([{ id: 1, name: 'test' }]));
      const spy = jest.spyOn(backendService, 'tickets').mockReturnValue(of([]));
      const loadTickets = jest.spyOn(store, 'loadTickets');
      store.ngrxOnStateInit();
      tick();
      expect(loadTickets).toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
    }));

    describe('Given all api returns success response', () => {
      it('Then tickets and users should be merged ', fakeAsync(() => {
        jest.spyOn(backendService, 'users').mockReturnValue(of(USERS));
        jest.spyOn(backendService, 'tickets').mockReturnValue(of(TICKETS));
        store.ngrxOnStateInit();
        tick();
        let value;
        store.vm$.subscribe((v) => (value = v));
        tick();
        expect(value).toEqual({
          tickets: TICKETS.map((t) => ({ ...t, assignee: 'titi' })),
          users: USERS,
          loading: false,
          error: '',
        });
      }));
    });

    describe('Given users api returns failure response', () => {
      it('Then tickets should not have any assignee', fakeAsync(() => {
        jest
          .spyOn(backendService, 'users')
          .mockReturnValue(throwError(new Error('Failed')));
        jest.spyOn(backendService, 'tickets').mockReturnValue(of(TICKETS));
        store.ngrxOnStateInit();
        tick();
        let value;
        store.vm$.subscribe((v) => (value = v));
        tick();
        expect(value).toEqual({
          tickets: TICKETS,
          users: [],
          loading: false,
          error: new Error('Failed'),
        });
      }));
    });

    describe('When adding a new ticket with success', () => {
      it('Then ticket is added to the list', fakeAsync(() => {
        const spy = jest.spyOn(backendService, 'newTicket');
        store.addTicket('New Ticket');
        expect(spy).toHaveBeenCalled();
        let value: Partial<TicketState> | undefined = {};
        tick();
        store.vm$.subscribe((v) => (value = v));
        tick();
        expect(value?.tickets || []).toContainEqual({
          id: 2,
          description: 'New Ticket',
          assigneeId: null,
          completed: false,
          assignee: undefined,
        });
      }));
    });
  });
});
