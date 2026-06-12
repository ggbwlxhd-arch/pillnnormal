'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Goal, calcR, rc, curM } from '@/lib/utils';

export default function GoalsTab({
  memberId, longGoals, monthGoals, onRefresh,
}: {
  memberId: string;
  longGoals: Goal[];
  monthGoals: Goal[];
  onRefresh: () => void;
}) {
  const [lgInput, setLgInput] = useState('');
  const [mgInput, setMgInput] = useState('');
  const lr = calcR(longGoals);
  const mr = calcR(monthGoals);

  async function toggleLG(g: Goal) {
    await supabase.from('long_term_goals').update({ is_done: !g.is_done }).eq('id', g.id);
    onRefresh();
  }
  async function toggleMG(g: Goal) {
    await supabase.from('monthly_goals').update({ is_done: !g.is_done }).eq('id', g.id);
    onRefresh();
  }
  async function addLG() {
    if (!lgInput.trim()) return;
    await supabase.from('long_term_goals').insert({ member_id: memberId, title: lgInput.trim(), sort_order: longGoals.length });
    setLgInput('');
    onRefresh();
  }
  async function addMG() {
    if (!mgInput.trim()) return;
    await supabase.from('monthly_goals').insert({ member_id: memberId, month: curM(), title: mgInput.trim(), sort_order: monthGoals.length });
    setMgInput('');
    onRefresh();
  }
  async function deleteLG(id: string) {
    await supabase.from('long_term_goals').delete().eq('id', id);
    onRefresh();
  }
  async function deleteMG(id: string) {
    await supabase.from('monthly_goals').delete().eq('id', id);
    onRefresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 장기 목표 */}
      <GoalCard
        title="🎯 장기 목표"
        subtitle="전체 기간 누적 달성률"
        rate={lr}
        goals={longGoals}
        doneIcon="🏆"
        onToggle={toggleLG}
        onDelete={deleteLG}
        input={lgInput}
        setInput={setLgInput}
        onAdd={addLG}
        placeholder="새 장기 목표 입력"
      />

      {/* 이달 목표 */}
      <GoalCard
        title="📅 이달의 목표"
        subtitle={`${curM().replace('-', '년 ')}월`}
        rate={mr}
        goals={monthGoals}
        doneIcon="✅"
        onToggle={toggleMG}
        onDelete={deleteMG}
        input={mgInput}
        setInput={setMgInput}
        onAdd={addMG}
        placeholder="새 이달 목표 입력"
      />
    </div>
  );
}

function GoalCard({
  title, subtitle, rate, goals, doneIcon, onToggle, onDelete, input, setInput, onAdd, placeholder,
}: {
  title: string;
  subtitle: string;
  rate: number;
  goals: Goal[];
  doneIcon: string;
  onToggle: (g: Goal) => void;
  onDelete: (id: string) => void;
  input: string;
  setInput: (v: string) => void;
  onAdd: () => void;
  placeholder: string;
}) {
  const color = rc(rate);
  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{title}</p>
          <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>{subtitle}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 24, fontWeight: 800, color }}>{rate}%</span>
          <p style={{ fontSize: 12, color: '#9CA3AF' }}>{goals.filter((g) => g.is_done).length}/{goals.length}</p>
        </div>
      </div>
      <div style={{ height: 10, background: '#F3F4F6', borderRadius: 5, overflow: 'hidden', marginBottom: 18 }}>
        <div style={{ height: '100%', width: `${rate}%`, background: color, borderRadius: 5, transition: 'width .8s' }} />
      </div>
      <div>
        {goals.map((g) => (
          <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid #F3F4F6' }}>
            <button
              onClick={() => onToggle(g)}
              style={{
                width: 22, height: 22, borderRadius: 7, border: g.is_done ? 'none' : '2px solid #D1D5DB',
                background: g.is_done ? '#3182F6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, cursor: 'pointer', padding: 0,
              }}
            >
              {g.is_done && <span style={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>✓</span>}
            </button>
            <span style={{ flex: 1, fontSize: 14, color: g.is_done ? '#9CA3AF' : '#374151', textDecoration: g.is_done ? 'line-through' : 'none' }}>
              {g.title}
            </span>
            {g.is_done && <span>{doneIcon}</span>}
            <button onClick={() => onDelete(g.id)} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 16, cursor: 'pointer', padding: '0 4px' }}>×</button>
          </div>
        ))}
        {goals.length === 0 && <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: 16 }}>목표를 추가해보세요!</p>}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onAdd(); }}
          placeholder={placeholder}
          style={{ flex: 1, padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, outline: 'none' }}
        />
        <button onClick={onAdd} style={{ padding: '12px 20px', background: '#3182F6', color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 14, border: 'none', cursor: 'pointer' }}>
          추가
        </button>
      </div>
    </div>
  );
}
