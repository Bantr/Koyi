import { Ban, User, UserSettings } from '@bantr/lib/dist/entities';
import { Player } from '@bantr/lib/dist/entities/player.entity';
import * as faker from 'faker';

import { EconomyBan, IGetPlayerBansResponse } from '../src/steam/steam.service';

export function mockUser(options: IMockUserOptions): User {
  const user = new User();
  user.discordId = process.env.BANTR_TEST_DISCORD_USER_ID;
  user.settings = new UserSettings();
  user.steamId = '76561198028175941';
  user.faceitId = options.emptyFaceitProfile
    ? null
    : 'd7ca3835-27c2-4c1f-a76e-6a21bb2c6dd6';
  user.faceitName = options.emptyFaceitProfile ? null : 'Catalysm_';
  user.username = 'Catalysm';

  user.settings.notificationDiscordEnabled = true;
  user.settings.notificationVACEnabled = true;
  user.settings.notificationGameEnabled = true;
  user.settings.notificationCommunityEnabled = true;
  user.settings.notificationEconomyEnabled = true;
  user.settings.notificationFaceitEnabled = true;

  return user;
}

interface IMockUserOptions {
  emptyFaceitProfile?: boolean;
}

export function mockBan(player: Player) {
  const ban = new Ban();
  ban.detectedAt = new Date(Date.now() - 5000);
  ban.id = faker.random.number(100000);
  ban.player = player;
  ban.preExisting = false;
  ban.type = faker.random.number(4);
  return ban;
}

export function mockPlayer() {
  const player = new Player();
  player.steamId = '76561198028175941';
  player.createdAt = faker.date.past();
  player.steamAvatar = 'https://bantr.app/static/assets/bantr-icon.png';
  player.steamUsername = 'Bantr';
  player.id = faker.random.number(100000);
  player.lastCheckedAt = faker.date.past();
  return player;
}

export function mockBanStatus(
  options: IGetPlayerBansResponse = {
    CommunityBanned: faker.random.boolean(),
    DaysSinceLastBan: faker.random.number({ min: 0, max: 9999 }),
    NumberOfGameBans: faker.random.number({ min: 0, max: 10 }),
    NumberOfVACBans: faker.random.number({ min: 0, max: 10 }),
    VACBanned: true,
    SteamId: '76561198028175942',
    EconomyBan: EconomyBan.Banned
  }
): IGetPlayerBansResponse {
  if (options.NumberOfVACBans > 0) {
    options.VACBanned = true;
  } else {
    options.VACBanned = false;
  }

  return options;
}
