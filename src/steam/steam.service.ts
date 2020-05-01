import { Injectable, Logger, HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Handles actions to do with Steam
 */
@Injectable()
export class SteamService {
    /**
     * The logger ;)
     */
    private logger: Logger = new Logger('SteamService');
    /**
     * API key used for authentication with Steam API
     */
    private steamApiKey: string;
    /**
     * The service constructor
     * @param httpService
     * @param configService
     */
    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.steamApiKey = configService.get('BANTR_STEAM_API');
    }

    /**
     * Get ban status for an array of steam IDs
     * @param steamIds
     */
    async getUserBans(steamIds: string[]) {
        // TODO create interface for steamId
        const response = await this.httpService.get(`https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/`, {
            params: {
                key: this.steamApiKey,
                steamids: steamIds.join(','),
            },
        }).toPromise();
        const data: GetPlayerBansResponse[] = response.data.players;
        return data;
    }

    /**
     * Get ban status for an array of steam IDs
     * @param steamIds
     */
    async getUserProfiles(steamIds: string[]) {
        // TODO create interface for steamId
        const response = await this.httpService.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/`, {
            params: {
                key: this.steamApiKey,
                steamids: steamIds.join(','),
            },
        }).toPromise();
        return response.data.response.players;
    }

}

/**
 * Response from Steam API ISteamUser/GetPlayerBans/v1/
 */
export interface GetPlayerBansResponse {
    /**
     * SteamID64
     */
    SteamId: string;
    /**
     * Is the user banned from Steam community functions
     */
    CommunityBanned: boolean;
    /**
     * Is the user banned by VAC
     */
    VACBanned: boolean;
    /**
     * How many VAC bans does this user have
     */
    NumberOfVACBans: number;
    /**
     * How long ago was the last ban added
     */
    DaysSinceLastBan: number;
    /**
     * How many game bans
     */
    NumberOfGameBans: number;
    /**
     * Type of economy ban
     */
    EconomyBan: EconomyBan;
}

/**
 * Types of economy bans
 */
export enum EconomyBan {
    Banned = 'banned',
    NotBanned = 'none',
    Probation = 'probation',
}
