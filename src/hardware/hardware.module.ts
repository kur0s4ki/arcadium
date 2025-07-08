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
import { TcpSerialService } from './serial/tcp-serial.service';
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
    {
      provide: SERIAL_CONTROL,
      useFactory: (cfg: ConfigService) => {
        // Choose serial service based on mode and config
        const mode = cfg.get<string>('global.mode', 'PROD');
        const serialType = cfg.get<string>(
          'global.hardware.serialType',
          'REAL',
        );

        console.log(
          `🔧 Hardware Module - Mode: ${mode}, SerialType: ${serialType}`,
        );

        if (mode === 'SIM' || serialType === 'TCP') {
          console.log('🔧 Using TcpSerialService for simulation');
          return new TcpSerialService(cfg);
        } else {
          console.log('🔧 Using ControllinoSerialService for real hardware');
          return new ControllinoSerialService(cfg);
        }
      },
      inject: [ConfigService],
    },
    { provide: DISPLAY, useClass: ConsoleDisplayService },
  ],
  exports: [NFC_READER, SENSOR_BUS, LED_CONTROL, SERIAL_CONTROL, DISPLAY],
})
export class HardwareModule {}
