import * as demofile from 'demofile';
import { DemoFile } from 'demofile';

import { CsgoMatchDto } from '../dto/csgoMatch.dto';
import Match from '../match.entity';
import { Logger } from '@nestjs/common';

import * as Sentry from '@sentry/node';
import Detectors from './detectors';

export default class Demo {
  private readonly demoFile: DemoFile = new demofile.DemoFile();
  private readonly fileBuffer: Buffer;
  private logger: Logger;

  constructor(fileBuffer: Buffer) {
    this.fileBuffer = fileBuffer;
  }

  public handle(matchData: CsgoMatchDto, match: Match): Promise<Match> {
    match.type = matchData.type;
    this.logger = new Logger(`DEMO ${match.externalId}`);

    return new Promise(resolve => {
      this.logger.debug(`Starting processing`);
      const promises: Promise<void>[] = [];

      for (const detector of Detectors) {
        const detectorClass = new detector(this.demoFile, match);
        promises.push(detectorClass.run());
      }

      this.demoFile.on('end', async () => {
        this.logger.debug(`Demo file has ended, awaiting detectors.`);

        try {
          await Promise.all(promises);
        } catch (e) {
          this.logger.error(`Error while running Detectors`, e);
          Sentry.captureException(e);
          throw e;
        }

        resolve(match);
      });

      this.demoFile.parse(this.fileBuffer);
    });
  }
}
