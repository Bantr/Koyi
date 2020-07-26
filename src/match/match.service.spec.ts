import { IMatchType } from '@bantr/lib/dist/types';
import { HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Job } from 'bull';
import { Connection } from 'typeorm';

import { mockUser } from '../../test/globals';
import { PlayerService } from '../player/player.service';
import { QueueService } from '../queue/queue.service';
import { UserRepository } from '../user/user.repository';
import { CsgoMatchDto } from './dto/csgoMatch.dto';
import { MatchRepository } from './match.repository';
import { MatchService } from './match.service';

jest.mock('./match.entity');

const mockUserRepository = {
  getUsers: jest.fn(() => [
    mockUser({ emptyFaceitProfile: true }),
    mockUser({})
  ]),
  saveUser: jest.fn(() => mockUser({}))
};

const mockMatchRepository = {};
const mockHttpService = new HttpService();
const mockQueueService = {
  getQueue: jest.fn()
};
const mockPlayerService = {};
const mockConfigService = {};

const mockConnection = {
  createQueryRunner: jest.fn()
};

describe('MatchService', () => {
  let service: MatchService;
  /* eslint-disable */
  let userRepository;
  let httpService;
  let configService;
  let matchService;
  /* eslint-enable */

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchService,
        {
          provide: getRepositoryToken(UserRepository),
          useValue: mockUserRepository
        },
        {
          provide: getRepositoryToken(MatchRepository),
          useValue: mockMatchRepository
        },
        { provide: HttpService, useValue: mockHttpService },
        { provide: QueueService, useValue: mockQueueService },
        { provide: PlayerService, useValue: mockPlayerService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: Connection, useValue: mockConnection }
      ]
    }).compile();

    service = await module.get<MatchService>(MatchService);
    userRepository = await module.get<UserRepository>(UserRepository);
    httpService = await module.get<HttpService>(HttpService);
    configService = await module.get<ConfigService>(ConfigService);
    matchService = await module.get<MatchService>(MatchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleMatch', () => {
    let mockJob: Job;
    beforeEach(() => {
      mockJob = ({
        progress: jest.fn()
      } as unknown) as Job;
    });

    it('Exits early when no demoUrl is found', async () => {
      const spy = jest.spyOn(service, 'downloadDemo');
      const csgoMatch: CsgoMatchDto = {
        demoUrl: undefined,
        externalId: 'aspofjapgapwgjpajwg',
        id: '1337',
        type: IMatchType.CSGOFaceIt,
        typeExtended: 'Testing match'
      };

      mockJob.data = csgoMatch;

      await service.handleMatch(mockJob);

      expect(spy).toBeCalledTimes(0);
      expect(mockJob.progress).toBeCalledWith(1);
    });
  });
});
