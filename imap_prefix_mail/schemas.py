from __future__ import annotations
from pydantic import BaseModel, Field
from datetime import datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    admin_token: str


class PrefixCreateRequest(BaseModel):
    prefix: str = Field(min_length=1, max_length=64, pattern=r"^[a-zA-Z0-9._-]+$")
    password: str = Field(min_length=4)


class PrefixUpdatePasswordRequest(BaseModel):
    password: str = Field(min_length=4)


class PrefixResponse(BaseModel):
    id: int
    prefix: str
    is_active: bool

    class Config:
        from_attributes = True


class EmailResponse(BaseModel):
    id: int
    received_at: datetime
    subject: str | None
    sender: str | None
    to_address: str | None

    class Config:
        from_attributes = True


class EmailDetailResponse(EmailResponse):
    recipients: str | None
    body_text: str | None
    body_html: str | None
