import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type HelpRole = 'staff' | 'manager' | 'ceo'

const HELP_CONTENT: Record<HelpRole, {
  title: string
  intro: string
  cards: Array<{ title: string; description: string; href?: string; cta?: string }>
}> = {
  staff: {
    title: 'Hướng dẫn cho nhân viên',
    intro: 'Bắt đầu với các màn quan trọng nhất: task, thông báo, cài đặt và kiểm tra KPI cá nhân.',
    cards: [
      { title: 'Bước 1: Hoàn thành onboarding', description: 'Cập nhật hồ sơ, đổi mật khẩu và làm quen checklist khởi động.', href: '/employee', cta: 'Mở onboarding' },
      { title: 'Bước 2: Theo dõi task', description: 'Xem danh sách công việc, mở Kanban và kiểm tra deadline từ màn công việc.', href: '/employee/tasks', cta: 'Mở task workspace' },
      { title: 'Bước 3: Quản lý thông báo', description: 'Lọc thông báo theo loại và lưu cài đặt nhận cảnh báo phù hợp.', href: '/employee/notifications', cta: 'Mở Notification Center' },
      { title: 'Bước 4: Tùy chỉnh giao diện', description: 'Chọn ngôn ngữ và điều chỉnh cài đặt thông báo theo thói quen làm việc.', href: '/employee/settings', cta: 'Mở Cài đặt' },
    ],
  },
  manager: {
    title: 'Hướng dẫn cho manager',
    intro: 'Theo dõi tiến độ, giao việc và dùng thông báo để phản hồi nhanh.',
    cards: [
      { title: 'Quản lý task', description: 'Dùng task workspace để giao việc, cập nhật deadline và theo dõi backlog.' },
      { title: 'Phản hồi nhanh', description: 'Duy trì nhịp trao đổi qua comment và thông báo theo thời gian thực.' },
      { title: 'Cài đặt thông báo', description: 'Bật/tắt các loại cảnh báo để tránh nhiễu khi theo dõi nhóm.' },
    ],
  },
  ceo: {
    title: 'Hướng dẫn cho CEO',
    intro: 'Tập trung vào KPI, cảnh báo hệ thống và trạng thái tổng quan.',
    cards: [
      { title: 'Xem KPI tổng quan', description: 'Đi sâu vào phần KPI để kiểm tra kết quả tháng và xu hướng.' },
      { title: 'Theo dõi cảnh báo', description: 'Dùng Notification Center để rà soát thay đổi quan trọng của hệ thống và KPI.' },
      { title: 'Cài đặt giao diện', description: 'Chọn ngôn ngữ phù hợp để duyệt nhanh trên thiết bị cá nhân.' },
    ],
  },
}

function EmployeeHelpCenterPage() {
  const { profile, session } = useAuth()
  const currentRole = (profile?.role ?? session?.role ?? 'staff') as HelpRole
  const content = HELP_CONTENT[currentRole]

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-slate-800 p-5 text-white shadow-panel">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-100">Help Center</p>
        <h1 className="mt-2 text-2xl font-semibold">{content.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-amber-50">{content.intro}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['staff', 'manager', 'ceo'] as HelpRole[]).map((role) => (
          <span
            key={role}
            className={`rounded-full px-4 py-2 text-sm font-medium ${currentRole === role ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            {role === 'staff' ? 'Nhân viên' : role === 'manager' ? 'Manager' : 'CEO'}
          </span>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {content.cards.map((card) => (
          <article key={card.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-lg font-semibold text-ink">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
            {card.href ? (
              <Link to={card.href} className="mt-4 inline-flex rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
                {card.cta ?? 'Mở trang'}
              </Link>
            ) : null}
          </article>
        ))}
      </div>

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold text-ink">Câu hỏi nhanh</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>• Cần làm gì trước tiên? Hoàn thành onboarding và kiểm tra thông báo chưa đọc.</li>
            <li>• Chỉnh giao diện ở đâu? Vào Cài đặt để chọn ngôn ngữ và kiểm soát thông báo.</li>
            <li>• Cần xem lại task? Mở Task workspace từ trang chủ hoặc menu điều hướng.</li>
          </ul>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <h3 className="font-semibold text-ink">Lối tắt</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link to="/employee" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Trang chủ</Link>
            <Link to="/employee/tasks" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Công việc</Link>
            <Link to="/employee/notifications" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Thông báo</Link>
            <Link to="/employee/settings" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cài đặt</Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default EmployeeHelpCenterPage