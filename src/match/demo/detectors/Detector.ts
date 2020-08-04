import { Match } from '@bantr/lib/dist/entities';
import { Logger } from '@nestjs/common';
import { DemoFile } from 'demofile';

export default abstract class Detector {
  protected readonly demoFile: DemoFile;
  protected readonly logger: Logger;
  protected match: Match;
  /**
   * When should this detector call it's save function?
   * Due to the complexity of our datastructures, we have to make sure we save the data in the correct order
   * priority = 0 highest priority, will run first
   */
  public abstract readonly savePriority: number;

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
      const calcPromise = this.calculate();

      this.demoFile.on('end', () => {
        calcPromise.then(resolve).catch(reject);
      });
    });
  }
}
