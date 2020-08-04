import { Match } from '@bantr/lib/dist/entities';
import { Player } from '@bantr/lib/dist/entities/player.entity';
import { DemoFile } from 'demofile';

import Detector from './Detector';

export default class Players extends Detector {
  constructor(demoFile: DemoFile, match: Match) {
    super(demoFile, match);
  }
  savePriority = 1000;
  private steamIdsInMatch: string[] = [];
  private playersInMatch: Array<Player> = [];

  getName() {
    return 'Players';
  }

  async calculate(): Promise<void> {
    this.demoFile.gameEvents.on('round_start', async () => {
      const players = this.demoFile.players;

      for (const demoPlayer of players) {
        const demoPlayerSteamId = demoPlayer.steam64Id.toString();
        await this.createPlayer(demoPlayerSteamId);
        this.match.players = this.playersInMatch;
      }
    });
  }

  async saveData() {
    await Promise.all(this.playersInMatch.map(_ => _.save()));
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
      return player;
    }
  }
}
