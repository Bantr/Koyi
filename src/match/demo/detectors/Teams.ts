import { Match } from '@bantr/lib/dist/entities';
import { Team } from '@bantr/lib/dist/entities/team.entity';
import { DemoFile } from 'demofile';

import Detector from './Detector';

export default class Teams extends Detector {
  private teamsInMatch: Map<number, Team> = new Map();
  constructor(demoFile: DemoFile, match: Match) {
    super(demoFile, match);
  }

  getName() {
    return 'Teams';
  }

  async calculate(): Promise<void> {
    this.demoFile.gameEvents.on('round_officially_ended', async () => {
      for (const demoTeam of this.demoFile.teams) {
        const team = new Team();

        team.name = demoTeam.clanName;

        if (!this.teamsInMatch.has(demoTeam.index) && demoTeam.members.length) {
          team.players = demoTeam.members.map(member =>
            this.match.players.find(
              player => player.steamId === member.steam64Id
            )
          );

          this.logger.log(
            `Detected team ${team.name} in match - ${team.players.length} players`
          );

          this.teamsInMatch.set(demoTeam.index, team);
        }
      }

      this.match.teams = Array.from(this.teamsInMatch.values());
    });
  }

  async saveData() {
    for (const team of this.match.teams) {
      await team.save();
    }
    await this.match.save();
    return;
  }
}
