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
  get: jest.fn(() => process.env.BANTR_FACEIT_API)
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

  it('Updates user profiles', async () => {
    await service.getMatchesForUsers();
    expect(userRepository.saveUser).toBeCalledTimes(1);
  });

  afterAll(() => {
    talkbackServer.close();
  });
});
