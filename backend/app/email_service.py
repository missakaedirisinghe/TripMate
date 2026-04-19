"""
Email Service Module

Provides email sending functionality using Flask-Mail.
Includes branded HTML email templates for trip invitations.
"""

from flask import current_app
from flask_mail import Message


def send_trip_invite_email(mail, to_email, trip_title, inviter_name, signup_url):
    """Send a branded invitation email to a non-registered user.

    Args:
        mail: Flask-Mail instance.
        to_email: Recipient email address.
        trip_title: Name of the trip they're being invited to.
        inviter_name: Name of the person sending the invite.
        signup_url: Full URL for the recipient to sign up and join.

    Raises:
        Exception: If email sending fails (logged, not raised to caller).
    """
    subject = f"🌍 {inviter_name} invited you to join '{trip_title}' on TripMate!"

    html_body = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f3f4f6;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;margin:40px auto;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
                <td style="background:linear-gradient(135deg,#0891B2,#00D1B2);padding:40px 32px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">
                        ✈️ TripMate
                    </h1>
                    <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;font-weight:500;">
                        Collaborative Travel Planning
                    </p>
                </td>
            </tr>

            <!-- Body -->
            <tr>
                <td style="padding:40px 32px;">
                    <h2 style="margin:0 0 16px;color:#101828;font-size:22px;font-weight:700;">
                        You're invited! 🎉
                    </h2>
                    <p style="margin:0 0 24px;color:#475467;font-size:16px;line-height:1.6;">
                        <strong style="color:#101828;">{inviter_name}</strong> has invited you to
                        collaborate on a trip called <strong style="color:#0891B2;">"{trip_title}"</strong>
                        on TripMate.
                    </p>
                    <p style="margin:0 0 32px;color:#475467;font-size:16px;line-height:1.6;">
                        TripMate lets you build itineraries together, vote on destinations,
                        and split expenses seamlessly with your travel group.
                    </p>

                    <!-- CTA Button -->
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                        <tr>
                            <td style="border-radius:50px;background:linear-gradient(135deg,#0891B2,#00D1B2);">
                                <a href="{signup_url}"
                                   style="display:inline-block;padding:16px 40px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">
                                    Join the Trip →
                                </a>
                            </td>
                        </tr>
                    </table>

                    <p style="margin:32px 0 0;color:#98A2B3;font-size:13px;text-align:center;line-height:1.5;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="{signup_url}" style="color:#0891B2;word-break:break-all;">{signup_url}</a>
                    </p>
                </td>
            </tr>

            <!-- Footer -->
            <tr>
                <td style="padding:24px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
                    <p style="margin:0;color:#98A2B3;font-size:12px;">
                        © 2026 TripMate. All rights reserved.
                    </p>
                    <p style="margin:4px 0 0;color:#d0d5dd;font-size:11px;">
                        This invitation expires in 7 days.
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    text_body = (
        f"{inviter_name} has invited you to join '{trip_title}' on TripMate!\n\n"
        f"TripMate lets you build itineraries together, vote on destinations, "
        f"and split expenses seamlessly.\n\n"
        f"Sign up and join the trip: {signup_url}\n\n"
        f"This invitation expires in 7 days."
    )

    try:
        msg = Message(
            subject=subject,
            recipients=[to_email],
            html=html_body,
            body=text_body,
            sender=current_app.config.get("MAIL_DEFAULT_SENDER", "noreply@tripmate.app"),
        )
        mail.send(msg)
        current_app.logger.info(f"Invite email sent to {to_email} for trip '{trip_title}'")
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send invite email to {to_email}: {str(e)}")
        return False
