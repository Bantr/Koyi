import * as fs from 'fs';
import * as path from 'path';

import Demo from './demo';

describe('Demo handler', () => {
  let demoClass: Demo;
  let demoFileBuffer: Buffer;

  beforeAll(() => {
    demoFileBuffer = fs.readFileSync(
      path.join(__dirname, '../../test/demos/faceit-5v5.dem')
    );
    demoClass = new Demo(demoFileBuffer);
  });

  it('is defined', () => {
    expect(demoClass).toBeDefined();
  });
});
