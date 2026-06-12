'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Member, Goal, PainRecord, Diary, calcR, rc, pregW, nc, nl, fmtD, curM,
} from '@/lib/utils';
import GoalsTab from '@/components/admin/GoalsTab';
import DiaryTab from '@/components/admin/DiaryTab';
import PainTab from '@/components/admin/PainTab';

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<Member | null>(null);
  const [longGoals, setLongGoals] = useState<Goal[]>([]);
  const [monthGoals, setMonthGoals] = useState<Goal[]>([]);
  const [painRecs, setPainRecs] = useState<PainRecord[]>([]);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [tab, setTab] = useState<'goals' | 'diary' | 'pain'>('goals');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  async function fetchAll() {
    setLoading(true);
    const [{ data: m }, { data: lg }, { data: mg }, { data: pr }, { data: di }] = await Promise.all([
      supabase.from('members').select('*').eq('id', id).single(),
      supabase.from('long_term_goals').select('*').eq('member_id', id).order('sort_order'),
      supabase.from('monthly_goals').select('*').eq('member_id', id).eq('month', curM()).order('sort_order'),
      supabase.from('pain_records').select('*').eq('member_id', id).order('recorded_at'),
      supabase.from('diaries').select('*, diary_pain_changes(*)').eq('member_id', id).order('session_date', { ascending: false }),
    ]);
    setMember(m ?? null);
    setLongGoals(lg ?? []);
    setMonthGoals(mg ?? []);
    setPainRecs(pr ?? []);
    setDiaries((di ?? []).map((d: any) => ({ ...d, pain_changes: d.diary_pain_changes })));
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #3182F6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!member) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>회원을 찾을 수 없습니다</div>;
  }

  const lr = calcR(longGoals);
  const mr = calcR(monthGoals);
  const pw = member.is_pregnant && member.edd ? pregW(member.edd) : null;
  const lat = painRecs[painRecs.length - 1];
  const fst = painRecs.find((p) => p.is_first) ?? painRecs[0];

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', fontFamily: "-apple-system,'Apple SD Gothic Neo',sans-serif" }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/admin" style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, textDecoration: 'none', color: '#374151' }}>
            ←
          </Link>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#111827' }}>{member.name} 회원</span>
          {member.is_pregnant && <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#FCE7F3', color: '#BE185D' }}>임산부</span>}
          <Link href={`/diary/${member.share_token}`} target="_blank" style={{ marginLeft: 'auto', padding: '7px 14px', background: '#EFF6FF', color: '#3182F6', fontSize: 12, fontWeight: 700, borderRadius: 10, textDecoration: 'none' }}>
            👁 회원 화면
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px 20px' }}>
        {/* 프로필 카드 */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 22, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: member.is_pregnant ? '#EC4899' : '#3182F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 24, flexShrink: 0 }}>
                {member.name[0]}
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 4 }}>{member.name}</h2>
                <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>{member.phone || '연락처 없음'}</p>
                <p style={{ fontSize: 12, color: '#9CA3AF' }}>등록 {fmtD(member.registered_at)}</p>
              </div>
            </div>
            {pw && (
              <div style={{ background: '#FDF2F8', border: '1px solid #FBCFE8', borderRadius: 16, padding: '12px 16px', textAlign: 'center', flexShrink: 0 }}>
                <p style={{ fontSize: 12, color: '#9D174D', marginBottom: 3 }}>현재</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: '#BE185D', marginBottom: 2 }}>{pw.w}주</p>
                <p style={{ fontSize: 12, color: '#EC4899' }}>{pw.d}일차</p>
              </div>
            )}
          </div>

          {/* 이중 달성률 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: lat ? 14 : 0 }}>
            <div style={{ background: '#F9FAFB', borderRadius: 14, padding: '13px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>🎯 장기목표</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: rc(lr) }}>{lr}%</span>
              </div>
              <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginBottom: 5 }}>
                <div style={{ height: '100%', width: `${lr}%`, background: rc(lr), borderRadius: 4, transition: 'width .8s' }} />
              </div>
              <p style={{ fontSize: 12, color: '#9CA3AF' }}>{longGoals.filter((g) => g.is_done).length}/{longGoals.length}개 완료</p>
            </div>
            <div style={{ background: '#F9FAFB', borderRadius: 14, padding: '13px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>📅 이달목표</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: rc(mr) }}>{mr}%</span>
              </div>
              <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginBottom: 5 }}>
                <div style={{ height: '100%', width: `${mr}%`, background: rc(mr), borderRadius: 4, transition: 'width .8s' }} />
              </div>
              <p style={{ fontSize: 12, color: '#9CA3AF' }}>{monthGoals.filter((g) => g.is_done).length}/{monthGoals.length}개 완료</p>
            </div>
          </div>

          {lat && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: '#F9FAFB', borderRadius: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: nc(lat.nrs_score), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 17, flexShrink: 0 }}>
                {lat.nrs_score}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{nl(lat.nrs_score)} · {lat.body_parts.join(', ')}</p>
                <p style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtD(lat.recorded_at)}</p>
              </div>
              {fst && lat.nrs_score < fst.nrs_score && (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 12, color: '#9CA3AF' }}>첫방문 대비</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#10B981' }}>-{fst.nrs_score - lat.nrs_score}↓</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 4, background: '#fff', borderRadius: 18, padding: 4, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          {(['goals', 'diary', 'pain'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: 10, fontSize: 13, fontWeight: 700, borderRadius: 14, border: 'none', cursor: 'pointer',
                background: tab === t ? '#3182F6' : 'transparent', color: tab === t ? '#fff' : '#6B7280', transition: 'all .2s',
              }}
            >
              {t === 'goals' ? '목표' : t === 'diary' ? '운동 일지' : '통증 관리'}
            </button>
          ))}
        </div>

        {tab === 'goals' && (
          <GoalsTab memberId={member.id} longGoals={longGoals} monthGoals={monthGoals} onRefresh={fetchAll} />
        )}
        {tab === 'diary' && (
          <DiaryTab memberId={member.id} diaries={diaries} painRecs={painRecs} onRefresh={fetchAll} />
        )}
        {tab === 'pain' && (
          <PainTab memberId={member.id} painRecs={painRecs} onRefresh={fetchAll} />
        )}
      </div>
    </div>
  );
}
