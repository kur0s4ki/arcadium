# Better NestJS Middleware Patterns

## ❌ Current Problem: While Loop Approach
```typescript
// BAD: Blocking while loop
private async startMainLoop() {
  while (true) {
    try {
      const badgeId = await this.waitForBadgeScan();
      const authResult = await this.performTeamAuthorization(badgeId);
      // ... more sequential steps
    } catch (error) {
      // Handle error and continue loop
    }
  }
}
```

**Issues:**
- Blocks the event loop
- Not reactive to external events  
- Hard to test individual states
- Difficult to handle concurrent operations
- Not aligned with NestJS patterns

---

## ✅ Solution 1: Event-Driven State Machine (Implemented)

```typescript
enum GameSessionState {
  WAITING_FOR_BADGE = 'WAITING_FOR_BADGE',
  AUTHORIZING = 'AUTHORIZING',
  SETTING_UP_ROOM = 'SETTING_UP_ROOM',
  ARCADE_SESSION_ACTIVE = 'ARCADE_SESSION_ACTIVE',
  WAITING_FOR_SCORES = 'WAITING_FOR_SCORES',
  PROCESSING_RESULTS = 'PROCESSING_RESULTS',
  SHOWING_EFFECTS = 'SHOWING_EFFECTS',
  CLEANING_UP = 'CLEANING_UP',
  ERROR_STATE = 'ERROR_STATE'
}

@Injectable()
export class TeamArcadeService {
  private currentState = GameSessionState.WAITING_FOR_BADGE;
  private stateTransitions = new Subject<{from: GameSessionState, to: GameSessionState, data?: any}>();

  async onModuleInit() {
    this.initializeStateMachine();
    this.transitionTo(GameSessionState.WAITING_FOR_BADGE);
  }

  private initializeStateMachine() {
    this.stateTransitions.subscribe(({from, to, data}) => {
      console.log(`🔄 State transition: ${from} → ${to}`);
      this.handleStateTransition(to, data);
    });
    this.setupBadgeScanListener();
  }

  private transitionTo(newState: GameSessionState, data?: any) {
    const oldState = this.currentState;
    this.currentState = newState;
    this.stateTransitions.next({from: oldState, to: newState, data});
  }

  private async handleStateTransition(state: GameSessionState, data?: any) {
    switch (state) {
      case GameSessionState.WAITING_FOR_BADGE:
        await this.handleWaitingForBadge();
        break;
      case GameSessionState.AUTHORIZING:
        await this.handleAuthorizing(data.badgeId);
        break;
      // ... other states
    }
  }

  private setupBadgeScanListener() {
    // Listen for badge scans and trigger state transitions
    this.badgeScans$.subscribe((badgeId) => {
      if (this.currentState === GameSessionState.WAITING_FOR_BADGE) {
        this.transitionTo(GameSessionState.AUTHORIZING, { badgeId });
      }
    });
  }
}
```

**Benefits:**
- ✅ Non-blocking, event-driven
- ✅ Clear state management
- ✅ Easy to test individual states
- ✅ Reactive to external events
- ✅ Follows NestJS patterns
- ✅ Easy to add logging/monitoring
- ✅ Handles errors gracefully

---

## ✅ Solution 2: Observable-Based Workflow

```typescript
@Injectable()
export class TeamArcadeService {
  private gameSession$ = new BehaviorSubject<GameSession | null>(null);
  
  async onModuleInit() {
    this.setupGameSessionPipeline();
  }

  private setupGameSessionPipeline() {
    // Create reactive pipeline
    this.nfc.onTag().pipe(
      // Badge scan detected
      tap(badgeId => console.log(`Badge: ${badgeId}`)),
      
      // Authorize team
      switchMap(badgeId => this.authorizeTeam(badgeId)),
      filter(auth => auth.success),
      
      // Setup room
      switchMap(auth => this.setupRoom(auth.team)),
      
      // Start arcade session
      switchMap(team => this.startArcadeSession(team)),
      
      // Wait for scores
      switchMap(session => this.waitForScores(session)),
      
      // Process results
      switchMap(scores => this.processResults(scores)),
      
      // Cleanup
      tap(() => this.cleanup()),
      
      // Error handling
      catchError(error => {
        console.error('Session error:', error);
        this.cleanup();
        return EMPTY; // Restart pipeline
      }),
      
      // Restart on completion
      repeat()
    ).subscribe();
  }
}
```

**Benefits:**
- ✅ Functional reactive programming
- ✅ Built-in error handling and retry
- ✅ Composable operations
- ✅ Easy to add operators (debounce, retry, etc.)

---

## ✅ Solution 3: NestJS Scheduler + Events

```typescript
@Injectable()
export class TeamArcadeService {
  private currentSession: GameSession | null = null;
  
  constructor(private eventEmitter: EventEmitter2) {}

  async onModuleInit() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.eventEmitter.on('badge.scanned', this.handleBadgeScanned.bind(this));
    this.eventEmitter.on('team.authorized', this.handleTeamAuthorized.bind(this));
    this.eventEmitter.on('scores.received', this.handleScoresReceived.bind(this));
  }

  @OnEvent('badge.scanned')
  async handleBadgeScanned(badgeId: string) {
    if (this.currentSession) return; // Session already active
    
    const auth = await this.authorizeTeam(badgeId);
    if (auth.success) {
      this.eventEmitter.emit('team.authorized', auth.team);
    }
  }

  @OnEvent('team.authorized')
  async handleTeamAuthorized(team: Team) {
    await this.setupRoom(team);
    this.currentSession = await this.startArcadeSession(team);
  }

  @Cron('*/5 * * * * *') // Check every 5 seconds
  async checkSessionTimeout() {
    if (this.currentSession?.isExpired()) {
      this.eventEmitter.emit('session.timeout');
    }
  }
}
```

**Benefits:**
- ✅ Uses NestJS built-in event system
- ✅ Scheduled tasks for timeouts
- ✅ Decoupled event handling
- ✅ Easy to add new event listeners

---

## 🎯 Recommendation

**Use Solution 1 (State Machine)** for arcade middleware because:

1. **Clear State Visualization**: Easy to understand current system state
2. **Predictable Transitions**: Each state has defined entry/exit conditions  
3. **Error Recovery**: Centralized error handling with state transitions
4. **Testing**: Each state handler can be tested independently
5. **Monitoring**: Easy to add state change logging/metrics
6. **Debugging**: Clear state history for troubleshooting

The state machine approach provides the best balance of clarity, maintainability, and NestJS alignment for this use case.
