"""SMTP delivery (Gmail, Outlook, SES, Brevo... anything that speaks SMTP)."""

import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid

from app.core.config import get_settings
from app.services.email.templates import OutgoingEmail


class EmailNotConfiguredError(Exception):
    pass


def deliver(email: OutgoingEmail) -> str:
    """Send one email and return its Message-ID. Raises on any SMTP failure."""
    s = get_settings()
    if not s.smtp_configured:
        raise EmailNotConfiguredError("SMTP is not configured (set SMTP_HOST, SMTP_USERNAME and SMTP_PASSWORD).")
    sender = s.smtp_from_email or s.smtp_username
    msg = EmailMessage()
    msg["Subject"] = email.subject
    msg["From"] = formataddr((s.smtp_from_name, sender))
    msg["To"] = email.to
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain=sender.split("@")[-1])
    msg.set_content(email.text)
    msg.add_alternative(email.html, subtype="html")
    for att in email.attachments:
        msg.add_attachment(att.content, maintype=att.maintype, subtype=att.subtype, filename=att.filename, params=att.params)

    context = ssl.create_default_context()
    if s.smtp_use_ssl:
        server = smtplib.SMTP_SSL(s.smtp_host, s.smtp_port, timeout=s.smtp_timeout_seconds, context=context)
    else:
        server = smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=s.smtp_timeout_seconds)
    with server:
        if not s.smtp_use_ssl:
            server.ehlo()
            if server.has_extn("starttls"):
                server.starttls(context=context)
                server.ehlo()
        if s.smtp_username and s.smtp_password:
            server.login(s.smtp_username, s.smtp_password)
        server.send_message(msg)
    return msg["Message-ID"]
