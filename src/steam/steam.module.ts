import { Module, HttpModule } from '@nestjs/common';
import { SteamService } from './steam.service';

@Module({
  imports: [
    HttpModule
  ],
  providers: [SteamService],
  exports: [SteamService]
})
export class SteamModule {
}
