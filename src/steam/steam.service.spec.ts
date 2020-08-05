/* eslint-disable @typescript-eslint/no-unused-vars */
import { HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as dotenv from 'dotenv';
import * as path from 'path';

import { mockUser } from '../../test/globals';
import { MatchService } from '../match/match.service';
import { UserRepository } from '../user/user.repository';
import { SteamService } from './steam.service';
import SteamBot from './SteamBot';

jest.mock('./SteamBot');

dotenv.config();
const mockHttpService = new HttpService();

const mockConfigService = () => ({
  get: jest.fn(() => process.env.BANTR_STEAM_API)
});

//eslint-disable-next-line @typescript-eslint/no-var-requires
const talkback = require('talkback');

const talkbackServer = talkback({
  host: 'https://api.steampowered.com',
  record: talkback.Options.RecordMode.NEW,
  port: 7457,
  silent: true,
  path: `${__dirname}/tapes`,
  ignoreQueryParams: ['key', 'steamidkey'],
  tapeNameGenerator: (tapeNumber, tape) => {
    return path.join(`${tape.req.method}`, `-${tape.req.url}`);
  }
});

const mockedUser = mockUser({});

const mockUserRepository = () => ({
  getUsersSortedByLastChecked: jest.fn().mockReturnValue([mockedUser])
});

const mockMatchService = {
  addMatchToQueue: jest.fn()
};

/**
 * This is a bit of a weird method,
 * but had trouble getting the TestingModule to initialize a real SteamService
 * Something to do with circular dependency I think...
 * This works for now, it's just a test :)
 */
const testService = new SteamService(
  (mockUserRepository() as unknown) as UserRepository,
  mockHttpService,
  (mockConfigService() as unknown) as ConfigService,
  (mockMatchService as unknown) as MatchService
);

describe('SteamService', () => {
  let service: SteamService;
  let httpService;
  let configService;
  let matchService: MatchService;
  let userRepository;

  beforeAll(() => {
    talkbackServer.start();
  });

  afterAll(() => {
    talkbackServer.close();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: SteamService, useValue: testService },
        { provide: UserRepository, useFactory: mockUserRepository },
        { provide: HttpService, useValue: mockHttpService },
        { provide: MatchService, useValue: mockMatchService },
        { provide: ConfigService, useFactory: mockConfigService }
      ]
    }).compile();

    userRepository = await module.get<UserRepository>(UserRepository);
    matchService = await module.get<MatchService>(MatchService);
    service = await module.get<SteamService>(SteamService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);

    // Override the private method and supply it with our proxy server
    service['getSteamApiUrl'] = () => 'http://localhost:7457';
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('Does not start a Steam bot when no auth credentials are provided', async () => {
    expect(service.SteamBot).toBeUndefined;
  });

  describe('Getting matchmaking matches from steam', () => {
    beforeEach(() => {
      // This is mocked
      service['SteamBot'] = new SteamBot('user', 'password');
      service['SteamBot'].ready = true;
      mockedUser.settings.lastKnownMatch = 'CSGO-nvYA4-FkWRA-dp8AK-qLFot-7WFuA';
    });

    it('Gets new matches until there are no new ones and adds them to the match queue', async () => {
      const addToQueueSpy = jest.spyOn(matchService, 'addMatchToQueue');
      const getDemoUrlFromShareCodeSpy = jest.spyOn(
        service.SteamBot,
        'getDemoUrlFromShareCode'
      );
      await service.getMatchesForUsers();

      // In the tapes, there's 7 valid matches
      expect(getDemoUrlFromShareCodeSpy).toHaveBeenCalledTimes(7);
      expect(addToQueueSpy).toHaveBeenCalledTimes(7);
    });

    it('Does not throw when Steam bot is not running', async () => {
      const addToQueueSpy = jest.spyOn(matchService, 'addMatchToQueue');

      service['SteamBot'] = undefined;
      await service.getMatchesForUsers();

      expect(addToQueueSpy).toHaveBeenCalledTimes(0);
    });

    it('Updates the lastKnownCode for a user after getting matches', async () => {
      await service.getMatchesForUsers();

      expect(mockedUser.settings.lastKnownMatch).toBe(
        'CSGO-wkzOw-RzsHo-AXBL7-tLzdR-rvMpP'
      );
      expect(mockedUser.settings.save).toHaveBeenCalledTimes(1);
    });
  });
});
