import { Match } from '@bantr/lib/dist/entities';
import { Logger } from '@nestjs/common';
import { DemoFile } from 'demofile';

export default abstract class Detector {
  protected readonly demoFile: DemoFile;
  protected readonly logger: Logger;
  protected match: Match;

  constructor(demoFile: DemoFile, match: Match) {
    this.demoFile = demoFile;
    this.match = match;
    this.logger = new Logger(`DEMO [${match.externalId}][${this.getName()}]`);
  }

  public abstract getName(): string;

  /**
   * Adjusts the match object. Data added in one detector can be used in others
   * Eg, one detector creates an array of players, another can link kills to players
   */
  public abstract async calculate(): Promise<void>;

  /**
   * Saves all data added/modified by this detector. Note that this functions runs at the same time for all detectors
   */
  public abstract async saveData(): Promise<void>;

  public async run(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.debug(`Running detector`);
      this.calculate().catch(reject);

      this.demoFile.on('end', () => {
        this.logger.debug('Demo ended, saving data');
        this.saveData()
          .then(resolve)
          .catch(reject);
      });
    });
  }
}
