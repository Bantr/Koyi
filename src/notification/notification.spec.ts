import { IBanType } from '@bantr/lib/dist/types';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MessageEmbed } from 'discord.js';
import * as faker from 'faker';

import Ban from '../ban/ban.entity';
import Player from '../player/player.entity';
import { EconomyBan, GetPlayerBansResponse } from '../steam/steam.service';
import UserSettings from '../user-settings/user-settings.entity';
import User from '../user/user.entity';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';

jest.setTimeout(10000);

function mockBanStatus(options: GetPlayerBansResponse = {
    CommunityBanned: faker.random.boolean(),
    DaysSinceLastBan: faker.random.number({ min: 0, max: 9999 }),
    NumberOfGameBans: faker.random.number({ min: 0, max: 10 }),
    NumberOfVACBans: faker.random.number({ min: 0, max: 10 }),
    VACBanned: true,
    SteamId: '76561198028175942',
    EconomyBan: EconomyBan.Banned,
}): GetPlayerBansResponse {

    if (options.NumberOfVACBans > 0) {
        options.VACBanned = true;
    } else {
        options.VACBanned = false;
    }

    return options;
}

const mockConfigService = () => ({
    get: jest.fn(() => process.env.DISCORD_BOT_TOKEN),
});

function mockUser(): User {
    const user = new User();
    user.discordId = process.env.BANTR_TEST_DISCORD_USER_ID;
    user.settings = new UserSettings();

    user.settings.notificationDiscordEnabled = true;
    user.settings.notificationVACEnabled = true;
    user.settings.notificationGameEnabled = true;
    user.settings.notificationCommunityEnabled = true;
    user.settings.notificationEconomyEnabled = true;
    user.settings.notificationFaceitEnabled = true;

    return user;
}

function mockBan(player: Player) {
    const ban = new Ban();
    ban.detectedAt = new Date(Date.now() - 5000);
    ban.id = faker.random.number(100000);
    ban.player = player;
    ban.preExisting = false;
    ban.type = faker.random.number(4);
    return ban;
}

function mockPlayer() {
    const player = new Player();
    player.steamId = '76561198028175941';
    player.createdAt = faker.date.past();
    player.steamAvatar = 'https://bantr.app/static/assets/bantr-icon.png';
    player.steamUsername = 'Bantr';
    player.id = faker.random.number(100000);
    player.lastCheckedAt = faker.date.past();
    return player;
}

const mockNotificationRepository = () => ({
    createNotification: jest.fn(),
});

/**
 * These tests can be really brittle because they use third party APIs
 * Tests are included for debugging purposes
 */

describe('NotificationService', () => {
    let service: NotificationService;
    let configService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [NotificationService,
                { provide: ConfigService, useFactory: mockConfigService },
                { provide: NotificationRepository, useFactory: mockNotificationRepository },
            ],
            //       imports: [ConfigModule]
        }).compile();

        service = await module.get<NotificationService>(NotificationService);
        configService = await module.get<ConfigService>(ConfigService);

        // Filthy hack to access private methods
        // tslint:disable-next-line:no-string-literal
        service['sendDiscordDm'] = async () => { return; };
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('Should send a pretty embed', () => {
        const player = mockPlayer();
        const user = mockUser();
        player.trackedBy = [user];

        const newBans = [mockBan(player)];
        const deletedBans = [mockBan(player)];

        const embedIncludesString = (str, embedVar) => {
            return embedVar.fields.filter(_ => _.name.includes(str) || _.value.includes(str)).length > 0;
        };

        const embed = service.createDiscordEmbed({ deletedBans, newBans, player });

        expect(embed instanceof MessageEmbed).toBe(true);
        // Check if the embed contains the steam ID of the tracked account
        expect(embedIncludesString(player.steamId, embed)).toBe(true);
    });

    describe('sendNotification', () => {
        it('should apply filtering based on user settings', async () => {
            const filterSpy = jest.spyOn(NotificationService.prototype as any, 'filterDataBasedOnSettings');
            const player = mockPlayer();
            const user = mockUser();
            player.trackedBy = [user];
            await service.sendNotification({ deletedBans: [mockBan(player)], newBans: [mockBan(player)], player });
            expect(filterSpy).toHaveBeenCalled();  // Success!
        });

    });
    describe('filterDataBasedOnSettings', () => {
        it(`Filters correctly for all ban types`, () => {
            const player = mockPlayer();
            const user = mockUser();
            player.trackedBy = [user];
            const bans = [mockBan(player), mockBan(player)];
            expect(service.filterDataBasedOnSettings(bans, user.settings).length).toBe(2);

            let i = 0;
            // Check for each type
            for (const type in IBanType) {
                if (Object.prototype.hasOwnProperty.call(IBanType, type)) {
                    bans[0].type = i;
                    bans[1].type = i;
                    i++;
                    user.settings[`notification${IBanType[type]}Enabled`] = false;
                    expect(service.filterDataBasedOnSettings(bans, user.settings).length).toBe(0);
                }
            }
        });
    });

    afterAll(async done => {
        // Closing the DB connection allows Jest to exit successfully.
        service.bot.destroy();
        done();
    });
});
