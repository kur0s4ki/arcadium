# GameManagerResource API Integration Specification for NestJS Backend

## Overview

This document provides complete technical specifications for integrating with the Spring Boot GameManagerResource endpoints from a NestJS backend service. The NestJS backend will act as an intermediary service that consumes these endpoints internally without exposing them as REST APIs.

## Integration Context

- **Consumer**: NestJS backend service (internal consumption)
- **Provider**: Spring Boot GameManagerResource
- **Authentication**: No JWT authentication required for these calls
- **Usage Pattern**: Internal service-to-service communication
- **Data Flow**: NestJS receives requests → processes → calls Spring Boot endpoints → returns processed responses

## Endpoint Specifications

### 1. Team Authorization Endpoint

**Technical Details:**

- **HTTP Method**: GET
- **Full URL Path**: `/api/game-manager/team-authorization`
- **Content Type**: Not applicable (GET request)
- **Response Type**: `application/json`

**Query Parameters:**
| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `badgeId` | String | Yes | Badge ID of any team member | Non-empty string |
| `gameId` | Long | Yes | Target game identifier | Positive integer |

**Request Headers:**

```
Accept: application/json
```

**Complete Request URL Format:**

```
GET /api/game-manager/team-authorization?badgeId={badgeId}&gameId={gameId}
```

**Response Schema:**

```typescript
interface TeamGameManagerResponse {
  code: number; // Status code (200 = success, others = error)
  message: string; // Human-readable status message
  team: TeamData | null; // Team information (null on error)
  players: PlayerData[] | null; // Array of team players (null on error)
}

interface TeamData {
  id: number;
  name: string;
  playerCount: number;
  points: number;
  session: SessionData;
  gamePlay: GamePlayData;
  language: LanguageData;
}

interface SessionData {
  id: number;
  timestamp: string; // ISO 8601 format
  duration: number; // Duration in seconds
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'STOPPED' | 'FINISHED';
}

interface GamePlayData {
  id: number;
  description: string;
  duration: number; // Duration in seconds
}

interface LanguageData {
  id: number;
  code: string; // Language code (e.g., "en", "es")
  name: string; // Language name (e.g., "English", "Spanish")
}

interface PlayerData {
  id: number;
  badgeId: string;
  badgeActivated: boolean;
  displayName: string;
  firstName: string;
  lastName: string;
  points: number;
  isJackpot: boolean;
  avatarUrl?: string;
  team: {
    id: number;
    name: string;
  };
}
```

### 2. Team Score Creation Endpoint

**Technical Details:**

- **HTTP Method**: POST
- **Full URL Path**: `/api/game-manager/team-create-score`
- **Content Type**: `application/json`
- **Response Type**: `application/json`

**Request Headers:**

```
Content-Type: application/json
Accept: application/json
```

**Request Body Schema:**

```typescript
interface TeamScoreRequest {
  gameId: number; // Required: Target game ID
  players: PlayerScoreData[]; // Required: Array of player scores (min 1 item)
}

interface PlayerScoreData {
  playerId: number; // Required: Player identifier
  playerPoints: number; // Required: Points achieved by player
  isJackpot?: boolean; // Optional: Jackpot status (default: false)
}
```

**Request Body Validation Rules:**

- `gameId`: Must be a positive integer
- `players`: Must be non-empty array
- `playerId`: Must be a positive integer
- `playerPoints`: Must be a non-negative integer
- `isJackpot`: Boolean value, defaults to false if omitted

**Response Schema:**
Same as Team Authorization endpoint (`TeamGameManagerResponse`)

## Response Scenarios

### Success Responses

**Team Authorization Success (HTTP 200):**

```json
{
  "code": 200,
  "message": "Success",
  "team": {
    "id": 1,
    "name": "Team Alpha",
    "playerCount": 3,
    "points": 1500,
    "session": {
      "id": 1,
      "timestamp": "2025-07-03T10:00:00Z",
      "duration": 3600,
      "status": "IN_PROGRESS"
    },
    "gamePlay": {
      "id": 1,
      "description": "Standard Game",
      "duration": 300
    },
    "language": {
      "id": 1,
      "code": "en",
      "name": "English"
    }
  },
  "players": [
    {
      "id": 1,
      "badgeId": "BADGE001",
      "badgeActivated": true,
      "displayName": "Player One",
      "firstName": "John",
      "lastName": "Doe",
      "points": 500,
      "isJackpot": false,
      "team": {
        "id": 1,
        "name": "Team Alpha"
      }
    },
    {
      "id": 2,
      "badgeId": "BADGE002",
      "badgeActivated": true,
      "displayName": "Player Two",
      "firstName": "Jane",
      "lastName": "Smith",
      "points": 750,
      "isJackpot": true,
      "team": {
        "id": 1,
        "name": "Team Alpha"
      }
    }
  ]
}
```

**Team Score Creation Success (HTTP 200):**

```json
{
  "code": 200,
  "message": "Success",
  "team": {
    "id": 1,
    "name": "Team Alpha",
    "playerCount": 3,
    "points": 1925,
    "session": {
      "id": 1,
      "status": "IN_PROGRESS"
    }
  },
  "players": [
    {
      "id": 1,
      "badgeId": "BADGE001",
      "badgeActivated": false,
      "displayName": "Player One",
      "points": 600,
      "isJackpot": false
    },
    {
      "id": 2,
      "badgeId": "BADGE002",
      "badgeActivated": false,
      "displayName": "Player Two",
      "points": 1000,
      "isJackpot": true
    }
  ]
}
```

### Error Responses

**Error Response Structure:**
All error responses follow the same structure with different codes and messages:

```json
{
  "code": <error_code>,
  "message": "<error_message>",
  "team": null,
  "players": null
}
```

**Complete Error Code Reference:**

| HTTP Status | Error Code | Message                                 | Scenario                                         |
| ----------- | ---------- | --------------------------------------- | ------------------------------------------------ |
| 200         | 600        | "Player not found or not authorized"    | Invalid badge ID or player not in active session |
| 200         | 601        | "Team not found or not authorized"      | Player exists but team is invalid                |
| 200         | 602        | "Session is invalid"                    | Team session is FINISHED or invalid state        |
| 200         | 603        | "Game not found"                        | Invalid game ID provided                         |
| 200         | 604        | "Timer could not be started"            | Timer service failure during session start       |
| 400         | 603        | "Game ID is required"                   | Missing gameId in request body                   |
| 400         | 600        | "At least one player score is required" | Empty players array in request                   |

**Error Response Examples:**

**Player Not Found (Badge ID Invalid):**

```json
{
  "code": 600,
  "message": "Player not found or not authorized",
  "team": null,
  "players": null
}
```

**Game Not Found:**

```json
{
  "code": 603,
  "message": "Game not found",
  "team": null,
  "players": null
}
```

**Invalid Request Body (Missing Game ID):**

```json
{
  "code": 603,
  "message": "Game ID is required",
  "team": null,
  "players": null
}
```

**Session Invalid:**

```json
{
  "code": 602,
  "message": "Session is invalid",
  "team": {
    "id": 1,
    "name": "Team Alpha"
  },
  "players": [...]
}
```

## Business Logic Scenarios

### Session State Handling

**New Session (NOT_STARTED):**

- Team authorization automatically starts the session timer
- All team players are activated simultaneously
- Session status changes to IN_PROGRESS

**Existing Session (IN_PROGRESS):**

- Team authorization directly activates players
- No timer changes required
- Maintains current session state

**Invalid Session (FINISHED/STOPPED):**

- Returns error code 602
- No player activation occurs
- Team and player data may still be returned for context

### Automatic Game Switching

**When team switches games:**

1. System detects current game differs from requested game
2. Creates zero-point scores for all players in current game
3. Deactivates current game (status → AVAILABLE)
4. Removes team assignment from current game
5. Proceeds with authorization for new game
6. All operations are atomic (succeed together or fail together)

**Game switching is transparent to the API consumer - no special handling required**

### Cumulative Scoring Logic

**Point Calculation Rules:**

- Points accumulate across games within a session
- Only score improvements count toward point totals
- Team points = sum of all individual player points
- Jackpot status persists throughout session (once true, stays true)

**Score Processing:**

- Each player's score is processed individually
- Team membership validation occurs for each player
- Players not belonging to the game's team are silently skipped
- Successful scores automatically release players from the game

## Practical Integration Examples

### Example 1: Team Authorization for New Session

**Request:**

```
GET /api/game-manager/team-authorization?badgeId=BADGE001&gameId=1
```

**Expected Response (Success):**

- HTTP 200 with code 200
- Team object with session status "IN_PROGRESS"
- All players have badgeActivated: true
- Session timer has been started

### Example 2: Multi-Player Score Submission

**Request:**

```
POST /api/game-manager/team-create-score
Content-Type: application/json

{
  "gameId": 1,
  "players": [
    {
      "playerId": 1,
      "playerPoints": 100,
      "isJackpot": false
    },
    {
      "playerId": 2,
      "playerPoints": 250,
      "isJackpot": true
    }
  ]
}
```

**Expected Response (Success):**

- HTTP 200 with code 200
- Updated team points reflecting cumulative scoring
- Player 2 has isJackpot: true
- All players have badgeActivated: false (released from game)

### Example 3: Game Switching Scenario

**Request:**

```
GET /api/game-manager/team-authorization?badgeId=BADGE001&gameId=2
```

_(Team was previously playing game 1)_

**Expected Behavior:**

- Automatic cleanup of game 1 (zero scores, activity logs)
- Authorization for game 2
- Transparent to API consumer
- Same response format as normal authorization

### Example 4: Error Handling

**Request with Invalid Badge:**

```
GET /api/game-manager/team-authorization?badgeId=INVALID&gameId=1
```

**Expected Response:**

```json
{
  "code": 600,
  "message": "Player not found or not authorized",
  "team": null,
  "players": null
}
```

## Data Processing Guidelines

### Response Validation

- Always check `code` field first (200 = success)
- `team` and `players` are null on error responses
- Error responses may include partial data for context

### Error Handling Strategy

- HTTP 200 responses can contain business logic errors
- HTTP 400 responses indicate request validation failures
- Use error codes for programmatic error handling
- Use messages for logging/debugging purposes

### Data Consistency

- Team points always equal sum of individual player points
- Player badgeActivated status indicates current game participation
- Session status reflects current team state
- Jackpot status persists throughout session
