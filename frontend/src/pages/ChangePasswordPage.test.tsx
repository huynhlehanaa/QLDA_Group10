import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChangePasswordPage from './ChangePasswordPage'

const forcePasswordChangeMock = vi.fn()
const navigateMock = vi.fn()

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    forcePasswordChange: forcePasswordChangeMock,
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

describe('ChangePasswordPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows error when confirmation does not match', async () => {
    render(<ChangePasswordPage />)

    fireEvent.change(screen.getByLabelText('Mật khẩu cũ'), { target: { value: 'oldpass' } })
      fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'Newpass1!' } })
      fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu mới'), { target: { value: 'different' } })

    fireEvent.click(screen.getByText('Xác nhận đổi mật khẩu'))

    expect(await screen.findByText('Mật khẩu xác nhận không khớp.')).toBeInTheDocument()
    expect(forcePasswordChangeMock).not.toHaveBeenCalled()
  })

  it('calls forcePasswordChange and navigates on success', async () => {
    forcePasswordChangeMock.mockResolvedValue(undefined)
    render(<ChangePasswordPage />)

    fireEvent.change(screen.getByLabelText('Mật khẩu cũ'), { target: { value: 'oldpass' } })
      fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'Newpass1!' } })
      fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu mới'), { target: { value: 'Newpass1!' } })

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đổi mật khẩu' }))

    await waitFor(() => {
      expect(forcePasswordChangeMock).toHaveBeenCalledWith('oldpass', 'Newpass1!')
      expect(navigateMock).toHaveBeenCalledWith('/employee', { replace: true })
    })
  })
})
