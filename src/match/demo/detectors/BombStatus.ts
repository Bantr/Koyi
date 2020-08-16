import { Match, Position } from '@bantr/lib/dist/entities';
import { BombStatus as BombStatusEntity } from '@bantr/lib/dist/entities/bombStatus.entity';
import { BombStatusChange } from '@bantr/lib/dist/types/BombStatusChange.enum';
import { DemoFile, Player } from 'demofile';

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

  private createBombPosition(type: BombStatusChange, player: Player) {
    const position = new Position();
    let x, y, z;
    if (this.bomb !== undefined) {
      ({ x, y, z } = this.bomb.position);
    }

    // If the bomb exploded, there is no entity anymore to get the position of
    // We find the postion of the bombPlanted event and use that instead
    if (type === BombStatusChange.Exploded) {
      this.logger.debug(
        'No bomb entity found, finding location where bomb was planted'
      );
      ({ x, y, z } = this.currentRound.bombStatusChanges.find(
        _ => _.type === BombStatusChange.Planted
      ).position);
    }

    // If the bomb was picked up
    // We should use the players position
    if (type === BombStatusChange.PickedUp) {
      ({ x, y, z } = player.position);
    }

    // If position is 0 for whatever reason
    // We use the players position
    if (
      parseInt(x, 10) === 0 &&
      parseInt(y, 10) === 0 &&
      parseInt(z, 10) === 0
    ) {
      ({ x, y, z } = player.position);
    }

    // If position is undefined/null for whatever reason
    // We use the players position
    if (!x && !y && !z) {
      ({ x, y, z } = player.position);
    }

    position.x = x.toString();
    position.y = y.toString();
    position.z = z.toString();
    return position;
  }

  private createBombStatus(type: BombStatusChange, player: Player) {
    const bombStatus = new BombStatusEntity();
    bombStatus.type = type;
    bombStatus.tick = this.currentTick;
    if (player) {
      bombStatus.player = createPlayerInfo(this.demoFile, player);
    }

    bombStatus.position = this.createBombPosition(type, player);
    this.currentRound.bombStatusChanges.push(bombStatus);
  }

  async calculate() {
    this.demoFile.gameEvents.on('bomb_defused', e => {
      this.logger.debug(`Bomb defused ${e.site}`);
      this.createBombStatus(
        BombStatusChange.Defused,
        this.getPlayerFromId(e.userid)
      );
    });

    this.demoFile.gameEvents.on('bomb_exploded', e => {
      this.logger.debug(`Bomb exploded ${e.site}`);
      this.createBombStatus(
        BombStatusChange.Exploded,
        this.getPlayerFromId(e.userid)
      );
    });

    this.demoFile.gameEvents.on('bomb_abortdefuse', e => {
      this.logger.debug(`Bomb stopped defusing`);
      this.createBombStatus(
        BombStatusChange.StopDefuse,
        this.getPlayerFromId(e.userid)
      );
    });

    this.demoFile.gameEvents.on('bomb_begindefuse', e => {
      this.logger.debug(`Bomb started defusing`);
      this.createBombStatus(
        BombStatusChange.StartDefuse,
        this.getPlayerFromId(e.userid)
      );
    });

    this.demoFile.gameEvents.on('bomb_dropped', e => {
      this.logger.debug(`Bomb dropped`);
      this.createBombStatus(
        BombStatusChange.Dropped,
        this.getPlayerFromId(e.userid)
      );
    });

    this.demoFile.gameEvents.on('bomb_pickup', e => {
      this.logger.debug(`Bomb picked up`);
      this.createBombStatus(
        BombStatusChange.PickedUp,
        this.getPlayerFromId(e.userid)
      );
    });

    this.demoFile.gameEvents.on('bomb_planted', e => {
      this.logger.debug(`Bomb planted`);
      this.createBombStatus(
        BombStatusChange.Planted,
        this.getPlayerFromId(e.userid)
      );
    });
  }

  async saveData() {
    for (const round of this.match.rounds) {
      for (const statusChange of round.bombStatusChanges) {
        if (statusChange.position) {
          await statusChange.position.save();
        }
        if (statusChange.player) {
          await statusChange.player.save();
        }

        await statusChange.save();
      }
    }
  }
}
