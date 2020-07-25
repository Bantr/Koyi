import { IBanType } from '@bantr/lib/dist/types';
import { Test, TestingModule } from '@nestjs/testing';

import { mockBanStatus } from '../../test/globals';
import { FaceitService } from '../faceit/faceit.service';
import { NotificationService } from '../notification/notification.service';
import Player from '../player/player.entity';
import { PlayerService } from '../player/player.service';
import { QueueService } from '../queue/queue.service';
import { EconomyBan } from '../steam/interface/IGetPlayerBansResponse.interface';
import { SteamService } from '../steam/steam.service';
import { BanRepository } from './ban.repository';
import { BanService } from './ban.service';

const mockBanRepository = () => ({
  findBansForPlayer: jest.fn(),
  createBan: jest.fn(),
  deleteBan: jest.fn()
});

const mockQueueService = () => ({
  getQueue: jest.fn()
});

const mockPlayerService = () => ({
  updateLastCheckedAt: jest.fn()
});

const mockFaceitService = () => ({});

const mockSteamService = () => ({});

const mockNotificationService = () => ({
  sendNotification: jest.fn()
});

describe('BanService', () => {
  let service: BanService;
  let banRepository;
  /* eslint-disable */
  let queueService;
  let playerService;
  let faceitService;
  let steamService;
  let notificationService;
  /* eslint-enable */

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BanService,
        { provide: BanRepository, useFactory: mockBanRepository },
        { provide: QueueService, useFactory: mockQueueService },
        { provide: PlayerService, useFactory: mockPlayerService },
        { provide: FaceitService, useFactory: mockFaceitService },
        { provide: SteamService, useFactory: mockSteamService },
        { provide: NotificationService, useFactory: mockNotificationService }
      ]
    }).compile();

    service = await module.get<BanService>(BanService);
    banRepository = await module.get<BanRepository>(BanRepository);
    queueService = await module.get<QueueService>(QueueService);
    playerService = await module.get<PlayerService>(PlayerService);
    faceitService = await module.get<FaceitService>(FaceitService);
    steamService = await module.get<SteamService>(SteamService);
    notificationService = await module.get<NotificationService>(
      NotificationService
    );
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
        { type: IBanType.Economy }
      ]);
      await service.processProfile(
        player,
        mockBanStatus({
          NumberOfVACBans: 0,
          NumberOfGameBans: 0,
          CommunityBanned: false,
          DaysSinceLastBan: 4,
          EconomyBan: EconomyBan.NotBanned,
          VACBanned: true,
          SteamId: 'aaa'
        })
      );

      expect(banRepository.deleteBan).toHaveBeenCalledTimes(4);
    });

    it('Detects when new bans are added', async () => {
      const player = new Player();
      player.lastCheckedAt = new Date(0);
      banRepository.findBansForPlayer.mockResolvedValue([{ a: 'b' }]);
      const result = await service.processProfile(
        player,
        mockBanStatus({
          NumberOfVACBans: 2,
          NumberOfGameBans: 4,
          CommunityBanned: false,
          DaysSinceLastBan: 4,
          EconomyBan: EconomyBan.NotBanned,
          VACBanned: true,
          SteamId: 'aaa'
        })
      );
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
