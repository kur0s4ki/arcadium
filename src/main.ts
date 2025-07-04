import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const cfg = app.get(ConfigService);
  app.useWebSocketAdapter(new WsAdapter(app));
  await app.listen(cfg.get<number>('global.port', 3000));
  console.log(`📟  Mini‑Golf station '${cfg.get('global.stationId')}' ready.`);
}
bootstrap();