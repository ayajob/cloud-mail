from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/prefixes", tags=["prefixes"])


@router.get("/", response_model=List[schemas.EmailPrefix])
def list_prefixes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """List all email prefixes (admin only)"""
    prefixes = db.query(models.EmailPrefix).all()
    return prefixes


@router.post("/", response_model=schemas.EmailPrefix)
def create_prefix(
    prefix_data: schemas.PrefixCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """Create a new email prefix (admin only)"""
    # Check if prefix already exists
    existing = db.query(models.EmailPrefix).filter(
        models.EmailPrefix.prefix == prefix_data.prefix
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prefix already exists"
        )
    
    # Create new prefix
    hashed_password = auth.get_password_hash(prefix_data.access_password)
    db_prefix = models.EmailPrefix(
        prefix=prefix_data.prefix.lower(),
        description=prefix_data.description,
        access_password_hash=hashed_password
    )
    db.add(db_prefix)
    db.commit()
    db.refresh(db_prefix)
    
    return db_prefix


@router.get("/{prefix_id}", response_model=schemas.EmailPrefix)
def get_prefix(
    prefix_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """Get a specific email prefix (admin only)"""
    prefix = db.query(models.EmailPrefix).filter(models.EmailPrefix.id == prefix_id).first()
    
    if not prefix:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prefix not found"
        )
    
    return prefix


@router.put("/{prefix_id}", response_model=schemas.EmailPrefix)
def update_prefix(
    prefix_id: int,
    prefix_update: schemas.PrefixUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """Update an email prefix (admin only)"""
    prefix = db.query(models.EmailPrefix).filter(models.EmailPrefix.id == prefix_id).first()
    
    if not prefix:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prefix not found"
        )
    
    # Update fields
    if prefix_update.description is not None:
        prefix.description = prefix_update.description
    
    if prefix_update.access_password is not None:
        prefix.access_password_hash = auth.get_password_hash(prefix_update.access_password)
    
    if prefix_update.is_active is not None:
        prefix.is_active = prefix_update.is_active
    
    db.commit()
    db.refresh(prefix)
    
    return prefix


@router.delete("/{prefix_id}")
def delete_prefix(
    prefix_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """Delete an email prefix (admin only)"""
    prefix = db.query(models.EmailPrefix).filter(models.EmailPrefix.id == prefix_id).first()
    
    if not prefix:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prefix not found"
        )
    
    # Delete associated cached emails
    db.query(models.CachedEmail).filter(models.CachedEmail.prefix_id == prefix_id).delete()
    
    # Delete associated access records
    db.query(models.PrefixAccess).filter(models.PrefixAccess.prefix_id == prefix_id).delete()
    
    # Delete the prefix
    db.delete(prefix)
    db.commit()
    
    return {"detail": "Prefix deleted successfully"}


@router.post("/verify")
def verify_prefix_access(
    access_data: schemas.PrefixAccess,
    db: Session = Depends(get_db)
):
    """Verify access to a prefix with password"""
    is_valid = auth.verify_prefix_access(
        access_data.prefix,
        access_data.access_password,
        db
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid prefix or password"
        )
    
    return {"detail": "Access verified", "prefix": access_data.prefix}