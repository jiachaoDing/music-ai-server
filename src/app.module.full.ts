import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { BattlesModule } from './battles/battles.module';
import { CommunityModule } from './community/community.module';
import { FortuneModule } from './fortune/fortune.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { PrismaModule } from './prisma/prisma.module';
import { QrModule } from './qr/qr.module';
import { SongsModule } from './songs/songs.module';
import { TreeModule } from './tree/tree.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SongsModule,
    AdminModule,
    AiModule,
    CommunityModule,
    PlaylistsModule,
    BattlesModule,
    FortuneModule,
    TreeModule,
    QrModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
