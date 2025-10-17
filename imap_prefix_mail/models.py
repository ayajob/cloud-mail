from __future__ import annotations
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey, UniqueConstraint, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from .database import Base


class PrefixCredential(Base):
    __tablename__ = "prefix_credentials"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    prefix: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    emails: Mapped[list[Email]] = relationship("Email", back_populates="prefix_credential")


class Email(Base):
    __tablename__ = "emails"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    message_id: Mapped[str] = mapped_column(String(255), index=True)
    received_at: Mapped[datetime] = mapped_column(DateTime, index=True, default=datetime.utcnow)

    subject: Mapped[str | None] = mapped_column(String(512), nullable=True)
    sender: Mapped[str | None] = mapped_column(String(320), nullable=True)
    recipients: Mapped[str | None] = mapped_column(Text, nullable=True)  # comma-separated
    to_address: Mapped[str | None] = mapped_column(String(320), nullable=True)

    body_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    body_html: Mapped[str | None] = mapped_column(Text, nullable=True)

    prefix_id: Mapped[int | None] = mapped_column(ForeignKey("prefix_credentials.id"), index=True)
    prefix_credential: Mapped[PrefixCredential | None] = relationship("PrefixCredential", back_populates="emails")

    __table_args__ = (
        UniqueConstraint("message_id", name="uq_emails_message_id"),
    )
