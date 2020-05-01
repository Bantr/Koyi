import { DemoFile } from 'demofile';

import Detector from './Detector';
import { Match } from '@bantr/lib/dist/entities';

export default class BasicInfo extends Detector {
    /**
     *
     */
    constructor(demoFile: DemoFile) {
        super(demoFile);
    }

    getName() {
        return 'Basic info';
    }

    calculate(match: Match): Promise<Match> {
        return new Promise((resolve, reject) => {
            this.demoFile.on('start', () => {
                // console.log('Demo header:', this.demoFile.header);
                // console.log('Tick rate:', this.demoFile.tickRate);
                resolve(match);
            });

        });

    }
}
