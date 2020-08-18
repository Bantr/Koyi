import { Player } from '@bantr/lib/dist/entities';
import { random } from 'faker';

import getDb from '../../test/getDb';
import { mockPlayer } from '../../test/globals';
import { PlayerRepository } from './player.repository';

const repo = new PlayerRepository();

const playerRecords: Player[] = [];

describe('Player repository', () => {
  beforeAll(async () => {
    await getDb();

    for (let i = 0; i < 250; i++) {
      const player = mockPlayer();
      player.steamId = random.alphaNumeric(17);
      playerRecords.push(await player.save());
    }

    await Promise.all(playerRecords);
  });

  describe('findPlayerByLastCheckedAt', () => {
    it('Returns limit amount of records', async () => {
      const defaultLimit = await repo.findPlayerByLastCheckedAt();
      expect(defaultLimit.length).toBe(100);

      const smallLimit = await repo.findPlayerByLastCheckedAt(5);
      expect(smallLimit.length).toBe(5);

      const bigLimit = await repo.findPlayerByLastCheckedAt(250);
      expect(bigLimit.length).toBe(100);
    });

    it('Sorts by lastCheckedAt', async () => {
      const result = await repo.findPlayerByLastCheckedAt();
      for (let i = 0; i < result.length; i++) {
        if (result[i + 1] === undefined) {
          return;
        }
        const curDate = result[i].lastCheckedAt;
        const nextDate = result[i + 1].lastCheckedAt;

        expect(curDate.valueOf()).toBeLessThanOrEqual(nextDate.valueOf());
      }
    });
  });
});
