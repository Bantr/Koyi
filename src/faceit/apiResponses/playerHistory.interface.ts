export interface IPlayer {
  player_id: string;
  nickname: string;
  avatar: string;
  skill_level: number;
  game_player_id: string;
  game_player_name: string;
  faceit_url: string;
}

export interface IFaction1 {
  team_id: string;
  nickname: string;
  avatar: string;
  type: string;
  players: IPlayer[];
}

export interface IPlayer2 {
  player_id: string;
  nickname: string;
  avatar: string;
  skill_level: number;
  game_player_id: string;
  game_player_name: string;
  faceit_url: string;
}

export interface IFaction2 {
  team_id: string;
  nickname: string;
  avatar: string;
  type: string;
  players: IPlayer2[];
}

export interface ITeams {
  faction1: IFaction1;
  faction2: IFaction2;
}

export interface IScore {
  faction1: number;
  faction2: number;
}

export interface IResults {
  winner: string;
  score: IScore;
}

export interface IItem {
  match_id: string;
  game_id: string;
  region: string;
  match_type: string;
  game_mode: string;
  max_players: number;
  teams_size: number;
  teams: ITeams;
  playing_players: string[];
  competition_id: string;
  competition_name: string;
  competition_type: string;
  organizer_id: string;
  status: string;
  started_at: number;
  finished_at: number;
  results: IResults;
  faceit_url: string;
}

export interface IPlayerHistory {
  items: IItem[];
  start: number;
  end: number;
  from: number;
  to: number;
}
