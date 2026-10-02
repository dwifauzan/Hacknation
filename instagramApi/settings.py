"""Centralized runtime configuration for the Instagram automation service."""

from dataclasses import dataclass
import os
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    base_dir: Path
    session_file: Path
    database_file: Path
    proxy: str = ""
    my_user_id: str = ""

    @classmethod
    def from_env(cls) -> "Settings":
        base_dir = Path(__file__).resolve().parent
        return cls(
            base_dir=base_dir,
            session_file=base_dir / "session.json",
            database_file=Path(os.environ.get(
                "AUTOREPLY_DB",
                str(base_dir / "dm_store.sqlite3"),
            )),
            proxy=os.environ.get("IG_PROXY", ""),
            my_user_id=os.environ.get("IG_MY_USER_ID", ""),
        )
