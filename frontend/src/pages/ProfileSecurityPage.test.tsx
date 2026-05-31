import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProfileSecurityPage from './ProfileSecurityPage'

const updateAvatarMock = vi.fn()
const updatePhoneMock = vi.fn()
const getProfileMock = vi.fn()

vi.mock('../lib/api', () => ({
  updateAvatar: (...args: unknown[]) => updateAvatarMock(...args),
  updatePhone: (...args: unknown[]) => updatePhoneMock(...args),
  getProfile: () => getProfileMock(),
  getApiErrorMessage: () => 'Có lỗi xảy ra',
  changePassword: vi.fn(),
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    profile: { email: 'nv1@company.com', avatar_url: '', phone: '', full_name: 'NV 1' },
    updateProfileLocally: vi.fn(),
    logoutEverywhere: vi.fn(),
    logoutThisDevice: vi.fn(),
  }),
}))

describe('ProfileSecurityPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('hiển thị và gọi API khi lưu avatar và số điện thoại, và có nút đăng xuất', async () => {
    render(
      <MemoryRouter>
        <ProfileSecurityPage />
      </MemoryRouter>,
    )

    // labels
    expect(screen.getByLabelText('URL ảnh đại diện')).toBeInTheDocument()
    expect(screen.getByLabelText('Số điện thoại')).toBeInTheDocument()

    // save avatar
    fireEvent.change(screen.getByLabelText('URL ảnh đại diện'), { target: { value: 'https://img.test/1.png' } })
    fireEvent.click(screen.getByText('Lưu ảnh đại diện'))
    expect(updateAvatarMock).toHaveBeenCalled()

    // save phone
    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0901234567' } })
    fireEvent.click(screen.getByText('Lưu số điện thoại'))
    expect(updatePhoneMock).toHaveBeenCalled()

    // logout buttons exist
    expect(screen.getByText('Đăng xuất tất cả')).toBeInTheDocument()
    expect(screen.getByText('Đăng xuất thiết bị này')).toBeInTheDocument()
  })
})
