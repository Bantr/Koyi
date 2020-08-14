import { Match, Round, Team } from '@bantr/lib/dist/entities';
import * as Sentry from '@sentry/node';
import { DemoFile, Team as DemoTeam } from 'demofile';

import Detector from './Detector';

export default class Rounds extends Detector {
  private activeRound: Round;
  private activeRoundWinner: DemoTeam;

  // At halftime, teams switch. This variable is used to keep track of that
  private invertTeams = false;
  savePriority = 3000;
  constructor(demoFile: DemoFile, match: Match) {
    super(demoFile, match);
  }

  getName() {
    return 'Rounds';
  }

  async calculate(): Promise<void> {
    this.match.rounds = [];
    this.demoFile.gameEvents.on('round_start', () => {
      this.logger.debug(`Round ${this.match.rounds.length + 1} started`);
      this.activeRound = new Round();
      this.match.rounds.push(this.activeRound);
      this.activeRound.match = this.match;
      // TODO: Can these be automatically initialized in the entity constructor?
      this.activeRound.kills = [];
      this.activeRound.bombStatusChanges = [];
      this.activeRound.startTick = this.demoFile.currentTick;
    });

    this.demoFile.gameEvents.on('round_end', e => {
      if (!this.activeRound) {
        return;
      }
      this.logger.debug(`Round ${this.match.rounds.length} ended`);
      this.activeRound.endTick = this.demoFile.currentTick;

      this.activeRound.endReason = e.reason;
      this.activeRoundWinner = this.demoFile.teams.find(_ => {
        return _.teamNumber === e.winner;
      });
      this.activeRound.winningTeam = this.findMatchingTeam(
        this.activeRoundWinner,
        this.match.teams
      );
    });

    this.demoFile.gameEvents.on('round_officially_ended', () => {
      if (!this.activeRound) {
        return;
      }
      this.logger.debug(`Round ${this.match.rounds.length} officially ended`);

      this.activeRound.officialEndTick = this.demoFile.currentTick;
    });

    this.demoFile.gameEvents.on('round_announce_last_round_half', () => {
      this.logger.debug(`Half time! Switching teams`);
      this.invertTeams = !this.invertTeams;
    });
  }

  async saveData() {
    for (const round of this.match.rounds) {
      // If a round has no endTick, it never actually ended
      // and we should not try to save it
      if (!round.endTick) {
        continue;
      }

      // Sometimes a round has no officialEndTick
      // In that case, we set it to endTick
      if (!round.officialEndTick) {
        round.officialEndTick = round.endTick;
      }

      try {
        await round.save();
      } catch (e) {
        // TODO:
        // Demos have weird behavior, like rounds starting but not 'ending'.
        // If a round fails to save, we assume the round is bogus
        // For now, just log any errors that happen and capture them in Sentry
        // This way we will be able to see what demo types show which weird behavior
        this.logger.error(e);
        this.logger.error(e.message);
        this.logger.error(e.stack);
        Sentry.captureException(e);
      }
    }
  }

  private findMatchingTeam(demoTeam: DemoTeam, matchTeams: Team[]) {
    if (this.invertTeams) {
      return matchTeams.find(team => team.handle !== demoTeam.handle);
    } else {
      return matchTeams.find(team => team.handle === demoTeam.handle);
    }
  }
}
