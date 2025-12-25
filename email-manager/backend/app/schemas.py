from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(UserBase):
    id: int
    is_admin: bool
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class PrefixBase(BaseModel):
    prefix: str
    description: Optional[str] = None


class PrefixCreate(PrefixBase):
    access_password: str


class PrefixUpdate(BaseModel):
    description: Optional[str] = None
    access_password: Optional[str] = None
    is_active: Optional[bool] = None


class EmailPrefix(PrefixBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class PrefixAccess(BaseModel):
    prefix: str
    access_password: str


class EmailMessage(BaseModel):
    id: int
    message_id: str
    subject: str
    sender: str
    recipient: str
    date: datetime
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    headers: Dict[str, Any]
    attachments: List[Dict[str, Any]]
    
    class Config:
        from_attributes = True


class EmailFilter(BaseModel):
    prefix: str
    access_password: str
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)
    search_query: Optional[str] = None