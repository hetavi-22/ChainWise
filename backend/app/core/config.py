from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ors_api_key: str | None = None
    climatiq_api_key: str | None = None
    chainwise_data_dir: str | None = None
    """Directory containing `airports.json` and `ports.json`. Default: <repo>/data/processed."""

    @field_validator("chainwise_data_dir", mode="before")
    @classmethod
    def empty_str_to_none(cls, v: object) -> object:
        if v == "":
            return None
        if isinstance(v, Path):
            return str(v)
        return v


settings = Settings()
