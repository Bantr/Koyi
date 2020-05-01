import { Match } from '@bantr/lib/dist/entities';
import { DemoFile } from 'demofile';

export default abstract class Detector {
    protected readonly demoFile: DemoFile;

    constructor(demoFile: DemoFile) {
        this.demoFile = demoFile;
    }

    public abstract getName(): string;

    public abstract calculate(match: Match): Promise<Match>;
}
