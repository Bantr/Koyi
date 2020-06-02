import * as demofile from 'demofile';
import { DemoFile } from 'demofile';

import { CsgoMatchDto } from '../dto/csgoMatch.dto';
import Match from '../match.entity';
import { Logger } from '@nestjs/common';
import { Connection } from 'typeorm';

import * as Sentry from '@sentry/node'
import Detectors from './detectors'

export default class Demo {
    private readonly demoFile: DemoFile = new demofile.DemoFile();
    private readonly fileBuffer: Buffer;
    private logger: Logger;
    private readonly connection: Connection;

    constructor(fileBuffer: Buffer, connection: Connection) {
        this.fileBuffer = fileBuffer;
        this.connection = connection;
    }

    public handle(matchData: CsgoMatchDto, match: Match): Promise<Match> {
        match.type = matchData.type;
        this.logger = new Logger(`DEMO ${match.externalId}`);

        return new Promise((resolve, reject) => {
            this.logger.debug(`Starting processing`);
            const promises: Promise<Match>[] = [];

            for (const detector of Detectors) {
                const detectorClass = new detector(this.demoFile);
                promises.push(detectorClass.calculate(match));
            }


            this.demoFile.on('end', async () => {
                try {
                    this.logger.debug(`Demo file has ended, saving data.`);

                    try {
                        await Promise.all(promises);
                    } catch (e) {
                        this.logger.error(`Error while running Detectors`, e);
                        Sentry.captureException(e);
                        throw e;
                    }

                    const queryRunner = this.connection.createQueryRunner();

                    await queryRunner.connect();
                    await queryRunner.startTransaction();
                    try {

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
}
