import { entities } from '@bantr/lib/dist/entities';
import { IMatchType } from '@bantr/lib/dist/types';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

import Demo from './demo';
import Match from './match.entity';

dotenv.config();
const demoFileBuffer = fs.readFileSync(
  path.join(__dirname, '../../test/demos/faceit-5v5.dem')
);

// Database connection is required to run this test!

describe('Demo handler', () => {
  // Timeout reaaaally long because parsing a demo can take a while
  // Especially on slow CI servers
  jest.setTimeout(1000 * 60 * 5);

  let demoClass: Demo;

  let app: TestingModule;
  let resultMatch: Match;

  beforeAll(done => {
    demoClass = new Demo(demoFileBuffer);

    Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.BANTR_PG_HOST,
          port: parseInt(process.env.BANTR_PG_PORT, 10),
          username: process.env.BANTR_PG_USER,
          password: process.env.BANTR_PG_PW,
          database: process.env.BANTR_PG_DB,
          entities: entities,
          dropSchema: process.env.CI === 'true' ? true : false,
          //dropSchema: true,
          synchronize: true
        })
      ]
    })
      .compile()
      .then(newApp => {
        app = newApp;
        const initMatch = new Match();
        initMatch.externalId = 'Testing Demo 5v5 faceit';
        demoClass
          .handle(
            {
              externalId: 'foo',
              id: ' bar',
              type: IMatchType.CSGOFaceIt,
              demoUrl: 'notneeded',
              typeExtended: 'test match'
            },
            initMatch
          )
          .then(match => {
            Match.findOne(match.id, {
              relations: [
                'teams',
                'players',
                'teams.players',
                'teams.matches',
                'players.teams'
              ]
            })
              .then(res => {
                resultMatch = res;
                done();
              })
              .catch(done);
          })
          .catch(done);
      })
      .catch(done);
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

  describe('DETECTOR Teams', () => {
    it('Registers the team in the match', () => {
      expect(resultMatch).toHaveProperty('teams');
      expect(resultMatch.teams).toHaveLength(2);
    });

    it('fills in team info for players', () => {
      for (const player of resultMatch.players) {
        expect(player.teams).not.toBe(undefined);
        expect(player.teams).not.toBe(null);
        expect(player.teams).toHaveLength(1);
      }
    });

    it('returns correct data for teams', async () => {
      for (const team of resultMatch.teams) {
        expect(team).toHaveProperty('players');
        expect(team.players).toHaveLength(5);

        expect(team).toHaveProperty('matches');
        expect(team.matches).toHaveLength(1);

        expect(team).toHaveProperty('name');
        expect(team.name.length).toBeGreaterThan(0);
      }
    });
  });

  afterAll(async () => {
    await resultMatch.remove();
    await app.close();
  });
});
