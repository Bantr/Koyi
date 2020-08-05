interface IRoster {
  player_id: string;
  nickname: string;
  avatar: string;
  membership: string;
  game_player_id: string;
  game_player_name: string;
  game_skill_level: number;
  anticheat_required: boolean;
}

interface IFaction1 {
  faction_id: string;
  leader: string;
  avatar: string;
  roster: IRoster[];
  substituted: boolean;
  name: string;
  type: string;
}

interface IRoster2 {
  player_id: string;
  nickname: string;
  avatar: string;
  membership: string;
  game_player_id: string;
  game_player_name: string;
  game_skill_level: number;
  anticheat_required: boolean;
}

interface IFaction2 {
  faction_id: string;
  leader: string;
  avatar: string;
  roster: IRoster2[];
  substituted: boolean;
  name: string;
  type: string;
}

interface ITeams {
  faction1: IFaction1;
  faction2: IFaction2;
}

interface IEntity {
  class_name: string;
  game_location_id: string;
  guid: string;
  image_lg: string;
  image_sm: string;
  name: string;
}

interface ILocation {
  entities: IEntity[];
  pick: string[];
}

interface IEntity2 {
  image_sm: string;
  name: string;
  class_name: string;
  game_map_id: string;
  guid: string;
  image_lg: string;
}

interface IMap {
  entities: IEntity2[];
  pick: string[];
}

interface IVoting {
  voted_entity_types: string[];
  location: Location;
  map: IMap;
}

interface IScore {
  faction1: number;
  faction2: number;
}

interface IResults {
  winner: string;
  score: IScore;
}

interface IItem {
  match_id: string;
  version: number;
  game: string;
  region: string;
  competition_id: string;
  competition_type: string;
  competition_name: string;
  organizer_id: string;
  teams: ITeams;
  calculate_elo: boolean;
  finished_at: number;
  chat_room_id: string;
  best_of: number;
  status: string;
  faceit_url: string;
  voting: IVoting;
  configured_at?: number;
  started_at?: number;
  demo_url: string[];
  results: IResults;
}

export interface IHubMatches {
  items: IItem[];
  start: number;
  end: number;
}
