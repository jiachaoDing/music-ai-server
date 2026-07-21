import { Test, TestingModule } from '@nestjs/testing';
import { AI_QUEUE_STATUS_SERVICE, AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: AI_QUEUE_STATUS_SERVICE,
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
