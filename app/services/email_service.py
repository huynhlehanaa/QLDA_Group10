"""
Email service cho: PB007 (reset pw), PB024 (tài khoản Manager mới),
PB034 (chào mừng nhân viên), PB003 (cảnh báo khóa tài khoản)
"""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


def _send(to_email: str, subject: str, html_body: str) -> bool:
    """Gửi email qua SMTP. Trả về True nếu thành công."""
    if not settings.MAIL_USERNAME:
        # Dev mode: chỉ print ra console
        print(f"\n{'='*60}")
        print(f"[EMAIL] To: {to_email}")
        print(f"[EMAIL] Subject: {subject}")
        print(f"[EMAIL] Body: {html_body[:200]}...")
        print(f"{'='*60}\n")
        return True
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT) as server:
            if settings.MAIL_STARTTLS:
                server.starttls()
            server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.sendmail(settings.MAIL_FROM, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False


def send_reset_password_email(to_email: str, reset_link: str) -> bool:
    """PB007: link reset hết hạn sau 5 phút"""
    subject = "Đặt lại mật khẩu - KPI Nội Bộ"
    body = f"""
    <h2>Yêu cầu đặt lại mật khẩu</h2>
    <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
    <p>
      <a href="{reset_link}" style="background:#4F46E5;color:white;padding:12px 24px;
         border-radius:6px;text-decoration:none;display:inline-block;">
        Đặt lại mật khẩu
      </a>
    </p>
    <p><strong>Link hết hạn sau 5 phút.</strong> Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    <p style="color:#999;font-size:12px;">KPI Nội Bộ - {settings.APP_URL}</p>
    """
    return _send(to_email, subject, body)


def send_new_manager_email(to_email: str, full_name: str, temp_password: str) -> bool:
    """PB024: gửi thông tin đăng nhập cho Manager mới"""
    subject = "Tài khoản Manager - KPI Nội Bộ"
    body = f"""
    <h2>Chào mừng {full_name}!</h2>
    <p>CEO đã tạo tài khoản Manager cho bạn trên hệ thống KPI Nội Bộ.</p>
    <table style="border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:4px 12px 4px 0;color:#666">Link hệ thống:</td>
          <td><a href="{settings.APP_URL}">{settings.APP_URL}</a></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">Email:</td>
          <td><strong>{to_email}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">Mật khẩu tạm:</td>
          <td><strong>{temp_password}</strong></td></tr>
    </table>
    <p style="color:#e11d48">Bạn sẽ được yêu cầu đổi mật khẩu ngay lần đăng nhập đầu tiên.</p>
    """
    return _send(to_email, subject, body)


def send_new_staff_email(to_email: str, full_name: str, temp_password: str) -> bool:
    """PB034: gửi email chào mừng nhân viên mới"""
    subject = "Chào mừng đến với KPI Nội Bộ"
    body = f"""
    <h2>Xin chào {full_name}!</h2>
    <p>Manager của bạn đã tạo tài khoản trên hệ thống KPI Nội Bộ.</p>
    <table style="border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:4px 12px 4px 0;color:#666">Link hệ thống:</td>
          <td><a href="{settings.APP_URL}">{settings.APP_URL}</a></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">Email:</td>
          <td><strong>{to_email}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">Mật khẩu tạm:</td>
          <td><strong>{temp_password}</strong></td></tr>
    </table>
    <p>Sau khi đăng nhập, bạn có thể cài PWA để dùng trên điện thoại.</p>
    <p style="color:#e11d48">Đổi mật khẩu ngay lần đăng nhập đầu tiên.</p>
    """
    return _send(to_email, subject, body)


def send_account_locked_email(to_email: str, full_name: str, lockout_minutes: int) -> bool:
    """PB003: cảnh báo tài khoản bị khóa"""
    subject = "Cảnh báo: Tài khoản bị tạm khóa - KPI Nội Bộ"
    body = f"""
    <h2>Cảnh báo bảo mật</h2>
    <p>Xin chào {full_name},</p>
    <p>Tài khoản của bạn vừa bị tạm khóa <strong>{lockout_minutes} phút</strong>
       do nhập sai mật khẩu quá 5 lần.</p>
    <p>Nếu không phải bạn thực hiện, hãy liên hệ IT ngay.</p>
    <p>Sau {lockout_minutes} phút bạn có thể đăng nhập lại bình thường.</p>
    """
    return _send(to_email, subject, body)


def send_otp_email(to_email: str, full_name: str, otp: str) -> bool:
    """PB011: 2FA OTP"""
    subject = "Mã xác thực OTP - KPI Nội Bộ"
    body = f"""
    <h2>Xác thực hai yếu tố</h2>
    <p>Xin chào {full_name},</p>
    <p>Mã OTP của bạn là:</p>
    <h1 style="font-size:48px;letter-spacing:12px;color:#4F46E5;margin:24px 0">{otp}</h1>
    <p style="color:#999">Mã hết hạn sau <strong>5 phút</strong>.
       Không chia sẻ mã này với bất kỳ ai.</p>
    """
    return _send(to_email, subject, body)
