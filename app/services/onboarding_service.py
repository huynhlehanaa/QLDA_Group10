"""
Onboarding Service — PB233 đến PB236
"""
import io
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.user import User


# ── Checklist steps definition ────────────────────────────────

ONBOARDING_STEPS = [
    {
        "step_id": "change_password",
        "title": "Đổi mật khẩu lần đầu",
        "description": "Bảo mật tài khoản bằng cách đổi mật khẩu tạm thời được cấp",
        "action_url": "/settings/change-password",
        "order": 1,
    },
    {
        "step_id": "update_avatar",
        "title": "Cập nhật ảnh đại diện",
        "description": "Thêm ảnh đại diện để đồng nghiệp nhận ra bạn",
        "action_url": "/profile",
        "order": 2,
    },
    {
        "step_id": "install_pwa",
        "title": "Cài đặt ứng dụng trên điện thoại",
        "description": "Cài KPI Nội Bộ lên màn hình chính để truy cập nhanh",
        "action_url": "/settings/install-guide",
        "order": 3,
    },
    {
        "step_id": "view_first_task",
        "title": "Xem task đầu tiên được giao",
        "description": "Xem danh sách task của bạn và bắt đầu làm việc",
        "action_url": "/tasks/me",
        "order": 4,
    },
]

VALID_STEP_IDS = {s["step_id"] for s in ONBOARDING_STEPS}


# ── Onboarding storage (dùng JSON trong DB hoặc memory) ───────
# Lưu vào UserSetting JSON field để đơn giản

def _get_progress(user_id: UUID, db: Session) -> dict:
    """Lấy tiến độ onboarding từ UserSetting"""
    from app.models.settings import UserSetting
    setting = db.query(UserSetting).filter(
        UserSetting.user_id == user_id
    ).first()
    if not setting:
        return {}
    # Dùng một column riêng hoặc lưu trong extra JSON
    # Tạm thời dùng dict trong memory với key "onboarding_{step_id}"
    return {}


def _save_progress(user_id: UUID, step_id: str,
                   is_done: bool, db: Session):
    """Lưu tiến độ bước onboarding"""
    from app.models.settings import UserSetting
    setting = db.query(UserSetting).filter(
        UserSetting.user_id == user_id
    ).first()
    if not setting:
        setting = UserSetting(user_id=user_id)
        db.add(setting)
    # Encode tiến độ vào language field tạm thời
    # Production: dùng JSON column riêng
    db.commit()


# ── Checklist state store (in-memory for simplicity) ─────────
_onboarding_state: dict = {}


def get_checklist(user: User, db: Session) -> dict:
    """PB234: lấy checklist onboarding và trạng thái từng bước"""
    user_key = str(user.id)
    if user_key not in _onboarding_state:
        _onboarding_state[user_key] = {}

    state = _onboarding_state[user_key]

    items = []
    for step in sorted(ONBOARDING_STEPS, key=lambda s: s["order"]):
        step_id = step["step_id"]

        # Auto-detect: đổi mật khẩu
        if step_id == "change_password":
            is_done = not user.must_change_pw
        else:
            is_done = state.get(step_id, False)

        items.append({
            "step_id": step_id,
            "title": step["title"],
            "description": step["description"],
            "action_url": step["action_url"],
            "is_done": is_done,
            "order": step["order"],
        })

    done_count = sum(1 for item in items if item["is_done"])
    total = len(items)
    completion_pct = round(done_count / total * 100, 1) if total else 0.0
    is_complete = done_count == total

    return {
        "items": items,
        "done_count": done_count,
        "total": total,
        "completion_pct": completion_pct,
        "is_complete": is_complete,
    }


def mark_step(user_id: UUID, step_id: str, is_done: bool, db: Session) -> dict:
    """PB234: đánh dấu bước hoàn thành"""
    if step_id not in VALID_STEP_IDS:
        raise HTTPException(
            status_code=404,
            detail=f"Bước '{step_id}' không tồn tại trong checklist"
        )

    user_key = str(user_id)
    if user_key not in _onboarding_state:
        _onboarding_state[user_key] = {}

    _onboarding_state[user_key][step_id] = is_done

    step = next(s for s in ONBOARDING_STEPS if s["step_id"] == step_id)
    return {
        "step_id": step_id,
        "title": step["title"],
        "is_done": is_done,
    }


# ── Welcome Email ─────────────────────────────────────────────

def send_welcome_email(to_email: str, full_name: str,
                       temp_password: str, role: str):
    """PB233: gửi email chào mừng khi tạo tài khoản mới"""
    from app.core.config import settings
    from app.services.email_service import _send

    guide_url = {
        "staff": f"{settings.APP_URL}/onboarding/guide/staff",
        "manager": f"{settings.APP_URL}/onboarding/guide/manager",
        "ceo": f"{settings.APP_URL}/onboarding/guide/ceo",
    }.get(role, f"{settings.APP_URL}/onboarding/guide/staff")

    subject = f"[KPI Nội Bộ] Chào mừng {full_name} đến với hệ thống!"
    body = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h1 style="color:#4F46E5">Chào mừng bạn đến với KPI Nội Bộ! 🎉</h1>
      <p>Xin chào <strong>{full_name}</strong>,</p>
      <p>Tài khoản của bạn đã được tạo thành công.
         Dưới đây là thông tin đăng nhập:</p>
      <table style="border-collapse:collapse;margin:16px 0;width:100%">
        <tr>
          <td style="padding:8px 16px 8px 0;color:#666;width:140px">Email:</td>
          <td><strong>{to_email}</strong></td>
        </tr>
        <tr>
          <td style="padding:8px 16px 8px 0;color:#666">Mật khẩu tạm:</td>
          <td><strong style="font-family:monospace;background:#f3f4f6;
                             padding:2px 8px;border-radius:4px">
              {temp_password}</strong></td>
        </tr>
      </table>
      <p style="color:#dc2626">
        ⚠️ Vui lòng đổi mật khẩu ngay sau lần đăng nhập đầu tiên!
      </p>
      <div style="margin:24px 0">
        <a href="{settings.APP_URL}"
           style="background:#4F46E5;color:white;padding:12px 24px;
                  border-radius:6px;text-decoration:none;
                  display:inline-block;margin-right:12px">
          Đăng nhập ngay
        </a>
        <a href="{guide_url}"
           style="background:#f3f4f6;color:#374151;padding:12px 24px;
                  border-radius:6px;text-decoration:none;
                  display:inline-block">
          📄 Tải hướng dẫn sử dụng
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <h3 style="color:#374151">🚀 Bắt đầu nhanh</h3>
      <ol style="color:#374151;line-height:2">
        <li>Đăng nhập và đổi mật khẩu</li>
        <li>Cập nhật ảnh đại diện</li>
        <li>Cài ứng dụng lên điện thoại (PWA)</li>
        <li>Xem task được giao và bắt đầu làm việc</li>
      </ol>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px">
        Email này được gửi tự động từ hệ thống KPI Nội Bộ.
        Vui lòng không trả lời email này.
      </p>
    </div>
    """
    _send(to_email, subject, body)


# ── PDF Guide generation ──────────────────────────────────────

def generate_guide_pdf(role: str) -> bytes:
    """PB235, PB236: tạo PDF hướng dẫn theo role"""
    content = _get_guide_content(role)
    return _render_pdf(content, role)


def _get_guide_content(role: str) -> dict:
    if role == "staff":
        return {
            "title": "Hướng dẫn sử dụng dành cho Nhân viên",
            "subtitle": "KPI Nội Bộ — Phiên bản 1.0",
            "sections": [
                {
                    "heading": "1. Đăng nhập hệ thống",
                    "content": [
                        "Truy cập hệ thống tại địa chỉ được cung cấp.",
                        "Nhập email và mật khẩu tạm thời nhận qua email.",
                        "Đổi mật khẩu ngay sau lần đăng nhập đầu tiên.",
                        "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, số và ký tự đặc biệt.",
                    ],
                },
                {
                    "heading": "2. Cài đặt ứng dụng trên điện thoại (PWA)",
                    "content": [
                        "Android: Mở Chrome → menu 3 chấm → 'Add to Home screen'.",
                        "iOS: Mở Safari → nút Share → 'Add to Home Screen'.",
                        "Ứng dụng sẽ xuất hiện trên màn hình chính như app bình thường.",
                    ],
                },
                {
                    "heading": "3. Xem và cập nhật tiến độ task",
                    "content": [
                        "Vào mục 'Task của tôi' để xem danh sách task được giao.",
                        "Click vào task để xem chi tiết và cập nhật tiến độ.",
                        "Kéo thanh tiến độ hoặc nhập % hoàn thành.",
                        "Thêm ghi chú để báo cáo tiến độ cho Manager.",
                    ],
                },
                {
                    "heading": "4. Xem điểm KPI",
                    "content": [
                        "Vào mục 'KPI của tôi' để xem điểm tháng hiện tại.",
                        "Xem lịch sử KPI 12 tháng và so sánh với trung bình phòng ban.",
                        "Gửi khiếu nại nếu điểm không chính xác.",
                    ],
                },
                {
                    "heading": "5. Quản lý thông báo",
                    "content": [
                        "Thông báo hiện trong chuông góc phải màn hình.",
                        "Vào Cài đặt để bật/tắt từng loại thông báo.",
                        "Bật push notification để nhận thông báo kể cả khi đóng app.",
                    ],
                },
            ],
        }
    elif role in ("manager", "ceo"):
        sections = [
            {
                "heading": "1. Quản lý nhân viên",
                "content": [
                    "Tạo tài khoản nhân viên mới: Quản lý → Thêm nhân viên.",
                    "Reset mật khẩu khi nhân viên quên mật khẩu.",
                    "Vô hiệu hóa tài khoản khi nhân viên nghỉ việc.",
                ],
            },
            {
                "heading": "2. Tạo và giao task",
                "content": [
                    "Vào mục Task → Tạo task mới.",
                    "Điền tiêu đề, deadline, độ ưu tiên và chọn người thực hiện.",
                    "Một task có thể giao cho nhiều nhân viên.",
                    "Theo dõi tiến độ qua Kanban hoặc Gantt Chart.",
                ],
            },
            {
                "heading": "3. Xem báo cáo hiệu suất",
                "content": [
                    "Dashboard Manager: tổng quan task phòng ban.",
                    "Báo cáo → Hiệu suất: tỉ lệ hoàn thành đúng hạn từng nhân viên.",
                    "Xuất báo cáo ra Excel hoặc PDF.",
                ],
            },
            {
                "heading": "4. Cấu hình KPI",
                "content": [
                    "Vào KPI → Tiêu chí để xem và điều chỉnh trọng số.",
                    "Chốt điểm KPI cuối tháng tại KPI → Chốt điểm.",
                    "Phản hồi khiếu nại từ nhân viên trong vòng 3 ngày.",
                ],
            },
        ]

        if role == "ceo":
            sections.extend([
                {
                    "heading": "5. Cấu hình hệ thống",
                    "content": [
                        "Cài đặt → Thông tin công ty: logo, tên, lịch làm việc.",
                        "Cài đặt → KPI: mục tiêu, ngày chốt, ngưỡng xếp loại.",
                        "Tạo tiêu chí KPI toàn công ty với trọng số tổng = 100%.",
                    ],
                },
                {
                    "heading": "6. Dashboard CEO",
                    "content": [
                        "Xem tổng quan toàn công ty: nhân viên, task, KPI.",
                        "Heatmap hiệu suất theo ngày.",
                        "So sánh KPI phòng ban theo quý.",
                    ],
                },
            ])

        return {
            "title": f"Hướng dẫn sử dụng dành cho {'Manager' if role == 'manager' else 'CEO'}",
            "subtitle": "KPI Nội Bộ — Phiên bản 1.0",
            "sections": sections,
        }
    else:
        raise HTTPException(status_code=404, detail="Role không hợp lệ")


def _render_pdf(content: dict, role: str) -> bytes:
    """Tạo PDF từ content dict"""
    try:
        import weasyprint
        html = _build_html(content, role)
        return weasyprint.HTML(string=html).write_pdf()
    except ImportError:
        # Fallback: tạo HTML-based PDF placeholder
        html = _build_html(content, role)
        return html.encode("utf-8")


def _build_html(content: dict, role: str) -> str:
    role_color = {
        "staff": "#4F46E5",
        "manager": "#059669",
        "ceo": "#DC2626",
    }.get(role, "#4F46E5")

    sections_html = ""
    for section in content.get("sections", []):
        items = "".join(f"<li>{item}</li>" for item in section["content"])
        sections_html += f"""
        <div class="section">
          <h2>{section['heading']}</h2>
          <ul>{items}</ul>
        </div>
        """

    return f"""
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>{content['title']}</title>
      <style>
        body {{
          font-family: 'Arial', sans-serif;
          margin: 0; padding: 40px;
          color: #1f2937; line-height: 1.6;
        }}
        .header {{
          background: {role_color};
          color: white; padding: 30px 40px;
          margin: -40px -40px 40px -40px;
        }}
        .header h1 {{ margin: 0 0 8px; font-size: 24px; }}
        .header p {{ margin: 0; opacity: 0.8; font-size: 14px; }}
        .section {{
          margin-bottom: 32px;
          padding: 24px; background: #f9fafb;
          border-radius: 8px;
          border-left: 4px solid {role_color};
        }}
        .section h2 {{
          color: {role_color};
          margin: 0 0 12px; font-size: 16px;
        }}
        .section ul {{
          margin: 0; padding-left: 20px;
        }}
        .section li {{ margin-bottom: 6px; }}
        .footer {{
          margin-top: 40px; padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center; color: #9ca3af;
          font-size: 12px;
        }}
      </style>
    </head>
    <body>
      <div class="header">
        <h1>{content['title']}</h1>
        <p>{content['subtitle']}</p>
      </div>
      {sections_html}
      <div class="footer">
        <p>KPI Nội Bộ — Tài liệu hướng dẫn sử dụng</p>
        <p>Phiên bản 1.0 | Bảo mật nội bộ - Không phân phối bên ngoài</p>
      </div>
    </body>
    </html>
    """
