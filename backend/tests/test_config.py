from backend.app.core.config import Settings


def test_settings_accept_legacy_security_env_names(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "legacy-secret")
    monkeypatch.setenv("ALGORITHM", "HS512")

    settings = Settings()

    assert settings.jwt_secret_key == "legacy-secret"
    assert settings.jwt_algorithm == "HS512"


def test_settings_normalize_plain_postgresql_url(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://dbuser:dbpass@db.example.com:5432/tasks")

    settings = Settings()

    assert settings.database_url == "postgresql+psycopg://dbuser:dbpass@db.example.com:5432/tasks"
