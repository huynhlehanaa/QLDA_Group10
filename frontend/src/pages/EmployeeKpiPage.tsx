import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  compareMyKpi,
  createKpiAppeal,
  getApiErrorMessage,
  getMyKpi,
  getMyKpiHistory,
  setMyKpiTarget,
} from '../lib/api'
import type {
  KpiCompareResponse,
  KpiHistoryItem,
  KpiMonthlyResult,
} from '../types/kpi'

function currentPeriod() {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }
}

function formatMonthLabel(year: number, month: number) {
  return `${String(month).padStart(2, '0')}/${year}`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)
}

function EmployeeKpiPage() {
  const { year, month } = useMemo(currentPeriod, [])
  const [kpi, setKpi] = useState<KpiMonthlyResult | null>(null)
  const [history, setHistory] = useState<KpiHistoryItem[]>([])
  const [compare, setCompare] = useState<KpiCompareResponse | null>(null)
  const [targetValue, setTargetValue] = useState('')
  const [appealCriteria, setAppealCriteria] = useState('')
  const [appealCurrentScore, setAppealCurrentScore] = useState('')
  const [appealProposedScore, setAppealProposedScore] = useState('')
  const [appealReason, setAppealReason] = useState('')
  const [targetMessage, setTargetMessage] = useState<string | null>(null)
  const [appealMessage, setAppealMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submittingTarget, setSubmittingTarget] = useState(false)
  const [submittingAppeal, setSubmittingAppeal] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const [kpiData, historyData, compareData] = await Promise.all([
          getMyKpi(year, month),
          getMyKpiHistory(6),
          compareMyKpi(year, month),
        ])
        setKpi(kpiData)
        setHistory(historyData)
        setCompare(compareData)
        setTargetValue(String(kpiData.target_score))
      } catch (err) {
        setError(getApiErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [month, year])

  async function handleTargetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!targetValue.trim()) {
      setTargetMessage('Vui lòng nhập mục tiêu KPI.')
      return
    }

    try {
      setSubmittingTarget(true)
      setTargetMessage(null)
      const result = await setMyKpiTarget({
        year,
        month,
        target_score: Number(targetValue),
      })
      setTargetValue(String(result.target_score))
      setTargetMessage(`Đã lưu mục tiêu KPI ${formatMonthLabel(result.year, result.month)}.`)
      const refreshed = await getMyKpi(year, month)
      setKpi(refreshed)
    } catch (err) {
      setTargetMessage(getApiErrorMessage(err))
    } finally {
      setSubmittingTarget(false)
    }
  }

  async function handleAppealSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!appealCriteria.trim() || !appealReason.trim()) {
      setAppealMessage('Vui lòng nhập tiêu chí và lý do khiếu nại.')
      return
    }

    try {
      setSubmittingAppeal(true)
      setAppealMessage(null)
      const appeal = await createKpiAppeal({
        year,
        month,
        criteria_name: appealCriteria,
        current_score: Number(appealCurrentScore || 0),
        proposed_score: Number(appealProposedScore || 0),
        reason: appealReason,
      })
      setAppealMessage(`Đã gửi khiếu nại KPI #${appeal.id.slice(0, 8)}.`)
      setAppealCriteria('')
      setAppealCurrentScore('')
      setAppealProposedScore('')
      setAppealReason('')
    } catch (err) {
      setAppealMessage(getApiErrorMessage(err))
    } finally {
      setSubmittingAppeal(false)
    }
  }

  const progressPct = kpi && kpi.target_score > 0 ? Math.min((kpi.total_score / kpi.target_score) * 100, 100) : 0

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-teal-700 via-emerald-600 to-cyan-600 p-5 text-white shadow-panel">
        <p className="text-xs uppercase tracking-[0.2em] text-teal-100">KPI cá nhân</p>
        <h1 className="mt-2 text-2xl font-semibold">Kế hoạch và kết quả KPI tháng hiện tại</h1>
        <p className="mt-2 max-w-2xl text-sm text-teal-50">
          Dùng màn này để đặt mục tiêu KPI cho tháng sau, theo dõi kết quả hiện tại và gửi khiếu nại nếu cần.
        </p>
      </div>

      {loading && <p className="text-sm text-slate-500">Đang tải dữ liệu KPI...</p>}
      {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      {!loading && kpi && (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Tháng {formatMonthLabel(kpi.year, kpi.month)}</p>
                <h2 className="mt-1 text-2xl font-semibold text-ink">{kpi.full_name}</h2>
                <p className="mt-1 text-sm text-slate-600">Xếp loại hiện tại: <span className="font-semibold text-ink">{kpi.grade}</span></p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-wide text-slate-500">Điểm KPI</p>
                <p className="mt-1 text-3xl font-semibold text-ink">{formatNumber(kpi.total_score)}</p>
                <p className="text-sm text-slate-500">Mục tiêu {formatNumber(kpi.target_score)}</p>
              </div>
            </div>

            <div className="mt-5 h-3 rounded-full bg-slate-100">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <article className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">So với phòng ban</p>
                <p className="mt-2 text-2xl font-semibold text-ink">{compare ? formatNumber(compare.my_score) : '--'}</p>
                <p className="text-sm text-slate-500">Điểm của bạn</p>
              </article>
              <article className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Điểm trung bình phòng ban</p>
                <p className="mt-2 text-2xl font-semibold text-ink">{compare ? formatNumber(compare.dept_average) : '--'}</p>
                <p className="text-sm text-slate-500">Dùng để đối chiếu mục tiêu</p>
              </article>
              <article className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Lịch sử 6 tháng</p>
                <p className="mt-2 text-2xl font-semibold text-ink">{history.length}</p>
                <p className="text-sm text-slate-500">Kỳ KPI đã tải</p>
              </article>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="font-semibold text-ink">Phân rã điểm KPI</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {kpi.breakdown.length > 0 ? (
                  kpi.breakdown.map((item) => (
                    <div key={item.criteria_id} className="grid gap-2 px-4 py-3 md:grid-cols-[1.4fr_0.4fr_0.4fr_0.4fr] md:items-center">
                      <div>
                        <p className="font-medium text-ink">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.formula_type}</p>
                      </div>
                      <p className="text-sm text-slate-600 md:text-right">Trọng số {item.weight}%</p>
                      <p className="text-sm text-slate-600 md:text-right">Điểm {formatNumber(item.score)}</p>
                      <p className="text-sm font-semibold text-ink md:text-right">{formatNumber(item.weighted_score)}</p>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-6 text-sm text-slate-500">Chưa có breakdown cho kỳ KPI này.</div>
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <form onSubmit={handleTargetSubmit} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
              <h3 className="text-lg font-semibold text-ink">Đặt mục tiêu KPI</h3>
              <p className="mt-1 text-sm text-slate-600">Nhập mục tiêu tháng {month + 1 > 12 ? `01/${year + 1}` : formatMonthLabel(year, month + 1)}.</p>
              <label className="mt-4 block text-sm font-medium text-slate-700">
                Mục tiêu KPI
                <input
                  value={targetValue}
                  onChange={(event) => setTargetValue(event.target.value)}
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  placeholder="Ví dụ: 85"
                />
              </label>
              <button
                type="submit"
                disabled={submittingTarget}
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submittingTarget ? 'Đang lưu...' : 'Lưu mục tiêu'}
              </button>
              {targetMessage && <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{targetMessage}</p>}
            </form>

            <form onSubmit={handleAppealSubmit} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
              <h3 className="text-lg font-semibold text-ink">Khiếu nại KPI</h3>
              <div className="mt-4 space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Tiêu chí
                  <input
                    value={appealCriteria}
                    onChange={(event) => setAppealCriteria(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    placeholder="Ví dụ: Hoàn thành đúng hạn"
                  />
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Điểm hiện tại
                    <input
                      value={appealCurrentScore}
                      onChange={(event) => setAppealCurrentScore(event.target.value)}
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Điểm đề xuất
                    <input
                      value={appealProposedScore}
                      onChange={(event) => setAppealProposedScore(event.target.value)}
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    />
                  </label>
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  Lý do
                  <textarea
                    value={appealReason}
                    onChange={(event) => setAppealReason(event.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    placeholder="Mô tả ngắn gọn lý do và minh chứng"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={submittingAppeal}
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submittingAppeal ? 'Đang gửi...' : 'Gửi khiếu nại'}
              </button>
              {appealMessage && <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{appealMessage}</p>}
            </form>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
              <h3 className="text-lg font-semibold text-ink">Lịch sử KPI gần đây</h3>
              <div className="mt-4 space-y-3">
                {history.map((item) => (
                  <div key={`${item.year}-${item.month}`} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-ink">{formatMonthLabel(item.year, item.month)}</span>
                    <span className="text-sm text-slate-600">{formatNumber(item.total_score)}</span>
                  </div>
                ))}
                {history.length === 0 && <p className="text-sm text-slate-500">Chưa có dữ liệu lịch sử.</p>}
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}

export default EmployeeKpiPage