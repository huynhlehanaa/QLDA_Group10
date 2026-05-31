import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import EmployeeHomePage from './EmployeeHomePage'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    session: { fullName: 'Nhân viên Test' },
    profile: {
      email: 'staff@test.com',
      role: 'staff',
      phone: null,
      first_login_at: null,
    },
  }),
}))

vi.mock('../lib/api', () => ({
  getOnboardingChecklist: vi.fn(async () => ({
    done_count: 0,
    total: 4,
    completion_pct: 0,
    is_complete: false,
    items: [],
  })),
  getStaffDashboard: vi.fn(async () => ({
    tasks_today: [],
    tasks_done_this_month: 5,
    tasks_done_last_month: 4,
    tasks_done_change: 1,
    change_direction: 'up',
    kpi_current_month: {
      total_score: 72.5,
      target_score: 80,
      grade: 'Đạt',
    },
  })),
  getApiErrorMessage: () => 'Không thể tải dữ liệu',
}))

describe('EmployeeHomePage welcome modal', () => {
  it('hiển thị modal chào mừng 3 bước cho lần đăng nhập đầu tiên và có thể đóng', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <EmployeeHomePage />
      </MemoryRouter>,
    )

    await screen.findByText('Dashboard hôm nay')
    expect(screen.getByRole('dialog', { name: 'Chào mừng bạn đến với KPI Nội Bộ' })).toBeInTheDocument()
    expect(screen.getByText('Bước 1: Đổi mật khẩu tạm thời')).toBeInTheDocument()
    expect(screen.getByText('Bước 2: Cập nhật ảnh đại diện và số điện thoại')).toBeInTheDocument()
    expect(screen.getByText('Bước 3: Kiểm tra danh sách công việc được giao')).toBeInTheDocument()
    expect(screen.getByText('Task hôm nay')).toBeInTheDocument()
    expect(screen.getByText('KPI hiện tại')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Bỏ qua' }))
    expect(screen.queryByRole('dialog', { name: 'Chào mừng bạn đến với KPI Nội Bộ' })).not.toBeInTheDocument()
  })

  it('không hiển thị mã PB trên giao diện người dùng', async () => {
    render(
      <MemoryRouter>
        <EmployeeHomePage />
      </MemoryRouter>,
    )

    await screen.findByText('Dashboard hôm nay')
    expect(screen.queryByText(/PB\d+/i)).not.toBeInTheDocument()
  })
})
