import * as demofile from 'demofile';
import { DemoFile } from 'demofile';

import { CsgoMatchDto } from '../dto/csgoMatch.dto';
import Match from '../match.entity';
import { Logger } from '@nestjs/common';

import * as Sentry from '@sentry/node';
import Detectors from './detectors';
import Detector from './detectors/Detector';

export default class Demo {
  private readonly demoFile: DemoFile = new demofile.DemoFile();
  private readonly fileBuffer: Buffer;
  private logger: Logger;
  private detectors: Detector[] = [];

  constructor(fileBuffer: Buffer) {
    this.fileBuffer = fileBuffer;
  }

  public handle(matchData: CsgoMatchDto, match: Match): Promise<Match> {
    match.type = matchData.type;
    this.logger = new Logger(`DEMO ${match.externalId}`);

    return new Promise((resolve, reject) => {
      this.logger.debug(`Starting processing`);
      const promises: Promise<void>[] = [];

      for (const detector of Detectors) {
        const detectorClass = new detector(this.demoFile, match);
        this.detectors.push(detectorClass);
        promises.push(detectorClass.run());
      }

      this.demoFile.on('end', async () => {
        this.logger.debug(`Demo file has ended, awaiting detectors.`);

        try {
          await Promise.all(promises);
          const sortedDetectors = this.detectors.sort(
            (a, b) => a.savePriority - b.savePriority
          );
          for (const detector of sortedDetectors) {
            this.logger.debug(
              `Saving data for ${detector.getName()} - priority ${
                detector.savePriority
              }`
            );
            await detector.saveData();
          }
        } catch (error) {
          this.logger.error(`Error while running Detectors`);
          this.logger.error(error.stack);
          Sentry.captureException(error);
          return reject(error);
        }

        resolve(match);
      });

      this.demoFile.parse(this.fileBuffer);
    });
  }
}
