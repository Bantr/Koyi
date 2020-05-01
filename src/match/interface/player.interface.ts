/**
 * Player who played a Match
 */
export interface PlayerInMatch {
    /**
     * Steam identifier
     */
    steamId: string;
    /**
     * Faceit identifier
     */
    faceitId: string;
    /**
     * Steam username
     */
    steamUsername: string;
    /**
     * Faceit username
     */
    faceitUsername: string;
}
