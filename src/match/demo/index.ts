import * as demofile from 'demofile';
import { DemoFile } from 'demofile';

import Detectors from './detectors';
import { CsgoMatchDto } from '../dto/csgoMatch.dto';
import Match from '../match.entity';
import { Logger } from '@nestjs/common';
import { Connection } from 'typeorm';
import { Player } from '@bantr/lib/dist/entities/player.entity';

export default class Demo {
    private readonly demoFile: DemoFile = new demofile.DemoFile();
    private readonly fileBuffer: Buffer;
    private logger: Logger;
    private readonly connection: Connection;

    private steamIdsInMatch: string[] = [];
    private playersInMatch: Player[] = [];

    constructor(fileBuffer: Buffer, connection: Connection) {
        this.fileBuffer = fileBuffer;
        this.connection = connection;

    }

    public handle(matchData: CsgoMatchDto): Promise<Match> {
        const match = new Match();
        match.date = new Date();
        match.externalId = matchData.externalId;
        match.type = matchData.type;
        this.logger = new Logger(`DEMO ${match.externalId}`);

        return new Promise((resolve, reject) => {
            this.logger.debug(`Starting processing`);

            this.demoFile.gameEvents.on('round_start', async (event) => {
                const players = this.demoFile.players;

                for (const demoPlayer of players) {
                    const demoPlayerSteamId = demoPlayer.steam64Id.toString();

                    this.pushPlayer(demoPlayerSteamId);

                }
            });

            this.demoFile.on('end', async () => {
                try {
                    this.logger.debug(`Demo file has ended, saving data.`);

                    const queryRunner = this.connection.createQueryRunner();

                    await queryRunner.connect();
                    await queryRunner.startTransaction();
                    try {
                        match.players = this.playersInMatch;
                        await match.save();
                        await queryRunner.commitTransaction();
                    } catch (err) {
                        // since we have errors lets rollback the changes we made
                        await queryRunner.rollbackTransaction();
                        return reject(err);
                    } finally {
                        // you need to release a queryRunner which was manually instantiated
                        await queryRunner.release();
                    }

                } catch (error) {
                    return reject(error);
                }
                resolve(match);
            });

            this.demoFile.parse(this.fileBuffer);
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
            this.playersInMatch.push(await player.save());
            this.logger.log(`Detected player ${steamId} in match`);
        }

    }

}
