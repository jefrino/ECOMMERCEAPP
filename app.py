import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from starlette.responses import FileResponse

from config import settings
from database import engine, Base
from seed import seed_database
from routers import auth_router, product_router, order_router, admin_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables and run automatic seeder
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="Modern E-Commerce Store with Product Management, Order Tracking, Role-Based Access Control, and Multi-Database Support.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Include Routers
app.include_router(auth_router.router)
app.include_router(product_router.router)
app.include_router(order_router.router)
app.include_router(admin_router.router)

# Root Endpoint: Serves Main SPA Interface
@app.get("/")
async def serve_index():
    index_file = os.path.join(os.path.dirname(__file__), "templates", "index.html")
    return FileResponse(index_file)

# Health Check Endpoint
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "database": settings.DATABASE_URL.split("://")[0]
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    print(f"Starting {settings.APP_NAME} on http://localhost:{port} ...")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
