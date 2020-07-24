/**
 * Response from Steam API ISteamUser/GetPlayerBans/v1/
 */
export default interface IGetPlayerBansResponse {
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
