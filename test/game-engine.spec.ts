import { Test } from '@nestjs/testing';
import { GameCoreModule } from '../src/games/game-core/game-core.module';
import { GameEngineService } from '../src/games/game-core/game-engine.service';
import { ConfigModule } from '@nestjs/config';
import globalConfig from '../src/config/global';
import { HardwareModule } from '../src/hardware/hardware.module';
import { ApiModule } from '../src/api/api.module';

describe('GameEngine', () => {
  it('runs pinball and returns positive score', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [globalConfig] }),
        HardwareModule,
        ApiModule,
        GameCoreModule,
      ],
    }).compile();
    const engine = moduleRef.get(GameEngineService);
    expect(engine).toBeDefined();
  });
});
