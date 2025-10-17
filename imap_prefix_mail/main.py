from __future__ import annotations
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .settings import settings
from .database import Base, engine
from .api import router as api_router

app = FastAPI(title="IMAP Prefix Mail")

# CORS - allow all for simplicity, restrict in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# init tables on startup
@app.on_event("startup")
async def on_startup():
    Base.metadata.create_all(bind=engine)


app.include_router(api_router, prefix="/api")

# serve static frontend if present
app.mount("/", StaticFiles(directory=settings.STATIC_DIR, html=True), name="static")
