import { IBanType } from '@bantr/lib/dist/types';

import Player from '../../player/player.entity';

/**
 * DTO for a Ban
 */
export class CreateBanDTO {
    /**
     * Type of ban
     * VAC, game, economy, faceit, ...
     */
    type: IBanType;

    /**
     * When was the ban detected by the system
     */
    detectedAt: Date;

    /**
     * Did the ban exist before the system started tracking the account?
     */

    preExisting: boolean;
    /**
     * Tracked Account this ban belongs to
     */
    player: Player;
}
