'use client';

import { type CSSProperties, FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authStore } from '@/store/authStore';
import { apiRequest } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import {
  type DeptKpiSummary,
  type DeptScoreItem,
  type GradeDistribution,
  type KpiAdjustmentHistoryItem,
  type KpiCompareResult,
  type KpiHistoryItem,
  type MyKpiResult,
  useKpi
} from '@/hooks/useKpi';

type StaffOption = { id: string; full_name: string };

export default function KpiPage() {
  const router = useRouter();
  const { accessToken, me } = useAuthStore();
  const {
    loading,
    fetchKpi,
    fetchHistory,
    fetchCompare,
    updateTarget,
    fetchDeptSummary,
    fetchDeptScores,
    fetchDistribution,
    fetchDeptRanking,
    createAppeal,
    createAdjustment,
    fetchAdjustmentHistory,
    finalizeKpi,
    unlockKpi,
    respondAppeal,
    reviewAdjustment,
    exportDeptExcel,
    exportCompanyExcel
  } = useKpi();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [ready, setReady] = useState(false);

  const [myKpi, setMyKpi] = useState<MyKpiResult | null>(null);
  const [history, setHistory] = useState<KpiHistoryItem[]>([]);
  const [compare, setCompare] = useState<KpiCompareResult | null>(null);
  const [deptSummary, setDeptSummary] = useState<DeptKpiSummary | null>(null);
  const [deptScores, setDeptScores] = useState<DeptScoreItem[]>([]);
  const [deptRanking, setDeptRanking] = useState<DeptScoreItem[]>([]);
  const [distribution, setDistribution] = useState<GradeDistribution | null>(null);
  const [adjustmentHistory, setAdjustmentHistory] = useState<KpiAdjustmentHistoryItem[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);

  const [targetScore, setTargetScore] = useState('80');
  const [appealCriteria, setAppealCriteria] = useState('');
  const [appealCurrentScore, setAppealCurrentScore] = useState('0');
  const [appealProposedScore, setAppealProposedScore] = useState('0');
  const [appealReason, setAppealReason] = useState('');

  const [adjustUserId, setAdjustUserId] = useState('');
  const [adjustCriteria, setAdjustCriteria] = useState('');
  const [adjustProposedScore, setAdjustProposedScore] = useState('0');
  const [adjustReason, setAdjustReason] = useState('');
  const [appealIdToRespond, setAppealIdToRespond] = useState('');
  const [appealResponseText, setAppealResponseText] = useState('');
  const [appealAdjustedScore, setAppealAdjustedScore] = useState('');
  const [appealApprove, setAppealApprove] = useState('approve');
  const [reviewAdjId, setReviewAdjId] = useState('');
  const [reviewApprove, setReviewApprove] = useState('approve');
  const [reviewComment, setReviewComment] = useState('');
  const [unlockReason, setUnlockReason] = useState('');

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadKpiData = useCallback(async () => {
    if (!accessToken) return;
    const [myKpiRes, historyRes, compareRes] = await Promise.all([
      fetchKpi(year, month),
      fetchHistory(12),
      fetchCompare(year, month)
    ]);
    setMyKpi(myKpiRes);
    setHistory(historyRes);
    setCompare(compareRes);

    if (me?.role === 'manager' || me?.role === 'ceo') {
      const [summaryRes, scoresRes, rankingRes, distributionRes, adjustmentRes] = await Promise.all([
        fetchDeptSummary(year, month),
        fetchDeptScores(year, month),
        fetchDeptRanking(year, month),
        fetchDistribution(year, month),
        fetchAdjustmentHistory()
      ]);
      setDeptSummary(summaryRes);
      setDeptScores(scoresRes);
      setDeptRanking(rankingRes);
      setDistribution(distributionRes);
      setAdjustmentHistory(adjustmentRes);
    } else {
      setDeptSummary(null);
      setDeptScores([]);
      setDeptRanking([]);
      setDistribution(null);
      setAdjustmentHistory([]);
    }
  }, [
    accessToken,
    fetchCompare,
    fetchDeptScores,
    fetchDeptRanking,
    fetchDeptSummary,
    fetchDistribution,
    fetchHistory,
    fetchKpi,
    fetchAdjustmentHistory,
    me?.role,
    month,
    year
  ]);

  useEffect(() => {
    if (!accessToken) {
      router.replace('/auth/login');
      return;
    }

    authStore.bootstrap().then(async (profile) => {
      if (!profile) {
        router.replace('/auth/login');
        return;
      }
      if (profile.role === 'manager') {
        try {
          const data = await apiRequest<StaffOption[]>('/api/v1/users/staff', { token: accessToken });
          setStaff(data);
          if (data[0]) setAdjustUserId(data[0].id);
        } catch {
          setStaff([]);
        }
      }
      setReady(true);
    }).catch(() => router.replace('/auth/login'));
  }, [accessToken, router]);

  useEffect(() => {
    if (!ready) return;
    loadKpiData().catch((err) => {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu KPI');
    });
  }, [ready, year, month, loadKpiData]);

  async function onSetTarget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      await updateTarget(year, month, Number(targetScore));
      setNotice('Đã cập nhật mục tiêu KPI cá nhân.');
      await loadKpiData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật mục tiêu thất bại');
    }
  }

  async function onCreateAppeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const result = await createAppeal({
        year,
        month,
        criteria_name: appealCriteria,
        current_score: Number(appealCurrentScore),
        proposed_score: Number(appealProposedScore),
        reason: appealReason
      });
      setNotice('Đã gửi khiếu nại KPI. Mã khiếu nại: ' + (result.id || ''));
      setAppealCriteria('');
      setAppealCurrentScore('0');
      setAppealProposedScore('0');
      setAppealReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gửi khiếu nại thất bại');
    }
  }

  async function onCreateAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const result = await createAdjustment({
        user_id: adjustUserId,
        year,
        month,
        criteria_name: adjustCriteria,
        proposed_score: Number(adjustProposedScore),
        reason: adjustReason
      });
      setNotice('Đã gửi yêu cầu điều chỉnh KPI. Mã yêu cầu: ' + (result.id || ''));
      setAdjustCriteria('');
      setAdjustProposedScore('0');
      setAdjustReason('');
      await loadKpiData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gửi điều chỉnh thất bại');
    }
  }

  async function onRespondAppeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      await respondAppeal(appealIdToRespond, {
        approved: appealApprove === 'approve',
        response: appealResponseText,
        adjusted_score: appealApprove === 'approve' && appealAdjustedScore !== '' ? Number(appealAdjustedScore) : undefined
      });
      setNotice('Đã phản hồi khiếu nại KPI.');
      setAppealIdToRespond('');
      setAppealResponseText('');
      setAppealAdjustedScore('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Phản hồi khiếu nại thất bại');
    }
  }

  async function onReviewAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      await reviewAdjustment(reviewAdjId, {
        approved: reviewApprove === 'approve',
        comment: reviewComment || undefined
      });
      setNotice('Đã xử lý yêu cầu điều chỉnh KPI.');
      setReviewAdjId('');
      setReviewComment('');
      await loadKpiData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duyệt điều chỉnh thất bại');
    }
  }

  async function onFinalizeKpi() {
    setError('');
    setNotice('');
    try {
      await finalizeKpi(year, month);
      setNotice(`Đã chốt KPI tháng ${month}/${year}.`);
      await loadKpiData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chốt KPI thất bại');
    }
  }

  async function onUnlockKpi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      await unlockKpi(year, month, unlockReason);
      setNotice(`Đã mở khóa KPI tháng ${month}/${year}.`);
      setUnlockReason('');
      await loadKpiData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mở khóa KPI thất bại');
    }
  }

  async function onExportDept() {
    setError('');
    setNotice('');
    try {
      await exportDeptExcel(year, month);
      setNotice('Đã tải file Excel KPI phòng ban.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xuất Excel phòng ban thất bại');
    }
  }

  async function onExportCompany(monthly: boolean) {
    setError('');
    setNotice('');
    try {
      await exportCompanyExcel(year, monthly ? month : undefined);
      setNotice(`Đã tải file Excel KPI công ty ${monthly ? 'tháng' : 'năm'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xuất Excel công ty thất bại');
    }
  }

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24, display: 'grid', gap: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>KPI & Đánh giá</h1>
          <p style={{ margin: '4px 0 0', color: '#475569' }}>Xin chào {me?.full_name || 'User'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => router.push('/dashboard')} style={btnSecondary}>Dashboard</button>
          <button type="button" onClick={() => router.push('/tasks')} style={btnSecondary}>Task</button>
          <button type="button" onClick={() => router.push('/settings')} style={btnSecondary}>Cài đặt</button>
          <button type="button" onClick={() => router.push('/notifications')} style={btnSecondary}>Thông báo</button>
          <button type="button" onClick={() => router.push('/onboarding')} style={btnSecondary}>Onboarding</button>
          <button type="button" onClick={() => authStore.signOut().then(() => router.replace('/auth/login'))} style={btnSecondary}>Đăng xuất</button>
        </div>
      </header>

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Kỳ đánh giá</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input aria-label="Năm đánh giá" type="number" value={year} onChange={(e) => setYear(Number(e.target.value || now.getFullYear()))} style={inputStyle} />
          <input aria-label="Tháng đánh giá" type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value || now.getMonth() + 1))} style={inputStyle} />
          <button type="button" onClick={() => loadKpiData()} style={btnPrimary}>Tải dữ liệu</button>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: 18 }}>KPI cá nhân</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 }}>
          <Stat label="Điểm KPI" value={myKpi?.total_score ?? 0} />
          <Stat label="Xếp loại" value={myKpi?.grade ?? '-'} />
          <Stat label="Mục tiêu" value={myKpi?.target_score ?? 0} />
          <Stat label="TB phòng ban" value={compare?.dept_average ?? 0} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                <th style={{ padding: 8 }}>Tiêu chí</th>
                <th style={{ padding: 8 }}>Trọng số</th>
                <th style={{ padding: 8 }}>Điểm</th>
                <th style={{ padding: 8 }}>Điểm có trọng số</th>
              </tr>
            </thead>
            <tbody>
              {(myKpi?.breakdown || []).map((item) => (
                <tr key={item.criteria_id} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ padding: 8 }}>{item.name}</td>
                  <td style={{ padding: 8 }}>{item.weight}</td>
                  <td style={{ padding: 8 }}>{item.score}</td>
                  <td style={{ padding: 8 }}>{item.weighted_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Lịch sử 12 tháng gần nhất</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: 8 }}>
          {history.slice(0, 12).map((item) => (
            <article key={`${item.year}-${item.month}`} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
              <div style={{ color: '#64748b', fontSize: 12 }}>{item.month}/{item.year}</div>
              <div style={{ fontWeight: 700 }}>{item.total_score}</div>
            </article>
          ))}
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Cập nhật mục tiêu KPI</h2>
        <form onSubmit={onSetTarget} style={{ display: 'flex', gap: 8 }}>
          <input type="number" step="0.1" min={0} max={100} value={targetScore} onChange={(e) => setTargetScore(e.target.value)} style={inputStyle} />
          <button type="submit" disabled={loading} style={btnPrimary}>{loading ? 'Đang lưu...' : 'Lưu mục tiêu'}</button>
        </form>
      </section>

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Gửi khiếu nại KPI</h2>
        <form onSubmit={onCreateAppeal} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', gap: 8 }}>
          <input required value={appealCriteria} onChange={(e) => setAppealCriteria(e.target.value)} placeholder="Tiêu chí KPI" style={inputStyle} />
          <input required type="number" step="0.1" value={appealCurrentScore} onChange={(e) => setAppealCurrentScore(e.target.value)} placeholder="Điểm hiện tại" style={inputStyle} />
          <input required type="number" step="0.1" value={appealProposedScore} onChange={(e) => setAppealProposedScore(e.target.value)} placeholder="Điểm đề xuất" style={inputStyle} />
          <input required value={appealReason} onChange={(e) => setAppealReason(e.target.value)} placeholder="Lý do khiếu nại" style={inputStyle} />
          <button type="submit" disabled={loading} style={btnPrimary}>Gửi</button>
        </form>
      </section>

      {(me?.role === 'manager' || me?.role === 'ceo') ? (
        <section style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>KPI phòng ban</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 }}>
            <Stat label="Số nhân sự" value={deptSummary?.member_count ?? 0} />
            <Stat label="Điểm TB" value={deptSummary?.average_score ?? 0} />
            <Stat label="Mục tiêu phòng" value={deptSummary?.summary.target ?? 0} />
            <Stat label="Đạt/Tổng" value={`${(distribution?.excellent || 0) + (distribution?.good || 0) + (distribution?.pass || 0)}/${distribution?.total || 0}`} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                  <th style={{ padding: 8 }}>Hạng</th>
                  <th style={{ padding: 8 }}>Nhân viên</th>
                  <th style={{ padding: 8 }}>Điểm</th>
                  <th style={{ padding: 8 }}>Xếp loại</th>
                </tr>
              </thead>
              <tbody>
                {deptScores.map((row) => (
                  <tr key={row.user_id} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 8 }}>{row.rank}</td>
                    <td style={{ padding: 8 }}>{row.full_name}</td>
                    <td style={{ padding: 8 }}>{row.total_score}</td>
                    <td style={{ padding: 8 }}>{row.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                  <th style={{ padding: 8 }}>Top</th>
                  <th style={{ padding: 8 }}>Nhân viên</th>
                  <th style={{ padding: 8 }}>Điểm</th>
                </tr>
              </thead>
              <tbody>
                {deptRanking.slice(0, 5).map((item, index) => (
                  <tr key={item.user_id} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 8 }}>#{index + 1}</td>
                    <td style={{ padding: 8 }}>{item.full_name}</td>
                    <td style={{ padding: 8 }}>{item.total_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onExportDept} disabled={loading} style={btnSecondary}>Xuất Excel phòng ban</button>
          </div>
        </section>
      ) : null}

      {me?.role === 'manager' ? (
        <section style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Đề xuất điều chỉnh KPI (Manager)</h2>
          <form onSubmit={onCreateAdjustment} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 2fr auto', gap: 8 }}>
            <select value={adjustUserId} onChange={(e) => setAdjustUserId(e.target.value)} style={inputStyle}>
              {staff.map((item) => (
                <option key={item.id} value={item.id}>{item.full_name}</option>
              ))}
            </select>
            <input required value={adjustCriteria} onChange={(e) => setAdjustCriteria(e.target.value)} placeholder="Tiêu chí KPI" style={inputStyle} />
            <input required type="number" step="0.1" value={adjustProposedScore} onChange={(e) => setAdjustProposedScore(e.target.value)} placeholder="Điểm đề xuất" style={inputStyle} />
            <input required value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Lý do điều chỉnh" style={inputStyle} />
            <button type="submit" disabled={loading || !adjustUserId} style={btnPrimary}>Gửi</button>
          </form>
        </section>
      ) : null}

      {me?.role === 'manager' ? (
        <section style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Phản hồi khiếu nại KPI (Manager)</h2>
          <form onSubmit={onRespondAppeal} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr 1fr auto', gap: 8 }}>
            <input required value={appealIdToRespond} onChange={(e) => setAppealIdToRespond(e.target.value)} placeholder="Mã khiếu nại" style={inputStyle} />
            <select value={appealApprove} onChange={(e) => setAppealApprove(e.target.value)} style={inputStyle}>
              <option value="approve">Duyệt</option>
              <option value="reject">Từ chối</option>
            </select>
            <input required value={appealResponseText} onChange={(e) => setAppealResponseText(e.target.value)} placeholder="Phản hồi" style={inputStyle} />
            <input value={appealAdjustedScore} onChange={(e) => setAppealAdjustedScore(e.target.value)} type="number" step="0.1" placeholder="Điểm điều chỉnh" style={inputStyle} />
            <button type="submit" disabled={loading} style={btnPrimary}>Gửi</button>
          </form>
        </section>
      ) : null}

      {(me?.role === 'manager' || me?.role === 'ceo') ? (
        <section style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Lịch sử điều chỉnh KPI</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                  <th style={{ padding: 8 }}>Nhân viên</th>
                  <th style={{ padding: 8 }}>Tiêu chí</th>
                  <th style={{ padding: 8 }}>Điểm đề xuất</th>
                  <th style={{ padding: 8 }}>Trạng thái</th>
                  <th style={{ padding: 8 }}>Người duyệt</th>
                </tr>
              </thead>
              <tbody>
                {adjustmentHistory.map((item) => (
                  <tr key={item.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 8 }}>{item.staff_name}</td>
                    <td style={{ padding: 8 }}>{item.criteria_name}</td>
                    <td style={{ padding: 8 }}>{item.proposed_score}</td>
                    <td style={{ padding: 8 }}>{item.status}</td>
                    <td style={{ padding: 8 }}>{item.approver || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {me?.role === 'ceo' ? (
        <section style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Phê duyệt điều chỉnh KPI (CEO)</h2>
          <form onSubmit={onReviewAdjustment} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 2fr auto', gap: 8 }}>
            <input required value={reviewAdjId} onChange={(e) => setReviewAdjId(e.target.value)} placeholder="Mã yêu cầu điều chỉnh" style={inputStyle} />
            <select value={reviewApprove} onChange={(e) => setReviewApprove(e.target.value)} style={inputStyle}>
              <option value="approve">Duyệt</option>
              <option value="reject">Từ chối</option>
            </select>
            <input value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Ghi chú" style={inputStyle} />
            <button type="submit" disabled={loading} style={btnPrimary}>Xử lý</button>
          </form>
        </section>
      ) : null}

      {me?.role === 'ceo' ? (
        <section style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Chốt & mở khóa KPI (CEO)</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onFinalizeKpi} disabled={loading} style={btnPrimary}>Chốt KPI tháng</button>
            <button type="button" onClick={() => onExportCompany(true)} disabled={loading} style={btnSecondary}>Xuất Excel công ty (tháng)</button>
            <button type="button" onClick={() => onExportCompany(false)} disabled={loading} style={btnSecondary}>Xuất Excel công ty (năm)</button>
          </div>
          <form onSubmit={onUnlockKpi} style={{ display: 'grid', gridTemplateColumns: '2fr auto', gap: 8 }}>
            <input required value={unlockReason} onChange={(e) => setUnlockReason(e.target.value)} placeholder="Lý do mở khóa KPI" style={inputStyle} />
            <button type="submit" disabled={loading} style={btnPrimary}>Mở khóa KPI</button>
          </form>
        </section>
      ) : null}

      {error ? <p style={{ color: '#b91c1c', margin: 0 }}>{error}</p> : null}
      {notice ? <p style={{ color: '#166534', margin: 0 }}>{notice}</p> : null}
    </main>
  );
}

const cardStyle: CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: 16,
  display: 'grid',
  gap: 10
};

const inputStyle: CSSProperties = {
  padding: 8,
  border: '1px solid #cbd5e1',
  borderRadius: 6
};

const btnPrimary: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 6,
  border: 'none',
  background: '#2563eb',
  color: '#fff'
};

const btnSecondary: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  background: '#fff'
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <article style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 22 }}>{value}</div>
    </article>
  );
}
