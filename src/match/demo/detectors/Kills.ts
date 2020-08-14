import { Kill, Match } from '@bantr/lib/dist/entities';
import { DemoFile, Player } from 'demofile';

import createPlayerInfo from '../createPlayerInfo';
import Detector from './Detector';

export default class Kills extends Detector {
  savePriority = 2500;
  constructor(demoFile: DemoFile, match: Match) {
    super(demoFile, match);
  }

  getName() {
    return 'Kills';
  }

  async calculate(): Promise<void> {
    this.demoFile.gameEvents.on('player_death', e => {
      // Death happened before any rounds have started.
      // Presumably this happens during warmup/pregame...
      if (!this.match.rounds.length) {
        return;
      }

      const attacker = this.getPlayerFromId(e.attacker);
      const victim = this.getPlayerFromId(e.userid);
      const assister = this.getPlayerFromId(e.assister);

      // If there is no victim or an attacker
      // The kill data is not correct
      // TODO: This probably happens during suicide? Not sure, has to be investigated and handled correctly
      if (!victim || !attacker) {
        return;
      }

      this.logger.debug(
        `${attacker.name} (${attacker.steam64Id}) killed ${victim.name} (${victim.steam64Id}) on tick ${this.demoFile.currentTick}`
      );
      const killRecord = new Kill();

      killRecord.tick = this.currentTick;
      killRecord.throughSmoke = e.thrusmoke;
      killRecord.throughWall = !!e.penetrated;
      killRecord.whileBlind = e.attackerblind;

      killRecord.attacker = createPlayerInfo(this.demoFile, attacker);
      killRecord.attacker.player = this.findMatchingPlayer(attacker);
      killRecord.victim = createPlayerInfo(this.demoFile, victim);
      killRecord.victim.player = this.findMatchingPlayer(victim);

      if (assister) {
        killRecord.assister = createPlayerInfo(this.demoFile, assister);
        killRecord.assister.player = this.findMatchingPlayer(assister);
      }

      this.currentRound.kills.push(killRecord);
    });
  }

  async saveData() {
    for (const round of this.match.rounds) {
      for (const kill of round.kills) {
        await kill.attacker.save();
        await kill.victim.save();
        if (kill.assister) {
          await kill.assister.save();
        }
        await kill.save();
      }
    }
  }

  private findMatchingPlayer(player: Player) {
    return this.match.players.find(_ => _.steamId === player.steam64Id);
  }
}
