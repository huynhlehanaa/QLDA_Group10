import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OtpPage from './OtpPage'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    signInWithOtp: vi.fn(),
    session: { role: 'staff' },
  }),
}))

const sendOtpMock = vi.fn()

vi.mock('../lib/api', () => ({
  sendOtp: (...args: unknown[]) => sendOtpMock(...args),
  getApiErrorMessage: () => 'Có lỗi xảy ra',
}))

describe('OtpPage cooldown', () => {
  beforeEach(() => {
    sendOtpMock.mockReset()
    sendOtpMock.mockResolvedValue(undefined)
  })

  it('khóa nút gửi lại OTP và hiển thị đếm ngược sau khi gửi', async () => {
    vi.useFakeTimers()

    render(
      <MemoryRouter>
        <OtpPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nv1@company.com' } })
    const resendButton = screen.getByRole('button', { name: 'Gửi lại OTP' })

    await act(async () => {
      fireEvent.click(resendButton)
      await Promise.resolve()
    })

    expect(sendOtpMock).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Gửi lại OTP' })).toBeDisabled()
    expect(screen.getByText(/Bạn có thể gửi lại OTP sau 60 giây/)).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(61000)
      await Promise.resolve()
    })

    expect(screen.getByRole('button', { name: 'Gửi lại OTP' })).not.toBeDisabled()

    vi.useRealTimers()
  })
})
