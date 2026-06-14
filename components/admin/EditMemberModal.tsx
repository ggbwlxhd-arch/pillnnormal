'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Member } from '@/lib/utils';

export default function EditMemberModal({
  member, onClose, onSaved,
}: {
  member: Member;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: member.name,
    phone: member.phone || '',
    notes: member.notes || '',
    is_pregnant: member.is_pregnant,
    edd: member.edd || '',
    notify_channel: member.notify_channel,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.name.trim()) { setError('이름을 입력해주세요'); return; }
    if (form.is_pregnant && !form.edd) { setError('출산예정일을 입력해주세요'); return; }
    setSaving(true);
    const { error: err } = await supabase.from('members').update({
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
      is_pregnant: form.is_pregnant,
      edd: form.is_pregnant ? form.edd : null,
      notify_channel: form.notify_channel,
    }).eq('id', member.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
      <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', position: 'sticky', top: 0, background: '#fff' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>회원 정보 수정</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', border: 'none', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <Field label="이름 *">
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="홍길동" style={inputStyle} />
          </Field>

          <Field label="연락처">
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="010-0000-0000" style={inputStyle} />
          </Field>

          <Field label="운동 목적">
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="예) 출산 후 코어 회복, 허리 통증 개선" rows={3} style={{ ...inputStyle, resize: 'none' }} />
          </Field>

          {/* 발송 채널 */}
          <Field label="발송 채널">
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => set('notify_channel', 'kakao')} style={{
                flex: 1, padding: 12, borderRadius: 14, border: `2px solid ${form.notify_channel === 'kakao' ? '#FEE500' : '#E5E7EB'}`,
                background: form.notify_channel === 'kakao' ? '#FFFDE7' : '#fff', fontWeight: 700, fontSize: 13,
                color: form.notify_channel === 'kakao' ? '#856404' : '#9CA3AF', cursor: 'pointer',
              }}>💬 카카오톡</button>
              <button onClick={() => set('notify_channel', 'sms')} style={{
                flex: 1, padding: 12, borderRadius: 14, border: `2px solid ${form.notify_channel === 'sms' ? '#374151' : '#E5E7EB'}`,
                background: form.notify_channel === 'sms' ? '#F9FAFB' : '#fff', fontWeight: 700, fontSize: 13,
                color: form.notify_channel === 'sms' ? '#374151' : '#9CA3AF', cursor: 'pointer',
              }}>📱 문자(SMS)</button>
            </div>
          </Field>

          {/* 임산부 토글 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F9FAFB', borderRadius: 14, padding: '14px 16px' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>임산부 회원</p>
              <p style={{ fontSize: 12, color: '#9CA3AF' }}>
                {form.is_pregnant ? '✅ 임산부로 설정됨' : '임신하면 여기서 바로 변경하세요'}
              </p>
            </div>
            <button
              onClick={() => set('is_pregnant', !form.is_pregnant)}
              style={{ width: 48, height: 26, borderRadius: 13, border: 'none', background: form.is_pregnant ? '#EC4899' : '#D1D5DB', position: 'relative', cursor: 'pointer', flexShrink: 0 }}
            >
              <span style={{ position: 'absolute', top: 3, left: form.is_pregnant ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .2s' }} />
            </button>
          </div>

          {form.is_pregnant && (
            <Field label="출산예정일(EDD) *">
              <input type="date" value={form.edd} onChange={(e) => set('edd', e.target.value)} style={inputStyle} />
            </Field>
          )}

          {/* 임산부 → 일반 전환 안내 */}
          {!form.is_pregnant && member.is_pregnant && (
            <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '12px 14px' }}>
              <p style={{ fontSize: 12, color: '#92400E', fontWeight: 600 }}>⚠️ 임산부 해제 시 임신 주수 표시가 사라집니다</p>
              <p style={{ fontSize: 12, color: '#B45309', marginTop: 3 }}>출산 후에도 출산예정일 기록은 유지됩니다</p>
            </div>
          )}

          {error && <p style={{ fontSize: 13, color: '#EF4444', background: '#FEF2F2', padding: '8px 12px', borderRadius: 10 }}>{error}</p>}

          <button
            onClick={handleSave} disabled={saving}
            style={{ width: '100%', padding: 14, background: '#3182F6', color: '#fff', fontWeight: 700, fontSize: 14, borderRadius: 16, border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? '저장 중...' : '수정 완료'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB',
  borderRadius: 12, fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
