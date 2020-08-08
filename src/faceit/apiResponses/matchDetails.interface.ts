export interface IRoster {
  player_id: string;
  nickname: string;
  avatar: string;
  membership: string;
  game_player_id: string;
  game_player_name: string;
  game_skill_level: number;
  anticheat_required: boolean;
}

export interface IFaction2 {
  faction_id: string;
  leader: string;
  avatar: string;
  roster: IRoster[];
  substituted: boolean;
  name: string;
  type: string;
}

export interface IRoster2 {
  player_id: string;
  nickname: string;
  avatar: string;
  membership: string;
  game_player_id: string;
  game_player_name: string;
  game_skill_level: number;
  anticheat_required: boolean;
}

export interface IFaction1 {
  faction_id: string;
  leader: string;
  avatar: string;
  roster: IRoster2[];
  substituted: boolean;
  name: string;
  type: string;
}

export interface ITeams {
  faction2: IFaction2;
  faction1: IFaction1;
}

export interface IEntity {
  name: string;
  class_name: string;
  game_map_id: string;
  guid: string;
  image_lg: string;
  image_sm: string;
}

export interface IMap {
  entities: IEntity[];
  pick: string[];
}

export interface IVoting {
  voted_entity_types: string[];
  map: IMap;
}

export interface IScore {
  faction1: number;
  faction2: number;
}

export interface IResults {
  winner: string;
  score: IScore;
}

export interface IMatchDetails {
  match_id: string;
  version: number;
  game: string;
  region: string;
  competition_id: string;
  competition_type: string;
  competition_name: string;
  organizer_id: string;
  teams: ITeams;
  voting: IVoting;
  calculate_elo: boolean;
  configured_at: number;
  started_at: number;
  finished_at: number;
  demo_url: string[];
  chat_room_id: string;
  best_of: number;
  results: IResults;
  status: string;
  faceit_url: string;
}
