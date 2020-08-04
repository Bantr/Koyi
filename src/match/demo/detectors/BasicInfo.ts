import { Match } from '@bantr/lib/dist/entities';
import { DemoFile } from 'demofile';

import Detector from './Detector';

export default class BasicInfo extends Detector {
  savePriority = 10000;
  constructor(demoFile: DemoFile, match: Match) {
    super(demoFile, match);
  }

  getName() {
    return 'Basic info';
  }

  calculate(): Promise<void> {
    return new Promise(resolve => {
      this.demoFile.on('start', () => {
        this.match.durationTicks = this.demoFile.header.playbackTicks;
        this.match.map = this.demoFile.header.mapName;
        this.match.tickrate = this.demoFile.tickRate;
        this.match.date = new Date();
        resolve();
      });
    });
  }

  async saveData() {
    await this.match.save();
  }
}
