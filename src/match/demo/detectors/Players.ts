import { Match } from '@bantr/lib/dist/entities';
import { Player } from '@bantr/lib/dist/entities/player.entity';
import { Logger } from '@nestjs/common';
import { DemoFile } from 'demofile';

import Detector from './Detector';

export default class Players extends Detector {
  private logger: Logger;
  /**
   *
   */
  constructor(demoFile: DemoFile) {
    super(demoFile);
  }

  private steamIdsInMatch: string[] = [];
  private playersInMatch: Array<Player> = [];

  getName() {
    return 'Players';
  }

  calculate(match: Match): Promise<Match> {
    this.logger = new Logger(`DEMO ${match.externalId}`);
    return new Promise(resolve => {
      this.demoFile.gameEvents.on('round_start', async () => {
        const players = this.demoFile.players;

        for (const demoPlayer of players) {
          const demoPlayerSteamId = demoPlayer.steam64Id.toString();
          await this.createPlayer(demoPlayerSteamId);
          match.players = this.playersInMatch;
        }
      });

      this.demoFile.on('end', async () => {
        match.players = await Promise.all(
          this.playersInMatch.map(_ => _.save())
        );
        resolve(match);
      });
    });
  }

  async createPlayer(steamId: string) {
    const existsInCurrentMatch =
      this.steamIdsInMatch.indexOf(steamId) === -1 ? false : true;
    const isSteamId = /[0-9]{17}/.test(steamId);

    if (!existsInCurrentMatch && isSteamId) {
      this.steamIdsInMatch.push(steamId);
      const existingRecord = await Player.findOne({ where: { steamId } });
      let player: Player;

      if (existingRecord) {
        player = existingRecord;
      } else {
        player = new Player();
        player.steamId = steamId;
      }
      await player.save();
      this.playersInMatch.push(player);
      this.logger.log(`Detected player ${steamId} in match`);
      return player;
    }
  }
}
