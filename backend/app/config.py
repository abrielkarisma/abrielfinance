from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "dev-secret-key-change-me-please"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    DB_PATH: str = "keuangan.db"
    BACKUP_DIR: str = "backups"
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://127.0.0.1:8000/api/auth/google/callback"
    API_SERVICE_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
