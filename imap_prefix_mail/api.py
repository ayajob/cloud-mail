from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session
from typing import Optional

from .database import db_session
from .models import PrefixCredential, Email
from .schemas import (
    TokenResponse,
    LoginRequest,
    PrefixCreateRequest,
    PrefixUpdatePasswordRequest,
    PrefixResponse,
    EmailResponse,
    EmailDetailResponse,
)
from .security import create_access_token, hash_password, verify_password
from .settings import settings

router = APIRouter()


# Dependency to get a db session per-request
class _SessionDep:
    def __call__(self):
        with db_session() as session:
            yield session


get_db = _SessionDep()


@router.post("/admin/login", response_model=TokenResponse)
def admin_login(payload: LoginRequest):
    if payload.admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid admin token")
    token = create_access_token("admin")
    return TokenResponse(access_token=token)


# rudimentary admin auth via header Bearer token

def _require_admin(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    from .security import decode_token

    data = decode_token(token)
    if data.get("sub") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")


@router.post("/admin/prefix", response_model=PrefixResponse, dependencies=[Depends(_require_admin)])
def create_prefix(payload: PrefixCreateRequest, session: Session = Depends(get_db)):
    exists = session.query(PrefixCredential).filter(PrefixCredential.prefix == payload.prefix).first()
    if exists:
        raise HTTPException(status_code=409, detail="Prefix exists")
    obj = PrefixCredential(prefix=payload.prefix.lower(), password_hash=hash_password(payload.password))
    session.add(obj)
    session.flush()
    return obj


@router.get("/admin/prefix", response_model=list[PrefixResponse], dependencies=[Depends(_require_admin)])
def list_prefixes(session: Session = Depends(get_db)):
    return session.query(PrefixCredential).order_by(PrefixCredential.prefix.asc()).all()


@router.put("/admin/prefix/{prefix}", response_model=PrefixResponse, dependencies=[Depends(_require_admin)])
def update_prefix_password(prefix: str, payload: PrefixUpdatePasswordRequest, session: Session = Depends(get_db)):
    obj = session.query(PrefixCredential).filter(PrefixCredential.prefix == prefix.lower()).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    obj.password_hash = hash_password(payload.password)
    session.add(obj)
    return obj


@router.delete("/admin/prefix/{prefix}", dependencies=[Depends(_require_admin)])
def delete_prefix(prefix: str, session: Session = Depends(get_db)):
    obj = session.query(PrefixCredential).filter(PrefixCredential.prefix == prefix.lower()).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(obj)
    return {"ok": True}


# Client access endpoints
class ClientLoginRequest(LoginRequest):
    prefix: str
    password: str


@router.post("/client/login", response_model=TokenResponse)
def client_login(payload: ClientLoginRequest, session: Session = Depends(get_db)):
    obj = (
        session.query(PrefixCredential)
        .filter(PrefixCredential.prefix == payload.prefix.lower(), PrefixCredential.is_active == True)
        .first()
    )
    if not obj or not verify_password(payload.password, obj.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(f"prefix:{obj.prefix}")
    return TokenResponse(access_token=token)


# guard for client token that encodes prefix

def _require_prefix_token(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    from .security import decode_token

    data = decode_token(token)
    sub = data.get("sub")
    if not sub or not sub.startswith("prefix:"):
        raise HTTPException(status_code=403, detail="Forbidden")
    return sub.split(":", 1)[1]


@router.get("/emails", response_model=list[EmailResponse])
def list_emails(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_db),
    prefix: str = Depends(_require_prefix_token),
):
    q = (
        session.query(Email)
        .filter(Email.prefix_credential.has(prefix=prefix))
        .order_by(Email.received_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return q.all()


@router.get("/emails/{email_id}", response_model=EmailDetailResponse)
def get_email(email_id: int, session: Session = Depends(get_db), prefix: str = Depends(_require_prefix_token)):
    obj = session.query(Email).filter(Email.id == email_id).first()
    if not obj or not obj.prefix_credential or obj.prefix_credential.prefix != prefix:
        raise HTTPException(status_code=404, detail="Not found")
    return obj
