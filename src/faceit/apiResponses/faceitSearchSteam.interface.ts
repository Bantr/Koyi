export interface IInfractions {
  last_infraction_date: string;
  afk: number;
  leaver: number;
  qm_not_checkedin: number;
  qm_not_voted: number;
}

export interface IPlatforms {
  steam: string;
}

export interface IEU {
  selected_ladder_id: string;
}

export interface IRegions {
  EU: IEU;
}

export interface ICsgo {
  game_profile_id: string;
  region: string;
  regions: IRegions;
  skill_level_label: string;
  game_player_id: string;
  skill_level: number;
  faceit_elo: number;
  game_player_name: string;
}

export interface IEU2 {
  selected_ladder_id: string;
}

export interface IRegions2 {
  EU: IEU2;
}

export interface ICsco {
  game_profile_id: string;
  region: string;
  regions: IRegions2;
  skill_level_label: string;
  game_player_id: string;
  skill_level: number;
  faceit_elo: number;
  game_player_name: string;
}

export interface IGames {
  csgo: ICsgo;
  csco: ICsco;
}

export interface ISettings {
  language: string;
}

export interface IFaceitSearchForSteamId {
  player_id: string;
  nickname: string;
  avatar: string;
  country: string;
  cover_image: string;
  cover_featured_image: string;
  infractions: IInfractions;
  platforms: IPlatforms;
  games: IGames;
  settings: ISettings;
  friends_ids: string[];
  bans: any[];
  new_steam_id: string;
  steam_id_64: string;
  steam_nickname: string;
  membership_type: string;
  memberships: string[];
  faceit_url: string;
}
