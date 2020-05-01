import { IBanType } from '@bantr/lib/dist/types';
import { Test, TestingModule } from '@nestjs/testing';
import * as faker from 'faker';

import { FaceitService } from '../faceit/faceit.service';
import { NotificationService } from '../notification/notification.service';
import Player from '../player/player.entity';
import { PlayerService } from '../player/player.service';
import { QueueService } from '../queue/queue.service';
import { EconomyBan, GetPlayerBansResponse, SteamService } from '../steam/steam.service';
import { BanRepository } from './ban.repository';
import { BanService } from './ban.service';

export function mockBanStatus(options: GetPlayerBansResponse = {
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

const mockBanRepository = () => ({
  findBansForPlayer: jest.fn(),
  createBan: jest.fn(),
  deleteBan: jest.fn(),
});

const mockQueueService = () => ({
  getQueue: jest.fn(),
});

const mockPlayerService = () => ({
  updateLastCheckedAt: jest.fn(),
});

const mockFaceitService = () => ({});

const mockSteamService = () => ({});

const mockNotificationService = () => ({
  sendNotification: jest.fn(),
});

describe('BanService', () => {
  let service: BanService;
  let banRepository;
  let queueService;
  let playerService;
  let faceitService;
  let steamService;
  let notificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BanService,
        { provide: BanRepository, useFactory: mockBanRepository },
        { provide: QueueService, useFactory: mockQueueService },
        { provide: PlayerService, useFactory: mockPlayerService },
        { provide: FaceitService, useFactory: mockFaceitService },
        { provide: SteamService, useFactory: mockSteamService },
        { provide: NotificationService, useFactory: mockNotificationService },
      ],
    }).compile();

    service = await module.get<BanService>(BanService);
    banRepository = await module.get<BanRepository>(BanRepository);
    queueService = await module.get<QueueService>(QueueService);
    playerService = await module.get<PlayerService>(PlayerService);
    faceitService = await module.get<FaceitService>(FaceitService);
    steamService = await module.get<SteamService>(SteamService);
    notificationService = await module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processProfile()', () => {
    it('Detects when a ban was removed (unbans)', async () => {
      const player = new Player();
      player.lastCheckedAt = new Date(0);
      banRepository.findBansForPlayer.mockResolvedValue([
        { type: IBanType.Community },
        { type: IBanType.VAC },
        { type: IBanType.Game },
        { type: IBanType.Economy },
      ]);
      await service.processProfile(player, mockBanStatus({
        NumberOfVACBans: 0,
        NumberOfGameBans: 0,
        CommunityBanned: false,
        DaysSinceLastBan: 4,
        EconomyBan: EconomyBan.NotBanned,
        VACBanned: true,
        SteamId: 'aaa',
      }));

      expect(banRepository.deleteBan).toHaveBeenCalledTimes(4);
    });

    it('Detects when new bans are added', async () => {
      const player = new Player();
      player.lastCheckedAt = new Date(0);
      banRepository.findBansForPlayer.mockResolvedValue([{ a: 'b' }]);
      const result = await service.processProfile(player, mockBanStatus({
        NumberOfVACBans: 2,
        NumberOfGameBans: 4,
        CommunityBanned: false,
        DaysSinceLastBan: 4,
        EconomyBan: EconomyBan.NotBanned,
        VACBanned: true,
        SteamId: 'aaa',
      }));
      expect(banRepository.createBan).toHaveBeenCalledTimes(6);
      expect(result.newBans.length).toEqual(6);
      expect(result.hasBan).toEqual(true);
    });
    it('It updates the lastCheckedAt date', async () => {
      const player = new Player();
      player.lastCheckedAt = new Date(0);
      banRepository.findBansForPlayer.mockResolvedValue([{ a: 'b' }]);

      await service.processProfile(player, mockBanStatus());
      expect(playerService.updateLastCheckedAt).toHaveBeenCalled();
    });
  });
});
