'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Member } from '@/lib/utils';

export interface Notice {
  id: string;
  member_id: string | null;
  title: string;
  content: string | null;
  bg_color: string;
  text_color: string;
  is_active: boolean;
  created_at: string;
}

// 배경색 23가지
const BG_COLORS = [
  '#FFF7ED', '#FEF3C7', '#FEF9C3', '#ECFCCB', '#DCFCE7', '#D1FAE5',
  '#CCFBF1', '#CFFAFE', '#E0F2FE', '#DBEAFE', '#E0E7FF', '#EDE9FE',
  '#F3E8FF', '#FAE8FF', '#FCE7F3', '#FFE4E6', '#FEE2E2', '#FFEDD5',
  '#F5F5F4', '#F3F4F6', '#1F2937', '#065F46', '#7C2D12',
];
// 그라데이션 4가지
const BG_GRADIENTS = [
  'linear-gradient(135deg,#FFDEE9,#B5FFFC)',
  'linear-gradient(135deg,#a8edea,#fed6e3)',
  'linear-gradient(135deg,#fbc2eb,#a6c1ee)',
  'linear-gradient(135deg,#667eea,#764ba2)',
];
// 글씨색 18가지
const TEXT_COLORS = [
  '#111827', '#374151', '#6B7280', '#9CA3AF', '#FFFFFF', '#7C2D12',
  '#92400E', '#B45309', '#166534', '#047857', '#0F766E', '#0369A1',
  '#1D4ED8', '#4338CA', '#6D28D9', '#A21CAF', '#BE185D', '#B91C1C',
];

interface Props {
  members: Member[];
  onClose: () => void;
}

export default function NoticeManager({ members, onClose }: Props) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 폼 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [memberId, setMemberId] = useState<string>(''); // '' = 전체 공지
  const [bgColor, setBgColor] = useState('#FEF3C7');
  const [textColor, setTextColor] = useState('#111827');
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/notices');
    const json = await res.json();
    setNotices(json.notices || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setMemberId('');
    setBgColor('#FEF3C7');
    setTextColor('#111827');
    setIsActive(true);
  };

  const startEdit = (n: Notice) => {
    setEditingId(n.id);
    setTitle(n.title);
    setContent(n.content || '');
    setMemberId(n.member_id || '');
    setBgColor(n.bg_color);
    setTextColor(n.text_color);
    setIsActive(n.is_active);
  };

  const save = async () => {
    if (!title.trim()) { alert('배너 문구를 입력해주세요'); return; }
    setSaving(true);
    const payload = {
      title: title.trim(),
      content: content.trim() || null,
      member_id: memberId || null,
      bg_color: bgColor,
      text_color: textColor,
      is_active: isActive,
    };
    const res = editingId
      ? await fetch('/api/notices', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...payload }) })
      : await fetch('/api/notices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setSaving(false);
    if (!res.ok) { const j = await res.json(); alert('저장 실패: ' + (j.error || res.status)); return; }
    resetForm();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('이 공지를 삭제할까요?')) return;
    await fetch(`/api/notices?id=${id}`, { method: 'DELETE' });
    if (editingId === id) resetForm();
    load();
  };

  const toggleActive = async (n: Notice) => {
    await fetch('/api/notices', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: n.id, is_active: !n.is_active }),
    });
    load();
  };

  const memberName = (mid: string | null) =>
    mid ? (members.find((m) => m.id === mid)?.name || '알 수 없음') : '전체';

  // 미리보기 문구 ("이름님" 치환 예시)
  const previewText = title.replace(/이름님/g, `${memberId ? memberName(memberId) : '회원'}님`);

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.headerRow}>
          <h2 style={S.title}>📢 공지 배너 관리</h2>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* ===== 작성/수정 폼 ===== */}
        <div style={S.formBox}>
          <label style={S.label}>배너 문구 * <span style={S.hint}>("이름님"이라고 쓰면 회원 이름으로 자동 치환됩니다)</span></label>
          <input style={S.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예) 이름님, 이번 주 수업 시간이 변경되었어요!" />

          <label style={S.label}>공지 내용 (배너를 누르면 팝업으로 표시)</label>
          <textarea style={{ ...S.input, minHeight: 70 }} value={content} onChange={(e) => setContent(e.target.value)} placeholder="자세한 내용을 입력해주세요" />

          <label style={S.label}>대상</label>
          <select style={S.input} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">전체 회원</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <label style={S.label}>배경색</label>
          <div style={S.swatchGrid}>
            {[...BG_COLORS, ...BG_GRADIENTS].map((c) => (
              <button
                key={c}
                style={{ ...S.swatch, background: c, outline: bgColor === c ? '3px solid #111827' : '1px solid #E5E7EB' }}
                onClick={() => setBgColor(c)}
                aria-label={c}
              />
            ))}
          </div>

          <label style={S.label}>글씨색</label>
          <div style={S.swatchGrid}>
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                style={{ ...S.swatch, background: c, outline: textColor === c ? '3px solid #F59E0B' : '1px solid #E5E7EB' }}
                onClick={() => setTextColor(c)}
                aria-label={c}
              />
            ))}
          </div>

          {/* 미리보기 */}
          <label style={S.label}>미리보기</label>
          <div style={{ ...S.preview, background: bgColor, color: textColor }}>
            📢 {previewText || '배너 문구를 입력하면 여기에 표시됩니다'}
          </div>

          <div style={S.toggleRow} onClick={() => setIsActive(!isActive)}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>공지 게시 (끄면 회원에게 안 보임)</span>
            <div style={{ ...S.toggle, background: isActive ? '#10B981' : '#D1D5DB' }}>
              <div style={{ ...S.knob, transform: isActive ? 'translateX(20px)' : 'translateX(0)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {editingId && <button style={S.cancelBtn} onClick={resetForm}>새로 작성</button>}
            <button style={S.saveBtn} onClick={save} disabled={saving}>
              {saving ? '저장 중…' : editingId ? '수정 저장' : '공지 등록'}
            </button>
          </div>
        </div>

        {/* ===== 공지 목록 ===== */}
        <h3 style={S.listTitle}>등록된 공지 {notices.length ? `(${notices.length})` : ''}</h3>
        {loading && <div style={S.empty}>불러오는 중…</div>}
        {!loading && notices.length === 0 && <div style={S.empty}>등록된 공지가 없습니다.</div>}
        {notices.map((n) => (
          <div key={n.id} style={S.noticeItem}>
            <div style={{ ...S.noticeChip, background: n.bg_color, color: n.text_color, opacity: n.is_active ? 1 : 0.4 }}>
              📢 {n.title}
            </div>
            <div style={S.noticeMeta}>
              대상: {memberName(n.member_id)} · {n.is_active ? '게시 중' : '숨김'}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={S.smallBtn} onClick={() => toggleActive(n)}>{n.is_active ? '숨기기' : '게시'}</button>
              <button style={S.smallBtn} onClick={() => startEdit(n)}>수정</button>
              <button style={{ ...S.smallBtn, background: '#FEF2F2', color: '#B91C1C' }} onClick={() => remove(n.id)}>삭제</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  modal: { background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto' },
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 19, fontWeight: 700, margin: 0 },
  closeBtn: { border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: '#6B7280' },
  formBox: { background: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#4B5563', marginBottom: 4, marginTop: 10 },
  hint: { fontWeight: 400, color: '#9CA3AF', fontSize: 12 },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', background: '#fff' },
  swatchGrid: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  swatch: { width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', padding: 0 },
  preview: { borderRadius: 10, padding: '12px 14px', fontSize: 14, fontWeight: 600 },
  toggleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, cursor: 'pointer' },
  toggle: { width: 44, height: 24, borderRadius: 12, position: 'relative', transition: 'background 0.2s' },
  knob: { width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: 2, transition: 'transform 0.2s' },
  cancelBtn: { padding: '10px 14px', borderRadius: 10, border: '1px solid #D1D5DB', background: '#fff', fontSize: 14, cursor: 'pointer' },
  saveBtn: { flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#111827', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  listTitle: { fontSize: 15, fontWeight: 700, margin: '4px 0 8px' },
  empty: { color: '#9CA3AF', fontSize: 14, padding: '8px 0' },
  noticeItem: { borderBottom: '1px solid #F3F4F6', padding: '10px 0' },
  noticeChip: { borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 600, marginBottom: 6 },
  noticeMeta: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  smallBtn: { border: 'none', background: '#F3F4F6', borderRadius: 6, padding: '4px 10px', fontSize: 13, cursor: 'pointer' },
};
