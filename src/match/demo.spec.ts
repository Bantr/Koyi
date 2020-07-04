import { IMatchType } from '@bantr/lib/dist/types';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

import Demo from './demo';
import Match from './match.entity';

dotenv.config();

// Database connection is required to run this test!

describe('Demo handler', () => {
  // Timeout reaaaally long because parsing a demo can take a while
  // Especially on slow CI servers
  jest.setTimeout(1000 * 60 * 5);

  let demoClass: Demo;
  let demoFileBuffer: Buffer;
  let app: TestingModule;
  let resultMatch: Match;

  beforeAll(async () => {
    demoFileBuffer = fs.readFileSync(
      path.join(__dirname, '../../test/demos/faceit-5v5.dem')
    );
    demoClass = new Demo(demoFileBuffer);

    app = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.BANTR_PG_HOST,
          port: parseInt(process.env.BANTR_PG_PORT, 10),
          username: process.env.BANTR_PG_USER,
          password: process.env.BANTR_PG_PW,
          database: process.env.BANTR_PG_DB,
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: true
        })
      ]
    }).compile();

    const initMatch = new Match();
    initMatch.externalId = 'Testing Demo 5v5 faceit';
    resultMatch = await demoClass.handle(
      {
        externalId: 'foo',
        id: ' bar',
        type: IMatchType.CSGOFaceIt,
        demoUrl: 'notneeded'
      },
      initMatch
    );
  });

  it('is defined', () => {
    expect(demoClass).toBeDefined();
  });

  it('returns a correct amount of players', async () => {
    expect(resultMatch).toHaveProperty('players');
    expect(resultMatch.players).toHaveLength(10);
  });

  it('returns correct basicInfo', async () => {
    expect(resultMatch).toHaveProperty('durationTicks');
    expect(resultMatch.durationTicks).toBe(340352);

    expect(resultMatch).toHaveProperty('map');
    expect(resultMatch.map).toBe('de_dust2');

    expect(resultMatch).toHaveProperty('tickrate');
    expect(resultMatch.tickrate).toBe(128);
  });

  afterAll(async () => {
    await app.close();
  });
});
