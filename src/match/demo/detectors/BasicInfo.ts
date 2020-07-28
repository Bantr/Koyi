import { Match } from '@bantr/lib/dist/entities';
import { DemoFile } from 'demofile';

import Detector from './Detector';

export default class BasicInfo extends Detector {
  constructor(demoFile: DemoFile) {
    super(demoFile);
  }

  getName() {
    return 'Basic info';
  }

  calculate(match: Match): Promise<Match> {
    return new Promise(resolve => {
      this.demoFile.on('start', () => {
        match.durationTicks = this.demoFile.header.playbackTicks;
        match.map = this.demoFile.header.mapName;
        match.tickrate = this.demoFile.tickRate;
        match.date = new Date();
        resolve(match);
      });
    });
  }
}
