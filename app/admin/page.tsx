'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Member, Goal, PainRecord, Comment, calcR, rc, pregW, curM } from '@/lib/utils';
import MemberCard from '@/components/admin/MemberCard';
import AddMemberModal from '@/components/admin/AddMemberModal';

export default function AdminDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [longGoals, setLongGoals] = useState<Record<string, Goal[]>>({});
  const [monthGoals, setMonthGoals] = useState<Record<string, Goal[]>>({});
  const [painRecs, setPainRecs] = useState<Record<string, PainRecord[]>>({});
  const [unread, setUnread] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const { data: m } = await supabase.from('members').select('*').order('registered_at', { ascending: false });
    setMembers(m ?? []);

    if (m && m.length > 0) {
      const ids = m.map((x) => x.id);

      const { data: lg } = await supabase.from('long_term_goals').select('*').in('member_id', ids).order('sort_order');
      const lgGrouped: Record<string, Goal[]> = {};
      (lg ?? []).forEach((g) => {
        (lgGrouped[g.member_id] ??= []).push(g);
      });
      setLongGoals(lgGrouped);

      const { data: mg } = await supabase.from('monthly_goals').select('*').in('member_id', ids).eq('month', curM()).order('sort_order');
      const mgGrouped: Record<string, Goal[]> = {};
      (mg ?? []).forEach((g) => {
        (mgGrouped[g.member_id] ??= []).push(g);
      });
      setMonthGoals(mgGrouped);

      const { data: pr } = await supabase.from('pain_records').select('*').in('member_id', ids).order('recorded_at');
      const prGrouped: Record<string, PainRecord[]> = {};
      (pr ?? []).forEach((p) => {
        (prGrouped[p.member_id] ??= []).push(p);
      });
      setPainRecs(prGrouped);

      const { count } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('is_read', false);
      setUnread(count ?? 0);
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', fontFamily: "-apple-system,'Apple SD Gothic Neo',sans-serif" }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, background: '#3182F6', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15 }}>P</div>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#111827' }}>필라테스 센터</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {unread > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: '#FFFBEB', borderRadius: 20, border: '1px solid #FDE68A' }}>
                <span style={{ width: 6, height: 6, background: '#F59E0B', borderRadius: '50%', display: 'block' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>새 피드백 {unread}건</span>
              </div>
            )}
            <button
              onClick={() => setShowAdd(true)}
              style={{ padding: '11px 20px', fontSize: 13, fontWeight: 700, borderRadius: 14, border: 'none', background: '#3182F6', color: '#fff', cursor: 'pointer' }}
            >
              + 회원 등록
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>전체 회원</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: '#3182F6' }}>{members.length}<span style={{ fontSize: 13, fontWeight: 500, color: '#9CA3AF', marginLeft: 2 }}>명</span></p>
          </div>
          <div style={{ background: '#fff', borderRadius: 20, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>임산부</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: '#EC4899' }}>{members.filter((m) => m.is_pregnant).length}<span style={{ fontSize: 13, fontWeight: 500, color: '#9CA3AF', marginLeft: 2 }}>명</span></p>
          </div>
          <div style={{ background: '#fff', borderRadius: 20, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>새 피드백</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: '#F59E0B' }}>{unread}<span style={{ fontSize: 13, fontWeight: 500, color: '#9CA3AF', marginLeft: 2 }}>건</span></p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #3182F6', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>등록된 회원이 없습니다</p>
            <p style={{ fontSize: 13 }}>+ 회원 등록 버튼을 눌러 추가해보세요</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {members.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                longGoals={longGoals[m.id] ?? []}
                monthGoals={monthGoals[m.id] ?? []}
                painRecs={painRecs[m.id] ?? []}
                onRefresh={fetchAll}
              />
            ))}
          </div>
        )}
      </div>

      {showAdd && <AddMemberModal onClose={() => setShowAdd(false)} onSaved={fetchAll} />}
    </div>
  );
}
