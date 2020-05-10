import { HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { MatchService } from '../match/match.service';
import { UserRepository } from '../user/user.repository';
import { FaceitService } from './faceit.service';

const mockUserRepository = () => ({
  findBansForPlayer: jest.fn(),
  createBan: jest.fn(),
  deleteBan: jest.fn()
});

const mockHttpService = () => ({
  getQueue: jest.fn()
});

const mockConfigService = () => ({
  get: jest.fn(() => 'secret key')
});

const mockMatchService = () => ({});

describe('FaceitService', () => {
  let service: FaceitService;
  /* eslint-disable */
  let userRepository;
  let httpService;
  let configService;
  let matchService;
  /* eslint-enable */

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaceitService,
        { provide: UserRepository, useFactory: mockUserRepository },
        { provide: HttpService, useFactory: mockHttpService },
        { provide: ConfigService, useFactory: mockConfigService },
        { provide: MatchService, useFactory: mockMatchService }
      ]
    }).compile();

    service = await module.get<FaceitService>(FaceitService);
    userRepository = await module.get<UserRepository>(UserRepository);
    httpService = await module.get<HttpService>(HttpService);
    configService = await module.get<ConfigService>(ConfigService);
    matchService = await module.get<FaceitService>(FaceitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // TODO: Add tests with Talkback
});
