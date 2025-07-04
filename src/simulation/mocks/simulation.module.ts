import { DynamicModule, Module } from '@nestjs/common';
import { HardwareModule } from 'src/hardware/hardware.module';

@Module({})
export class SimulationModule {
  static registerAsync(options): DynamicModule {
    const enabled = options.mode === 'SIM';
    return {
      module: SimulationModule,
      imports: enabled ? [HardwareModule.register('SIM')] : [],
      exports: enabled ? [HardwareModule] : [],
    };
  }
}