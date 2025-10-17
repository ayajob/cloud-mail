from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, prefixes, emails
from .config import settings
from . import models
from .auth import get_password_hash
from sqlalchemy.orm import Session
from .database import SessionLocal
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Email Manager API",
    description="Email management system with prefix-based filtering",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(prefixes.router)
app.include_router(emails.router)


@app.on_event("startup")
async def startup_event():
    """Create admin user on startup if it doesn't exist"""
    db = SessionLocal()
    try:
        # Check if admin exists
        admin = db.query(models.User).filter(
            models.User.email == settings.admin_email
        ).first()
        
        if not admin:
            # Create admin user
            admin = models.User(
                email=settings.admin_email,
                hashed_password=get_password_hash(settings.admin_password),
                is_admin=True
            )
            db.add(admin)
            db.commit()
            logger.info(f"Created admin user: {settings.admin_email}")
        else:
            logger.info(f"Admin user already exists: {settings.admin_email}")
    
    except Exception as e:
        logger.error(f"Error creating admin user: {e}")
    finally:
        db.close()


@app.get("/")
def root():
    return {
        "message": "Email Manager API",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}