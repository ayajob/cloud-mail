from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from .. import models, schemas, auth
from ..database import get_db
from ..imap_service import IMAPService
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/emails", tags=["emails"])


def cache_emails(prefix: str, emails: List[dict], db: Session):
    """Cache emails in database"""
    prefix_obj = db.query(models.EmailPrefix).filter(
        models.EmailPrefix.prefix == prefix
    ).first()
    
    if not prefix_obj:
        return
    
    for email_data in emails:
        # Check if email already cached
        existing = db.query(models.CachedEmail).filter(
            models.CachedEmail.message_id == email_data['message_id']
        ).first()
        
        if not existing:
            cached_email = models.CachedEmail(
                prefix_id=prefix_obj.id,
                message_id=email_data['message_id'],
                subject=email_data['subject'],
                sender=email_data['sender'],
                recipient=email_data['recipient'],
                date=email_data['date'],
                body_text=email_data['body_text'],
                body_html=email_data['body_html'],
                headers=email_data['headers'],
                attachments=email_data['attachments']
            )
            db.add(cached_email)
    
    db.commit()


@router.post("/fetch", response_model=List[schemas.EmailMessage])
def fetch_emails(
    filter_data: schemas.EmailFilter,
    db: Session = Depends(get_db)
):
    """Fetch emails for a specific prefix"""
    # Verify access
    is_valid = auth.verify_prefix_access(
        filter_data.prefix,
        filter_data.access_password,
        db
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid prefix or password"
        )
    
    # Get prefix object
    prefix_obj = db.query(models.EmailPrefix).filter(
        models.EmailPrefix.prefix == filter_data.prefix,
        models.EmailPrefix.is_active == True
    ).first()
    
    if not prefix_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prefix not found or inactive"
        )
    
    # Check if we have cached emails (cached for 5 minutes)
    cache_time_limit = datetime.utcnow() - timedelta(minutes=5)
    cached_emails = db.query(models.CachedEmail).filter(
        models.CachedEmail.prefix_id == prefix_obj.id,
        models.CachedEmail.fetched_at > cache_time_limit
    ).order_by(models.CachedEmail.date.desc()).all()
    
    if cached_emails:
        # Return cached emails
        return cached_emails[filter_data.offset:filter_data.offset + filter_data.limit]
    
    # Fetch fresh emails from IMAP
    try:
        with IMAPService() as imap:
            emails = imap.fetch_emails_by_prefix(filter_data.prefix, limit=filter_data.limit)
            
            # Cache the emails
            cache_emails(filter_data.prefix, emails, db)
            
            # Convert to response format
            result = []
            for email_data in emails[filter_data.offset:filter_data.offset + filter_data.limit]:
                result.append(schemas.EmailMessage(
                    id=0,  # Temporary ID
                    **email_data
                ))
            
            return result
    
    except Exception as e:
        logger.error(f"Error fetching emails: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch emails from IMAP server"
        )


@router.get("/admin/all", response_model=List[schemas.EmailMessage])
def fetch_all_emails(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: models.User = Depends(auth.get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Fetch all emails from the catch-all mailbox (admin only)"""
    try:
        with IMAPService() as imap:
            emails = imap.fetch_all_emails(limit=limit + offset)
            
            # Convert to response format
            result = []
            for email_data in emails[offset:offset + limit]:
                result.append(schemas.EmailMessage(
                    id=0,  # Temporary ID
                    **email_data
                ))
            
            return result
    
    except Exception as e:
        logger.error(f"Error fetching all emails: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch emails from IMAP server"
        )


@router.get("/cached/{prefix}", response_model=List[schemas.EmailMessage])
def get_cached_emails(
    prefix: str,
    access_password: str,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """Get cached emails for a prefix"""
    # Verify access
    is_valid = auth.verify_prefix_access(prefix, access_password, db)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid prefix or password"
        )
    
    # Get prefix object
    prefix_obj = db.query(models.EmailPrefix).filter(
        models.EmailPrefix.prefix == prefix
    ).first()
    
    if not prefix_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prefix not found"
        )
    
    # Get cached emails
    emails = db.query(models.CachedEmail).filter(
        models.CachedEmail.prefix_id == prefix_obj.id
    ).order_by(models.CachedEmail.date.desc()).offset(offset).limit(limit).all()
    
    return emails


@router.post("/refresh/{prefix}")
def refresh_emails(
    prefix: str,
    access_password: str,
    db: Session = Depends(get_db)
):
    """Force refresh emails for a prefix"""
    # Verify access
    is_valid = auth.verify_prefix_access(prefix, access_password, db)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid prefix or password"
        )
    
    # Get prefix object
    prefix_obj = db.query(models.EmailPrefix).filter(
        models.EmailPrefix.prefix == prefix
    ).first()
    
    if not prefix_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prefix not found"
        )
    
    # Delete old cached emails
    db.query(models.CachedEmail).filter(
        models.CachedEmail.prefix_id == prefix_obj.id
    ).delete()
    db.commit()
    
    # Fetch fresh emails
    try:
        with IMAPService() as imap:
            emails = imap.fetch_emails_by_prefix(prefix, limit=100)
            cache_emails(prefix, emails, db)
            
            return {"detail": f"Refreshed {len(emails)} emails for prefix {prefix}"}
    
    except Exception as e:
        logger.error(f"Error refreshing emails: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh emails"
        )