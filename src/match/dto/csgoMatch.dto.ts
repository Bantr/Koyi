import { IMatchType } from '@bantr/lib/dist/types';
import { IsNotEmpty, IsString, IsUrl, ValidateNested } from 'class-validator';

/**
 * DTO for a CSGO match
 */
export class CsgoMatchDto {
    /**
     * ID gotten from the demo
     */
    @IsString()
    @IsNotEmpty()
    id: string;
    /**
     * Type of match
     */
    @ValidateNested()
    type: IMatchType;

    /**
     * ID gotten from service this match was played on
     */
    @IsString()
    @IsNotEmpty()
    externalId: string;

    @IsUrl()
    @IsNotEmpty()
    demoUrl: string;
}
