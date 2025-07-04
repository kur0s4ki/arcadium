import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ApiService } from './api.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: 30000, // 30 second default timeout
        maxRedirects: 3,
        retries: 2,
        retryDelay: 1000, // 1 second between retries
        // Note: httpsAgent configuration removed to fix compatibility issues
        // SSL/TLS settings can be configured at the application level if needed
        headers: {
          'User-Agent': `Arcadium-Middleware/${configService.get(
            'global.stationId',
            'ARCADE-01',
          )}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ApiService],
  exports: [ApiService],
})
export class ApiModule {}
