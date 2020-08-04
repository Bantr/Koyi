import { Match } from '@bantr/lib/dist/entities';
import { Team } from '@bantr/lib/dist/entities/team.entity';
import { TeamType } from '@bantr/lib/dist/types/TeamType.enum';
import { DemoFile } from 'demofile';

import Detector from './Detector';

export default class Teams extends Detector {
  private teamsInMatch: Map<number, Team> = new Map();
  savePriority = 2000;
  // What round are we currently handling?
  private roundIndex = 1;
  constructor(demoFile: DemoFile, match: Match) {
    super(demoFile, match);
  }

  getName() {
    return 'Teams';
  }

  async calculate(): Promise<void> {
    this.demoFile.gameEvents.on('round_end', async () => {
      for (const demoTeam of this.demoFile.teams) {
        const team = new Team();

        team.name = demoTeam.clanName;
        team.handle = demoTeam.handle;

        if (
          !this.teamsInMatch.has(demoTeam.handle) &&
          demoTeam.members.length
        ) {
          team.players = demoTeam.members.map(member =>
            this.match.players.find(
              player => player.steamId === member.steam64Id
            )
          );

          this.logger.log(
            `Detected team ${team.name} in match - ${team.players.length} players`
          );

          this.teamsInMatch.set(demoTeam.handle, team);
        }
      }

      this.match.teams = Array.from(this.teamsInMatch.values());

      // We set this not on the first round to account for
      // Knife rounds, restarts before the game, ...
      if (this.roundIndex === 5) {
        this.setStartingSides();
      }

      this.roundIndex++;
    });
  }

  async saveData() {
    for (const team of this.match.teams) {
      await team.save();
    }
    await this.match.save();
    return;
  }

  private setStartingSides() {
    this.match.teams = this.match.teams.map(team => {
      const matchingTeam = this.demoFile.teams.find(
        _ => _.handle === team.handle
      );

      team.startingSide = Object.values(TeamType)[
        matchingTeam.teamNumber
      ] as TeamType;
      return team;
    });
  }
}
