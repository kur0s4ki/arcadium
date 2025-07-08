import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log'], // Keep only essential startup logs
  });
  const cfg = app.get(ConfigService);
  await app.listen(cfg.get<number>('global.port', 3000));
  console.log(
    `🎮  Team Arcade Middleware '${cfg.get('global.stationId')}' ready.`,
  );
}
bootstrap();
