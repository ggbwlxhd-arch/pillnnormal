'use client';

import { useState } from 'react';

import type { Member } from '@/lib/utils';

import { supabase } from '@/lib/supabase';

interface Props {
  member: Member;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditMemberModal({ member, onClose, onSaved }: Props) {
  const [name, setName] = useState(member.name || '');
  const [phone, setPhone] = useState(member.phone || '');
  const [notifyChannel, setNotifyChannel] = useState(member.notify_channel || '카카오톡');
  const [notes, setNotes] = useState(member.notes || '');
  const [isPregnant, setIsPregnant] = useState(!!member.is_pregnant);
  const [edd, setEdd] = useState(member.edd || '');
  // v6: 분만 대비 정보
  const [birthHospital, setBirthHospital] = useState(member.birth_hospital || '');
  const [birthHospitalTel, setBirthHospitalTel] = useState(member.birth_hospital_tel || '');
  const [guardianTel, setGuardianTel] = useState(member.guardian_tel || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { alert('이름을 입력해주세요'); return; }
    if (isPregnant && !edd) { alert('출산예정일을 입력해주세요'); return; }
    setSaving(true);
    const { error } = await supabase.from('members').update({
      name: name.trim(),
      phone: phone.trim() || null,
      notify_channel: notifyChannel,
      notes: notes.trim() || null,
      is_pregnant: isPregnant,
      edd: isPregnant && edd ? edd : null,
      birth_hospital: isPregnant && birthHospital.trim() ? birthHospital.trim() : null,
      birth_hospital_tel: isPregnant && birthHospitalTel.trim() ? birthHospitalTel.trim() : null,
      guardian_tel: isPregnant && guardianTel.trim() ? guardianTel.trim() : null,
    }).eq('id', member.id);
    setSaving(false);
    if (error) { alert('저장 실패: ' + error.message); return; }
    onSaved();
    onClose();
  };

  const remove = async () => {
    if (!confirm(`${member.name} 회원을 삭제할까요?\n관련 일지·통증·목표 기록이 함께 삭제될 수 있습니다.`)) return;
    const { error } = await supabase.from('members').delete().eq('id', member.id);
    if (error) { alert('삭제 실패: ' + error.message); return; }
    onSaved();
    onClose();
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={S.title}>회원 정보 수정</h2>

        <label style={S.label}>이름 *</label>
        <input style={S.input} value={name} onChange={(e) => setName(e.target.value)} />

        <label style={S.label}>연락처</label>
        <input style={S.input} value={phone} onChange={(e) => setPhone(e.target.value)} />

        <label style={S.label}>알림 채널</label>
        <select style={S.input} value={notifyChannel} onChange={(e) => setNotifyChannel(e.target.value)}>
          <option>카카오톡</option>
          <option>문자</option>
          <option>없음</option>
        </select>

        <label style={S.label}>메모</label>
        <textarea style={{ ...S.input, minHeight: 60 }} value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div style={S.toggleRow} onClick={() => setIsPregnant(!isPregnant)}>
          <span style={{ fontWeight: 600 }}>🤰 임산부 회원</span>
          <div style={{ ...S.toggle, background: isPregnant ? '#F472B6' : '#D1D5DB' }}>
            <div style={{ ...S.knob, transform: isPregnant ? 'translateX(20px)' : 'translateX(0)' }} />
          </div>
        </div>

        {isPregnant && (
          <div style={S.pregBox}>
            <label style={S.label}>출산예정일 *</label>
            <input type="date" style={S.input} value={edd} onChange={(e) => setEdd(e.target.value)} />

            <div style={S.pregDivider}>🏥 분만 대비 정보</div>

            <label style={S.label}>분만 병원</label>
            <input style={S.input} value={birthHospital} onChange={(e) => setBirthHospital(e.target.value)} placeholder="OO여성병원" />

            <label style={S.label}>분만 병원 연락처</label>
            <input style={S.input} value={birthHospitalTel} onChange={(e) => setBirthHospitalTel(e.target.value)} placeholder="02-000-0000" />

            <label style={S.label}>보호자 연락처</label>
            <input style={S.input} value={guardianTel} onChange={(e) => setGuardianTel(e.target.value)} placeholder="010-0000-0000" />
          </div>
        )}

        <div style={S.btnRow}>
          <button style={S.delBtn} onClick={remove}>삭제</button>
          <button style={S.cancelBtn} onClick={onClose}>취소</button>
          <button style={S.saveBtn} onClick={save} disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  modal: { background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#4B5563', marginBottom: 4, marginTop: 12 },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' },
  toggleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: '10px 12px', background: '#FDF2F8', borderRadius: 10, cursor: 'pointer' },
  toggle: { width: 44, height: 24, borderRadius: 12, position: 'relative', transition: 'background 0.2s' },
  knob: { width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: 2, transition: 'transform 0.2s' },
  pregBox: { background: '#FDF2F8', borderRadius: 10, padding: '4px 12px 12px', marginTop: 8 },
  pregDivider: { fontSize: 13, fontWeight: 700, color: '#BE185D', marginTop: 16, paddingTop: 12, borderTop: '1px dashed #F9A8D4' },
  btnRow: { display: 'flex', gap: 8, marginTop: 20 },
  delBtn: { flex: 1, padding: 12, borderRadius: 10, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#B91C1C', fontSize: 15, cursor: 'pointer' },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, border: '1px solid #D1D5DB', background: '#fff', fontSize: 15, cursor: 'pointer' },
  saveBtn: { flex: 2, padding: 12, borderRadius: 10, border: 'none', background: '#111827', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
};
