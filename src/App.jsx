import { useState, useRef, useEffect, useCallback } from "react";

/* ── Helpers ── */
function toKST(d = new Date()) {
  return new Date(d.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
}
function kstDateStr(d = toKST()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatDateKR(s) {
  const d = parseDate(s);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return { year: d.getFullYear(), month: d.getMonth() + 1, date: d.getDate(), day: days[d.getDay()] };
}
function addDays(s, n) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return kstDateStr(d);
}

/* ── Data ── */
const DEF_CATS = [
  { id: "cat1", label: "서울경제", emoji: "📰" },
  { id: "cat2", label: "뉴스쿨", emoji: "🎒" },
  { id: "cat3", label: "육아", emoji: "🧸" },
];
const CAT_ST = [
  { color: "#7A6210", bg: "#FFF8DC", accent: "#D4A812" },
  { color: "#8B5E2B", bg: "#FFF3E0", accent: "#E8963A" },
  { color: "#5C6B2F", bg: "#F4F8E8", accent: "#8FA644" },
  { color: "#5B3A7A", bg: "#F3EBF8", accent: "#9B6BC4" },
  { color: "#2B6E8B", bg: "#E8F4F8", accent: "#3AA0C8" },
];
const SAMPLE = {
  cat1: [
    { id: 1, text: "오전 데스크 회의", time: "09:00", done: false, note: "" },
    { id: 2, text: "기사 초안 작성", time: "10:00", done: false, note: "경제면 3건 마감" },
    { id: 3, text: "팩트체크 & 교정", time: "14:00", done: false, note: "" },
    { id: 4, text: "편집장 리뷰 회의", time: "16:00", done: false, note: "3층 회의실" },
  ],
  cat2: [
    { id: 5, text: "콘텐츠 기획안 제출", time: "10:00", done: false, note: "" },
    { id: 6, text: "뉴스레터 원고 작성", time: "13:00", done: false, note: "주제: AI교육" },
    { id: 7, text: "SNS 콘텐츠 업로드", time: "15:00", done: false, note: "" },
  ],
  cat3: [
    { id: 8, text: "등원 준비 & 등원", time: "08:00", done: false, note: "" },
    { id: 9, text: "간식/도시락 준비", time: "07:30", done: false, note: "알레르기 주의" },
    { id: 10, text: "하원 픽업", time: "17:30", done: false, note: "" },
    { id: 11, text: "독서 & 놀이 시간", time: "19:00", done: false, note: "" },
  ],
};
const INIT_PROJ = [
  { id: "p1", name: "연간 기획 시리즈", catId: "cat1", startMonth: 1, endMonth: 4, progress: 75, note: "1~4월 연재" },
  { id: "p2", name: "디지털 전환", catId: "cat1", startMonth: 3, endMonth: 8, progress: 40, note: "CMS 이전" },
  { id: "p3", name: "뉴스쿨 리브랜딩", catId: "cat2", startMonth: 2, endMonth: 5, progress: 60, note: "" },
  { id: "p4", name: "여름 특집", catId: "cat2", startMonth: 5, endMonth: 8, progress: 10, note: "" },
  { id: "p5", name: "초등 입학 준비", catId: "cat3", startMonth: 1, endMonth: 3, progress: 90, note: "" },
  { id: "p6", name: "가족 여행", catId: "cat3", startMonth: 7, endMonth: 8, progress: 5, note: "제주도 or 해외" },
];
const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const EMOJIS = ["📰","🎒","🧸","💼","🎯","📝","💡","🏠","🎨","📊","🔬","🎓","🏃","🍳","📱","✈️"];

function getMiniCal(ds) {
  const d = parseDate(ds);
  const y = d.getFullYear(), m = d.getMonth();
  return {
    blanks: Array(new Date(y, m, 1).getDay()).fill(null),
    days: Array.from({ length: new Date(y, m + 1, 0).getDate() }, (_, i) => i + 1),
    month: m + 1, year: y,
  };
}

/* ── Storage (localStorage) ── */
function load(k, fb) {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fb;
  } catch { return fb; }
}
function save(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.error(e); }
}

/* ── App ── */
export default function DailySchedule() {
  const todayStr = kstDateStr();
  const kNow = toKST();

  const [tab, setTab] = useState("daily");
  const [selDate, setSelDate] = useState(todayStr);
  const [cats, setCats] = useState(DEF_CATS);
  const [tasksByDate, setTasksByDate] = useState({ [todayStr]: SAMPLE });
  const [projects, setProjects] = useState(INIT_PROJ);
  const [activeCat, setActiveCat] = useState(null);
  const [showCal, setShowCal] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ text: "", time: "09:00", cat: "cat1", note: "" });
  const [expTask, setExpTask] = useState(null);
  const [editNote, setEditNote] = useState(null);
  const [noteVal, setNoteVal] = useState("");
  const [editingTask, setEditingTask] = useState(null);
  const [etText, setEtText] = useState("");
  const [etTime, setEtTime] = useState("");
  const [etCat, setEtCat] = useState("");
  const [editCat, setEditCat] = useState(null);
  const [editCatLabel, setEditCatLabel] = useState("");
  const [editCatEmoji, setEditCatEmoji] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAddProj, setShowAddProj] = useState(false);
  const [newProj, setNewProj] = useState({ name: "", catId: "cat1", startMonth: 1, endMonth: 3, note: "" });
  const [expProj, setExpProj] = useState(null);
  const [editProjNote, setEditProjNote] = useState(null);
  const [projNoteVal, setProjNoteVal] = useState("");
  const [editProjProg, setEditProjProg] = useState(null);
  const [editingProj, setEditingProj] = useState(null);
  const [epName, setEpName] = useState("");
  const [epCat, setEpCat] = useState("");
  const [epStart, setEpStart] = useState(1);
  const [epEnd, setEpEnd] = useState(3);
  const [loaded, setLoaded] = useState(false);
  const editRef = useRef(null);
  const tlRef = useRef(null);

  const isToday = selDate === todayStr;
  const dateInfo = formatDateKR(selDate);
  const tasks = tasksByDate[selDate] || {};

  // Load from storage
  useEffect(() => {
    try {
      const c = load("sch-cats", DEF_CATS);
      const t = load("sch-tasks", { [todayStr]: SAMPLE });
      const p = load("sch-proj", INIT_PROJ);
      setCats(c); setTasksByDate(t); setProjects(p);
    } catch (e) { console.error(e); }
    setLoaded(true);
  }, []);

  // Save on change
  useEffect(() => { if (loaded) save("sch-cats", cats); }, [cats, loaded]);
  useEffect(() => { if (loaded) save("sch-tasks", tasksByDate); }, [tasksByDate, loaded]);
  useEffect(() => { if (loaded) save("sch-proj", projects); }, [projects, loaded]);

  // Midnight refresh
  useEffect(() => {
    const iv = setInterval(() => {
      if (kstDateStr(toKST()) !== todayStr) window.location.reload();
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => { if (editRef.current) editRef.current.focus(); }, [editCat]);
  useEffect(() => {
    if (tab === "projects" && tlRef.current) {
      tlRef.current.scrollLeft = Math.max(0, (toKST().getMonth() - 1) * 72);
    }
  }, [tab]);

  const getCS = (cid) => { const i = cats.findIndex(c => c.id === cid); return CAT_ST[(i >= 0 ? i : 0) % CAT_ST.length]; };
  const getC = (cid) => cats.find(c => c.id === cid) || { label: "?", emoji: "?" };

  // Task helpers
  const setTF = useCallback((date, fn) => {
    setTasksByDate(p => ({ ...p, [date]: fn(p[date] || {}) }));
  }, []);

  const toggleT = (cat, id) => setTF(selDate, p => ({
    ...p, [cat]: (p[cat] || []).map(t => t.id === id ? { ...t, done: !t.done } : t)
  }));

  const delT = (cat, id) => {
    setTF(selDate, p => ({ ...p, [cat]: (p[cat] || []).filter(t => t.id !== id) }));
    if (expTask === id) setExpTask(null);
  };

  const addT = () => {
    if (!newTask.text.trim()) return;
    const id = Date.now();
    setTF(selDate, p => ({
      ...p,
      [newTask.cat]: [...(p[newTask.cat] || []), { id, text: newTask.text, time: newTask.time, done: false, note: newTask.note }]
        .sort((a, b) => a.time.localeCompare(b.time))
    }));
    setNewTask({ text: "", time: "09:00", cat: newTask.cat, note: "" });
    setShowAdd(false);
  };

  const saveN = (cat, id) => {
    setTF(selDate, p => ({ ...p, [cat]: (p[cat] || []).map(t => t.id === id ? { ...t, note: noteVal } : t) }));
    setEditNote(null);
  };

  const startEditT = (cat, t) => { setEditingTask(t.id); setEtText(t.text); setEtTime(t.time); setEtCat(cat); };
  const saveEditT = (origCat, id) => {
    if (!etText.trim()) return;
    if (etCat !== origCat) {
      setTF(selDate, p => {
        const old = (p[origCat] || []).filter(t => t.id !== id);
        const tk = (p[origCat] || []).find(t => t.id === id);
        if (!tk) return p;
        const nl = [...(p[etCat] || []), { ...tk, text: etText, time: etTime }].sort((a, b) => a.time.localeCompare(b.time));
        return { ...p, [origCat]: old, [etCat]: nl };
      });
    } else {
      setTF(selDate, p => ({
        ...p, [origCat]: (p[origCat] || []).map(t => t.id === id ? { ...t, text: etText, time: etTime } : t)
          .sort((a, b) => a.time.localeCompare(b.time))
      }));
    }
    setEditingTask(null);
  };

  const copyYesterday = () => {
    const yt = tasksByDate[addDays(selDate, -1)];
    if (!yt) return;
    const cp = {};
    Object.entries(yt).forEach(([c, l]) => {
      cp[c] = l.map(t => ({ ...t, id: Date.now() + Math.random() * 1e3, done: false }));
    });
    setTF(selDate, () => cp);
  };

  // Category helpers
  const startEC = (c) => { setEditCat(c.id); setEditCatLabel(c.label); setEditCatEmoji(c.emoji); setShowEmoji(false); };
  const saveEC = () => { if (!editCatLabel.trim()) return; setCats(p => p.map(c => c.id === editCat ? { ...c, label: editCatLabel, emoji: editCatEmoji } : c)); setEditCat(null); };
  const addCat = () => setCats(p => [...p, { id: "cat" + Date.now(), label: "새 업무", emoji: "💼" }]);
  const delCat = (cid) => { if (cats.length <= 1) return; setCats(p => p.filter(c => c.id !== cid)); setProjects(p => p.filter(pr => pr.catId !== cid)); setEditCat(null); };

  // Project helpers
  const addP = () => {
    if (!newProj.name.trim()) return;
    setProjects(p => [...p, { id: "p" + Date.now(), ...newProj, progress: 0 }]);
    setNewProj({ name: "", catId: "cat1", startMonth: 1, endMonth: 3, note: "" });
    setShowAddProj(false);
  };
  const delP = (id) => { setProjects(p => p.filter(pr => pr.id !== id)); setExpProj(null); };
  const savePN = (id) => { setProjects(p => p.map(pr => pr.id === id ? { ...pr, note: projNoteVal } : pr)); setEditProjNote(null); };
  const updPP = (id, v) => setProjects(p => p.map(pr => pr.id === id ? { ...pr, progress: Math.min(100, Math.max(0, v)) } : pr));

  const startEditP = (pr) => { setEditingProj(pr.id); setEpName(pr.name); setEpCat(pr.catId); setEpStart(pr.startMonth); setEpEnd(pr.endMonth); };
  const saveEditP = (id) => {
    if (!epName.trim()) return;
    setProjects(p => p.map(pr => pr.id === id ? { ...pr, name: epName, catId: epCat, startMonth: epStart, endMonth: epEnd } : pr));
    setEditingProj(null);
  };

  // Derived
  const total = Object.values(tasks).flat().length;
  const done = Object.values(tasks).flat().filter(t => t.done).length;
  const prog = total > 0 ? (done / total) * 100 : 0;
  const fCats = activeCat ? cats.filter(c => c.id === activeCat) : cats;
  const cal = getMiniCal(selDate);
  const cMonth = kNow.getMonth() + 1;
  const tDateNum = kNow.getDate();
  const TY = kNow.getFullYear();
  const goDay = (n) => { setSelDate(addDays(selDate, n)); setExpTask(null); setEditingTask(null); };
  const hasT = (ds) => { const t = tasksByDate[ds]; return t && Object.values(t).flat().length > 0; };

  /* ── RENDER ── */
  return (
    <div style={S.wrap}>
      {/* Tab Bar */}
      <div style={S.topTabs}>
        <button style={{ ...S.topTab, ...(tab === "daily" ? S.topTabOn : {}) }} onClick={() => setTab("daily")}>📋 오늘 할 일</button>
        <button style={{ ...S.topTab, ...(tab === "projects" ? S.topTabOn : {}) }} onClick={() => setTab("projects")}>📊 연간 프로젝트</button>
      </div>

      {/* ═══ DAILY TAB ═══ */}
      {tab === "daily" && (
        <div>
          {/* Header */}
          <div style={S.hdr}>
            <div style={S.dnav}>
              <button style={S.dnavBtn} onClick={() => goDay(-1)}>◀</button>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={S.hdrDate}>{dateInfo.month}월 {dateInfo.date}일 {dateInfo.day}요일</div>
                <div style={S.hdrYr}>
                  {dateInfo.year}
                  {isToday && <span style={{ ...S.badge, background: "rgba(255,255,255,.5)" }}>오늘</span>}
                  {!isToday && <span style={S.badge}>{selDate < todayStr ? "지난 일정" : "미래 일정"}</span>}
                </div>
              </div>
              <button style={S.dnavBtn} onClick={() => goDay(1)}>▶</button>
            </div>
            <div style={S.qrow}>
              {!isToday && <button style={S.qbtn} onClick={() => setSelDate(todayStr)}>📌 오늘로</button>}
              <button style={S.qbtn} onClick={() => setShowCal(!showCal)}>{showCal ? "✕ 닫기" : "📅 달력"}</button>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                <span style={{ opacity: 0.7 }}>{isToday ? "오늘의 진행률" : "해당일 진행률"}</span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{done}/{total}</span>
              </div>
              <div style={S.pbar}><div style={{ ...S.pbarF, width: `${prog}%` }} /></div>
            </div>
          </div>

          {/* Category Tabs */}
          <div style={S.ctabs}>
            <button style={{ ...S.ctab, ...(activeCat === null ? S.ctabOn : {}) }} onClick={() => setActiveCat(null)}>전체</button>
            {cats.map(c => {
              const s = getCS(c.id);
              const ct = tasks[c.id] || [];
              return (
                <button key={c.id}
                  style={{ ...S.ctab, ...(activeCat === c.id ? { background: s.bg, color: s.color, borderColor: s.accent } : {}) }}
                  onClick={() => setActiveCat(activeCat === c.id ? null : c.id)}>
                  {c.emoji} {c.label}
                  <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 3 }}>{ct.filter(t => t.done).length}/{ct.length}</span>
                </button>
              );
            })}
            <button style={{ ...S.ctab, borderStyle: "dashed", color: "#C4B580" }} onClick={addCat}>+ 추가</button>
          </div>

          {/* Empty State */}
          {total === 0 && (
            <div style={{ padding: "40px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#7A6B40", marginBottom: 14 }}>
                {isToday ? "오늘 할 일을 추가해보세요!" : "등록된 일정이 없습니다"}
              </div>
              {hasT(addDays(selDate, -1)) && (
                <button style={S.copyBtn} onClick={copyYesterday}>📋 전날 일정 복사</button>
              )}
            </div>
          )}

          {/* Task List */}
          <div style={{ padding: "8px 16px" }}>
            {fCats.map(cat => {
              const s = getCS(cat.id);
              const ct = (tasks[cat.id] || []).sort((a, b) => a.time.localeCompare(b.time));
              if (ct.length === 0) return null;
              return (
                <div key={cat.id} style={{ ...S.sec, borderLeftColor: s.accent }}>
                  <div style={{ ...S.secH, background: s.bg }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{cat.emoji} {cat.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: s.accent }}>{ct.filter(t => t.done).length}/{ct.length}</span>
                      <button style={S.ecBtn} onClick={() => startEC(cat)}>✎</button>
                    </div>
                  </div>
                  <div style={{ padding: "2px 0 6px" }}>
                    {ct.map(t => (
                      <div key={t.id}>
                        <div style={{ ...S.tRow, opacity: t.done ? 0.5 : 1 }}>
                          <button style={{ ...S.chk, background: t.done ? s.accent : "transparent", borderColor: t.done ? s.accent : "#E0D8B8" }}
                            onClick={() => toggleT(cat.id, t.id)}>
                            {t.done && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          </button>
                          <span style={S.tTime}>{t.time}</span>
                          <span style={{ ...S.tText, textDecoration: t.done ? "line-through" : "none", flex: 1, cursor: "pointer" }}
                            onClick={() => setExpTask(expTask === t.id ? null : t.id)}>
                            {t.text}{t.note && expTask !== t.id && <span style={{ marginLeft: 5, fontSize: 10 }}>📌</span>}
                          </span>
                          <button style={S.delBtn} onClick={() => delT(cat.id, t.id)}>×</button>
                        </div>

                        {/* Expanded Panel */}
                        {expTask === t.id && (
                          <div style={{ ...S.nPanel, background: s.bg, borderLeftColor: s.accent }}>
                            {/* Edit Task */}
                            {editingTask === t.id ? (
                              <div style={{ marginBottom: 10 }}>
                                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                                  <input type="time" value={etTime} onChange={e => setEtTime(e.target.value)} style={{ ...S.addTime, flex: "none" }} />
                                  <input value={etText} onChange={e => setEtText(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && saveEditT(cat.id, t.id)} style={S.addInput} autoFocus />
                                </div>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <select value={etCat} onChange={e => setEtCat(e.target.value)} style={{ ...S.addSel, flex: 1 }}>
                                    {cats.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                                  </select>
                                  <button style={S.nSave} onClick={() => saveEditT(cat.id, t.id)}>저장</button>
                                  <button style={S.nCancel} onClick={() => setEditingTask(null)}>취소</button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ ...S.nDisp, marginBottom: 10 }} onClick={() => startEditT(cat.id, t)}>
                                <div style={{ fontSize: 12, color: s.color, fontWeight: 600 }}>✎ 할 일 수정하려면 탭하세요</div>
                              </div>
                            )}
                            {/* Edit Note */}
                            {editNote === t.id ? (
                              <div style={{ display: "flex", gap: 8 }}>
                                <textarea value={noteVal} onChange={e => setNoteVal(e.target.value)} style={S.nTA}
                                  placeholder="메모를 입력하세요..." rows={3} autoFocus />
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  <button style={S.nSave} onClick={() => saveN(cat.id, t.id)}>저장</button>
                                  <button style={S.nCancel} onClick={() => setEditNote(null)}>취소</button>
                                </div>
                              </div>
                            ) : (
                              <div style={S.nDisp} onClick={() => { setEditNote(t.id); setNoteVal(t.note); }}>
                                {t.note ? <div style={S.nText}>📌 {t.note}</div> : <div style={S.nPH}>탭하여 메모 추가...</div>}
                                <span style={{ fontSize: 12, opacity: 0.4 }}>✎</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* FAB */}
          <button style={S.fab} onClick={() => setShowAdd(!showAdd)}>{showAdd ? "✕" : "+"}</button>

          {/* Add Panel */}
          {showAdd && (
            <div style={S.addP}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "#7A6210" }}>
                {isToday ? "오늘" : `${dateInfo.month}/${dateInfo.date}`} 할 일 추가
              </div>
              <div style={S.addR}>
                <select value={newTask.cat} onChange={e => setNewTask({ ...newTask, cat: e.target.value })} style={S.addSel}>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                </select>
                <input type="time" value={newTask.time} onChange={e => setNewTask({ ...newTask, time: e.target.value })} style={S.addTime} />
              </div>
              <div style={S.addR}>
                <input placeholder="할 일을 입력하세요" value={newTask.text}
                  onChange={e => setNewTask({ ...newTask, text: e.target.value })}
                  onKeyDown={e => e.key === "Enter" && addT()} style={S.addInput} />
              </div>
              <div style={S.addR}>
                <input placeholder="메모 (선택)" value={newTask.note} onChange={e => setNewTask({ ...newTask, note: e.target.value })} style={S.addInput} />
                <button style={S.addBtn} onClick={addT}>추가</button>
              </div>
            </div>
          )}

          {/* Calendar */}
          {showCal && (
            <div style={S.calP}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#7A6210", marginBottom: 10, textAlign: "center" }}>{cal.year}년 {cal.month}월</div>
              <div style={S.calG}>
                {["일","월","화","수","목","금","토"].map(d => <div key={d} style={{ fontSize: 10, fontWeight: 700, color: "#B8A060", padding: "3px 0" }}>{d}</div>)}
                {cal.blanks.map((_, i) => <div key={"b" + i} />)}
                {cal.days.map(d => {
                  const ds = `${cal.year}-${String(cal.month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  const isSel = ds === selDate;
                  const isTod = ds === todayStr;
                  return (
                    <div key={d}
                      style={{ fontSize: 12, padding: "6px 0", borderRadius: 8, cursor: "pointer", position: "relative",
                        color: isSel ? "#fff" : "#7A6B40", fontWeight: isSel || isTod ? 800 : 500,
                        background: isSel ? "#E8B830" : isTod ? "#FAEBC0" : "transparent",
                        outline: isTod && !isSel ? "1.5px solid #E8B830" : "none" }}
                      onClick={() => { setSelDate(ds); setShowCal(false); }}>
                      {d}
                      {hasT(ds) && !isSel && <div style={S.calDot} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date Strip */}
          <div style={S.hStrip}>
            {Array.from({ length: 7 }, (_, i) => {
              const ds = addDays(selDate, -(3 - i));
              const di = formatDateKR(ds);
              const isSel = ds === selDate;
              const isTod = ds === todayStr;
              return (
                <button key={ds} style={{ ...S.hDay, ...(isSel ? S.hDayOn : {}), ...(isTod && !isSel ? { borderColor: "#E8B830" } : {}) }}
                  onClick={() => setSelDate(ds)}>
                  <div style={{ fontSize: 10, color: isSel ? "#fff" : "#B8A060", fontWeight: 600 }}>{di.day}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: isSel ? "#fff" : "#3E2C00" }}>{di.date}</div>
                  {isTod && !isSel && <div style={{ fontSize: 8, color: "#E8B830", fontWeight: 700 }}>오늘</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ PROJECTS TAB ═══ */}
      {tab === "projects" && (
        <div>
          <div style={S.pHdr}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#3E2C00" }}>📊 {TY}년 프로젝트 타임라인</div>
            <div style={{ fontSize: 12, color: "#6B5A20", marginTop: 4, opacity: 0.8 }}>프로젝트를 연간 일정으로 한눈에</div>
          </div>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }} ref={tlRef}>
            <div style={{ minWidth: 900 }}>
              <div style={S.gMR}>
                <div style={S.gLC} />
                {MONTHS.map((m, i) => (
                  <div key={i} style={{ ...S.gMC, ...(i + 1 === cMonth ? { color: "#E85830", borderBottom: "2px solid #E85830" } : {}) }}>{m}</div>
                ))}
              </div>
              {cats.map(cat => {
                const s = getCS(cat.id);
                const cp = projects.filter(p => p.catId === cat.id);
                return (
                  <div key={cat.id}>
                    <div style={{ display: "flex", alignItems: "center", padding: "6px 0" }}>
                      <div style={{ ...S.gCatL, color: s.color, background: s.bg }}>{cat.emoji} {cat.label}</div>
                      <div style={{ flex: 1, height: 1, background: "#F0E6C0" }} />
                    </div>
                    {cp.map(pr => (
                      <div key={pr.id}>
                        <div style={S.gRow} onClick={() => setExpProj(expProj === pr.id ? null : pr.id)}>
                          <div style={S.gLC}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#3E2C00" }}>{pr.name}</div>
                            <div style={{ fontSize: 10, color: "#B8A060" }}>{pr.startMonth}월~{pr.endMonth}월</div>
                          </div>
                          {MONTHS.map((_, mi) => {
                            const m = mi + 1;
                            const inR = m >= pr.startMonth && m <= pr.endMonth;
                            const isS = m === pr.startMonth;
                            const isE = m === pr.endMonth;
                            return (
                              <div key={mi} style={{ flex: 1, position: "relative", padding: "6px 0" }}>
                                {inR && (
                                  <div style={{
                                    height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                                    background: `linear-gradient(90deg,${s.accent}CC,${s.accent}88)`,
                                    borderRadius: isS && isE ? 8 : isS ? "8px 0 0 8px" : isE ? "0 8px 8px 0" : 0,
                                    marginLeft: isS ? 4 : 0, marginRight: isE ? 4 : 0,
                                    position: "relative", overflow: "hidden",
                                  }}>
                                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pr.progress}%`, background: s.accent, borderRadius: "inherit" }} />
                                    {isS && <span style={{ position: "relative", zIndex: 1, fontSize: 10, fontWeight: 700, color: "#fff", padding: "0 6px" }}>{pr.progress}%</span>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Expanded Project */}
                        {expProj === pr.id && (
                          <div style={{ ...S.pDet, background: s.bg, borderLeftColor: s.accent }}>
                            {editingProj === pr.id ? (
                              <div style={{ marginBottom: 12 }}>
                                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                                  <input value={epName} onChange={e => setEpName(e.target.value)} style={{ ...S.addInput, flex: 2 }} placeholder="프로젝트명" />
                                  <select value={epCat} onChange={e => setEpCat(e.target.value)} style={S.addSel}>
                                    {cats.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                                  </select>
                                </div>
                                <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                                  <span style={{ fontSize: 12, color: "#888" }}>시작</span>
                                  <select value={epStart} onChange={e => setEpStart(parseInt(e.target.value))} style={S.addSel}>
                                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                  </select>
                                  <span style={{ fontSize: 12, color: "#888" }}>종료</span>
                                  <select value={epEnd} onChange={e => setEpEnd(parseInt(e.target.value))} style={S.addSel}>
                                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                  </select>
                                </div>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button style={S.nSave} onClick={() => saveEditP(pr.id)}>저장</button>
                                  <button style={S.nCancel} onClick={() => setEditingProj(null)}>취소</button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => startEditP(pr)}>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: s.color, marginBottom: 4 }}>{pr.name} <span style={{ fontSize: 11, opacity: 0.5 }}>✎ 수정</span></div>
                                  <div style={{ fontSize: 12, color: "#888" }}>{pr.startMonth}월~{pr.endMonth}월 · {getC(pr.catId).label}</div>
                                </div>
                                <button style={S.pDelBtn} onClick={e => { e.stopPropagation(); delP(pr.id); }}>삭제</button>
                              </div>
                            )}
                            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>진행률</span>
                              <input type="range" min={0} max={100} value={pr.progress}
                                onChange={e => updPP(pr.id, parseInt(e.target.value))}
                                style={{ flex: 1, accentColor: s.accent }} />
                              <span style={{ fontSize: 14, fontWeight: 800, color: s.accent, cursor: "pointer" }}
                                onClick={() => setEditProjProg(pr.id)}>{pr.progress}%</span>
                            </div>
                            {editProjNote === pr.id ? (
                              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                <textarea value={projNoteVal} onChange={e => setProjNoteVal(e.target.value)} style={S.nTA} placeholder="프로젝트 메모..." rows={2} autoFocus />
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  <button style={S.nSave} onClick={() => savePN(pr.id)}>저장</button>
                                  <button style={S.nCancel} onClick={() => setEditProjNote(null)}>취소</button>
                                </div>
                              </div>
                            ) : (
                              <div style={S.nDisp} onClick={() => { setEditProjNote(pr.id); setProjNoteVal(pr.note); }}>
                                {pr.note ? <div style={S.nText}>{pr.note}</div> : <div style={S.nPH}>탭하여 메모 추가...</div>}
                                <span style={{ fontSize: 12, opacity: 0.4 }}>✎</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {cp.length === 0 && <div style={{ padding: "8px 16px", fontSize: 12, color: "#bbb" }}>등록된 프로젝트 없음</div>}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Summary */}
          <div style={{ display: "flex", gap: 10, padding: "12px 16px", overflowX: "auto" }}>
            {cats.map(cat => {
              const s = getCS(cat.id);
              const cp = projects.filter(p => p.catId === cat.id);
              const avg = cp.length ? Math.round(cp.reduce((a, p) => a + p.progress, 0) / cp.length) : 0;
              return (
                <div key={cat.id} style={{ ...S.sumCard, borderTopColor: s.accent }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{cat.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{cat.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.accent, margin: "4px 0" }}>{avg}%</div>
                  <div style={{ fontSize: 11, color: "#aaa" }}>{cp.length}개</div>
                </div>
              );
            })}
          </div>
          <button style={S.fab} onClick={() => setShowAddProj(!showAddProj)}>{showAddProj ? "✕" : "+"}</button>
          {showAddProj && (
            <div style={S.addP}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "#7A6210" }}>새 프로젝트 추가</div>
              <div style={S.addR}>
                <input placeholder="프로젝트명" value={newProj.name} onChange={e => setNewProj({ ...newProj, name: e.target.value })} style={{ ...S.addInput, flex: 2 }} />
                <select value={newProj.catId} onChange={e => setNewProj({ ...newProj, catId: e.target.value })} style={S.addSel}>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
              <div style={S.addR}>
                <span style={{ fontSize: 12, color: "#888" }}>시작</span>
                <select value={newProj.startMonth} onChange={e => setNewProj({ ...newProj, startMonth: parseInt(e.target.value) })} style={S.addSel}>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <span style={{ fontSize: 12, color: "#888" }}>종료</span>
                <select value={newProj.endMonth} onChange={e => setNewProj({ ...newProj, endMonth: parseInt(e.target.value) })} style={S.addSel}>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div style={S.addR}>
                <input placeholder="메모 (선택)" value={newProj.note} onChange={e => setNewProj({ ...newProj, note: e.target.value })} style={S.addInput} />
                <button style={S.addBtn} onClick={addP}>추가</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ CATEGORY EDIT MODAL ═══ */}
      {editCat && (
        <div style={S.ov} onClick={() => { setEditCat(null); setShowEmoji(false); }}>
          <div style={S.eModal} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#3E2C00", marginBottom: 14 }}>카테고리 수정</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <button style={S.emojiBtn} onClick={() => setShowEmoji(!showEmoji)}>{editCatEmoji}</button>
              <input ref={editRef} style={S.eInput} value={editCatLabel}
                onChange={e => setEditCatLabel(e.target.value)} onKeyDown={e => e.key === "Enter" && saveEC()} placeholder="업무 이름" />
            </div>
            {showEmoji && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 4, marginBottom: 8 }}>
                {EMOJIS.map(em => (
                  <button key={em} style={{ ...S.emojiOp, ...(editCatEmoji === em ? { background: "#FFF0B0", transform: "scale(1.15)" } : {}) }}
                    onClick={() => { setEditCatEmoji(em); setShowEmoji(false); }}>{em}</button>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button style={S.eSaveBtn} onClick={saveEC}>저장</button>
              <button style={S.eDelBtn} onClick={() => delCat(editCat)}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── STYLES ── */
const S = {
  wrap: { fontFamily: "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif", maxWidth: 600, margin: "0 auto", background: "#FFFDF5", minHeight: "100vh", position: "relative", paddingBottom: 68 },
  topTabs: { display: "flex", background: "#3E2C00" },
  topTab: { flex: 1, padding: "14px 0", border: "none", background: "transparent", color: "#B8A060", fontSize: 14, fontWeight: 700, cursor: "pointer", borderBottom: "3px solid transparent", fontFamily: "inherit" },
  topTabOn: { color: "#F5D54A", background: "rgba(245,213,74,.08)", borderBottomColor: "#F5D54A" },
  hdr: { background: "linear-gradient(135deg,#E8B830,#F5D54A 40%,#F0C840)", padding: "20px 20px 16px", color: "#3E2C00" },
  dnav: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
  dnavBtn: { background: "rgba(255,255,255,.35)", border: "none", borderRadius: 10, width: 36, height: 36, fontSize: 14, cursor: "pointer", color: "#3E2C00", fontWeight: 700, fontFamily: "inherit" },
  hdrDate: { fontSize: 22, fontWeight: 800, letterSpacing: -0.5 },
  hdrYr: { fontSize: 12, opacity: 0.6, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
  badge: { fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 700, background: "rgba(0,0,0,.12)" },
  qrow: { display: "flex", gap: 6, justifyContent: "center", marginBottom: 10 },
  qbtn: { padding: "5px 14px", borderRadius: 16, border: "1.5px solid rgba(255,255,255,.4)", background: "rgba(255,255,255,.25)", fontSize: 11, fontWeight: 600, color: "#3E2C00", cursor: "pointer", fontFamily: "inherit" },
  pbar: { height: 7, background: "rgba(255,255,255,.45)", borderRadius: 10, overflow: "hidden" },
  pbarF: { height: "100%", borderRadius: 10, transition: "width .5s", background: "linear-gradient(90deg,#B8860B,#DAA520)" },
  ctabs: { display: "flex", gap: 6, padding: "12px 16px", overflowX: "auto", background: "#FFFEF8", borderBottom: "1px solid #F0E6C0", position: "sticky", top: 0, zIndex: 10 },
  ctab: { padding: "7px 13px", borderRadius: 20, border: "1.5px solid #E8DFC0", background: "#FFFEF8", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4, color: "#7A6B40", fontFamily: "inherit" },
  ctabOn: { background: "#E8B830", color: "#fff", borderColor: "#E8B830" },
  copyBtn: { padding: "10px 20px", borderRadius: 12, border: "1.5px solid #E8DFC0", background: "#FFFEF8", fontSize: 13, fontWeight: 700, color: "#7A6210", cursor: "pointer", fontFamily: "inherit" },
  sec: { marginBottom: 14, borderRadius: 14, overflow: "hidden", background: "#fff", borderLeft: "4px solid #ccc", boxShadow: "0 1px 3px rgba(0,0,0,.04)" },
  secH: { padding: "11px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  ecBtn: { background: "none", border: "none", fontSize: 13, cursor: "pointer", opacity: 0.4, padding: "2px 4px" },
  tRow: { display: "flex", alignItems: "center", padding: "9px 16px", gap: 10 },
  chk: { width: 22, height: 22, borderRadius: 6, border: "2px solid #E0D8B8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  tTime: { fontSize: 11, fontWeight: 700, color: "#B8A060", width: 40, flexShrink: 0 },
  tText: { fontSize: 13, color: "#333", fontWeight: 500 },
  delBtn: { background: "none", border: "none", fontSize: 17, color: "#ddd", cursor: "pointer", padding: "0 4px" },
  nPanel: { margin: "0 14px 6px", padding: "10px 12px", borderRadius: 9, borderLeft: "3px solid #ccc" },
  nDisp: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer", gap: 8, marginTop: 4 },
  nText: { fontSize: 12, color: "#555", lineHeight: 1.6, whiteSpace: "pre-wrap", flex: 1 },
  nPH: { fontSize: 12, color: "#bbb", fontStyle: "italic" },
  nTA: { flex: 1, padding: "9px 11px", borderRadius: 9, border: "1.5px solid #E8DFC0", fontSize: 12, resize: "vertical", fontFamily: "inherit", background: "#FFFEF8", outline: "none" },
  nSave: { padding: "7px 13px", borderRadius: 8, border: "none", background: "#E8B830", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" },
  nCancel: { padding: "7px 13px", borderRadius: 8, border: "1px solid #E0D8B8", background: "#fff", color: "#888", fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: "inherit" },
  fab: { position: "fixed", bottom: 76, right: 24, width: 54, height: 54, borderRadius: "50%", background: "linear-gradient(135deg,#E8B830,#F5D54A)", color: "#3E2C00", fontSize: 26, fontWeight: 700, border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(232,184,48,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20, fontFamily: "inherit" },
  addP: { position: "fixed", bottom: 140, right: 16, left: 16, maxWidth: 520, margin: "0 auto", background: "#FFFEF8", borderRadius: 16, padding: 18, boxShadow: "0 8px 32px rgba(0,0,0,.15)", zIndex: 20, border: "1px solid #F0E6C0" },
  addR: { display: "flex", gap: 8, marginBottom: 8, alignItems: "center" },
  addSel: { flex: 1, padding: "9px 10px", borderRadius: 9, border: "1.5px solid #E8DFC0", fontSize: 12, fontWeight: 600, background: "#FFFDF5", fontFamily: "inherit" },
  addTime: { width: 100, padding: "9px 10px", borderRadius: 9, border: "1.5px solid #E8DFC0", fontSize: 12, fontWeight: 600, background: "#FFFDF5", fontFamily: "inherit" },
  addInput: { flex: 1, padding: "9px 12px", borderRadius: 9, border: "1.5px solid #E8DFC0", fontSize: 13, background: "#FFFDF5", fontFamily: "inherit" },
  addBtn: { padding: "9px 18px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#E8B830,#F5D54A)", color: "#3E2C00", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  calP: { margin: "8px 16px", background: "#fff", borderRadius: 14, padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,.04)", border: "1px solid #F0E6C0" },
  calG: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, textAlign: "center", marginBottom: 16 },
  calDot: { position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: "#D4A812" },
  hStrip: { position: "fixed", bottom: 0, left: 0, right: 0, background: "#FFFEF8", borderTop: "1px solid #F0E6C0", display: "flex", justifyContent: "center", gap: 4, padding: "8px 12px", zIndex: 15 },
  hDay: { width: 44, padding: "6px 0", borderRadius: 10, border: "1.5px solid #E8DFC0", background: "#fff", cursor: "pointer", textAlign: "center", fontFamily: "inherit" },
  hDayOn: { background: "#E8B830", borderColor: "#E8B830" },
  pHdr: { background: "linear-gradient(135deg,#E8B830,#F5D54A 40%,#F0C840)", padding: "24px 24px 18px" },
  gMR: { display: "flex", borderBottom: "2px solid #F0E6C0", position: "sticky", top: 0, background: "#FFFEF8", zIndex: 5 },
  gLC: { width: 140, minWidth: 140, flexShrink: 0, padding: "8px 16px" },
  gMC: { flex: 1, textAlign: "center", padding: "10px 0", fontSize: 12, fontWeight: 700, color: "#B8A060" },
  gCatL: { width: 140, minWidth: 140, flexShrink: 0, padding: "6px 16px", fontSize: 12, fontWeight: 800, borderRadius: "0 8px 8px 0" },
  gRow: { display: "flex", alignItems: "center", cursor: "pointer", minHeight: 44 },
  pDet: { margin: "0 16px 8px", padding: "14px 16px", borderRadius: 10, borderLeft: "4px solid #ccc" },
  pDelBtn: { padding: "5px 12px", borderRadius: 8, border: "1.5px solid #e8c0c0", background: "#fff", color: "#c44", fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: "inherit" },
  sumCard: { flex: 1, minWidth: 100, background: "#fff", borderRadius: 12, padding: "14px 12px", textAlign: "center", borderTop: "3px solid #ccc", boxShadow: "0 1px 3px rgba(0,0,0,.04)" },
  ov: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" },
  eModal: { background: "#FFFEF8", borderRadius: 18, padding: 22, width: "90%", maxWidth: 380, boxShadow: "0 16px 48px rgba(0,0,0,.2)" },
  emojiBtn: { width: 46, height: 46, borderRadius: 12, border: "2px solid #E8DFC0", background: "#FFFDF5", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  eInput: { flex: 1, padding: "11px 13px", borderRadius: 12, border: "1.5px solid #E8DFC0", fontSize: 14, fontWeight: 600, background: "#FFFDF5", outline: "none", fontFamily: "inherit" },
  emojiOp: { width: 36, height: 36, borderRadius: 8, border: "none", background: "#FFFDF5", fontSize: 17, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  eSaveBtn: { flex: 1, padding: "10px 0", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#E8B830,#F5D54A)", color: "#3E2C00", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  eDelBtn: { padding: "10px 18px", borderRadius: 12, border: "1.5px solid #e8c0c0", background: "#fff", color: "#c44", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
};
