import email
from email.header import decode_header
from typing import List, Dict, Any, Optional
from datetime import datetime
import re
from imapclient import IMAPClient
from .config import settings
import logging

logger = logging.getLogger(__name__)


class IMAPService:
    def __init__(self):
        self.host = settings.imap_host
        self.port = settings.imap_port
        self.username = settings.imap_username
        self.password = settings.imap_password
        self.use_ssl = settings.imap_use_ssl
        self.client = None
    
    def __enter__(self):
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()
    
    def connect(self):
        """Connect to IMAP server"""
        try:
            self.client = IMAPClient(self.host, port=self.port, use_uid=True, ssl=self.use_ssl)
            self.client.login(self.username, self.password)
            self.client.select_folder('INBOX')
            logger.info(f"Connected to IMAP server {self.host}")
        except Exception as e:
            logger.error(f"Failed to connect to IMAP server: {e}")
            raise
    
    def disconnect(self):
        """Disconnect from IMAP server"""
        if self.client:
            try:
                self.client.logout()
                logger.info("Disconnected from IMAP server")
            except:
                pass
    
    def decode_header_value(self, header_value):
        """Decode email header value"""
        if header_value is None:
            return ""
        
        decoded_parts = []
        for part, encoding in decode_header(header_value):
            if isinstance(part, bytes):
                try:
                    decoded_parts.append(part.decode(encoding or 'utf-8', errors='replace'))
                except:
                    decoded_parts.append(str(part, 'utf-8', errors='replace'))
            else:
                decoded_parts.append(part)
        return ''.join(decoded_parts)
    
    def extract_email_address(self, email_string):
        """Extract email address from string like 'Name <email@domain.com>'"""
        if not email_string:
            return ""
        
        # Try to extract email from angle brackets
        match = re.search(r'<(.+?)>', email_string)
        if match:
            return match.group(1).lower()
        
        # Otherwise return the string as is
        return email_string.strip().lower()
    
    def parse_email(self, raw_email) -> Dict[str, Any]:
        """Parse raw email into structured format"""
        msg = email.message_from_bytes(raw_email)
        
        # Decode headers
        subject = self.decode_header_value(msg.get('Subject', ''))
        from_header = self.decode_header_value(msg.get('From', ''))
        to_header = self.decode_header_value(msg.get('To', ''))
        date_header = msg.get('Date', '')
        message_id = msg.get('Message-ID', '')
        
        # Parse date
        try:
            date_parsed = email.utils.parsedate_to_datetime(date_header)
        except:
            date_parsed = datetime.now()
        
        # Extract body
        body_text = ""
        body_html = ""
        attachments = []
        
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition", ""))
                
                # Skip multipart containers
                if part.get_content_maintype() == 'multipart':
                    continue
                
                # Check for attachments
                if "attachment" in content_disposition:
                    filename = part.get_filename()
                    if filename:
                        attachments.append({
                            "filename": self.decode_header_value(filename),
                            "content_type": content_type,
                            "size": len(part.get_payload())
                        })
                    continue
                
                # Extract text/html content
                if content_type == "text/plain":
                    payload = part.get_payload(decode=True)
                    if payload:
                        charset = part.get_content_charset() or 'utf-8'
                        body_text = payload.decode(charset, errors='replace')
                elif content_type == "text/html":
                    payload = part.get_payload(decode=True)
                    if payload:
                        charset = part.get_content_charset() or 'utf-8'
                        body_html = payload.decode(charset, errors='replace')
        else:
            # Simple message
            payload = msg.get_payload(decode=True)
            if payload:
                charset = msg.get_content_charset() or 'utf-8'
                if msg.get_content_type() == "text/html":
                    body_html = payload.decode(charset, errors='replace')
                else:
                    body_text = payload.decode(charset, errors='replace')
        
        # Get all headers
        headers = {}
        for key, value in msg.items():
            headers[key] = self.decode_header_value(value)
        
        return {
            "message_id": message_id,
            "subject": subject,
            "sender": from_header,
            "recipient": to_header,
            "date": date_parsed,
            "body_text": body_text,
            "body_html": body_html,
            "headers": headers,
            "attachments": attachments
        }
    
    def fetch_emails_by_prefix(self, prefix: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch emails that match the given prefix"""
        emails = []
        
        try:
            # Search for emails where TO field contains the prefix
            # The prefix should be part of the email address before @
            search_criteria = ['OR',
                             ['TO', f'{prefix}'],
                             ['TO', f'{prefix}+'],
                             ['TO', f'{prefix}-']]
            
            message_ids = self.client.search(search_criteria)
            
            # Sort by date (newest first)
            if message_ids:
                message_ids = sorted(message_ids, reverse=True)[:limit]
                
                # Fetch emails
                for msg_id in message_ids:
                    try:
                        raw_email = self.client.fetch([msg_id], ['RFC822'])[msg_id][b'RFC822']
                        parsed_email = self.parse_email(raw_email)
                        
                        # Double-check that the email matches the prefix
                        recipient = self.extract_email_address(parsed_email['recipient'])
                        if recipient.startswith(prefix) or f'+{prefix}' in recipient or f'-{prefix}' in recipient:
                            emails.append(parsed_email)
                    except Exception as e:
                        logger.error(f"Error parsing email {msg_id}: {e}")
                        continue
            
        except Exception as e:
            logger.error(f"Error fetching emails for prefix {prefix}: {e}")
            raise
        
        return emails
    
    def fetch_all_emails(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Fetch all emails from the inbox"""
        emails = []
        
        try:
            # Get all message IDs
            message_ids = self.client.search(['ALL'])
            
            # Sort by date (newest first) and limit
            if message_ids:
                message_ids = sorted(message_ids, reverse=True)[:limit]
                
                # Fetch emails
                for msg_id in message_ids:
                    try:
                        raw_email = self.client.fetch([msg_id], ['RFC822'])[msg_id][b'RFC822']
                        emails.append(self.parse_email(raw_email))
                    except Exception as e:
                        logger.error(f"Error parsing email {msg_id}: {e}")
                        continue
            
        except Exception as e:
            logger.error(f"Error fetching all emails: {e}")
            raise
        
        return emails