import { Test, TestingModule } from '@nestjs/testing';
import { AiTaskService } from './ai/ai-task.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: AiTaskService,
          useValue: {
            getQueueStatus: vi.fn(),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return ok status', () => {
      expect(appController.getHealth()).toMatchObject({
        status: 'ok',
        service: 'music-ai-server',
      });
    });
  });
});
