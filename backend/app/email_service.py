"""
Email Service Module

Provides branded HTML email templates for all TripMate communications:
- Trip invitations (existing users & signups)
- Welcome / Registration confirmation
- Friend requests
"""

from flask import current_app
from flask_mail import Message


# ─── Shared Email Base Template ──────────────────────────────

def _base_template(title: str, body_html: str, footer_note: str = "") -> str:
    """Wrap body_html in a consistent branded email shell."""
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#0f1117;">
        <table role="presentation" cellpadding="0" cellspacing="0"
               style="width:100%;max-width:600px;margin:40px auto;background-color:#1a1d28;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.3);">
            <!-- Header -->
            <tr>
                <td style="background:linear-gradient(135deg,#0891B2,#06b6d4,#00D1B2);padding:36px 32px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">
                        ✈️ TripMate
                    </h1>
                    <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;font-weight:500;letter-spacing:1px;text-transform:uppercase;">
                        {title}
                    </p>
                </td>
            </tr>

            <!-- Body -->
            <tr>
                <td style="padding:36px 32px;">
                    {body_html}
                </td>
            </tr>

            <!-- Footer -->
            <tr>
                <td style="padding:20px 32px;background-color:#13151e;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
                    <p style="margin:0;color:#64748b;font-size:12px;">
                        © 2026 TripMate. Collaborative Travel Planning.
                    </p>
                    {f'<p style="margin:4px 0 0;color:#475569;font-size:11px;">{footer_note}</p>' if footer_note else ''}
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


def _cta_button(url: str, label: str) -> str:
    """Generate a gradient CTA button for email templates."""
    return f"""
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
        <tr>
            <td style="border-radius:50px;background:linear-gradient(135deg,#0891B2,#06b6d4,#00D1B2);">
                <a href="{url}"
                   style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">
                    {label}
                </a>
            </td>
        </tr>
    </table>
    """


# ─── Trip Invitation Email ───────────────────────────────────

def send_trip_invite_email(mail, to_email, trip_title, inviter_name, signup_url):
    """Send a branded invitation email to a non-registered user."""
    subject = f"🌍 {inviter_name} invited you to join '{trip_title}' on TripMate!"

    body_html = f"""
    <h2 style="margin:0 0 16px;color:#e2e8f0;font-size:22px;font-weight:700;">
        You're invited! 🎉
    </h2>
    <p style="margin:0 0 20px;color:#94a3b8;font-size:15px;line-height:1.7;">
        <strong style="color:#e2e8f0;">{inviter_name}</strong> has invited you to
        collaborate on a trip called <strong style="color:#06b6d4;">"{trip_title}"</strong>
        on TripMate.
    </p>
    <p style="margin:0 0 8px;color:#94a3b8;font-size:14px;line-height:1.7;">
        TripMate lets you build itineraries together, vote on destinations,
        track budgets, and split expenses seamlessly with your travel group.
    </p>
    {_cta_button(signup_url, "Join the Trip →")}
    <p style="margin:24px 0 0;color:#475569;font-size:12px;text-align:center;line-height:1.5;">
        If the button doesn't work, copy this link:<br>
        <a href="{signup_url}" style="color:#06b6d4;word-break:break-all;font-size:11px;">{signup_url}</a>
    </p>
    """

    text_body = (
        f"{inviter_name} has invited you to join '{trip_title}' on TripMate!\n\n"
        f"TripMate lets you build itineraries together, vote on destinations, "
        f"and split expenses seamlessly.\n\n"
        f"Sign up and join the trip: {signup_url}\n\n"
        f"This invitation expires in 7 days."
    )

    html = _base_template("Trip Invitation", body_html, "This invitation expires in 7 days.")

    try:
        msg = Message(
            subject=subject,
            recipients=[to_email],
            html=html,
            body=text_body,
            sender=current_app.config.get("MAIL_DEFAULT_SENDER", "noreply@tripmate.app"),
        )
        mail.send(msg)
        current_app.logger.info(f"Invite email sent to {to_email} for trip '{trip_title}'")
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send invite email to {to_email}: {str(e)}")
        return False


# ─── Welcome / Registration Email ────────────────────────────

def send_welcome_email(mail, to_email, user_name):
    """Send a welcome email after successful registration."""
    subject = "🎉 Welcome to TripMate — Let's plan your first adventure!"

    frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:3000")

    body_html = f"""
    <h2 style="margin:0 0 16px;color:#e2e8f0;font-size:22px;font-weight:700;">
        Welcome aboard, {user_name}! 🧳
    </h2>
    <p style="margin:0 0 20px;color:#94a3b8;font-size:15px;line-height:1.7;">
        Your TripMate account is ready. Here's what you can do:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
        <tr>
            <td style="padding:12px 16px;background:rgba(6,182,212,0.08);border-radius:12px;border-left:3px solid #06b6d4;margin-bottom:8px;">
                <p style="margin:0;color:#e2e8f0;font-size:14px;font-weight:600;">🗺️ Create AI-powered itineraries</p>
                <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">Tell our AI planner where you want to go and get a full schedule.</p>
            </td>
        </tr>
        <tr><td style="height:8px;"></td></tr>
        <tr>
            <td style="padding:12px 16px;background:rgba(6,182,212,0.08);border-radius:12px;border-left:3px solid #06b6d4;">
                <p style="margin:0;color:#e2e8f0;font-size:14px;font-weight:600;">👥 Invite friends & collaborate</p>
                <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">Plan together in real-time with live chat and voting.</p>
            </td>
        </tr>
        <tr><td style="height:8px;"></td></tr>
        <tr>
            <td style="padding:12px 16px;background:rgba(6,182,212,0.08);border-radius:12px;border-left:3px solid #06b6d4;">
                <p style="margin:0;color:#e2e8f0;font-size:14px;font-weight:600;">💰 Track & split expenses</p>
                <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">Keep budgets on track with smart settlement tracking.</p>
            </td>
        </tr>
    </table>
    {_cta_button(f"{frontend_url}/dashboard", "Go to Dashboard →")}
    """

    text_body = (
        f"Welcome to TripMate, {user_name}!\n\n"
        f"Your account is ready. Start planning your first adventure at {frontend_url}/dashboard\n\n"
        f"— The TripMate Team"
    )

    html = _base_template("Welcome", body_html)

    try:
        msg = Message(
            subject=subject,
            recipients=[to_email],
            html=html,
            body=text_body,
            sender=current_app.config.get("MAIL_DEFAULT_SENDER", "noreply@tripmate.app"),
        )
        mail.send(msg)
        current_app.logger.info(f"Welcome email sent to {to_email}")
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send welcome email to {to_email}: {str(e)}")
        return False


# ─── Friend Request Email ────────────────────────────────────

def send_friend_request_email(mail, to_email, to_name, from_name):
    """Send an email notifying someone that they received a friend request."""
    subject = f"👋 {from_name} wants to connect with you on TripMate"

    frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:3000")

    body_html = f"""
    <h2 style="margin:0 0 16px;color:#e2e8f0;font-size:22px;font-weight:700;">
        New friend request! 👋
    </h2>
    <p style="margin:0 0 20px;color:#94a3b8;font-size:15px;line-height:1.7;">
        <strong style="color:#e2e8f0;">{from_name}</strong> sent you a friend request on TripMate.
    </p>
    <p style="margin:0 0 8px;color:#94a3b8;font-size:14px;line-height:1.7;">
        Accept the request to see when they're online, invite them to trips instantly,
        and plan adventures together.
    </p>
    {_cta_button(f"{frontend_url}/dashboard", "View Request →")}
    """

    text_body = (
        f"{from_name} sent you a friend request on TripMate!\n\n"
        f"Accept the request to start planning trips together.\n\n"
        f"View it here: {frontend_url}/dashboard"
    )

    html = _base_template("Friend Request", body_html)

    try:
        msg = Message(
            subject=subject,
            recipients=[to_email],
            html=html,
            body=text_body,
            sender=current_app.config.get("MAIL_DEFAULT_SENDER", "noreply@tripmate.app"),
        )
        mail.send(msg)
        current_app.logger.info(f"Friend request email sent to {to_email}")
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send friend request email to {to_email}: {str(e)}")
        return False
