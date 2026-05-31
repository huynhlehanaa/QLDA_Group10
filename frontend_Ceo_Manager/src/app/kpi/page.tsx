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
type DeptOption = { id: string; name: string };

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <article style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 22 }}>{value}</div>
    </article>
  );
}

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

  // Khởi tạo ngày mặc định an toàn cho Server & Client SSR
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(6);
  const [ready, setReady] = useState(false);

  // State kiểm soát Hydration Mismatch
  const [hasMounted, setHasMounted] = useState(false);

  // States dữ liệu hệ thống
  const [myKpi, setMyKpi] = useState<MyKpiResult | null>(null);
  const [history, setHistory] = useState<KpiHistoryItem[]>([]);
  const [compare, setCompare] = useState<KpiCompareResult | null>(null);
  const [deptSummary, setDeptSummary] = useState<DeptKpiSummary | null>(null);
  const [deptScores, setDeptScores] = useState<DeptScoreItem[]>([]);
  const [deptRanking, setDeptRanking] = useState<DeptScoreItem[]>([]);
  const [distribution, setDistribution] = useState<GradeDistribution | null>(null);
  const [adjustmentHistory, setAdjustmentHistory] = useState<KpiAdjustmentHistoryItem[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  // States Form tác vụ cá nhân/Manager
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

  // States Form Giao tiêu chí chiến lược cho CEO
  const [newKpiTitle, setNewKpiTitle] = useState('');
  const [newKpiDesc, setNewKpiDesc] = useState('');
  const [newKpiWeight, setNewKpiWeight] = useState('20');
  const [newKpiFormulaType, setNewKpiFormulaType] = useState('manual');

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Kích hoạt khi Client hoàn thành Mount dữ liệu tĩnh
  useEffect(() => {
    setHasMounted(true);
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  }, []);

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
  }, [accessToken, fetchCompare, fetchDeptScores, fetchDeptRanking, fetchDeptSummary, fetchDistribution, fetchHistory, fetchKpi, fetchAdjustmentHistory, me?.role, month, year]);

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

      if (profile.role === 'ceo') {
        try {
          const deptData = await apiRequest<DeptOption[]>('/api/v1/departments', { token: accessToken });
          setDepartments(deptData);
          if (deptData[0]) setSelectedDeptId(deptData[0].id);
        } catch {
          setDepartments([]);
        }
      }

      setReady(true);
    }).catch(() => router.replace('/auth/login'));
  }, [accessToken, router]);

  useEffect(() => {
    if (!ready || !hasMounted) return;
    loadKpiData().catch((err) => {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu KPI');
    });
  }, [ready, hasMounted, year, month, loadKpiData]);

  // Ép kiểu trả về Promise<void> rõ ràng cho các sự kiện Form Submit hoặc Button Click nếu hook gốc yêu cầu
  async function onSetTarget(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(''); setNotice('');
    try {
      await apiRequest('/api/v1/kpi/me/target', {
        method: 'POST',
        token: accessToken,
        body: { year, month, target_score: Number(targetScore) }
      });
      setNotice('Đã cập nhật mục tiêu KPI cá nhân.');
      await loadKpiData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật mục tiêu thất bại');
    }
  }

  async function onCreateAppeal(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(''); setNotice('');
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
      setAppealCriteria(''); setAppealCurrentScore('0'); setAppealProposedScore('0'); setAppealReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gửi khiếu nại thất bại');
    }
  }

  async function onCreateAdjustment(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(''); setNotice('');
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
      setAdjustCriteria(''); setAdjustProposedScore('0'); setAdjustReason('');
      await loadKpiData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gửi điều chỉnh thất bại');
    }
  }

  async function onRespondAppeal(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(''); setNotice('');
    try {
      await respondAppeal(appealIdToRespond, {
        approved: appealApprove === 'approve',
        response: appealResponseText,
        adjusted_score: appealApprove === 'approve' && appealAdjustedScore !== '' ? Number(appealAdjustedScore) : undefined
      });
      setNotice('Đã phản hồi khiếu nại KPI.');
      setAppealIdToRespond(''); setAppealResponseText(''); setAppealAdjustedScore('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Phản hồi khiếu nại thất bại');
    }
  }

  async function onReviewAdjustment(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(''); setNotice('');
    try {
      await reviewAdjustment(reviewAdjId, {
        approved: reviewApprove === 'approve',
        comment: reviewComment || undefined
      });
      setNotice('Đã xử lý yêu cầu điều chỉnh KPI.');
      setReviewAdjId(''); setReviewComment('');
      await loadKpiData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duyệt điều chỉnh thất bại');
    }
  }

  async function onCreateNewKpiCriteria(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(''); setNotice('');
    try {
      await apiRequest('/api/v1/kpi/criteria', {
        method: 'POST',
        token: accessToken,
        body: {
          name: newKpiTitle.trim(),
          description: newKpiDesc.trim() || null,
          weight: Number(newKpiWeight), 
          is_global: true, 
          formula_type: newKpiFormulaType 
        }
      });
      setNotice(`Đã ban hành thành công tiêu chí KPI mới toàn công ty: "${newKpiTitle}".`);
      setNewKpiTitle(''); setNewKpiDesc('');
      await loadKpiData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khởi tạo tiêu chí KPI thất bại');
    }
  }

  async function handleQuickReview(id: string, approveStatus: boolean): Promise<void> {
    setError(''); setNotice('');
    try {
      await reviewAdjustment(id, {
        approved: approveStatus,
        comment: approveStatus ? "CEO Duyệt nhanh" : "CEO Từ chối"
      });
      setNotice(`Đã cập nhật trạng thái yêu cầu ${id}.`);
      await loadKpiData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xử lý thất bại');
    }
  }

  const colorCfg: Record<string, string> = {
    "Xuất sắc": "#e2a100", "A": "#e2a100",
    "Tốt": "#10b981", "B": "#10b981",
    "Đạt": "#3b82f6", "C": "#3b82f6",
    "Chưa đạt": "#ef4444", "D": "#ef4444"
  };

  // 🛠️ CHUẨN HÓA KIỂU HÀM TRẢ VỀ: Trả về một Promise<void> đồng bộ chữ ký hàm mong đợi
  async function onFinalizeKpi(): Promise<void> {
    setError(''); setNotice('');
    try {
      await apiRequest('/api/v1/kpi/finalize', {
        method: 'POST',
        token: accessToken,
        body: { year, month }
      });
      setNotice(`Đã khóa số và chốt điểm KPI toàn công ty tháng ${month}/${year}.`);
      await loadKpiData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chốt KPI thất bại');
    }
  }

  // 🛠️ CHUẨN HÓA KIỂU HÀM TRẢ VỀ: Đảm bảo khớp cấu trúc onSubmit Promise<void>
  async function onUnlockKpi(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(''); setNotice('');
    try {
      await apiRequest('/api/v1/kpi/unlock', {
        method: 'POST',
        token: accessToken,
        body: { year, month, reason: unlockReason }
      });
      setNotice(`Đã mở khóa sổ chỉnh sửa KPI tháng ${month}/${year}.`);
      setUnlockReason('');
      await loadKpiData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mở khóa KPI thất bại');
    }
  }

  function onExportCompany(monthly: boolean): void {
    setError(''); setNotice('');
    exportCompanyExcel(year, monthly ? month : undefined)
      .then(() => setNotice(`Đã tải file Excel KPI công ty.`))
      .catch((err) => setError(err instanceof Error ? err.message : 'Xuất Excel công ty thất bại'));
  }

  function onExportDept(): void {
    setError(''); setNotice('');
    exportDeptExcel(year, month)
      .then(() => setNotice('Đã tải file Excel KPI phòng ban.'))
      .catch((err) => setError(err instanceof Error ? err.message : 'Xuất Excel phòng ban thất bại'));
  }

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', display: 'grid', gap: '16px' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>KPI & Đánh giá</h1>
          <p style={{ margin: '4px 0 0', color: '#475569' }}>
            Xin chào {hasMounted && me?.full_name ? <strong>{me.full_name}</strong> : 'User'} 
            {hasMounted && me?.role ? ` (${me.role.toUpperCase()})` : ''}
          </p>
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
        <h2 style={{ margin: 0, fontSize: 18 }}>Bộ lọc dữ liệu hệ thống</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input aria-label="Năm đánh giá" type="number" value={year} onChange={(e) => setYear(Number(e.target.value || 2026))} style={inputStyle} />
          <input aria-label="Tháng đánh giá" type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value || 6))} style={inputStyle} />
          
          {hasMounted && me?.role === 'ceo' && (
            <select value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)} style={inputStyle}>
              <option value="">-- Tất cả các phòng --</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          <button type="button" onClick={() => { loadKpiData().catch(() => {}); }} style={btnPrimary}>Tải lại dữ liệu</button>
        </div>
      </section>

      {hasMounted && me?.role === 'ceo' && (
        <section style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#1e3a8a' }}>🎯 Ban hành tiêu chí KPI mới toàn công ty (CEO)</h2>
          <form onSubmit={onCreateNewKpiCriteria} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 0.6fr 1.5fr auto', gap: 8, alignItems: 'end' }}>
            <input required value={newKpiTitle} onChange={(e) => setNewKpiTitle(e.target.value)} placeholder="Tên tiêu chí (Vd: Đúng hạn công việc)" style={inputStyle} />
            <input required value={newKpiDesc} onChange={(e) => setNewKpiDesc(e.target.value)} placeholder="Mô tả tiêu chuẩn tính điểm" style={inputStyle} />
            <input required type="number" min={1} max={100} value={newKpiWeight} onChange={(e) => setNewKpiWeight(e.target.value)} placeholder="Trọng số (1 - 100)" style={inputStyle} />
            
            <select value={newKpiFormulaType} onChange={(e) => setNewKpiFormulaType(e.target.value)} style={inputStyle}>
              <option value="manual">Đánh giá thủ công (manual)</option>
              <option value="on_time_rate">Tỷ lệ hoàn thành đúng hạn (on_time_rate)</option>
              <option value="completion_rate">Tỷ lệ lượng công việc xong (completion_rate)</option>
              <option value="quality_rate">Tỷ lệ chất lượng kiểm duyệt (quality_rate)</option>
            </select>
            <button type="submit" disabled={loading} style={btnPrimary}>Ban hành</button>
          </form>
        </section>
      )}

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: 18 }}>KPI cá nhân người đăng nhập</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 }}>
          <Stat label="Điểm KPI" value={myKpi?.total_score ?? 0} />
          <Stat label="Xếp loại" value={myKpi?.grade ?? '-'} />
          <Stat label="Mục tiêu đặt ra" value={myKpi?.target_score ?? 0} />
          <Stat label="TB phòng ban" value={compare?.dept_average ?? 0} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                <th style={{ padding: 8 }}>Tiêu chí</th>
                <th style={{ padding: 8 }}>Trọng số</th>
                <th style={{ padding: 8 }}>Điểm số</th>
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
        <h2 style={{ margin: 0, fontSize: 18 }}>Lịch sử hiệu suất 12 tháng gần nhất</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: 8 }}>
          {history.slice(0, 12).map((item) => (
            <article key={`${item.year}-${item.month}`} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
              <div style={{ color: '#64748b', fontSize: 12 }}>{item.month}/{item.year}</div>
              <div style={{ fontWeight: 700 }}>{item.total_score}đ</div>
            </article>
          ))}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        <section style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Cập nhật mục tiêu KPI cá nhân</h2>
          <form onSubmit={onSetTarget} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="number" step="0.1" min={0} max={100} value={targetScore} onChange={(e) => setTargetScore(e.target.value)} style={inputStyle} />
            <button type="submit" disabled={loading} style={btnPrimary}>Lưu mục tiêu</button>
          </form>
        </section>

        <section style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Gửi đơn khiếu nại điểm số KPI</h2>
          <form onSubmit={onCreateAppeal} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', gap: 8 }}>
            <input required value={appealCriteria} onChange={(e) => setAppealCriteria(e.target.value)} placeholder="Tiêu chí" style={inputStyle} />
            <input required type="number" step="0.1" value={appealCurrentScore} onChange={(e) => setAppealCurrentScore(e.target.value)} placeholder="Điểm cũ" style={inputStyle} />
            <input required type="number" step="0.1" value={appealProposedScore} onChange={(e) => setAppealProposedScore(e.target.value)} placeholder="Đề xuất" style={inputStyle} />
            <input required value={appealReason} onChange={(e) => setAppealReason(e.target.value)} placeholder="Lý do" style={inputStyle} />
            <button type="submit" disabled={loading} style={btnPrimary}>Gửi đơn</button>
          </form>
        </section>
      </div>

      {hasMounted && (me?.role === 'manager' || me?.role === 'ceo') ? (
        <section style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>📈 Thống kê & Phân tích KPI Vận hành</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 }}>
            <Stat label="Tổng số nhân sự" value={deptSummary?.member_count ?? 0} />
            <Stat label="Điểm trung bình" value={deptSummary?.average_score ?? 0} />
            <Stat label="Mục tiêu đề ra" value={deptSummary?.summary.target ?? 0} />
            <Stat label="Tỷ lệ đạt chỉ tiêu" value={`${(distribution?.excellent || 0) + (distribution?.good || 0) + (distribution?.pass || 0)}/${distribution?.total || 0}`} />
          </div>

          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', margin: '8px 0', display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap' }}>
            {(() => {
              const exc = distribution?.excellent || 0;
              const gd = distribution?.good || 0;
              const ps = distribution?.pass || 0;
              const fl = distribution?.fail || 0;
              const totalCount = distribution?.total || 1;
              const r = 50, cx = 60, cy = 60, circumference = 2 * Math.PI * r;
              
              const segments = [
                { label: "Xuất sắc", count: exc, color: "#e2a100" },
                { label: "Tốt", count: gd, color: "#10b981" },
                { label: "Đạt", count: ps, color: "#3b82f6" },
                { label: "Chưa đạt", count: fl, color: "#ef4444" }
              ].filter(s => s.count > 0);

              let currentOffset = 0;
              return (
                <>
                  <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                    <svg width="120" height="120" viewBox="0 0 120 120">
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="16" />
                      {segments.map((seg) => {
                        const pct = seg.count / totalCount;
                        const strokeDash = pct * circumference;
                        const strokeOffset = currentOffset * circumference;
                        currentOffset += pct;
                        return (
                          <circle 
                            key={seg.label}
                            cx={cx} cy={cy} r={r} fill="none" 
                            stroke={seg.color} strokeWidth="16"
                            strokeDasharray={`${strokeDash} ${circumference}`}
                            strokeDashoffset={-strokeOffset}
                            transform="rotate(-90 60 60)"
                          />
                        );
                      })}
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#64748b' }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{distribution?.total || 0}</span> nhân sự
                    </div>
                  </div>
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, minWidth: 200 }}>
                    {[
                      { label: "Xuất sắc", count: exc, color: "#e2a100" },
                      { label: "Tốt", count: gd, color: "#10b981" },
                      { label: "Đạt", count: ps, color: "#3b82f6" },
                      { label: "Chưa đạt", count: fl, color: "#ef4444" }
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color }} />
                        <span style={{ color: '#475569' }}>{item.label}: <strong>{item.count}</strong> ({Math.round((item.count / totalCount) * 100)}%)</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 10 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Bảng điểm tổng quan thành viên</h3>
              <div style={{ overflowX: 'auto', maxHeight: 300, border: '1px solid #e2e8f0', borderRadius: 6 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>
                    <tr style={{ textAlign: 'left' }}>
                      <th style={{ padding: 8 }}>Hạng</th>
                      <th style={{ padding: 8 }}>Nhân viên</th>
                      <th style={{ padding: 8 }}>Điểm số</th>
                      <th style={{ padding: 8 }}>Xếp loại</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptScores.map((row) => (
                      <tr key={row.user_id} style={{ borderTop: '1px solid #e2e8f0' }}>
                        <td style={{ padding: 8 }}>{row.rank}</td>
                        <td style={{ padding: 8 }}>{row.full_name}</td>
                        <td style={{ padding: 8 }}>{row.total_score}</td>
                        <td style={{ padding: 8, fontWeight: 600, color: colorCfg[row.grade] || '#334155' }}>{row.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Top 5 Nhân Sự Xuất Sắc Nhất 🥇</h3>
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                      <th style={{ padding: 8 }}>Vinh danh</th>
                      <th style={{ padding: 8 }}>Nhân viên</th>
                      <th style={{ padding: 8 }}>Điểm số</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptRanking.slice(0, 5).map((item, index) => {
                      const medals = index === 0 ? "🥇 Vàng" : index === 1 ? "🥈 Bạc" : index === 2 ? "🥉 Đồng" : `#${index + 1}`;
                      return (
                        <tr key={item.user_id} style={{ borderTop: '1px solid #e2e8f0', background: index < 3 ? 'rgba(245, 158, 11, 0.02)' : 'transparent' }}>
                          <td style={{ padding: 8, fontWeight: index < 3 ? 700 : 400, color: index === 0 ? '#b45309' : '#475569' }}>{medals}</td>
                          <td style={{ padding: 8, fontWeight: 600 }}>{item.full_name}</td>
                          <td style={{ padding: 8, fontWeight: 700, color: '#2563eb' }}>{item.total_score}đ</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" onClick={onExportDept} style={btnSecondary}>Xuất Excel phòng ban</button>
          </div>
        </section>
      )}

      {hasMounted && me?.role === 'manager' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: 17 }}>Đề xuất điều chỉnh KPI (Manager)</h2>
            <form onSubmit={onCreateAdjustment} style={{ display: 'grid', gap: 8 }}>
              <select value={adjustUserId} onChange={(e) => setAdjustUserId(e.target.value)} style={inputStyle}>
                {staff.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}
              </select>
              <input required value={adjustCriteria} onChange={(e) => setAdjustCriteria(e.target.value)} placeholder="Tiêu chí KPI" style={inputStyle} />
              <input required type="number" step="0.1" value={adjustProposedScore} onChange={(e) => setAdjustProposedScore(e.target.value)} placeholder="Điểm số đề xuất mới" style={inputStyle} />
              <input required value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Lý do điều chỉnh cụ thể" style={inputStyle} />
              <button type="submit" disabled={loading || !adjustUserId} style={btnPrimary}>Gửi phê duyệt lên CEO</button>
            </form>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: 17 }}>Phản hồi khiếu nại của Nhân viên (Manager)</h2>
            <form onSubmit={onRespondAppeal} style={{ display: 'grid', gap: 8 }}>
              <input required value={appealIdToRespond} onChange={(e) => setAppealIdToRespond(e.target.value)} placeholder="Mã khiếu nại (ID)" style={inputStyle} />
              <select value={appealApprove} onChange={(e) => setAppealApprove(e.target.value)} style={inputStyle}>
                <option value="approve">Chấp thuận đơn</option>
                <option value="reject">Từ chối đơn</option>
              </select>
              <input required value={appealResponseText} onChange={(e) => setAppealResponseText(e.target.value)} placeholder="Nội dung phản hồi" style={inputStyle} />
              <input value={appealAdjustedScore} onChange={(e) => setAppealAdjustedScore(e.target.value)} type="number" step="0.1" placeholder="Điểm chốt" style={inputStyle} />
              <button type="submit" disabled={loading} style={btnPrimary}>Gửi kết quả giải quyết</button>
            </form>
          </section>
        </div>
      )}

      {hasMounted && (me?.role === 'manager' || me?.role === 'ceo') && (
        <section style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>📜 Danh sách & Nhật ký xử lý điều chỉnh điểm KPI</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                  <th style={{ padding: 8 }}>Nhân viên</th>
                  <th style={{ padding: 8 }}>Tiêu chí</th>
                  <th style={{ padding: 8 }}>Điểm đề xuất</th>
                  <th style={{ padding: 8 }}>Trạng thái</th>
                  <th style={{ padding: 8 }}>Người duyệt</th>
                  {me.role === 'ceo' && <th style={{ padding: 8, textAlign: 'center' }}>Thao tác nhanh (CEO)</th>}
                </tr>
              </thead>
              <tbody>
                {adjustmentHistory.map((item) => (
                  <tr key={item.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 8 }}>{item.staff_name}</td>
                    <td style={{ padding: 8 }}>{item.criteria_name}</td>
                    <td style={{ padding: 8 }}>{item.proposed_score}</td>
                    <td style={{ padding: 8 }}>
                      <span style={{ 
                        padding: '2px 6px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                        backgroundColor: item.status === 'pending' ? '#fef3c7' : item.status === 'approved' ? '#d1fae5' : '#fee2e2',
                        color: item.status === 'pending' ? '#d97706' : item.status === 'approved' ? '#065f46' : '#991b1b'
                      }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: 8 }}>{item.approver || '-'}</td>
                    {me.role === 'ceo' && (
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        {item.status === 'pending' || item.status === 'Pending' ? (
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            <button type="button" onClick={() => { handleQuickReview(item.id, true).catch(() => {}); }} style={{ padding: '3px 8px', fontSize: 11, background: '#10b981', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Duyệt</button>
                            <button type="button" onClick={() => { handleQuickReview(item.id, false).catch(() => {}); }} style={{ padding: '3px 8px', fontSize: 11, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Bác bỏ</button>
                          </div>
                        ) : <span style={{ fontSize: 12, color: '#94a3b8' }}>Đã xử lý</span>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {hasMounted && me?.role === 'ceo' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: 18, color: '#b91c1c' }}>🔒 Quản lý Đóng/Mở sổ chu kỳ đánh giá (CEO Only)</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              {/* Bọc callback để ép kiểu Promise trả về void an toàn cho onClick */}
              <button type="button" onClick={() => { onFinalizeKpi().catch(() => {}); }} disabled={loading} style={{ ...btnPrimary, background: '#b91c1c' }}>Chốt sổ KPI toàn công ty</button>
              <button type="button" onClick={() => onExportCompany(true)} disabled={loading} style={btnSecondary}>Xuất Excel tổng (tháng)</button>
              <button type="button" onClick={() => onExportCompany(false)} disabled={loading} style={btnSecondary}>Xuất Excel tổng (năm)</button>
            </div>
            {/* Sử dụng trực tiếp hàm onSubmit bất đồng bộ đã chuẩn hóa chữ ký */}
            <form onSubmit={onUnlockKpi} style={{ display: 'grid', gridTemplateColumns: '2fr auto', gap: 8, alignItems: 'center' }}>
              <input required value={unlockReason} onChange={(e) => setUnlockReason(e.target.value)} placeholder="Nhập lý do bắt buộc giải trình..." style={inputStyle} />
              <button type="submit" disabled={loading} style={{ ...btnPrimary, background: '#475569' }}>Mở khóa sổ</button>
            </form>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: 18 }}>🔍 Biểu mẫu xử lý thủ công (Theo mã ID)</h2>
            <form onSubmit={onReviewAdjustment} style={{ display: 'grid', gap: 8 }}>
              <input required value={reviewAdjId} onChange={(e) => setReviewAdjId(e.target.value)} placeholder="Dán mã ID yêu cầu cần xử lý..." style={inputStyle} />
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={reviewApprove} onChange={(e) => setReviewApprove(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                  <option value="approve">Phê chuẩn</option>
                  <option value="reject">Bác bỏ</option>
                </select>
                <input value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Ghi chú phản hồi..." style={{ ...inputStyle, flex: 2 }} />
                <button type="submit" disabled={loading} style={btnPrimary}>Thực thi</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {error ? <p style={{ color: '#b91c1c', fontWeight: 600, margin: 0 }}>❌ Lỗi hệ thống: {error}</p> : null}
      {notice ? <p style={{ color: '#166534', fontWeight: 600, margin: 0 }}>🎉 Thông báo: {notice}</p> : null}
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
  padding: '8px 12px',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  outline: 'none',
  fontSize: 14
};

const btnPrimary: CSSProperties = {
  padding: '9px 16px',
  borderRadius: 6,
  border: 'none',
  background: '#2563eb',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 14
};

const btnSecondary: CSSProperties = {
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#334155',
  cursor: 'pointer',
  fontSize: 14
};