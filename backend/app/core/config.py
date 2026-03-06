from pydantic import Field, AliasChoices, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "FastAPI Task Manager"
    database_url: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/task_manager",
        validation_alias=AliasChoices("DATABASE_URL", "database_url"),
    )
    jwt_secret_key: str = Field(
        default="change-this-in-production",
        validation_alias=AliasChoices("JWT_SECRET_KEY", "SECRET_KEY", "jwt_secret_key"),
    )
    jwt_algorithm: str = Field(
        default="HS256",
        validation_alias=AliasChoices("JWT_ALGORITHM", "ALGORITHM", "jwt_algorithm"),
    )
    access_token_expire_minutes: int = Field(
        default=60,
        validation_alias=AliasChoices(
            "ACCESS_TOKEN_EXPIRE_MINUTES",
            "access_token_expire_minutes",
        ),
    )

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        """Allow plain PostgreSQL URLs when psycopg3 is installed."""
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value


settings = Settings()
