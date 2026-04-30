from functools import lru_cache
import os
from pathlib import Path

from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "Styleon"
    styleon_data_mode: str = "mock"
    styleon_mock_inventory_path: str | None = None

    snowflake_account: str | None = None
    snowflake_user: str | None = None
    snowflake_password: str | None = None
    snowflake_role: str | None = None
    snowflake_warehouse: str | None = None
    snowflake_database: str = "STYLEON"
    snowflake_schema: str = "PUBLIC"

    gemini_api_key: str | None = None
    gemini_model: str = "gemini-1.5-flash"

    elevenlabs_api_key: str | None = None
    elevenlabs_voice_id: str | None = None

    @property
    def use_snowflake(self) -> bool:
        return self.styleon_data_mode.lower() == "snowflake"


@lru_cache
def get_settings() -> Settings:
    load_dotenv_file(Path(".env"))
    return Settings(
        app_name=os.getenv("STYLEON_APP_NAME", "Styleon"),
        styleon_data_mode=os.getenv("STYLEON_DATA_MODE", "mock"),
        styleon_mock_inventory_path=os.getenv("STYLEON_MOCK_INVENTORY_PATH") or None,
        snowflake_account=os.getenv("SNOWFLAKE_ACCOUNT") or None,
        snowflake_user=os.getenv("SNOWFLAKE_USER") or None,
        snowflake_password=os.getenv("SNOWFLAKE_PASSWORD") or None,
        snowflake_role=os.getenv("SNOWFLAKE_ROLE") or None,
        snowflake_warehouse=os.getenv("SNOWFLAKE_WAREHOUSE") or None,
        snowflake_database=os.getenv("SNOWFLAKE_DATABASE", "STYLEON"),
        snowflake_schema=os.getenv("SNOWFLAKE_SCHEMA", "PUBLIC"),
        gemini_api_key=os.getenv("GEMINI_API_KEY") or None,
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-1.5-flash"),
        elevenlabs_api_key=os.getenv("ELEVENLABS_API_KEY") or None,
        elevenlabs_voice_id=os.getenv("ELEVENLABS_VOICE_ID") or None,
    )


def load_dotenv_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
