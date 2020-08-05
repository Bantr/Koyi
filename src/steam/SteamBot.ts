import { Logger } from '@nestjs/common';
import * as csgo from 'csgo';
import * as Steam from 'steam';

export default class SteamBot {
  private readonly steamClient = new Steam.SteamClient();
  private readonly steamUser = new Steam.SteamUser(this.steamClient);
  private readonly gameCoordinator = new Steam.SteamGameCoordinator(
    this.steamClient,
    730
  );
  private readonly CSGOClient = new csgo.CSGOClient(
    this.steamUser,
    this.gameCoordinator,
    false
  );

  public ready: boolean;

  private logger = new Logger('SteamBot');

  constructor(username: string, password: string) {
    if (!username.length || !password.length) {
      this.logger.warn(
        'No Steam username or password provided, not initializing Steam bot.'
      );
      return;
    }

    this.steamClient.connect();
    this.steamClient.on('connected', () => {
      this.steamUser.logOn({
        // eslint-disable-next-line @typescript-eslint/camelcase
        account_name: username,
        password: password
      });
    });
    this.steamClient.on('logOnResponse', () => {
      this.logger.debug('Steam bot user logged in');

      this.CSGOClient.launch();
      this.CSGOClient.on('ready', () => {
        this.logger.log('CSGO Client ready');
        this.ready = true;
      });

      this.CSGOClient.on('unready', () => {
        this.logger.warn('CSGO Client unready');
        this.ready = false;
      });
    });

    this.steamClient.on('error', error => {
      this.logger.debug(error);
    });
  }

  async waitForReady(): Promise<void> {
    if (this.ready) {
      return;
    } else {
      return new Promise(resolve => {
        this.CSGOClient.once('ready', () => {
          resolve();
        });
      });
    }
  }

  async getDemoUrlFromShareCode(sharecode: string): Promise<string | null> {
    if (!this.ready) {
      await this.waitForReady();
    }

    return new Promise(resolve => {
      const matchInfo = new csgo.SharecodeDecoder(sharecode).decode();

      this.CSGOClient.requestGame(
        matchInfo.matchId,
        matchInfo.outcomeId,
        parseInt(matchInfo.tokenId, 10)
      );

      this.CSGOClient.once('matchList', data => {
        // Demo URL is only available in last element of roundstatsall...
        const roundStatsObject =
          data.matches[0].roundstatsall[
            data.matches[0].roundstatsall.length - 1
          ];

        if (!data.matches[0]) {
          this.logger.warn('No matches returned, invalid sharecode?');
          resolve(null);
        }

        if (!roundStatsObject.map) {
          this.logger.warn('No demo url returned, match expired?');
          resolve(null);
        }

        resolve(roundStatsObject.map);
      });
    });
  }
}
