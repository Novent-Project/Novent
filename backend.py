import atexit
import datetime
import json
import math
import mmap
import os
import re
import sqlite3
from pathlib import Path
import uuid
from time import sleep
import threading
import ctypes
from ctypes import c_int32, c_float, c_wchar
from contextlib import asynccontextmanager
from dataclasses import dataclass
import numpy as np
import h5py

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel
import psutil

app_data_dir = Path(os.environ.get("LOCALAPPDATA", "")) if os.name == "nt" else Path.cwd()
novent_data_dir = app_data_dir / "Novent"
novent_data_dir.mkdir(parents=True, exist_ok=True)
(novent_data_dir / "laps" / "default").mkdir(parents=True, exist_ok=True)
(novent_data_dir / "boundaries").mkdir(parents=True, exist_ok=True)
print(f"Using data directory: {novent_data_dir}")

AC_STATUS = c_int32
AC_OFF = 0
AC_REPLAY = 1
AC_LIVE = 2
AC_PAUSE = 3
AC_SESSION_TYPE = c_int32
AC_UNKNOWN = -1
AC_PRACTICE = 0
AC_QUALIFY = 1
AC_RACE = 2
AC_HOTLAP = 3
AC_TIME_ATTACK = 4
AC_DRIFT = 5
AC_DRAG = 6

AC_SESSION_NAMES = {
    -1: "Unknown", 0: "Practice", 1: "Qualify", 2: "Race",
    3: "Hotlap", 4: "Time Attack", 5: "Drift", 6: "Drag",
}
SESSION_IDLE_SECONDS = 30 * 60  # 30 minutes


@dataclass
class SessionInfo:
    air_temp:       float = 0.0
    road_temp:      float = 0.0
    player_name:    str   = "Driver"
    tyre_compound:  str   = ""
    session_type:   str   = "Unknown"
    completed_laps: int   = 0


class SPageFilePhysics(ctypes.Structure):
    _pack_ = 4
    _fields_ = [
        ('packetId', c_int32),
        ('gas', c_float),
        ('brake', c_float),
        ('fuel', c_float),
        ('gear', c_int32),
        ('rpms', c_int32),
        ('steerAngle', c_float),
        ('speedKmh', c_float),
        ('velocity', c_float * 3),
        ('accG', c_float * 3),
        ('wheelSlip', c_float * 4),
        ('wheelLoad', c_float * 4),
        ('wheelsPressure', c_float * 4),
        ('wheelAngularSpeed', c_float * 4),
        ('tyreWear', c_float * 4),
        ('tyreDirtyLevel', c_float * 4),
        ('tyreCoreTemperature', c_float * 4),
        ('camberRAD', c_float * 4),
        ('suspensionTravel', c_float * 4),
        ('drs', c_float),
        ('tc', c_float),
        ('heading', c_float),
        ('pitch', c_float),
        ('roll', c_float),
        ('cgHeight', c_float),
        ('carDamage', c_float * 5),
        ('numberOfTyresOut', c_int32),
        ('pitLimiterOn', c_int32),
        ('abs', c_float),
        # --- ACC SPECIFIC EXTENSIONS BELOW ---
        ('kersCharge', c_float),
        ('kersInput', c_float),
        ('autoShifterOn', c_int32),
        ('rideHeight', c_float * 2),
        ('turboBoost', c_float),
        ('ballast', c_float),
        ('airDensity', c_float),
        ('airTemp', c_float),
        ('roadTemp', c_float),
        ('localAngularVel', c_float * 3),
        ('finalFF', c_float),
        ('performanceMeter', c_float),
        ('engineBrake', c_int32),
        ('ersRecoveryLevel', c_int32),
        ('ersPowerLevel', c_int32),
        ('ersHeatCharging', c_int32),
        ('ersIsCharging', c_int32),
        ('kersCurrentKJ', c_float),
        ('drsAvailable', c_int32),
        ('drsEnabled', c_int32),
        ('brakeTemp', c_float * 4),
        ('clutch', c_float),
        ('tyreTempI', c_float * 4),
        ('tyreTempM', c_float * 4),
        ('tyreTempO', c_float * 4),
        ('isAIControlled', c_int32),
        # This is what we need! 12 floats = (X,Y,Z) for 4 tires
        ('tyreContactPoint', c_float * 12),
        ('tyreContactNormal', c_float * 12),
        ('tyreContactHeading', c_float * 12),
        ('brakeBias', c_float),
        ('localVelocity', c_float * 3),
    ]


class SPageFileGraphic(ctypes.Structure):
    _pack_ = 4
    _fields_ = [
        ('packetId', c_int32),
        ('status', AC_STATUS),
        ('session', AC_SESSION_TYPE),
        # NOTE: if you want str instead bytes, access it without '_'
        ('currentTime', c_wchar * 15),
        ('lastTime', c_wchar * 15),
        ('bestTime', c_wchar * 15),
        ('split', c_wchar * 15),
        ('completedLaps', c_int32),
        ('position', c_int32),
        ('iCurrentTime', c_int32),
        ('iLastTime', c_int32),
        ('iBestTime', c_int32),
        ('sessionTimeLeft', c_float),
        ('distanceTraveled', c_float),
        ('isInPit', c_int32),
        ('currentSectorIndex', c_int32),
        ('lastSectorTime', c_int32),
        ('numberOfLaps', c_int32),
        ('tyreCompound', c_wchar * 33),
        ('replayTimeMultiplier', c_float),
        ('normalizedCarPosition', c_float),
        ('carCoordinates', c_float * 3),
    ]


class SPageFileStatic(ctypes.Structure):
    _pack_ = 4
    _fields_ = [
        ('smVersion', c_wchar * 15),
        ('acVersion', c_wchar * 15),
        # session static info
        ('numberOfSessions', c_int32),
        ('numCars', c_int32),
        ('carModel', c_wchar * 33),
        ('track', c_wchar * 33),
        ('playerName', c_wchar * 33),
        ('playerSurname', c_wchar * 33),
        ('playerNick', c_wchar * 33),
        ('sectorCount', c_int32),
        # car static info
        ('maxTorque', c_float),
        ('maxPower', c_float),
        ('maxRpm', c_int32),
        ('maxFuel', c_float),
        ('suspensionMaxTravel', c_float * 4),
        ('tyreRadius', c_float * 4),
        # Fields below are required padding to reach trackConfiguration,
        # which holds the track layout (e.g. "gp" vs "national"). Present
        # in both AC (1.5+) and ACC shared memory, so mapping this far is safe.
        ('maxTurboBoost', c_float),
        ('deprecated_1', c_float),
        ('deprecated_2', c_float),
        ('penaltiesEnabled', c_int32),
        ('aidFuelRate', c_float),
        ('aidTireRate', c_float),
        ('aidMechanicalDamage', c_float),
        ('aidAllowTyreBlankets', c_int32),
        ('aidStability', c_float),
        ('aidAutoClutch', c_int32),
        ('aidAutoBlip', c_int32),
        ('hasDRS', c_int32),
        ('hasERS', c_int32),
        ('hasKERS', c_int32),
        ('kersMaxJ', c_float),
        ('engineBrakeSettingsCount', c_int32),
        ('ersPowerControllerCount', c_int32),
        ('trackSPlineLength', c_float),
        ('trackConfiguration', c_wchar * 33),
    ]


SIM_INFO_AVAILABLE = True


GAME_REGISTRY = {
    "AC":      {"process": "acs.exe",                    "shm_prefix": "acpmf"},
    "ACC":     {"process": "AC2-Win64-Shipping.exe",     "shm_prefix": "acpmf"},
    "iRacing": {"process": "iRacingSim64DX11.exe",       "shm_prefix": "iracing"},
    "LMU":     {"process": "Le Mans Ultimate.exe",       "shm_prefix": "acpmf"},
}


def load_config() -> dict:
    path = Setup.get_novent_dir() / "config.json"
    if not path.exists():
        return {}
    try:
        text = path.read_text().strip()
        return json.loads(text) if text else {}
    except json.JSONDecodeError:
        return {}


def save_config(config: dict):
    path = Setup.get_novent_dir() / "config.json"
    path.write_text(json.dumps(config, indent=2))


def detect_running_game() -> tuple[str, dict] | None:
    try:
        running_processes = {p.name().lower() for p in psutil.process_iter(["name"])}
    except Exception:
        return None

    config = load_config()
    for game_key, exe_path in config.get("games", {}).items():
        if not exe_path:
            continue
        try:
            exe_name = Path(exe_path).name.lower()
            if exe_name in running_processes and game_key in GAME_REGISTRY:
                return game_key, GAME_REGISTRY[game_key]
        except Exception:
            continue

    # Fallback to process name detection if config paths are not set or don't match
    for game_key, game_config in GAME_REGISTRY.items():
        if game_config["process"].lower() in running_processes:
            return game_key, game_config

    return None


def parse_lap_time(raw: str) -> float:
    from re import match
    raw = raw.strip()
    match = match(r'^(\d+):(\d+)[.:](\d+)$', raw)
    if match:
        return int(match.group(1)) * 60 + int(match.group(2)) + int(match.group(3)) / 1000.0
    try:
        return float(raw)
    except ValueError:
        return 0.0


def normalize_lap_time(raw) -> str:
    if isinstance(raw, (bytes, bytearray)):
        raw = raw.decode("utf-8", errors="ignore")

    cleaned = str(raw).strip().strip("\x00")

    if not cleaned or cleaned in ("0", "-1", ""):
        return "0:00.000"

    if cleaned.lstrip("-").isdigit():
        ms = int(cleaned)
        if ms <= 0:
            return "0:00.000"
        total_seconds = ms / 1000.0
        minutes = int(total_seconds // 60)
        seconds = total_seconds % 60
        return f"{minutes}:{seconds:06.3f}"

    return cleaned


class Backend:
    def __init__(self):
        self.phys_map   = None
        self.graph_map  = None
        self.static_map = None
        self.physics    = None
        self.graphics   = None
        self.static     = None
        self.active_game = None

        self.current_session_id  = None
        self.current_session_key = None
        self.last_lap_wall       = 0.0

        novent_dir = Setup.get_novent_dir()
        self.conn = sqlite3.connect(str(novent_dir / "database.db"), check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.db_lock = threading.Lock()
        self._init_db()

        atexit.register(self._on_exit)

    def open_shm(self):
        self.phys_map   = mmap.mmap(0, ctypes.sizeof(SPageFilePhysics),  "acpmf_physics")
        self.graph_map  = mmap.mmap(0, ctypes.sizeof(SPageFileGraphic),  "acpmf_graphics")
        self.static_map = mmap.mmap(0, ctypes.sizeof(SPageFileStatic),   "acpmf_static")

        self.physics  = SPageFilePhysics.from_buffer(self.phys_map)
        self.graphics = SPageFileGraphic.from_buffer(self.graph_map)
        self.static   = SPageFileStatic.from_buffer(self.static_map)

    def close_shm(self):
        self.physics    = None
        self.graphics   = None
        self.static     = None
        if self.phys_map:   self.phys_map.close();   self.phys_map   = None
        if self.graph_map:  self.graph_map.close();  self.graph_map  = None
        if self.static_map: self.static_map.close(); self.static_map = None
        self.active_game = None
        self.current_session_id  = None
        self.current_session_key = None

    def is_shm_open(self) -> bool:
        return self.physics is not None

    def is_session_active(self) -> bool:
        if self.current_session_id is None or not self.is_shm_open():
            return False
        now = datetime.datetime.now().timestamp()
        if (now - self.last_lap_wall) >= SESSION_IDLE_SECONDS:
            return False

        try:
            info = self.snapshot_session_info
            key  = (self.active_game, self.get_track(), self.get_track_layout(), self.get_car(), info.session_type, info.player_name)
        except Exception:
            return False
        return key == self.current_session_key

    def _init_db(self):
        with self.db_lock:
            self.conn.execute("""
                CREATE TABLE IF NOT EXISTS laps (
                    uuid      TEXT PRIMARY KEY,
                    game      TEXT,
                    lap_time  TEXT,
                    car       TEXT,
                    track     TEXT,
                    tel_path  TEXT,
                    date_time TEXT,
                    layout TEXT,
                    favorite  BOOLEAN DEFAULT FALSE
                )
            """)

            self.conn.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id            TEXT PRIMARY KEY,
                    game          TEXT,
                    track         TEXT,
                    layout        TEXT,
                    car           TEXT,
                    player_name   TEXT,
                    session_type  TEXT,
                    air_temp      REAL,
                    road_temp     REAL,
                    tyre_compound TEXT,
                    started_at    TEXT
                )
            """)

            existing = {r[1] for r in self.conn.execute("PRAGMA table_info(laps)")}
            for col, decl in (
                ("session_id", "TEXT"), ("completed_laps", "INTEGER"),
                ("air_temp", "REAL"), ("road_temp", "REAL"),
                ("player_name", "TEXT"), ("tyre_compound", "TEXT"),
                ("session_type", "TEXT"), ("lap_time_ms", "INTEGER"),
                ("layout", "TEXT"),
            ):
                if col not in existing:
                    self.conn.execute(f"ALTER TABLE laps ADD COLUMN {col} {decl}")

            existing_sessions = {r[1] for r in self.conn.execute("PRAGMA table_info(sessions)")}
            if "layout" not in existing_sessions:
                self.conn.execute("ALTER TABLE sessions ADD COLUMN layout TEXT")
            self.conn.commit()
        self._backfill()

    def _backfill(self):
        with self.db_lock:
            for r in self.conn.execute("SELECT uuid, lap_time FROM laps WHERE lap_time_ms IS NULL").fetchall():
                ms = int(parse_lap_time(r["lap_time"] or "") * 1000)
                self.conn.execute("UPDATE laps SET lap_time_ms = ? WHERE uuid = ?", (ms, r["uuid"]))

            orphans = self.conn.execute("SELECT * FROM laps WHERE session_id IS NULL ORDER BY date_time").fetchall()
            groups: dict[tuple, list] = {}
            for r in orphans:
                day = (r["date_time"] or "")[:10]
                key = (r["game"], r["track"], r["car"], r["session_type"] or "Unknown", day)
                groups.setdefault(key, []).append(r)
            for (game, track, car, stype, _day), laps in groups.items():
                sid   = str(uuid.uuid4())
                first = laps[0]
                self.conn.execute(
                    """INSERT INTO sessions (id, game, track, car, player_name, session_type,
                                             air_temp, road_temp, tyre_compound, started_at)
                       VALUES (?,?,?,?,?,?,?,?,?,?)""",
                    (sid, game, track, car, first["player_name"] or "Driver", stype,
                     first["air_temp"] or 0.0, first["road_temp"] or 0.0,
                     first["tyre_compound"] or "", first["date_time"]),
                )
                for r in laps:
                    self.conn.execute("UPDATE laps SET session_id = ? WHERE uuid = ?", (sid, r["uuid"]))
            self.conn.commit()

    def _on_exit(self):
        # Must delete ctypes buffer references before closing mmap,
        # otherwise Python raises: BufferError: cannot close exported pointers exist
        self.close_shm()
        with self.db_lock:
            self.conn.commit()
            self.conn.close()

    def get_telemetry_frame(self):
        # tyreContactPoint is a flat ctypes float[4][3] array.
        # Front-left tyre (index 0): x = tcp[0], y = tcp[1], z = tcp[2]
        tyre_contact_point = self.physics.tyreContactPoint
        world_x = tyre_contact_point[0]   # tyre 0, x
        world_z = tyre_contact_point[2]   # tyre 0, z
        return (
            self.physics.gas,
            self.physics.brake,
            self.physics.steerAngle,
            self.graphics.normalizedCarPosition,
            world_x,
            world_z,
            self.graphics.iCurrentTime / 1000.0,
            self.physics.speedKmh,
            self.physics.gear,
            self.physics.rpms,
        )
    
    def get_track_layout(self) -> str:
        try: 
            return (self.static.trackConfiguration or "").strip()
        except Exception:
            return ""

    def get_laps(self):
        return self.graphics.completedLaps, self.graphics.lastTime

    def get_track(self) -> str:
        return self.static.track.strip()

    def get_car(self) -> str:
        return self.static.carModel.strip()

    def get_game(self) -> str:
        return self.active_game or "Unknown"

    def snapshot_session_info(self) -> SessionInfo:
        if not self.is_shm_open():
            return SessionInfo()
        try:
            return SessionInfo(
                air_temp       = float(self.physics.airTemp),
                road_temp      = float(self.physics.roadTemp),
                player_name    = (self.static.playerName or "").strip() or "Driver",
                tyre_compound  = (self.graphics.tyreCompound or "").strip(),
                session_type   = AC_SESSION_NAMES.get(int(self.graphics.session), "Unknown"),
                completed_laps = int(self.graphics.completedLaps),
            )
        except Exception:
            return SessionInfo()
        
    def live_context(self) -> dict:
        if not self.is_shm_open():
            return {"car": None, "track": None, "layout": None, "session_type": None}
        try:
            return {
                "car": self.get_car() or None,
                "track": self.get_track() or None,
                "layout": self.get_track_layout() or None,
                "session_type": self.snapshot_session_info().session_type or None
            }
        except Exception:
            return {"car": None, "track": None, "layout": None, "session_type": None}

    def insert_session(self, session_id: str, game: str, track: str, car: str,
                       info: SessionInfo, started_at: str, layout: str = ""):
        with self.db_lock:
            self.conn.execute(
                """INSERT INTO sessions (id, game, track, layout, car, player_name, session_type,
                                         air_temp, road_temp, tyre_compound, started_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (session_id, game, track, layout, car, info.player_name, info.session_type,
                 info.air_temp, info.road_temp, info.tyre_compound, started_at),
            )
            self.conn.commit()

    def resolve_session(self, info: SessionInfo, game: str, track: str, car: str,
                        started_at: str, now_wall: float, layout: str = "") -> str:
        key  = (game, track, layout, car, info.session_type, info.player_name)
        IDLE = SESSION_IDLE_SECONDS
        if (self.current_session_id is not None and self.current_session_key == key
                and (now_wall - self.last_lap_wall) < IDLE):
            self.last_lap_wall = now_wall
            return self.current_session_id
        sid = str(uuid.uuid4())
        self.insert_session(sid, game, track, car, info, started_at, layout)
        self.current_session_id  = sid
        self.current_session_key = key
        self.last_lap_wall       = now_wall
        return sid

    def insert_lap(
        self,
        lap_uuid: str,
        game: str,
        lap_time_str: str,
        car: str,
        track: str,
        layout: str,
        tel_path: str,
        date_time: str,
        session_id: str | None = None,
        info: SessionInfo | None = None,
        lap_time_ms: int = 0,
    ):
        info = info or SessionInfo()
        with self.db_lock:
            self.conn.execute(
                """INSERT INTO laps (uuid, game, lap_time, car, track, layout, tel_path, date_time,
                                     session_id, completed_laps, air_temp, road_temp,
                                     player_name, tyre_compound, session_type, lap_time_ms)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (lap_uuid, game, lap_time_str, car, track, layout, tel_path, date_time,
                 session_id, info.completed_laps, info.air_temp, info.road_temp,
                 info.player_name, info.tyre_compound, info.session_type, lap_time_ms),
            )
            self.conn.commit()

    def query_laps(self, limit: int = 500):
        with self.db_lock:
            cursor = self.conn.execute(
                "SELECT * FROM laps ORDER BY date_time DESC LIMIT ?", (limit,)
            )
            return cursor.fetchall()

    _SESSION_SORTS = {
        "started_at": "s.started_at ASC",
        "-started_at": "s.started_at DESC",
        "best_lap_ms": "best_lap_ms ASC",
        "-best_lap_ms": "best_lap_ms DESC",
    }

    def query_sessions(self, game=None, track=None, car=None, session_type=None,
                       sort="-started_at", limit=100, offset=0):
        where, params = [], []
        for col, val in (("game", game), ("track", track), ("car", car),
                         ("session_type", session_type)):
            if val:
                where.append(f"s.{col} = ?")
                params.append(val)
        clause    = ("WHERE " + " AND ".join(where)) if where else ""
        order     = self._SESSION_SORTS.get(sort, "s.started_at DESC")
        limit     = max(1, min(int(limit), 500))
        offset    = max(0, int(offset))
        sql = f"""
            SELECT s.*,
                   (SELECT COUNT(*)          FROM laps l WHERE l.session_id = s.id) AS lap_count,
                   (SELECT MIN(l.lap_time_ms) FROM laps l WHERE l.session_id = s.id AND l.lap_time_ms > 0) AS best_lap_ms,
                   (SELECT l.uuid FROM laps l WHERE l.session_id = s.id AND l.lap_time_ms > 0
                    ORDER BY l.lap_time_ms ASC LIMIT 1) AS best_lap_id
            FROM sessions s
            {clause}
            ORDER BY {order}
            LIMIT ? OFFSET ?
        """
        with self.db_lock:
            return self.conn.execute(sql, (*params, limit, offset)).fetchall()

    def query_session(self, session_id: str):
        sql = """
            SELECT s.*,
                   (SELECT COUNT(*)          FROM laps l WHERE l.session_id = s.id) AS lap_count,
                   (SELECT MIN(l.lap_time_ms) FROM laps l WHERE l.session_id = s.id AND l.lap_time_ms > 0) AS best_lap_ms,
                   (SELECT l.uuid FROM laps l WHERE l.session_id = s.id AND l.lap_time_ms > 0
                    ORDER BY l.lap_time_ms ASC LIMIT 1) AS best_lap_id
            FROM sessions s WHERE s.id = ?
        """
        with self.db_lock:
            return self.conn.execute(sql, (session_id,)).fetchone()

    def query_laps_by_session(self, session_id: str):
        with self.db_lock:
            return self.conn.execute(
                "SELECT * FROM laps WHERE session_id = ? ORDER BY lap_time_ms ASC", (session_id,)
            ).fetchall()

    def query_lap(self, lap_uuid: str):
        with self.db_lock:
            return self.conn.execute("SELECT * FROM laps WHERE uuid = ?", (lap_uuid,)).fetchone()


# Directory setup and management for laps and boundaries data storage

class Setup:
    @staticmethod
    def set_laps_dir(folder_type: str = "default") -> Path:
        laps_dir = novent_data_dir / "laps" / folder_type
        laps_dir.mkdir(parents=True, exist_ok=True)
        return laps_dir

    @staticmethod
    def set_boundaries_dir() -> Path:
        boundaries_dir = novent_data_dir / "boundaries"
        boundaries_dir.mkdir(parents=True, exist_ok=True)
        return boundaries_dir

    @staticmethod
    def get_novent_dir() -> Path:
        novent_data_dir.mkdir(parents=True, exist_ok=True)
        return novent_data_dir


# Telemetry capture and saving logic

class HandleTraces:
    def __init__(self, backend: Backend, hz: int = 100):
        self.backend   = backend
        self.interval  = 1.0 / hz
        self.samples: list[dict] = []
        self.last_lap  = 0
        self.last_packet_id = -1
        self._frames_since_alive_check = 0
        self.lap_start_wall = None
        self.recording = False
        self.crossed_first_line = False

    def loop(self):
        print("Telemetry loop started.")
        while True:
            if not self.backend.is_shm_open():
                detected = detect_running_game()

                if detected:
                    game_key, game_config = detected
                    print(f"Detected {game_key}, opening shared memory...")
                    try:
                        self.backend.open_shm()
                        self.backend.active_game = game_key
                        self.last_lap, _ = self.backend.get_laps()
                        self.last_packet_id = -1
                        self.samples = []
                        self.recording = True
                        self.lap_start_wall = None
                        self.crossed_first_line = False
                        self._frames_since_alive_check = 0
                        print(f"Connected to {game_key}")
                    except Exception as e:
                        print(f"Failed to open SHM: {e}")
                        sleep(2.0)
                        continue
                sleep(2.0)
                continue

            sleep(self.interval)

            self._frames_since_alive_check += 1
            if self._frames_since_alive_check >= 300:
                self._frames_since_alive_check = 0
                if not detect_running_game():
                    print("Game closed, cleaning up...")
                    self.backend.close_shm()
                    self.samples = []
                    self.recording = False
                    self.lap_start_wall = None
                    continue

            try:
                current_packet_id = self.backend.physics.packetId
            except Exception:
                print("SHM read failed, game likely closed")
                self.backend.close_shm()
                self.samples = []
                self.recording = False
                self.lap_start_wall = None
                self.crossed_first_line = False
                continue

            if current_packet_id == self.last_packet_id:
                continue
            self.last_packet_id = current_packet_id

            current_lap, lap_time_raw = self.backend.get_laps()

            if current_lap > self.last_lap:
                lap_data            = self.samples
                self.samples        = []
                self.lap_start_wall = datetime.datetime.now().timestamp()
                self.last_lap       = current_lap

                if not self.crossed_first_line:
                    self.crossed_first_line = True
                    print(f"First line crossing (lap {current_lap}) — discarding outlap data")
                    continue

                resolved_raw = lap_time_raw
                for _ in range(20):
                    candidate = normalize_lap_time(resolved_raw)
                    if candidate != "0:00.000":
                        break
                    sleep(self.interval)
                    _, resolved_raw = self.backend.get_laps()

                lap_time_str = normalize_lap_time(resolved_raw)
                lap_time_sec = parse_lap_time(lap_time_str)

                if lap_time_str == "0:00.000" or lap_time_sec < 30:
                    print(f"Discarding lap {current_lap} — invalid or too short ({lap_time_str})")
                    continue

                if lap_data:
                    print(f"Lap completed — raw={resolved_raw!r}  stored={lap_time_str}")
                    game_key = self.backend.active_game or "Unknown"
                    threading.Thread(
                        target=self._save_lap,
                        args=(lap_time_str, lap_data, game_key),
                        daemon=True,
                    ).start()

            if not self.recording:
                continue

            now = datetime.datetime.now().timestamp()
            if self.lap_start_wall is None:
                self.lap_start_wall = now

            gas, brake, steering, norm_pos, world_x, world_z, _, speed, gear, rpms = self.backend.get_telemetry_frame()
            self.samples.append({
                "gas":                   gas,
                "brake":                 brake,
                "steering":              steering,
                "normalizedCarPosition": norm_pos,
                "worldX":                world_x,
                "worldZ":                world_z,
                "time":                  now - self.lap_start_wall,
                "speedKmh":              speed,
                "gear":                  gear,
                "rpms":                  rpms,
            })

    def _save_lap(self, lap_time_str: str, lap_data: list[dict], game: str):
        try:
            lap_uuid  = str(uuid.uuid4())
            laps_dir  = Setup.set_laps_dir("default")
            filepath  = laps_dir / f"lap_{lap_uuid}.h5"

            formatted_samples = [
                (s["gas"], s["brake"], s["steering"],
                 s["normalizedCarPosition"], s["worldX"], s["worldZ"], s["time"],
                 s.get("speedKmh", 0.0), s.get("gear", 0), s.get("rpms", 0))
                for s in lap_data
            ]

            arr = np.array(formatted_samples, dtype=[
                ("gas",                   "f4"),
                ("brake",                 "f4"),
                ("steering",              "f4"),
                ("normalizedCarPosition", "f4"),
                ("worldX",                "f4"),
                ("worldZ",                "f4"),
                ("time",                  "f4"),
                ("speedKmh",              "f4"),
                ("gear",                  "i4"),
                ("rpms",                  "i4"),
            ])

            if len(arr) > 1:
                time_col = arr["time"].copy()
                time_col -= time_col[0]
                lap_time_sec = parse_lap_time(lap_time_str)
                if lap_time_sec > 0 and time_col[-1] > 0:
                    time_col *= lap_time_sec / time_col[-1]
                arr["time"] = time_col

            with h5py.File(filepath, "w") as f:
                f.create_dataset("telemetry", data=arr, compression="gzip", compression_opts=4)

            info       = self.backend.snapshot_session_info()
            car        = self.backend.get_car()
            track      = self.backend.get_track()
            layout     = self.backend.get_track_layout()
            date_time  = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M")
            now_wall   = datetime.datetime.now().timestamp()
            session_id = self.backend.resolve_session(info, game, track, car, date_time, now_wall, layout)
            lap_ms     = int(parse_lap_time(lap_time_str) * 1000)

            self.backend.insert_lap(
                lap_uuid=lap_uuid,
                game=game,
                lap_time_str=lap_time_str,
                car=car,
                track=track,
                layout=layout,
                tel_path=str(laps_dir),
                date_time=date_time,
                session_id=session_id,
                info=info,
                lap_time_ms=lap_ms,
            )
            print(f"Saved lap {lap_uuid}  ({lap_time_str})  session={session_id[:8]}")

        except Exception as e:
            print(f"CRITICAL: lap save failed: {e}")


# API

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _backend
    _backend = Backend()
    handler = HandleTraces(_backend, hz=100)
    if SIM_INFO_AVAILABLE:
        threading.Thread(target=handler.loop, daemon=True).start()
    else:
        print("Telemetry capture loop not started (sim_info unavailable).")
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=1000)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:1420",
    "http://127.0.0.1:1420",
    "http://localhost:1430", 
    "http://127.0.0.1:1430",    
    "tauri://localhost",
    "https://tauri.localhost",
    "http://tauri.localhost"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_backend: Backend = None


class LapSummary(BaseModel):
    uuid:           str
    session_id:     str | None = None
    game:           str = ""
    track:          str = ""
    car:            str = ""
    lap_time:       str = ""
    lap_time_ms:    int = 0
    completed_laps: int = 0
    player_name:    str = ""
    tyre_compound:  str = ""
    session_type:   str = ""
    air_temp:       float = 0.0
    road_temp:      float = 0.0
    date_time:      str | None = None
    favorite:       bool = False
    layout:         str = ""


class SessionSummary(BaseModel):
    id:            str
    game:          str = ""
    track:         str = ""
    car:           str = ""
    player_name:   str = ""
    session_type:  str = ""
    air_temp:      float = 0.0
    road_temp:     float = 0.0
    tyre_compound: str = ""
    started_at:    str | None = None
    lap_count:     int = 0
    best_lap_ms:   int | None = None
    best_lap_id:   str | None = None
    layout:         str = ""


def _row_get(r, k, default=None):
    return r[k] if (k in r.keys() and r[k] is not None) else default


def _lap_dict(r) -> dict:
    return {
        "uuid":           _row_get(r, "uuid", ""),
        "session_id":     _row_get(r, "session_id"),
        "game":           _row_get(r, "game", ""),
        "track":          _row_get(r, "track", ""),
        "car":            _row_get(r, "car", ""),
        "lap_time":       _row_get(r, "lap_time", ""),
        "lap_time_ms":    int(_row_get(r, "lap_time_ms", 0)),
        "completed_laps": int(_row_get(r, "completed_laps", 0)),
        "player_name":    _row_get(r, "player_name", ""),
        "tyre_compound":  _row_get(r, "tyre_compound", ""),
        "session_type":   _row_get(r, "session_type", ""),
        "air_temp":       float(_row_get(r, "air_temp", 0.0)),
        "road_temp":      float(_row_get(r, "road_temp", 0.0)),
        "date_time":      _row_get(r, "date_time"),
        "favorite":       bool(_row_get(r, "favorite", False)),
        "layout": _row_get(r, "layout", "")
    }


def _session_dict(r) -> dict:
    return {
        "id":            _row_get(r, "id", ""),
        "game":          _row_get(r, "game", ""),
        "track":         _row_get(r, "track", ""),
        "car":           _row_get(r, "car", ""),
        "player_name":   _row_get(r, "player_name", ""),
        "session_type":  _row_get(r, "session_type", ""),
        "air_temp":      float(_row_get(r, "air_temp", 0.0)),
        "road_temp":     float(_row_get(r, "road_temp", 0.0)),
        "tyre_compound": _row_get(r, "tyre_compound", ""),
        "started_at":    _row_get(r, "started_at"),
        "lap_count":     int(_row_get(r, "lap_count", 0)),
        "best_lap_ms":   _row_get(r, "best_lap_ms"),
        "best_lap_id":   _row_get(r, "best_lap_id"),
        "layout": _row_get(r, "layout", "")
    }


@app.get("/laps", response_model=list[LapSummary])
def get_laps():
    return [_lap_dict(r) for r in _backend.query_laps()]


@app.get("/laps/{lap_uuid}/telemetry")
def get_telemetry(lap_uuid: str) -> dict[str, list]:
    filepath = Setup.set_laps_dir("default") / f"lap_{lap_uuid}.h5"

    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Telemetry file not found")

    with h5py.File(filepath, "r") as f:
        dataset_key = "telemetry" if "telemetry" in f else "telemtry"
        if dataset_key not in f:
            raise HTTPException(status_code=404, detail="Dataset not found in HDF5 file")
        data = f[dataset_key][:]

    total_points = len(data["gas"])
    step = max(1, total_points // 5000)

    names = set(data.dtype.names)
    n = len(data["gas"][::step])

    def col(key):
        if key in names:
            return np.nan_to_num(data[key][::step], nan=0.0, posinf=0.0, neginf=0.0).tolist()
        return [0] * n

    return {
        "gas":                   col("gas"),
        "brake":                 col("brake"),
        "steering":              col("steering"),
        "normalizedCarPosition": col("normalizedCarPosition"),
        "worldX":                col("worldX"),
        "worldZ":                col("worldZ"),
        "time":                  col("time"),
        "speedKmh":              col("speedKmh"),
        "gear":                  col("gear"),
        "rpms":                  col("rpms"),
    }


@app.get("/v1/sessions", response_model=list[SessionSummary])
def v1_sessions(
    game:         str | None = None,
    track:        str | None = None,
    car:          str | None = None,
    session_type: str | None = None,
    sort:         str = "-started_at",
    limit:        int = Query(100, ge=1, le=500),
    offset:       int = Query(0, ge=0),
):
    rows = _backend.query_sessions(game, track, car, session_type, sort, limit, offset)
    return [_session_dict(r) for r in rows]


@app.get("/v1/sessions/{session_id}", response_model=SessionSummary)
def v1_session(session_id: str):
    r = _backend.query_session(session_id)
    if r is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return _session_dict(r)


@app.get("/v1/sessions/{session_id}/laps", response_model=list[LapSummary])
def v1_session_laps(session_id: str):
    return [_lap_dict(r) for r in _backend.query_laps_by_session(session_id)]


@app.get("/v1/laps/{lap_id}", response_model=LapSummary)
def v1_lap(lap_id: str):
    r = _backend.query_lap(lap_id)
    if r is None:
        raise HTTPException(status_code=404, detail="Lap not found")
    return _lap_dict(r)


@app.get("/v1/laps/{lap_id}/telemetry")
def v1_lap_telemetry(lap_id: str):
    return get_telemetry(lap_id)


# AC track boundary reconstruction from the in-game map (map.png + map.ini)

_MOORE_CW = [(-1, -1), (-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1)]


def _detect_ac_root() -> Path | None:
    steam_roots: list[Path] = []
    try:
        import winreg
        for hive, key, name in (
            (winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam", "SteamPath"),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Valve\Steam", "InstallPath"),
        ):
            try:
                with winreg.OpenKey(hive, key) as k:
                    steam_roots.append(Path(winreg.QueryValueEx(k, name)[0]))
            except OSError:
                pass
    except Exception:
        pass
    steam_roots += [Path(r"C:\Program Files (x86)\Steam"), Path(r"C:\Program Files\Steam")]

    libs: list[Path] = []
    for sr in steam_roots:
        libs.append(sr)
        vdf = sr / "steamapps" / "libraryfolders.vdf"
        if vdf.is_file():
            try:
                for m in re.finditer(r'"path"\s*"([^"]+)"', vdf.read_text(encoding="utf-8", errors="ignore")):
                    libs.append(Path(m.group(1).replace("\\\\", "\\")))
            except Exception:
                pass

    seen: set[str] = set()
    for lib in libs:
        ac = lib / "steamapps" / "common" / "assettocorsa"
        key = str(ac).lower()
        if key in seen:
            continue
        seen.add(key)
        if (ac / "content" / "tracks").is_dir():
            return ac
    return None


def _ac_install_root() -> Path | None:
    cfg = load_config()
    exe = (cfg.get("games") or {}).get("AC", "")
    if exe:
        p = Path(exe)
        root = p.parent if p.suffix.lower() == ".exe" else p
        if (root / "content" / "tracks").is_dir():
            return root
    return _detect_ac_root()


def _find_track_map(track_id: str, layout: str = ""):

    root = _ac_install_root()
    if root is None:
        return None
    track_dir = root / "content" / "tracks" / track_id
    if layout:
        candidates = [track_dir / layout, track_dir]
    else:    
        candidates = [track_dir]
        if track_dir.is_dir():
            candidates += [d for d in sorted(track_dir.iterdir()) if d.is_dir()]
    for d in candidates:
        png = d / "map.png"
        ini = d / "data" / "map.ini"
        if png.is_file() and ini.is_file():
            return png, ini
    return None


def _parse_map_ini(path: Path) -> dict:
    params = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("["):
            key, val = line.split("=", 1)
            try:
                params[key.strip()] = float(val.strip())
            except ValueError:
                pass
    return params


def _largest_component(binary):
    rows, cols = binary.shape
    visited = np.zeros((rows, cols), dtype=bool)
    best = None
    best_n = 0
    ys, xs = np.where(binary)
    for sy, sx in zip(ys.tolist(), xs.tolist()):
        if visited[sy, sx]:
            continue
        stack = [(sy, sx)]
        visited[sy, sx] = True
        pixels = []
        while stack:
            r, c = stack.pop()
            pixels.append((r, c))
            for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and binary[nr, nc] and not visited[nr, nc]:
                    visited[nr, nc] = True
                    stack.append((nr, nc))
        if len(pixels) > best_n:
            best_n = len(pixels)
            best = pixels
    return best


def _trace_boundary(mask, start):
    rows, cols = mask.shape
    sr, sc = start
    prev = (sr, sc - 1)
    cur = (sr, sc)
    first, first_prev = cur, prev
    contour = [cur]
    for _ in range(8 * int(mask.sum()) + 1000):
        d = (prev[0] - cur[0], prev[1] - cur[1])
        if d not in _MOORE_CW:
            break
        i = _MOORE_CW.index(d)
        found = None
        for k in range(1, 9):
            j = (i + k) % 8
            nr, nc = cur[0] + _MOORE_CW[j][0], cur[1] + _MOORE_CW[j][1]
            if 0 <= nr < rows and 0 <= nc < cols and mask[nr, nc]:
                found = (nr, nc)
                prev = (cur[0] + _MOORE_CW[(j - 1) % 8][0], cur[1] + _MOORE_CW[(j - 1) % 8][1])
                break
        if found is None:
            break
        cur = found
        if cur == first and prev == first_prev:
            break
        contour.append(cur)
    return contour


def _topleft(pixels):
    r0, c0 = pixels[0]
    for (r, c) in pixels:
        if r < r0 or (r == r0 and c < c0):
            r0, c0 = r, c
    return (r0, c0)


def _mask_from_pixels(shape, pixels):
    m = np.zeros(shape, dtype=bool)
    for (r, c) in pixels:
        m[r, c] = True
    return m


def _decimate(points, min_d=2.0):
    out = []
    for p in points:
        if not out or math.dist(p, out[-1]) >= min_d:
            out.append(p)
    return out


def generate_ac_boundaries(track_id: str, layout: str = ""):
    found = _find_track_map(track_id, layout)
    if found is None:
        return None
    try:
        from PIL import Image, ImageDraw
    except Exception as e:
        print(f"AC boundaries: Pillow not installed, skipping ({e})")
        return None
    png_path, ini_path = found
    params = _parse_map_ini(ini_path)
    scale = params.get("SCALE_FACTOR", 1.0) or 1.0
    x_off = params.get("X_OFFSET")
    z_off = params.get("Z_OFFSET")
    if x_off is None or z_off is None:
        return None

    arr = np.array(Image.open(png_path))
    if arr.ndim != 3:
        return None
    mask = arr[..., 3] > 40 if arr.shape[2] == 4 else arr[..., :3].max(axis=2) > 40

    ribbon_pixels = _largest_component(mask)
    if not ribbon_pixels or len(ribbon_pixels) < 50:
        return None
    ribbon = _mask_from_pixels(mask.shape, ribbon_pixels)
    outer_px = _trace_boundary(ribbon, _topleft(ribbon_pixels))

    disk_img = Image.new("L", (mask.shape[1], mask.shape[0]), 0)
    ImageDraw.Draw(disk_img).polygon([(c, r) for (r, c) in outer_px], fill=1)
    infield = np.array(disk_img, dtype=bool) & ~mask

    inner_px = []
    infield_pixels = _largest_component(infield)
    if infield_pixels and len(infield_pixels) > 50:
        inner_region = _mask_from_pixels(mask.shape, infield_pixels)
        inner_px = _trace_boundary(inner_region, _topleft(infield_pixels))

    def to_world(px):
        return [[round(c / scale - x_off, 3), round(r / scale - z_off, 3)] for (r, c) in px]

    outer = _decimate(to_world(outer_px))
    inner = _decimate(to_world(inner_px)) if inner_px else []
    if len(outer) < 10:
        return None
    print(f"AC boundaries for '{track_id}': outer {len(outer)} pts, inner {len(inner)} pts ({png_path.parent.name})")
    return inner, outer


@app.get("/boundaries/{game_id}/{track_id}/{uuid}")
def get_boundaries(game_id: str, track_id: str, uuid: str, layout: str = "") -> dict:
    game = game_id.lower().strip()
    track = track_id.lower().strip()
    bdir = Setup.set_boundaries_dir()
    layout_key = layout.strip().lower()
    track_base = bdir/game/track
    layout_base = track_base/layout_key if layout_key else track_base

    def load_pair(base: Path):
        left_path = base / "left.json"
        right_path = base / "right.json"
        if left_path.is_file() and right_path.is_file():
            try:
                with open(left_path) as left_file, open(right_path) as right_file:
                    return {"inner": json.load(left_file), "outer": json.load(right_file)}
            except Exception as e:
                print(f"Boundary load error: {e}")
        return None

    result = load_pair(track_base / uuid.strip()) or load_pair(layout_base)
    if result is not None:
        return result

    if game == "ac":
        generated = generate_ac_boundaries(track_id.strip(), layout.strip())
        if generated is not None:
            left, right = generated
            layout_base.mkdir(parents=True, exist_ok=True)
            (layout_base / "left.json").write_text(json.dumps(left))
            (layout_base / "right.json").write_text(json.dumps(right))
            return {"inner": left, "outer": right}

    raise HTTPException(status_code=404, detail="Track boundaries not found")


@app.get("/status")
def get_status() -> dict:
    if _backend is None:
        return {"connected": False, "game": None, "session_active": False, "car": None, "track": None}
    return {
        "connected": _backend.is_shm_open(),
        "game": _backend.active_game,
        "session_active": _backend.is_session_active(),
        **_backend.live_context(_backend),
    }


@app.get("/config")
def get_config() -> dict:
    try:
        return load_config()
    except Exception:
        return {"error": "Failed to load config"}


@app.post("/config/games")
def set_game_paths(body: dict):
    config = load_config()
    config["games"] = body["games"]
    save_config(config)
    return {"ok": True}


if __name__ == "__main__":
    from uvicorn import run
    run(app, host="127.0.0.1", port=8000)