import { entities, Position, Team } from '@bantr/lib/dist/entities';
import { IMatchType } from '@bantr/lib/dist/types';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

import Demo from './demo';
import Match from './match.entity';

dotenv.config();

const isPostionAllZero = (pos: Position) =>
  parseInt(pos.x, 10) === 0 &&
  parseInt(pos.y, 10) === 0 &&
  parseInt(pos.z, 10) === 0;

// https://www.faceit.com/en/csgo/room/1-abde31bd-9e04-4cc4-abe4-8d2467665205/scoreboard
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
          //dropSchema: process.env.CI === 'true' ? true : false,
          dropSchema: true,
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
                'players.teams',
                'rounds',
                'rounds.match',
                'rounds.winningTeam',
                'rounds.kills',
                'rounds.kills.attacker',
                'rounds.kills.attacker.player',
                'rounds.bombStatusChanges',
                'rounds.bombStatusChanges.position'
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

    it('Detects correct round wins per team', async () => {
      const team1wins = resultMatch.rounds.filter(
        _ => _.winningTeam.id === resultMatch.teams[0].id
      ).length;
      const team2wins = resultMatch.rounds.filter(
        _ => _.winningTeam.id === resultMatch.teams[1].id
      ).length;

      // Teams can get switched around sometimes...
      expect(team1wins === 14 || team1wins === 17).toBe(true);
      expect(team2wins === 14 || team2wins === 17).toBe(true);
      // Make sure teams either have 14 or 17 wins
      expect(team1wins + team2wins).toBe(31);
    });
  });

  describe('DETECTOR Rounds', () => {
    it('Registers the rounds in the match', () => {
      expect(resultMatch).toHaveProperty('rounds');
      // Knife round is included
      expect(resultMatch.rounds).toHaveLength(31);
    });

    it('fills in round info', () => {
      for (const round of resultMatch.rounds) {
        expect(round).toBeDefined();
        expect(round.match.id).toBe(resultMatch.id);
        expect(round.endReason).toBeDefined();

        expect(round.winningTeam).toBeDefined();
        expect(round.winningTeam).toBeInstanceOf(Team);
      }
    });
  });

  describe('DETECTOR Kills', () => {
    it('Detects a correct amount of kills', async () => {
      const totalKills = resultMatch.rounds.reduce(
        (prev, cur) => prev + cur.kills.length,
        0
      );
      const cataKills = resultMatch.rounds.reduce((prev, cur) => {
        return (
          prev +
          cur.kills.filter(
            _ => _.attacker.player.steamId === '76561198028175941'
          ).length
        );
      }, 0);
      const emielKills = resultMatch.rounds.reduce((prev, cur) => {
        return (
          prev +
          cur.kills.filter(
            _ => _.attacker.player.steamId === '76561198035925898'
          ).length
        );
      }, 0);

      expect(totalKills).toBe(213);
      expect(cataKills).toBe(30); // Damn this Cata guy is so good :O
      expect(emielKills).toBe(19); // What a noooooob
    });
  });

  describe('DETECTOR BombStatus', () => {
    it('Registers the BombStatus changes in the match', () => {
      for (const round of resultMatch.rounds) {
        expect(round).toHaveProperty('bombStatusChanges');
        for (const statusChange of round.bombStatusChanges) {
          expect(statusChange).toHaveProperty('position');
          expect(statusChange.position).not.toBeNull();

          expect(isPostionAllZero(statusChange.position)).toBeFalsy();
          expect(statusChange.player).not.toBeNull();
          expect(statusChange.tick).not.toBe(0);
        }
      }
    });
  });

  afterAll(async () => {
    await resultMatch.remove();
    await app.close();
  });
});
