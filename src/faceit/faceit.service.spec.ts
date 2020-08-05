import { HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as dotenv from 'dotenv';
import * as path from 'path';

import { mockUser } from '../../test/globals';
import { MatchService } from '../match/match.service';
import { UserRepository } from '../user/user.repository';
import { FaceitService } from './faceit.service';

dotenv.config();

// talkback's typescript/import returns different stuff than the require, so disable the eslint alert for now
//eslint-disable-next-line @typescript-eslint/no-var-requires
const talkback = require('talkback');

const talkbackServer = talkback({
  host: 'https://open.faceit.com/data/v4',
  record: talkback.Options.RecordMode.NEW,
  port: 7456,
  path: `${__dirname}/tapes`,
  ignoreHeaders: ['authorization'],
  silent: true,
  tapeNameGenerator: (tapeNumber, tape) => {
    return path.join(`${tape.req.method}`, `-${tape.req.url}`);
  }
});

const mockUserRepository = () => ({
  getUsers: jest.fn(() => [
    mockUser({ emptyFaceitProfile: true }),
    mockUser({})
  ]),
  saveUser: jest.fn(() => mockUser({}))
});

const mockHttpService = new HttpService();
const mockConfigService = () => ({
  get: jest.fn(val => {
    switch (val) {
      case 'BANTR_FACEIT_API':
        return process.env.BANTR_FACEIT_API;
      case 'BANTR_WATCHED_FACEIT_HUBS':
        return '6f63b115-f45e-42b7-88ef-2a96714cd5e1,74624044-158f-446a-ad4f-cbd2e0e89423';
      default:
        break;
    }
  })
});

const mockMatchService = () => ({
  addMatchToQueue: jest.fn()
});

describe('FaceitService', () => {
  let service: FaceitService;
  /* eslint-disable */
  let userRepository;
  let httpService;
  let configService;
  let matchService;
  /* eslint-enable */

  beforeAll(() => {
    talkbackServer.start();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaceitService,
        { provide: UserRepository, useFactory: mockUserRepository },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useFactory: mockConfigService },
        { provide: MatchService, useFactory: mockMatchService }
      ]
    }).compile();

    service = await module.get<FaceitService>(FaceitService);
    userRepository = await module.get<UserRepository>(UserRepository);
    httpService = await module.get<HttpService>(HttpService);
    configService = await module.get<ConfigService>(ConfigService);
    matchService = await module.get<MatchService>(MatchService);

    // Override the private method and supply it with our proxy server
    service['getFaceItApiUrl'] = () => 'http://localhost:7456';
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleNewMatchesUsers()', () => {
    it('Updates user profiles', async () => {
      await service.handleNewMatchesUsers();
      expect(userRepository.saveUser).toBeCalledTimes(1);
    });
  });

  describe('handleHubs()', () => {
    it('Adds matches to the queue', async () => {
      await service.handleHubs();
      expect(matchService.addMatchToQueue).toBeCalledTimes(121);
    });
  });

  afterAll(() => {
    talkbackServer.close();
  });
});
