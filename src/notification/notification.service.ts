import { IBanType } from '@bantr/lib/dist/types';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, DMChannel, MessageEmbed, TextChannel } from 'discord.js';
import * as faker from 'faker';

import Ban from '../ban/ban.entity';
import Player from '../player/player.entity';
import UserSettings from '../user-settings/user-settings.entity';
import User from '../user/user.entity';
import { NotificationRepository } from './notification.repository';

@Injectable()
export class NotificationService {
  /**
   * The logger
   */
  private logger = new Logger('NotificationService');
  public bot = new Client();

  constructor(
    private configService: ConfigService,
    private notificationRepository: NotificationRepository
  ) {
    const token = configService.get('BANTR_DISCORD_BOT_TOKEN');

    if (token) {
      this.bot.login(token);
    }

    this.bot.on('ready', () => {
      this.logger.log('Discord bot has logged in');
      this.logger.log(
        `Invite link: https://discordapp.com/oauth2/authorize?client_id=${configService.get(
          'BANTR_DISCORD_CLIENTID'
        )}&scope=bot&permissions=3072`
      );
    });
  }

  async sendNotification(options: INotificationOptions) {
    const { deletedBans, newBans, player } = options;
    // Get users that track this account
    const users = player.trackedBy;
    try {
      await this.sendToGlobalChannel(options);
    } catch (error) {
      this.logger.error(error);
    }

    this.logger.log(
      `Sending a notification to ${users.length} users about ${player.steamId}`
    );
    for (const user of users) {
      const settings = user.settings;

      const delBans = this.filterDataBasedOnSettings(
        deletedBans.filter(_ => !_.preExisting),
        settings
      );
      const addBans = this.filterDataBasedOnSettings(
        newBans.filter(_ => !_.preExisting),
        settings
      );

      if (addBans.length || delBans.length) {
        // Create notifications to display on the website
        const allBans = addBans.concat(delBans);

        for (const ban of allBans) {
          await this.notificationRepository.createNotification(user, ban);
        }

        // Handle discord notification
        if (settings.notificationDiscordEnabled) {
          try {
            await this.sendDiscordDm(user, {
              deletedBans: delBans,
              newBans: addBans,
              player
            });
          } catch (error) {
            this.logger.error(
              `Error sending Discord DM to user ${user.id} - ${error}`
            );
          }
        }
      }
    }
  }

  // Filter the new bans based on the users settings
  public filterDataBasedOnSettings(bans: Ban[], settings: UserSettings) {
    let filteredBans: Ban[] = [];

    if (settings.notificationEconomyEnabled) {
      filteredBans = filteredBans.concat(
        this.filterOnBanType(IBanType.Economy, bans)
      );
    }

    if (settings.notificationVACEnabled) {
      filteredBans = filteredBans.concat(
        this.filterOnBanType(IBanType.VAC, bans)
      );
    }

    if (settings.notificationGameEnabled) {
      filteredBans = filteredBans.concat(
        this.filterOnBanType(IBanType.Game, bans)
      );
    }

    if (settings.notificationCommunityEnabled) {
      filteredBans = filteredBans.concat(
        this.filterOnBanType(IBanType.Community, bans)
      );
    }

    if (settings.notificationFaceitEnabled) {
      filteredBans = filteredBans.concat(
        this.filterOnBanType(IBanType.Faceit, bans)
      );
    }
    return filteredBans;
  }

  // TODO: make this private
  public async sendToGlobalChannel(options: INotificationOptions) {
    const channelId = this.configService.get(
      'BANTR_GLOBAL_NOTIFICATION_DISCORD'
    );
    const channel = this.bot.channels.resolve(channelId) as TextChannel;

    const embed = await this.createDiscordEmbed(options);
    await channel.send(embed);
  }

  private async getDiscordDMChannel(user: User) {
    const discordUser = await this.bot.users.fetch(user.discordId);
    const dmChannel = await discordUser.createDM();
    return dmChannel;
  }

  private async sendDiscordDm(user: User, options: INotificationOptions) {
    const channel = await this.getDiscordDMChannel(user);
    const embed = await this.createDiscordEmbed(options);

    await channel.send(embed);
  }

  public createDiscordEmbed(options: INotificationOptionsEmbed) {
    const { deletedBans, newBans, player } = options;
    const deletedDeltas = this.constructBanDeltas(deletedBans);
    const addedDeltas = this.constructBanDeltas(newBans);

    const embed = new MessageEmbed();

    embed.addField('Steam ID', player.steamId, true);

    // Set the colour of the embed based on the ban delta
    if (deletedBans.length) {
      embed.setColor('GREEN');
    }

    if (newBans.length) {
      embed.setColor('RED');
    }

    if (newBans.length && deletedBans.length) {
      embed.setColor('ORANGE');
    }

    embed.addField(
      '🕒 Tracking since',
      `${player.createdAt.toLocaleDateString()}`,
      true
    );
    embed.setThumbnail(player.steamAvatar);
    embed.addField('Name', player.steamUsername, true);

    embed.setDescription(
      `🔗 [Profile](https://bantr.app/profile?steamId=${player.steamId})\n\n`
    );

    // TODO: #8 refactor this
    for (const banType in addedDeltas) {
      if (addedDeltas[banType].length) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const [i, ban] of addedDeltas[banType].entries()) {
          embed.description += `🚫 Banned: ${banType.toLowerCase()}\n`;
        }
      }
    }
    for (const banType in deletedDeltas) {
      if (deletedDeltas[banType].length) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const [i, ban] of deletedDeltas[banType].entries()) {
          embed.description += `☑️ Unbanned: ${banType.toLowerCase()}\n`;
        }
      }
    }

    return embed;
  }

  private constructBanDeltas(bans: Ban[]) {
    return {
      [IBanType[0]]: this.filterOnBanType(IBanType.Game, bans),
      [IBanType[1]]: this.filterOnBanType(IBanType.VAC, bans),
      [IBanType[2]]: this.filterOnBanType(IBanType.Economy, bans),
      [IBanType[3]]: this.filterOnBanType(IBanType.Faceit, bans),
      [IBanType[4]]: this.filterOnBanType(IBanType.Community, bans)
    };
  }

  private filterOnBanType(type: IBanType, bans: Ban[]) {
    return bans.filter(_ => _.type === type);
  }

  public async testDiscordNotification(user: User) {
    const player = new Player();
    player.steamId = '76561198028175941';
    player.createdAt = faker.date.past();
    player.steamAvatar = 'https://bantr.app/static/assets/bantr-icon.png';
    player.steamUsername = 'Bantr';
    player.id = faker.random.number(100000);
    player.lastCheckedAt = faker.date.past();

    const mockBan = () => {
      const ban = new Ban();
      ban.detectedAt = new Date(Date.now() - 5000);
      ban.id = faker.random.number(100000);
      ban.player = player;
      ban.preExisting = false;
      ban.type = faker.random.number(4);
      return ban;
    };

    const deletedBans = [];
    const newBans = [];

    deletedBans.push(mockBan());
    newBans.push(mockBan());
    newBans.push(mockBan());

    let channel: DMChannel;
    try {
      channel = await this.getDiscordDMChannel(user);
    } catch (error) {
      throw new BadRequestException('Failed to create a DM channel');
    }

    try {
      const embed = await this.createDiscordEmbed({
        deletedBans,
        newBans,
        player
      });
      embed.setFooter('👍 This is a test message from Bantr.');
      await channel.send(embed);
    } catch (error) {
      throw new BadRequestException('Failed to send message');
    }
  }
}

export interface INotificationOptions {
  player: Player;
  newBans: Ban[];
  deletedBans: Ban[];
}

interface INotificationOptionsEmbed {
  player: Player;
  newBans: Ban[];
  deletedBans: Ban[];
}
