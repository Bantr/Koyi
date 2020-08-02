import { Match, Player } from '@bantr/lib/dist/entities';
import { Team } from '@bantr/lib/dist/entities/team.entity';
import { Logger } from '@nestjs/common';
import { DemoFile } from 'demofile';

import Detector from './Detector';

export default class Teams extends Detector {
  private logger: Logger;
  private teamsInMatch: Map<number, Team> = new Map();
  constructor(demoFile: DemoFile) {
    super(demoFile);
  }

  getName() {
    return 'Teams';
  }

  calculate(match: Match): Promise<Match> {
    this.logger = new Logger(`DEMO ${match.externalId}`);
    return new Promise((resolve, reject) => {
      this.demoFile.gameEvents.on('round_officially_ended', async () => {
        for (const demoTeam of this.demoFile.teams) {
          const team = new Team();

          team.name = demoTeam.clanName;

          if (
            !this.teamsInMatch.has(demoTeam.index) &&
            demoTeam.members.length
          ) {
            team.players = demoTeam.members.map(member =>
              match.players.find(player => player.steamId === member.steam64Id)
            );

            this.logger.log(
              `Detected team ${team.name} in match - ${team.players.length} players`
            );

            this.teamsInMatch.set(demoTeam.index, team);
          }
        }

        match.teams = Array.from(this.teamsInMatch.values());
      });

      this.demoFile.on('end', () =>
        this.saveData(match)
          .then(resolve)
          .catch(reject)
      );
    });
  }

  async saveData(match: Match) {
    this.logger.debug('Teams detector finished demo, saving data');
    for (const team of match.teams) {
      await team.save();
      this.logger.debug('Setting player -> teams relation');
      for (const player of team.players) {
        const playerRecord = await Player.findOne(player.id, {
          relations: ['teams']
        });
        playerRecord.teams.push(team);
        await playerRecord.save();
      }
    }
    this.logger.debug('Teams detector finished saving data');
    return match;
  }
}
