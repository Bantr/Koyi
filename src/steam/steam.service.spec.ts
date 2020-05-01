/* eslint-disable @typescript-eslint/no-unused-vars */
import { HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { SteamService } from './steam.service';

const mockHttpService = () => ({});

const mockConfigService = () => ({
  get: jest.fn()
});

describe('SteamService', () => {
  let service: SteamService;
  let httpService;
  let configService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SteamService,
        { provide: HttpService, useFactory: mockHttpService },
        { provide: ConfigService, useFactory: mockConfigService }
      ]
    }).compile();

    service = module.get<SteamService>(SteamService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
