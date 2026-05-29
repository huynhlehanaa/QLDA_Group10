import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ResetPasswordPage from './ResetPasswordPage'

const resetPasswordMock = vi.fn()

vi.mock('../lib/api', () => ({
  resetPassword: (...args: unknown[]) => resetPasswordMock(...args),
  getApiErrorMessage: () => 'Có lỗi xảy ra',
}))

describe('ResetPasswordPage', () => {
  beforeEach(() => vi.resetAllMocks())

  it('shows error when token missing', async () => {
    render(
      <MemoryRouter initialEntries={["/reset-password"]}>
        <ResetPasswordPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'newpass' } })
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu mới'), { target: { value: 'newpass' } })
    fireEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }))

    expect(await screen.findByText('Liên kết đặt lại mật khẩu không hợp lệ.')).toBeInTheDocument()
    expect(resetPasswordMock).not.toHaveBeenCalled()
  })

  it('calls resetPassword with token and shows success message', async () => {
    resetPasswordMock.mockResolvedValue(undefined)
    render(
      <MemoryRouter initialEntries={["/reset-password?token=abc123"]}>
        <ResetPasswordPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'newpass' } })
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu mới'), { target: { value: 'newpass' } })
    fireEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }))

    await waitFor(() => expect(resetPasswordMock).toHaveBeenCalledWith('abc123', 'newpass'))
    expect(await screen.findByText('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.')).toBeInTheDocument()
  })
})
