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
  const [comments, setComments] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFbPanel, setShowFbPanel] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (!showFbPanel) return;
    const handler = (e: MouseEvent) => {
      const panel = document.getElementById('fb-panel');
      const badge = document.getElementById('fb-badge');
      if (panel && !panel.contains(e.target as Node) && badge && !badge.contains(e.target as Node)) {
        setShowFbPanel(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showFbPanel]);

  async function fetchAll() {
    setLoading(true);
    const { data: m } = await supabase.from('members').select('*');
    // 🆕 가나다순 정렬
    const sorted = (m ?? []).sort((a: Member, b: Member) => a.name.localeCompare(b.name, 'ko'));
    setMembers(sorted);

    if (sorted.length > 0) {
      const ids = sorted.map((x: Member) => x.id);
      const [{ data: lg }, { data: mg }, { data: pr }, { data: cm }] = await Promise.all([
        supabase.from('long_term_goals').select('*').in('member_id', ids).order('sort_order'),
        supabase.from('monthly_goals').select('*').in('member_id', ids).eq('month', curM()).order('sort_order'),
        supabase.from('pain_records').select('*').in('member_id', ids).order('recorded_at'),
        supabase.from('comments').select('*, diaries(session_date, member_id, members(name))').order('created_at', { ascending: false }),
      ]);

      const lgG: Record<string, Goal[]> = {};
      (lg ?? []).forEach((g: Goal) => { (lgG[g.member_id] ??= []).push(g); });
      setLongGoals(lgG);

      const mgG: Record<string, Goal[]> = {};
      (mg ?? []).forEach((g: Goal) => { (mgG[g.member_id] ??= []).push(g); });
      setMonthGoals(mgG);

      const prG: Record<string, PainRecord[]> = {};
      (pr ?? []).forEach((p: PainRecord) => { (prG[p.member_id] ??= []).push(p); });
      setPainRecs(prG);

      setComments(cm ?? []);
      setUnread((cm ?? []).filter((c: any) => !c.is_read).length);
    }
    setLoading(false);
  }

  async function markAllRead() {
    await supabase.from('comments').update({ is_read: true }).eq('is_read', false);
    setComments((prev) => prev.map((c) => ({ ...c, is_read: true })));
    setUnread(0);
  }

  async function markOneRead(id: string) {
    await supabase.from('comments').update({ is_read: true }).eq('id', id);
    setComments((prev) => prev.map((c) => c.id === id ? { ...c, is_read: true } : c));
    setUnread((prev) => Math.max(0, prev - 1));
  }

  // 🆕 검색 필터
  const filtered = members.filter((m) =>
    !search || m.name.includes(search) || (m.phone || '').includes(search)
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', fontFamily: "-apple-system,'Apple SD Gothic Neo',sans-serif" }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, background: '#3182F6', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15 }}>P</div>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#111827' }}>필라테스 센터</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* 🆕 피드백 뱃지 + 드롭다운 */}
            {unread > 0 && (
              <div style={{ position: 'relative' }}>
                <button
                  id="fb-badge"
                  onClick={() => setShowFbPanel(!showFbPanel)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: '#FFFBEB', borderRadius: 20, border: '1px solid #FDE68A', cursor: 'pointer' }}
                >
                  <span style={{ width: 8, height: 8, background: '#F59E0B', borderRadius: '50%', display: 'block' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>새 피드백 {unread}건</span>
                </button>

                {showFbPanel && (
                  <div id="fb-panel" style={{ position: 'fixed', top: 68, right: 16, width: 360, maxWidth: 'calc(100vw - 32px)', background: '#fff', borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,.18)', zIndex: 300, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6' }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>💬 회원 피드백</p>
                      <button onClick={markAllRead} style={{ padding: '4px 10px', background: '#F3F4F6', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#6B7280', cursor: 'pointer' }}>모두 읽음</button>
                    </div>
                    {comments.slice(0, 15).map((c: any) => {
                      const diary = c.diaries;
                      const memberName = diary?.members?.name;
                      const memberId = diary?.member_id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => { markOneRead(c.id); setShowFbPanel(false); window.location.href = `/admin/members/${memberId}`; }}
                          style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', cursor: 'pointer', borderBottom: '1px solid #F9FAFB', width: '100%', background: c.is_read ? '#fff' : '#FFFBEB', border: 'none', textAlign: 'left', fontFamily: 'inherit' }}
                        >
                          {!c.is_read
                            ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', flexShrink: 0, marginTop: 5 }} />
                            : <div style={{ width: 8, flexShrink: 0 }} />
                          }
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <div style={{ width: 24, height: 24, borderRadius: 8, background: '#3182F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                                {memberName?.[0] ?? '?'}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{memberName ?? '알 수 없음'}</span>
                              {!c.is_read && <span style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', background: '#FFFBEB', padding: '2px 6px', borderRadius: 6, border: '1px solid #FDE68A' }}>NEW</span>}
                            </div>
                            <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{c.body}</p>
                            {diary && (
                              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
                                📋 {new Date(diary.session_date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 수업 일지
                              </p>
                            )}
                          </div>
                          <span style={{ fontSize: 14, color: '#D1D5DB', flexShrink: 0 }}>›</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <button onClick={() => setShowAdd(true)} style={{ padding: '11px 20px', fontSize: 13, fontWeight: 700, borderRadius: 14, border: 'none', background: '#3182F6', color: '#fff', cursor: 'pointer' }}>
              + 회원 등록
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
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

        {/* 🆕 검색바 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: '10px 16px', marginBottom: 14 }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="회원 이름 검색..."
            style={{ border: 'none', outline: 'none', fontSize: 14, flex: 1, background: 'transparent', color: '#111827' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', fontSize: 18, color: '#9CA3AF', cursor: 'pointer', padding: 0 }}>×</button>}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #3182F6', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
            <p style={{ fontSize: 16, fontWeight: 600 }}>{search ? `"${search}" 검색 결과가 없어요` : '등록된 회원이 없어요'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((m) => (
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
