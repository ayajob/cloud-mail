from __future__ import annotations
from imapclient import IMAPClient
from email.parser import BytesParser
from email import policy
from email.header import decode_header
from email.utils import parseaddr, getaddresses
from typing import Optional
from datetime import datetime
import time
import re

from .settings import settings
from .database import db_session, Base, engine
from .models import Email, PrefixCredential


PREFIX_EXTRACT_RE = re.compile(r"^(?P<prefix>[^@+]+)(?:\+[^@]+)?@(?P<domain>[^>]+)$")


def _decode_header_value(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    try:
        parts = decode_header(value)
        decoded = "".join(
            [
                (b.decode(enc or "utf-8", errors="replace") if isinstance(b, (bytes, bytearray)) else b)
                for b, enc in parts
            ]
        )
        return decoded
    except Exception:
        return value


def _extract_prefix_from_address(address: str) -> Optional[str]:
    match = PREFIX_EXTRACT_RE.match(address)
    if not match:
        return None
    domain = match.group("domain").lower()
    if settings.ALLOWED_DOMAIN and domain != settings.ALLOWED_DOMAIN.lower():
        return None
    return match.group("prefix").lower()


def _addresses_to_str(address_list: list[tuple[str, str]]) -> str:
    return ", ".join([f"{name} <{email}>" if name else email for name, email in address_list])


def init_db():
    Base.metadata.create_all(bind=engine)


def poll_once():
    init_db()
    with IMAPClient(host=settings.IMAP_HOST, port=settings.IMAP_PORT, ssl=settings.IMAP_SSL) as client:
        client.login(settings.IMAP_USER, settings.IMAP_PASSWORD)
        client.select_folder("INBOX")
        messages = client.search(["UNSEEN"])  # fetch unseen only
        if not messages:
            return 0
        response = client.fetch(messages, [b"RFC822", b"BODY.PEEK[]", b"ENVELOPE", b"FLAGS"])
        stored = 0
        for uid, data in response.items():
            raw_bytes = data.get(b"RFC822") or data.get(b"BODY[]") or data.get(b"BODY.PEEK[]")
            if not raw_bytes:
                continue
            msg = BytesParser(policy=policy.default).parsebytes(raw_bytes)

            subject = _decode_header_value(msg["subject"]) if msg["subject"] else None
            from_addr = parseaddr(msg.get("from", ""))[1]
            to_addrs = getaddresses(msg.get_all("to", [])) + getaddresses(msg.get_all("delivered-to", []))
            to_addr = to_addrs[0][1] if to_addrs else None
            recipients_str = _addresses_to_str(to_addrs)

            body_text = None
            body_html = None
            if msg.is_multipart():
                for part in msg.walk():
                    ctype = part.get_content_type()
                    if ctype == "text/plain" and body_text is None:
                        body_text = part.get_content()
                    elif ctype == "text/html" and body_html is None:
                        body_html = part.get_content()
            else:
                ctype = msg.get_content_type()
                if ctype == "text/plain":
                    body_text = msg.get_content()
                elif ctype == "text/html":
                    body_html = msg.get_content()

            prefix_str: Optional[str] = None
            if to_addr:
                prefix_str = _extract_prefix_from_address(to_addr)

            with db_session() as session:
                prefix_obj = None
                if prefix_str:
                    prefix_obj = session.query(PrefixCredential).filter(
                        PrefixCredential.prefix == prefix_str, PrefixCredential.is_active == True
                    ).first()
                email = Email(
                    message_id=msg.get("Message-Id", str(uid)),
                    received_at=datetime.utcnow(),
                    subject=subject,
                    sender=from_addr,
                    recipients=recipients_str,
                    to_address=to_addr,
                    body_text=body_text,
                    body_html=body_html,
                    prefix_credential=prefix_obj,
                )
                session.add(email)
                stored += 1
            # mark seen
            client.add_flags(uid, [b"\\Seen"])  # noqa: W605
        return stored


def run_forever():
    while True:
        try:
            count = poll_once()
            # you can add logging here
        except Exception:
            # swallow and continue; in prod log this
            pass
        time.sleep(settings.POLL_INTERVAL_SEC)
