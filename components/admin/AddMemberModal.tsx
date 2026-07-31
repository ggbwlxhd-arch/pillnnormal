'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddMemberModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [channel, setChannel] = useState<'kakao' | 'sms'>('kakao');
  const [isPregnant, setIsPregnant] = useState(false);
  const [edd, setEdd] = useState('');
  const [birthHosp, setBirthHosp] = useState('');
  const [birthTel, setBirthTel] = useState('');
  const [guardTel, setGuardTel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!name.trim()) { setError('이름을 입력해주세요'); return; }
    if (isPregnant && !edd) { setError('출산예정일을 입력해주세요'); return; }
    setSaving(true);
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const { error: err } = await supabase.from('members').insert({
      name: name.trim(),
      phone: phone.trim() || null,
      notes: notes.trim() || null,
      notify_channel: channel,
      is_pregnant: isPregnant,
      edd: isPregnant ? edd : null,
      share_token: token,
      birth_hospital: isPregnant ? birthHosp.trim() || null : null,
      birth_hospital_tel: isPregnant ? birthTel.trim() || null : null,
      guardian_tel: isPregnant ? guardTel.trim() || null : null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
    onClose();
  }

  const inp: React.CSSProperties = { width: '100%', padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
      <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', position: 'sticky', top: 0, background: '#fff' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>새 회원 등록</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', border: 'none', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={lbl}>이름 *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" style={inp} /></div>
          <div><label style={lbl}>연락처</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" style={inp} /></div>
          <div><label style={lbl}>운동 목적</label><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="예) 출산 후 코어 회복" rows={2} style={{ ...inp, resize: 'none' }} /></div>

          {/* 발송 채널 */}
          <div>
            <label style={lbl}>발송 채널</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setChannel('kakao')} style={{ flex: 1, padding: 12, borderRadius: 14, border: `2px solid ${channel === 'kakao' ? '#FEE500' : '#E5E7EB'}`, background: channel === 'kakao' ? '#FFFDE7' : '#fff', fontWeight: 700, fontSize: 13, color: channel === 'kakao' ? '#856404' : '#9CA3AF', cursor: 'pointer' }}>💬 카카오톡</button>
              <button onClick={() => setChannel('sms')} style={{ flex: 1, padding: 12, borderRadius: 14, border: `2px solid ${channel === 'sms' ? '#374151' : '#E5E7EB'}`, background: channel === 'sms' ? '#F9FAFB' : '#fff', fontWeight: 700, fontSize: 13, color: channel === 'sms' ? '#374151' : '#9CA3AF', cursor: 'pointer' }}>📱 문자(SMS)</button>
            </div>
          </div>

          {/* 임산부 토글 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F9FAFB', borderRadius: 14, padding: '14px 16px' }}>
            <div><p style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>임산부 회원</p><p style={{ fontSize: 12, color: '#9CA3AF' }}>임신 주수 자동 계산</p></div>
            <button onClick={() => setIsPregnant(!isPregnant)} style={{ width: 48, height: 26, borderRadius: 13, border: 'none', background: isPregnant ? '#EC4899' : '#D1D5DB', position: 'relative', cursor: 'pointer', transition: 'background .2s' }}>
              <span style={{ position: 'absolute', top: 3, left: isPregnant ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .2s' }} />
            </button>
          </div>

          {isPregnant && (
            <>
              <div><label style={lbl}>출산예정일(EDD) *</label><input type="date" value={edd} onChange={e => setEdd(e.target.value)} style={inp} /></div>

              {/* 1번: 분만 대비 정보 */}
              <div style={{ background: '#FFF1F2', border: '1.5px solid #FECDD3', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#BE123C' }}>🏥 분만 대비 긴급 정보 <span style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF' }}>(만삭 시 필수)</span></p>
                <div><label style={lbl}>분만병원</label><input value={birthHosp} onChange={e => setBirthHosp(e.target.value)} placeholder="예) 강남세브란스 산부인과" style={inp} /></div>
                <div><label style={lbl}>분만병원 연락처</label><input value={birthTel} onChange={e => setBirthTel(e.target.value)} placeholder="02-0000-0000" style={inp} /></div>
                <div><label style={lbl}>보호자 연락처</label><input value={guardTel} onChange={e => setGuardTel(e.target.value)} placeholder="010-0000-0000 (남편/가족)" style={inp} /></div>
              </div>
            </>
          )}

          {error && <p style={{ fontSize: 13, color: '#EF4444', background: '#FEF2F2', padding: '8px 12px', borderRadius: 10 }}>{error}</p>}

          <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: 14, background: '#3182F6', color: '#fff', fontWeight: 700, fontSize: 14, borderRadius: 16, border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? '등록 중...' : '회원 등록하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
