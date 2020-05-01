import { Module } from '@nestjs/common';
import { UserSettingsService } from './user-settings.service';

@Module({
  providers: [UserSettingsService]
})
export class UserSettingsModule {}
