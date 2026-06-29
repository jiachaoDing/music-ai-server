import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiModule } from './ai/ai.module';
import { SongsModule } from './songs/songs.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AiModule, SongsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
