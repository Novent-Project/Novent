export interface Lap {
	uuid:     string;
	game:     string;
	track:    string;
	car:      string;
	lap_time: string;
	time?:            string;
	date_time?:       string;
	session_id?:      string | null;
	lap_time_ms?:     number;
	completed_laps?:  number;
	player_name?:     string;
	tyre_compound?:   string;
	session_type?:    string;
	air_temp?:        number;
	road_temp?:       number;
	favorite?:        boolean;
}

export interface Session {
	id:            string;
	game:          string;
	track:         string;
	car:           string;
	player_name:   string;
	session_type:  string;
	air_temp:      number;
	road_temp:     number;
	tyre_compound: string;
	started_at:    string | null;
	lap_count:     number;
	best_lap_ms:   number | null;
	best_lap_id:   string | null;
}

export interface Telemetry {
	gas:                   number[];
	brake:                 number[];
	steering:              number[];
	normalizedCarPosition: number[];
	worldX:                number[];
	worldZ:                number[];
	time:                  number[];
	speedKmh:              number[];
	gear:                  number[];
	rpms:                  number[];
}

export interface TrackBoundaries {
	inner: { x: number; z: number }[];
	outer: { x: number; z: number }[];
}

export interface BackendStatus {
	connected: boolean;
	game:      string | null;
}

export interface GameConfig {
	games: Record<string, string>;
}
