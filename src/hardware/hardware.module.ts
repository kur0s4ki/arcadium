import { Module } from '@nestjs/common';
import {
  NFC_READER,
  SENSOR_BUS,
  DISPLAY,
  LED_CONTROL,
  SERIAL_CONTROL,
} from './tokens';
import { PcscLiteReaderService } from './nfc/nfc-pcsc-reader.service';
import { Rs232ReaderService } from './nfc/rs232-reader.service';
import { ControllinoSensorService } from './sensors/controllino-sensor.service';
import { ControllinoLedService } from './leds/controllino-led.service';
import { ControllinoSerialService } from './serial/controllino-serial.service';
import { ConsoleDisplayService } from './display/console-display.service';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [
    {
      provide: NFC_READER,
      useFactory: (cfg: ConfigService) => {
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
    { provide: SENSOR_BUS, useClass: ControllinoSensorService },
    { provide: LED_CONTROL, useClass: ControllinoLedService },
    { provide: SERIAL_CONTROL, useClass: ControllinoSerialService },
    { provide: DISPLAY, useClass: ConsoleDisplayService },
  ],
  exports: [NFC_READER, SENSOR_BUS, LED_CONTROL, SERIAL_CONTROL, DISPLAY],
})
export class HardwareModule {}
