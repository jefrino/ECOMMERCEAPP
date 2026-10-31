import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "ShopVerse - Modern E-Commerce"
    DEBUG: bool = True
    
    # Database Configuration: Defaults to SQLite for immediate zero-config operation
    # Can be overridden via environment variable to PostgreSQL or MySQL
    # e.g., DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce_db
    # e.g., DATABASE_URL=mysql+pymysql://user:password@localhost:3306/ecommerce_db
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ecommerce.db")
    
    # JWT Security Settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-ecommerce-jwt-key-change-in-prod-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # Store Settings
    TAX_RATE: float = 0.05 # 5% tax
    FREE_SHIPPING_THRESHOLD: float = 50.0 # Free shipping over $50
    STANDARD_SHIPPING_FEE: float = 5.0 # Flat $5 shipping

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
