from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    prefix_accesses = relationship("PrefixAccess", back_populates="user")


class EmailPrefix(Base):
    __tablename__ = "email_prefixes"
    
    id = Column(Integer, primary_key=True, index=True)
    prefix = Column(String, unique=True, index=True, nullable=False)
    description = Column(String)
    access_password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    accesses = relationship("PrefixAccess", back_populates="prefix")
    cached_emails = relationship("CachedEmail", back_populates="prefix")


class PrefixAccess(Base):
    __tablename__ = "prefix_accesses"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    prefix_id = Column(Integer, ForeignKey("email_prefixes.id"))
    granted_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    user = relationship("User", back_populates="prefix_accesses")
    prefix = relationship("EmailPrefix", back_populates="accesses")


class CachedEmail(Base):
    __tablename__ = "cached_emails"
    
    id = Column(Integer, primary_key=True, index=True)
    prefix_id = Column(Integer, ForeignKey("email_prefixes.id"))
    message_id = Column(String, unique=True, index=True)
    subject = Column(String)
    sender = Column(String)
    recipient = Column(String)
    date = Column(DateTime(timezone=True))
    body_text = Column(Text)
    body_html = Column(Text)
    headers = Column(JSON)
    attachments = Column(JSON)  # Store attachment metadata
    fetched_at = Column(DateTime(timezone=True), server_default=func.now())
    
    prefix = relationship("EmailPrefix", back_populates="cached_emails")