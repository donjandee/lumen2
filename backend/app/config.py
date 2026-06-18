from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    upload_dir: Path = Path("uploads")
    max_file_size_mb: int = 100
    github_token: str = ""
    llm_model: str = "gpt-4o-mini"
    llm_base_url: str = "https://models.inference.ai.azure.com"
    websocket_heartbeat: int = 30

    def ensure_dirs(self) -> None:
        self.upload_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()
