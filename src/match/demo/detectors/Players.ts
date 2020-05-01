import { Match } from '@bantr/lib/dist/entities';
import { Player } from '@bantr/lib/dist/entities/player.entity';
import { Logger } from '@nestjs/common';
import { DemoFile } from 'demofile';

import Detector from './Detector';

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}


export default class Players extends Detector {
    private logger: Logger;
    /**
     *
     */
    constructor(demoFile: DemoFile) {
        super(demoFile);
    }

    private steamIdsInMatch: string[] = [];
    private playersInMatch: Array<Promise<Player>> = [];

    getName() {
        return 'Players';
    }

    calculate(match: Match): Promise<Match> {
        this.logger = new Logger(`DEMO ${match.externalId}`);
        return new Promise((resolve) => {

            this.demoFile.gameEvents.on('round_start', async () => {
                const players = this.demoFile.players;

                for (const demoPlayer of players) {
                    const demoPlayerSteamId = demoPlayer.steam64Id.toString();

                    this.pushPlayer(demoPlayerSteamId);

                }
            });

            this.demoFile.on('end', async () => {

                match.players = await Promise.all(this.playersInMatch);
                match.players = match.players.filter(onlyUnique);
                resolve(match);
            });

        });
    }

    async pushPlayer(steamId: string) {

        const existsInCurrentMatch = this.steamIdsInMatch.indexOf(steamId) === -1 ? false : true;
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
            this.playersInMatch.push(player.save());
            this.logger.log(`Detected player ${steamId} in match`);
        }

    }
}

