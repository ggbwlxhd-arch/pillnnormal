'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Member } from '@/lib/utils';
import MemberCard from '@/components/admin/MemberCard';
import AddMemberModal from '@/components/admin/AddMemberModal';
import NoticeManager from '@/components/admin/NoticeManager';

interface UnreadComment {
  id: string;
  member_id: string;
  diary_id: string;
  body: string;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showNotices, setShowNotices] = useState(false);
  const [unread, setUnread] = useState<UnreadComment[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);

  const loadMembers = useCallback(async () => {
    const { data } = await supabase.from('members').select('*');
    // 가나다순 정렬
    const sorted = (data ?? []).sort((a: Member, b: Member) => a.name.localeCompare(b.name, 'ko'));
    setMembers(sorted);
  }, []);

  const loadUnread = useCallback(async () => {
    const { data } = await supabase
      .from('comments')
      .select('id, member_id, diary_id, body, created_at')
      .eq('is_read', false)
      .order('created_at', { ascending: false });
    setUnread(data ?? []);
  }, []);

  useEffect(() => {
    loadMembers();
    loadUnread();
  }, [loadMembers, loadUnread]);

  const memberName = (mid: string) => members.find((m) => m.id === mid)?.name ?? '회원';

  const goToFeedback = (c: UnreadComment) => {
    setShowFeedback(false);
    router.push(`/admin/members/${c.member_id}?diary=${c.diary_id}`);
  };

  const filtered = members.filter((m) => m.name.includes(search.trim()));

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 16px 60px', background: '#F2F4F6', minHeight: '100vh' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>pillnnormal</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* 피드백 드롭다운 */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowFeedback(!showFeedback)}
              style={{ position: 'relative', padding: '8px 12px', borderRadius: 10, border: 'none', background: '#fff', fontSize: 13, fontWeight: 700, color: '#374151', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              💬 피드백
              {unread.length > 0 && (
                <span style={{ position: 'absolute', top: -6, right: -6, background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 999, padding: '2px 6px' }}>{unread.length}</span>
              )}
            </button>
            {showFeedback && (
              <div style={{ position: 'absolute', top: '115%', right: 0, background: '#fff', borderRadius: 16, boxShadow: '0 8px 24px rgba(0,0,0,.12)', width: 280, maxHeight: 320, overflowY: 'auto', zIndex: 50 }}>
                {unread.length === 0 && <p style={{ padding: 16, fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>새 피드백이 없습니다</p>}
                {unread.map((c) => (
                  <button key={c.id} onClick={() => goToFeedback(c)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', borderBottom: '1px solid #F3F4F6', background: '#fff', padding: '11px 14px', cursor: 'pointer' }}>
                    <p style={{ fontWeight: 700, fontSize: 12, color: '#111827', marginBottom: 2 }}>
                      {memberName(c.member_id)} · {new Date(c.created_at).toLocaleDateString('ko-KR')}
                    </p>
                    <p style={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.body}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* 📢 공지 관리 (v6) */}
          <button onClick={() => setShowNotices(true)}
            style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: '#fff', fontSize: 13, fontWeight: 700, color: '#374151', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            📢 공지
          </button>
          <button onClick={() => setShowAdd(true)}
            style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#3182F6', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + 회원 등록
          </button>
        </div>
      </div>

      {/* 검색 */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 회원 이름 검색"
        style={{ width: '100%', padding: '13px 16px', border: 'none', borderRadius: 14, fontSize: 14, boxSizing: 'border-box', marginBottom: 14, outline: 'none', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}
      />

      {/* 회원 목록 (가나다순) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((m) => (
          <MemberCard key={m.id} member={m} onClick={() => router.push(`/admin/members/${m.id}`)} />
        ))}
        {filtered.length === 0 && (
          <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>{search ? '검색 결과가 없습니다' : '회원을 등록해보세요!'}</p>
          </div>
        )}
      </div>

      {showAdd && <AddMemberModal onClose={() => setShowAdd(false)} onSaved={loadMembers} />}
      {showNotices && <NoticeManager members={members} onClose={() => setShowNotices(false)} />}
    </div>
  );
}
