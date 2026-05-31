import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from './LoginPage'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    signIn: vi.fn(),
  }),
}))

describe('LoginPage content', () => {
  it('hiển thị tiếng Việt có dấu và không lộ mã PB', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Đăng nhập hệ thống KPI')).toBeInTheDocument()
    expect(screen.getByLabelText('Email công ty')).toBeInTheDocument()
    expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument()

    expect(screen.queryByText(/PB\d+/i)).not.toBeInTheDocument()
  })
})
