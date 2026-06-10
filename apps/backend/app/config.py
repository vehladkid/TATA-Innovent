from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Postgres / SQLAlchemy (legacy direct-connection path)
    database_url: str | None = None

    # Supabase (REST API path — preferred for cloud deployment)
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None

    # n8n webhook for critical-event fan-out
    n8n_webhook_url: str | None = None

    # LLM backends
    groq_api_key: str | None = None
    anthropic_api_key: str | None = None

    # Server
    cors_origins: str = "*"
    log_level: str = "INFO"
    environment: str = "development"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
