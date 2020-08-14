import { Match, Position } from '@bantr/lib/dist/entities';
import { BombStatus as BombStatusEntity } from '@bantr/lib/dist/entities/bombStatus.entity';
import { BombStatusChange } from '@bantr/lib/dist/types/BombStatusChange.enum';
import { DemoFile } from 'demofile';

import createPlayerInfo from '../createPlayerInfo';
import Detector from './Detector';

export default class BombStatus extends Detector {
  savePriority = 2400;
  constructor(demoFile: DemoFile, match: Match) {
    super(demoFile, match);
  }

  getName() {
    return 'Bomb status changes';
  }

  private createBombPosition() {
    const position = new Position();
    if (!this.bomb) {
      return null;
    }
    const { x, y, z } = this.bomb.position;
    position.x = x.toString();
    position.y = y.toString();
    position.z = z.toString();
    return position;
  }

  private createBombStatus(type: BombStatusChange, userId: number) {
    const bombStatus = new BombStatusEntity();
    bombStatus.type = type;
    bombStatus.tick = this.currentTick;
    bombStatus.player = createPlayerInfo(
      this.demoFile,
      this.getPlayerFromId(userId)
    );
    bombStatus.position = this.createBombPosition();
    this.currentRound.bombStatusChanges.push(bombStatus);
  }

  async calculate() {
    this.demoFile.gameEvents.on('bomb_defused', e => {
      this.logger.debug(`Bomb defused ${e.site}`);
      this.createBombStatus(BombStatusChange.Defused, e.userid);
    });

    this.demoFile.gameEvents.on('bomb_exploded', e => {
      this.logger.debug(`Bomb exploded ${e.site}`);
      this.createBombStatus(BombStatusChange.Exploded, e.userid);
    });

    this.demoFile.gameEvents.on('bomb_abortdefuse', e => {
      this.logger.debug(`Bomb stopped defusing`);
      this.createBombStatus(BombStatusChange.StopDefuse, e.userid);
    });

    this.demoFile.gameEvents.on('bomb_begindefuse', e => {
      this.logger.debug(`Bomb started defusing`);
      this.createBombStatus(BombStatusChange.StartDefuse, e.userid);
    });

    this.demoFile.gameEvents.on('bomb_dropped', e => {
      this.logger.debug(`Bomb dropped`);
      this.createBombStatus(BombStatusChange.Dropped, e.userid);
    });

    this.demoFile.gameEvents.on('bomb_pickup', e => {
      this.logger.debug(`Bomb picked up`);
      this.createBombStatus(BombStatusChange.PickedUp, e.userid);
    });

    this.demoFile.gameEvents.on('bomb_planted', e => {
      this.logger.debug(`Bomb planted`);
      this.createBombStatus(BombStatusChange.Planted, e.userid);
    });
  }

  async saveData() {
    for (const round of this.match.rounds) {
      for (const statusChange of round.bombStatusChanges) {
        if (statusChange.position) {
          await statusChange.position.save();
        }
        await statusChange.player.save();
        await statusChange.save();
      }
    }
  }
}
