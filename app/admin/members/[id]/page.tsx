'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Member, Goal, PainRecord, Diary, curM, pregW } from '@/lib/utils';
import EditMemberModal from '@/components/admin/EditMemberModal';
import GoalsTab from '@/components/admin/GoalsTab';
import DiaryTab from '@/components/admin/DiaryTab';
import PainTab from '@/components/admin/PainTab';

interface Memo {
  id: string;
  member_id: string;
  content: string;
  created_at: string;
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [longGoals, setLongGoals] = useState<Goal[]>([]);
  const [monthGoals, setMonthGoals] = useState<Goal[]>([]);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [painRecs, setPainRecs] = useState<PainRecord[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [tab, setTab] = useState<'diary' | 'pain' | 'goals' | 'memo'>('diary');
  const [showEdit, setShowEdit] = useState(false);

  // 특이사항 작성/수정
  const [memoInput, setMemoInput] = useState('');
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const [m, lg, mg, d, p, mm] = await Promise.all([
      supabase.from('members').select('*').eq('id', id).single(),
      supabase.from('long_term_goals').select('*').eq('member_id', id).order('sort_order'),
      supabase.from('monthly_goals').select('*').eq('member_id', id).eq('month', curM()).order('sort_order'),
      supabase.from('diaries').select('*, pain_changes:diary_pain_changes(*)').eq('member_id', id).order('session_date', { ascending: false }),
      supabase.from('pain_records').select('*').eq('member_id', id).order('recorded_at'),
      supabase.from('member_memos').select('*').eq('member_id', id).order('created_at', { ascending: false }),
    ]);
    setMember(m.data);
    setLongGoals(lg.data ?? []);
    setMonthGoals(mg.data ?? []);
    setDiaries(d.data ?? []);
    setPainRecs(p.data ?? []);
    setMemos(mm.data ?? []);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveMemo = async () => {
    if (!memoInput.trim()) return;
    if (editingMemoId) {
      const { error } = await supabase.from('member_memos').update({ content: memoInput.trim() }).eq('id', editingMemoId);
      if (error) { alert('수정 실패: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('member_memos').insert({ member_id: id, content: memoInput.trim() });
      if (error) { alert('저장 실패: ' + error.message); return; }
    }
    setMemoInput('');
    setEditingMemoId(null);
    fetchAll();
  };

  const deleteMemo = async (memoId: string) => {
    if (!confirm('이 특이사항을 삭제할까요?')) return;
    await supabase.from('member_memos').delete().eq('id', memoId);
    fetchAll();
  };

  if (!member) return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>불러오는 중...</div>;

  const weeks = member.is_pregnant && member.edd ? pregW(member.edd) : null;
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/diary/${member.share_token}` : '';

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 16px 60px', background: '#F2F4F6', minHeight: '100vh' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={() => router.push('/admin')} style={{ border: 'none', background: 'transparent', fontSize: 15, color: '#6B7280', cursor: 'pointer', padding: 4 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 21, fontWeight: 800, margin: 0 }}>{member.name}</h1>
            {member.is_pregnant && (
              <span style={{ fontSize: 12, background: '#FCE7F3', color: '#BE185D', padding: '3px 10px', borderRadius: 999, fontWeight: 700 }}>
                🤰 {weeks !== null ? `임신 ${weeks}주` : '임산부'}
              </span>
            )}
          </div>
          {member.phone && <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{member.phone} · {member.notify_channel}</p>}
        </div>
        <button onClick={() => setShowEdit(true)} style={{ padding: '8px 13px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 700, color: '#374151', cursor: 'pointer' }}>수정</button>
        <button
          onClick={() => { navigator.clipboard.writeText(shareUrl); alert('공유 링크가 복사되었습니다!'); }}
          style={{ padding: '8px 13px', borderRadius: 10, border: 'none', background: '#3182F6', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          링크 복사
        </button>
      </div>

      {/* ⚠️ 특이사항 배너 — 수업 전 항상 확인 */}
      {memos.length > 0 && (
        <div style={{ background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 16, padding: '13px 16px', marginBottom: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: '#92400E', marginBottom: 6 }}>⚠️ 수업 전 확인 — 특이사항</p>
          {memos.slice(0, 3).map((m) => (
            <p key={m.id} style={{ fontSize: 13, color: '#78350F', marginBottom: 3, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              • {m.content} <span style={{ fontSize: 11, color: '#B45309' }}>({m.created_at.slice(0, 10)})</span>
            </p>
          ))}
          {memos.length > 3 && (
            <button onClick={() => setTab('memo')} style={{ marginTop: 4, border: 'none', background: 'transparent', color: '#B45309', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
              +{memos.length - 3}건 더 보기
            </button>
          )}
        </div>
      )}

      {/* 🏥 긴급 연락처 카드 (임산부) */}
      {member.is_pregnant && (member.birth_hospital || member.birth_hospital_tel || member.guardian_tel) && (
        <div style={{ background: '#FDF2F8', border: '1.5px solid #F9A8D4', borderRadius: 16, padding: '13px 16px', marginBottom: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: '#BE185D', marginBottom: 8 }}>🏥 분만 대비 긴급 연락처</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {member.birth_hospital && (
              <div style={{ background: '#fff', borderRadius: 12, padding: '8px 12px', minWidth: 110 }}>
                <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>분만 병원</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{member.birth_hospital}</p>
              </div>
            )}
            {member.birth_hospital_tel && (
              <a href={`tel:${member.birth_hospital_tel}`} style={{ background: '#fff', borderRadius: 12, padding: '8px 12px', minWidth: 110, textDecoration: 'none' }}>
                <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>병원 전화</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#3182F6' }}>📞 {member.birth_hospital_tel}</p>
              </a>
            )}
            {member.guardian_tel && (
              <a href={`tel:${member.guardian_tel}`} style={{ background: '#fff', borderRadius: 12, padding: '8px 12px', minWidth: 110, textDecoration: 'none' }}>
                <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>보호자</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#3182F6' }}>📞 {member.guardian_tel}</p>
              </a>
            )}
          </div>
        </div>
      )}

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto' }}>
        {([
          ['diary', '📝 운동일지'],
          ['pain', '📊 통증'],
          ['goals', '🎯 목표'],
          ['memo', `⚠️ 특이사항${memos.length ? ` ${memos.length}` : ''}`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '9px 15px', borderRadius: 20, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              background: tab === key ? '#3182F6' : '#fff', color: tab === key ? '#fff' : '#6B7280',
              boxShadow: '0 1px 3px rgba(0,0,0,.06)',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      {tab === 'goals' && (
        <GoalsTab memberId={member.id} longGoals={longGoals} monthGoals={monthGoals} onRefresh={fetchAll} />
      )}
      {tab === 'diary' && (
        <DiaryTab memberId={member.id} diaries={diaries} painRecs={painRecs} onRefresh={fetchAll} />
      )}
      {tab === 'pain' && (
        <PainTab memberId={member.id} painRecs={painRecs} onRefresh={fetchAll} />
      )}

      {tab === 'memo' && (
        <div style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '10px 12px', marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>🔒 특이사항은 관리자에게만 보이며, 회원 공유 페이지에는 표시되지 않습니다.</p>
          </div>
          <textarea
            value={memoInput}
            onChange={(e) => setMemoInput(e.target.value)}
            placeholder="예) 허리 디스크 시술 이력 있음, 격한 굴곡 동작 주의"
            rows={3}
            style={{ width: '100%', padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', marginBottom: 8, lineHeight: 1.6 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            {editingMemoId && (
              <button onClick={() => { setEditingMemoId(null); setMemoInput(''); }} style={{ padding: '12px 16px', borderRadius: 12, border: '1.5px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 700, color: '#6B7280', cursor: 'pointer' }}>
                취소
              </button>
            )}
            <button onClick={saveMemo} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: '#F59E0B', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {editingMemoId ? '✅ 수정 저장' : '+ 특이사항 추가'}
            </button>
          </div>

          <div style={{ marginTop: 16 }}>
            {memos.length === 0 && <p style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: 16 }}>등록된 특이사항이 없습니다</p>}
            {memos.map((m) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '13px 0', borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{m.content}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{m.created_at.slice(0, 10)}</p>
                </div>
                <button onClick={() => { setEditingMemoId(m.id); setMemoInput(m.content); }} style={{ border: 'none', background: '#F3F4F6', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#6B7280', cursor: 'pointer' }}>✏️</button>
                <button onClick={() => deleteMemo(m.id)} style={{ border: 'none', background: '#FEF2F2', color: '#EF4444', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>삭제</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showEdit && (
        <EditMemberModal
          member={member}
          onClose={() => setShowEdit(false)}
          onSaved={fetchAll}
        />
      )}
    </div>
  );
}
