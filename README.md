# Team Arcade Middleware

A NestJS-based middleware service that acts as an intermediary between team-based arcade machines and backend game management systems.

## Description

This application serves as a middleware layer that implements a complete 9-phase team arcade game session workflow:

1. **Badge Scanning** - Waits for team member NFC badge scan
2. **Team Authorization** - Validates team access with backend API
3. **Room Access Control** - Controls lighting, access latches, and displays instructions
4. **Arcade Game Session Management** - Starts arcade machines and monitors timers
5. **Score Collection** - Receives final scores from arcade machines
6. **Result Evaluation** - Determines win/loss/jackpot status based on scores
7. **Backend Score Submission** - Submits team results to game management system
8. **End Game Effects** - Displays appropriate animations (win/loss/jackpot)
9. **Session Cleanup** - Resets system for next team

Built with [NestJS](https://github.com/nestjs/nest) framework.

## Project setup

```bash
$ npm install
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```bash
# Team Arcade Middleware Configuration
PORT=3000
STATION_ID=ARCADE-01
MODE=SIM
API_BASE=https://your-backend-server.com/api/game-manager
GAME_ID=1

# Game Rules Configuration
ROOM_DURATION_MINUTES=5
MAX_GAMES_PER_SESSION=4
JACKPOT_THRESHOLD=1000
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## API Integration

This middleware integrates with the GameManagerResource API endpoints:

### Team Authorization

- **Endpoint**: `GET /api/game-manager/team-authorization`
- **Purpose**: Authorizes a team to play a specific game
- **Parameters**: `badgeId` (string), `gameId` (number)

### Team Score Submission

- **Endpoint**: `POST /api/game-manager/team-create-score`
- **Purpose**: Submits team scores after game completion
- **Body**: JSON with `gameId` and array of player scores

For detailed API specifications, see `tasks.md`.

## Hardware Support

The middleware supports various hardware configurations:

- **NFC Readers**: PC/SC compatible readers and RS232 serial readers
- **Sensors**: Controllino-based sensor systems
- **LEDs**: RGB LED status indicators
- **Serial Control**: Room lighting, access latches, arcade machine control
- **Timer Monitoring**: Room duration and game completion tracking
- **Display Control**: Game instructions and result animations

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ yarn install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
