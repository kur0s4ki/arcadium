import { DynamicModule, Module, Provider } from '@nestjs/common';
import { NFC_READER, SENSOR_BUS, DISPLAY, LED_CONTROL } from './tokens';
import { MockNfcReaderService } from '../simulation/mocks/mock-nfc-reader.service';
import { MockSensorBusService } from '../simulation/mocks/mock-sensor-bus.service';
import { MockLedService } from '../simulation/mocks/mock-led.service';
import { PcscLiteReaderService } from './nfc/nfc-pcsc-reader.service';
import { Rs232ReaderService } from './nfc/rs232-reader.service';
import { ControllinoSensorService } from './sensors/controllino-sensor.service';
import { ControllinoLedService } from './leds/controllino-led.service';
import { UiModule } from '../ui/ui.module';
import { WebsocketDisplayService } from 'src/ui/websocket-display.service';
import { ConfigService } from '@nestjs/config';

@Module({})
export class HardwareModule {
  static register(mode: 'SIM' | 'PROD'): DynamicModule {
    const providers: Provider[] = [
      {
        provide: NFC_READER,
        useFactory: (cfg: ConfigService) => {
          if (mode === 'SIM') {
            return new MockNfcReaderService();
          }

          // Choose reader type based on config
          const readerType = cfg.get<string>(
            'global.hardware.nfcReaderType',
            'PCSC',
          );
          if (readerType === 'RS232') {
            return new Rs232ReaderService(cfg);
          } else {
            return new PcscLiteReaderService();
          }
        },
        inject: [ConfigService],
      },

      mode === 'PROD'
        ? { provide: SENSOR_BUS, useClass: ControllinoSensorService }
        : { provide: SENSOR_BUS, useClass: MockSensorBusService },

      mode === 'PROD'
        ? { provide: LED_CONTROL, useClass: ControllinoLedService }
        : { provide: LED_CONTROL, useClass: MockLedService },

      { provide: DISPLAY, useClass: WebsocketDisplayService },
    ];

    return {
      module: HardwareModule,
      imports: [UiModule],
      providers,
      exports: providers,
    };
  }
}
