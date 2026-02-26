import { useState, useRef, useEffect, useCallback } from "react";

/* ───────── HELPERS ───────── */
function toKST(d = new Date()) {
  return new Date(d.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
}
function kstDateStr(d = toKST()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function parseDate(str) {
  const [y,m,d] = str.split("-").map(Number);
  return new Date(y, m-1, d);
}
function formatDateKR(str) {
  const d = parseDate(str);
  const days = ["일","월","화","수","목","금","토"];
  return { year: d.getFullYear(), month: d.getMonth()+1, date: d.getDate(), day: days[d.getDay()] };
}
function addDays(str, n) {
  const d = parseDate(str);
  d.setDate(d.getDate() + n);
  return kstDateStr(d);
}
function kstHour() { return toKST().getHours(); }

/* ───────── DATA ───────── */
const DEFAULT_CATEGORIES = [
  { id: "cat1", label: "서울경제", emoji: "📰" },
  { id: "cat2", label: "뉴스쿨", emoji: "🎒" },
  { id: "cat3", label: "육아", emoji: "🧸" },
];
const CAT_STYLES = [
  { color: "#7A6210", bg: "#FFF8DC", accent: "#D4A812" },
  { color: "#8B5E2B", bg: "#FFF3E0", accent: "#E8963A" },
  { color: "#5C6B2F", bg: "#F4F8E8", accent: "#8FA644" },
  { color: "#5B3A7A", bg: "#F3EBF8", accent: "#9B6BC4" },
  { color: "#2B6E8B", bg: "#E8F4F8", accent: "#3AA0C8" },
];
const SAMPLE_TASKS = {
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
const INITIAL_PROJECTS = [
  { id: "p1", name: "연간 기획 시리즈", catId: "cat1", startMonth: 1, endMonth: 4, progress: 75, note: "1~4월 연재 기획" },
  { id: "p2", name: "디지털 전환 프로젝트", catId: "cat1", startMonth: 3, endMonth: 8, progress: 40, note: "CMS 이전 포함" },
  { id: "p3", name: "뉴스쿨 리브랜딩", catId: "cat2", startMonth: 2, endMonth: 5, progress: 60, note: "디자인 + 콘텐츠 전면 개편" },
  { id: "p4", name: "여름 특집 콘텐츠", catId: "cat2", startMonth: 5, endMonth: 8, progress: 10, note: "" },
  { id: "p5", name: "초등 입학 준비", catId: "cat3", startMonth: 1, endMonth: 3, progress: 90, note: "서류, 준비물, 학교 적응" },
  { id: "p6", name: "가족 여행 계획", catId: "cat3", startMonth: 7, endMonth: 8, progress: 5, note: "제주도 or 해외" },
];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7);
const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const EMOJI_OPTIONS = ["📰","🎒","🧸","💼","🎯","📝","💡","🏠","🎨","📊","🔬","🎓","🏃","🍳","📱","✈️"];

function getMiniCalendarDays(dateStr) {
  const d = parseDate(dateStr);
  const y = d.getFullYear(), m = d.getMonth();
  const firstDay = new Date(y,m,1).getDay();
  const dim = new Date(y,m+1,0).getDate();
  return { blanks: Array(firstDay).fill(null), days: Array.from({length:dim},(_,i)=>i+1), today: d.getDate(), month: m+1, year: y };
}

/* ───────── STORAGE HELPERS ───────── */
function loadDataSync(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function saveDataSync(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) { console.error("save error", e); }
}
// Keep async wrappers for compatibility
async function loadData(key, fallback) { return loadDataSync(key, fallback); }
async function saveData(key, value) { saveDataSync(key, value); }

/* ───────── MAIN ───────── */
export default function DailySchedule() {
  const todayStr = kstDateStr();
  const [tab, setTab] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [currentHour, setCurrentHour] = useState(kstHour());
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [tasksByDate, setTasksByDate] = useState({});
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [activeCategory, setActiveCategory] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [newTask, setNewTask] = useState({ text:"", time:"09:00", cat:"cat1", note:"" });
  const [showAdd, setShowAdd] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [editCatLabel, setEditCatLabel] = useState("");
  const [editCatEmoji, setEditCatEmoji] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [expandedTask, setExpandedTask] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [noteValue, setNoteValue] = useState("");
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProject, setNewProject] = useState({ name:"", catId:"cat1", startMonth:1, endMonth:3, note:"" });
  const [expandedProject, setExpandedProject] = useState(null);
  const [editingProjectNote, setEditingProjectNote] = useState(null);
  const [projectNoteValue, setProjectNoteValue] = useState("");
  const [editingProjectProgress, setEditingProjectProgress] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const editRef = useRef(null);
  const timelineRef = useRef(null);

  const isToday = selectedDate === todayStr;
  const dateInfo = formatDateKR(selectedDate);
  const tasks = tasksByDate[selectedDate] || {};

  // ── Load from storage on mount ──
  useEffect(() => {
    (async () => {
      const cats = await loadData("schedule-categories", DEFAULT_CATEGORIES);
      const allTasks = await loadData("schedule-all-tasks", { [todayStr]: SAMPLE_TASKS });
      const projs = await loadData("schedule-projects", INITIAL_PROJECTS);
      setCategories(cats);
      setTasksByDate(allTasks);
      setProjects(projs);
      setLoaded(true);
    })();
  }, []);

  // ── Save to storage on change ──
  useEffect(() => { if(loaded) saveData("schedule-categories", categories); }, [categories, loaded]);
  useEffect(() => { if(loaded) saveData("schedule-all-tasks", tasksByDate); }, [tasksByDate, loaded]);
  useEffect(() => { if(loaded) saveData("schedule-projects", projects); }, [projects, loaded]);

  // ── Midnight auto-refresh (KST) ──
  useEffect(() => {
    const checkMidnight = () => {
      const nowKST = toKST();
      const newDateStr = kstDateStr(nowKST);
      if (newDateStr !== todayStr) {
        window.location.reload();
      }
      setCurrentHour(nowKST.getHours());
    };
    // Check every 30 seconds
    const interval = setInterval(checkMidnight, 30000);
    return () => clearInterval(interval);
  }, [todayStr]);

  // ── Also schedule precise midnight reload ──
  useEffect(() => {
    const nowKST = toKST();
    const midnight = new Date(nowKST);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 1, 0);
    const msUntilMidnight = midnight.getTime() - nowKST.getTime();
    const timer = setTimeout(() => window.location.reload(), msUntilMidnight);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => { if(editRef.current) editRef.current.focus(); }, [editingCat]);
  useEffect(() => {
    if(tab === "projects" && timelineRef.current) {
      const cm = toKST().getMonth();
      timelineRef.current.scrollLeft = Math.max(0, (cm-1)*72);
    }
  }, [tab]);

  const getCatStyle = (catId) => { const idx = categories.findIndex(c=>c.id===catId); return CAT_STYLES[(idx>=0?idx:0)%CAT_STYLES.length]; };
  const getCat = (catId) => categories.find(c=>c.id===catId) || { label:"?", emoji:"?" };

  // ── Task helpers (date-aware) ──
  const setTasksForDate = useCallback((date, updater) => {
    setTasksByDate(prev => {
      const current = prev[date] || {};
      const updated = typeof updater === "function" ? updater(current) : updater;
      return { ...prev, [date]: updated };
    });
  }, []);

  const toggleTask = (cat, id) => {
    setTasksForDate(selectedDate, prev => ({
      ...prev, [cat]: (prev[cat]||[]).map(t => t.id===id ? {...t, done:!t.done} : t)
    }));
  };
  const deleteTask = (cat, id) => {
    setTasksForDate(selectedDate, prev => ({
      ...prev, [cat]: (prev[cat]||[]).filter(t => t.id!==id)
    }));
    if(expandedTask===id) setExpandedTask(null);
  };
  const addTask = () => {
    if(!newTask.text.trim()) return;
    const id = Date.now();
    setTasksForDate(selectedDate, prev => ({
      ...prev,
      [newTask.cat]: [...(prev[newTask.cat]||[]), {id, text:newTask.text, time:newTask.time, done:false, note:newTask.note}]
        .sort((a,b)=>a.time.localeCompare(b.time))
    }));
    setNewTask({text:"",time:"09:00",cat:newTask.cat,note:""}); setShowAdd(false);
  };
  const saveNote = (cat, id) => {
    setTasksForDate(selectedDate, prev => ({
      ...prev, [cat]: (prev[cat]||[]).map(t => t.id===id ? {...t, note:noteValue} : t)
    }));
    setEditingNote(null);
  };
  const copyYesterdayTasks = () => {
    const yesterday = addDays(selectedDate, -1);
    const yTasks = tasksByDate[yesterday];
    if(!yTasks || Object.keys(yTasks).length === 0) return;
    const copied = {};
    Object.entries(yTasks).forEach(([cat, list]) => {
      copied[cat] = list.map(t => ({...t, id: Date.now() + Math.random()*1000, done: false}));
    });
    setTasksForDate(selectedDate, copied);
  };

  // ── Category helpers ──
  const startEditCat = (cat) => { setEditingCat(cat.id); setEditCatLabel(cat.label); setEditCatEmoji(cat.emoji); setShowEmojiPicker(false); };
  const saveCat = () => { if(!editCatLabel.trim()) return; setCategories(p=>p.map(c=>c.id===editingCat?{...c,label:editCatLabel,emoji:editCatEmoji}:c)); setEditingCat(null); setShowEmojiPicker(false); };
  const addCategory = () => { const nid="cat"+Date.now(); setCategories(p=>[...p,{id:nid,label:"새 업무",emoji:"💼"}]); };
  const deleteCategory = (catId) => { if(categories.length<=1) return; setCategories(p=>p.filter(c=>c.id!==catId)); setProjects(p=>p.filter(pr=>pr.catId!==catId)); if(activeCategory===catId) setActiveCategory(null); setEditingCat(null); };

  // ── Project helpers ──
  const addProject = () => {
    if(!newProject.name.trim()) return;
    setProjects(p=>[...p,{id:"p"+Date.now(),name:newProject.name,catId:newProject.catId,startMonth:newProject.startMonth,endMonth:newProject.endMonth,progress:0,note:newProject.note}]);
    setNewProject({name:"",catId:"cat1",startMonth:1,endMonth:3,note:""}); setShowAddProject(false);
  };
  const deleteProject = (id) => { setProjects(p=>p.filter(pr=>pr.id!==id)); setExpandedProject(null); };
  const saveProjectNote = (id) => { setProjects(p=>p.map(pr=>pr.id===id?{...pr,note:projectNoteValue}:pr)); setEditingProjectNote(null); };
  const updateProjectProgress = (id, val) => { setProjects(p=>p.map(pr=>pr.id===id?{...pr,progress:Math.min(100,Math.max(0,val))}:pr)); };

  // ── Derived ──
  const totalTasks = Object.values(tasks).flat().length;
  const doneTasks = Object.values(tasks).flat().filter(t=>t.done).length;
  const progress = totalTasks>0?(doneTasks/totalTasks)*100:0;
  const filteredCats = activeCategory ? categories.filter(c=>c.id===activeCategory) : categories;
  const allTasks = Object.entries(tasks).flatMap(([cat,list])=>(list||[]).map(t=>({...t,cat})));
  const cal = getMiniCalendarDays(selectedDate);
  const kstNow = toKST();
  const currentMonth = kstNow.getMonth()+1;
  const todayDateNum = kstNow.getDate();
  const THIS_YEAR = kstNow.getFullYear();

  // ── Date nav helpers ──
  const goDay = (n) => { setSelectedDate(addDays(selectedDate, n)); setExpandedTask(null); setEditingNote(null); };
  const goToday = () => { setSelectedDate(todayStr); setExpandedTask(null); };

  // ── Check if viewing date has saved tasks ──
  const hasTasksForDate = (dateStr) => {
    const t = tasksByDate[dateStr];
    return t && Object.values(t).flat().length > 0;
  };

  /* ───────── RENDER ───────── */
  return (
    <div style={S.container}>
      {/* TOP TAB */}
      <div style={S.topTabs}>
        <button onClick={()=>setTab("daily")} style={{...S.topTab,...(tab==="daily"?S.topTabActive:{})}}>📋 오늘 할 일</button>
        <button onClick={()=>setTab("projects")} style={{...S.topTab,...(tab==="projects"?S.topTabActive:{})}}>📊 연간 프로젝트</button>
      </div>

      {/* ════════ DAILY TAB ════════ */}
      {tab==="daily"&&(<>
        {/* HEADER */}
        <div style={S.header}>
          {/* Date Navigator */}
          <div style={S.dateNav}>
            <button onClick={()=>goDay(-1)} style={S.dateNavBtn}>◀</button>
            <div style={S.dateNavCenter}>
              <div style={S.headerDate}>{dateInfo.month}월 {dateInfo.date}일 {dateInfo.day}요일</div>
              <div style={S.headerYear}>
                {dateInfo.year}
                {!isToday && <span style={S.pastBadge}>{selectedDate < todayStr ? "지난 일정" : "미래 일정"}</span>}
                {isToday && <span style={S.todayBadge}>오늘</span>}
              </div>
            </div>
            <button onClick={()=>goDay(1)} style={S.dateNavBtn}>▶</button>
          </div>
          {/* Quick actions */}
          <div style={S.quickRow}>
            {!isToday && <button onClick={goToday} style={S.quickBtn}>📌 오늘로 돌아가기</button>}
            <button onClick={()=>setShowCalendar(!showCalendar)} style={S.quickBtn}>{showCalendar?"✕ 닫기":"📅 달력"}</button>
          </div>
          {/* Progress */}
          <div style={S.progWrap}>
            <div style={S.progLabel}><span style={S.progText}>{isToday?"오늘의 진행률":"해당일 진행률"}</span><span style={S.progCount}>{doneTasks}/{totalTasks}</span></div>
            <div style={S.progBar}><div style={{...S.progFill,width:`${progress}%`,background:progress===100?"linear-gradient(90deg,#6B8E23,#9ACD32)":"linear-gradient(90deg,#B8860B,#DAA520)"}}/></div>
          </div>
        </div>

        {/* CATEGORY TABS */}
        <div style={S.tabs}>
          <button onClick={()=>setActiveCategory(null)} style={{...S.tab,...(activeCategory===null?S.tabActive:{})}}>전체</button>
          {categories.map(cat=>{const st=getCatStyle(cat.id);const ct=tasks[cat.id]||[];return(
            <button key={cat.id} onClick={()=>setActiveCategory(activeCategory===cat.id?null:cat.id)}
              style={{...S.tab,...(activeCategory===cat.id?{background:st.bg,color:st.color,borderColor:st.accent}:{})}}>
              {cat.emoji} {cat.label}<span style={S.tabBadge}>{ct.filter(t=>t.done).length}/{ct.length}</span>
            </button>);
          })}
          <button onClick={addCategory} style={{...S.tab,borderStyle:"dashed",color:"#C4B580"}}>+ 추가</button>
        </div>

        {/* EMPTY STATE */}
        {totalTasks === 0 && (
          <div style={S.emptyState}>
            <div style={{fontSize:40,marginBottom:12}}>📝</div>
            <div style={{fontSize:14,fontWeight:700,color:"#7A6B40",marginBottom:6}}>
              {isToday ? "오늘 할 일을 추가해보세요!" : `${dateInfo.month}월 ${dateInfo.date}일에 등록된 일정이 없습니다`}
            </div>
            <div style={{fontSize:12,color:"#B8A060",marginBottom:14}}>
              + 버튼으로 새 할 일을 추가하거나, 전날 일정을 복사할 수 있어요
            </div>
            {hasTasksForDate(addDays(selectedDate, -1)) && (
              <button onClick={copyYesterdayTasks} style={S.copyBtn}>📋 전날 일정 복사해오기</button>
            )}
          </div>
        )}

        {/* MAIN SCHEDULE */}
        <div style={S.main}>
          {filteredCats.map(cat=>{const st=getCatStyle(cat.id);const ct=(tasks[cat.id]||[]).sort((a,b)=>a.time.localeCompare(b.time));
          if(ct.length===0 && totalTasks > 0) return null;
          if(ct.length===0) return null;
          return(
            <div key={cat.id} style={{...S.section,borderLeftColor:st.accent}}>
              <div style={{...S.secHeader,background:st.bg}}>
                <span style={{...S.secTitle,color:st.color}}>{cat.emoji} {cat.label}</span>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{...S.secCount,color:st.accent}}>{ct.filter(t=>t.done).length}/{ct.length}</span>
                  <button onClick={()=>startEditCat(cat)} style={S.editCatBtn}>✎</button>
                </div>
              </div>
              <div style={S.taskList}>
                {ct.map(task=>(
                  <div key={task.id}>
                    <div style={{...S.taskRow,opacity:task.done?0.5:1}}>
                      <button onClick={()=>toggleTask(cat.id,task.id)} style={{...S.checkbox,background:task.done?st.accent:"transparent",borderColor:task.done?st.accent:"#E0D8B8"}}>
                        {task.done&&<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </button>
                      <span style={S.taskTime}>{task.time}</span>
                      <div style={{flex:1,cursor:"pointer"}} onClick={()=>setExpandedTask(expandedTask===task.id?null:task.id)}>
                        <span style={{...S.taskText,textDecoration:task.done?"line-through":"none"}}>{task.text}</span>
                        {task.note&&expandedTask!==task.id&&<span style={S.noteIndicator}>📌</span>}
                      </div>
                      <button onClick={()=>deleteTask(cat.id,task.id)} style={S.delBtn}>×</button>
                    </div>
                    {expandedTask===task.id&&(
                      <div style={{...S.notePanel,background:st.bg,borderLeftColor:st.accent}}>
                        {editingNote===task.id?(
                          <div style={{display:"flex",gap:8}}>
                            <textarea value={noteValue} onChange={e=>setNoteValue(e.target.value)} style={S.noteTextarea} placeholder="메모나 상세 설명을 입력하세요..." rows={3} autoFocus/>
                            <div style={{display:"flex",flexDirection:"column",gap:4}}>
                              <button onClick={()=>saveNote(cat.id,task.id)} style={S.noteSaveBtn}>저장</button>
                              <button onClick={()=>setEditingNote(null)} style={S.noteCancelBtn}>취소</button>
                            </div>
                          </div>
                        ):(
                          <div onClick={()=>{setEditingNote(task.id);setNoteValue(task.note);}} style={S.noteDisplay}>
                            {task.note?<div style={S.noteText}>{task.note}</div>:<div style={S.notePlaceholder}>탭하여 메모 추가...</div>}
                            <span style={S.noteEditIcon}>✎</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );})}
        </div>

        {/* FAB */}
        <button onClick={()=>setShowAdd(!showAdd)} style={S.fab}>{showAdd?"✕":"+"}</button>

        {/* ADD PANEL */}
        {showAdd&&(
          <div style={S.addPanel}>
            <div style={S.addTitle}>
              {isToday?"오늘":`${dateInfo.month}/${dateInfo.date}`} 할 일 추가
              {!isToday&&<span style={{fontSize:11,color:"#B8A060",marginLeft:6}}>{dateInfo.day}요일</span>}
            </div>
            <div style={S.addRow}>
              <select value={newTask.cat} onChange={e=>setNewTask({...newTask,cat:e.target.value})} style={S.addSelect}>
                {categories.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
              </select>
              <input type="time" value={newTask.time} onChange={e=>setNewTask({...newTask,time:e.target.value})} style={S.addTime}/>
            </div>
            <div style={S.addRow}>
              <input placeholder="할 일을 입력하세요" value={newTask.text} onChange={e=>setNewTask({...newTask,text:e.target.value})} onKeyDown={e=>e.key==="Enter"&&addTask()} style={S.addInput}/>
            </div>
            <div style={S.addRow}>
              <input placeholder="메모 (선택사항)" value={newTask.note} onChange={e=>setNewTask({...newTask,note:e.target.value})} style={S.addInput}/>
              <button onClick={addTask} style={S.addBtn}>추가</button>
            </div>
          </div>
        )}

        {/* CALENDAR */}
        {showCalendar&&(
          <div style={S.calPanel}>
            <div style={S.calTitle}>{cal.year}년 {cal.month}월</div>
            <div style={S.calGrid}>
              {["일","월","화","수","목","금","토"].map(d=><div key={d} style={S.calDayLabel}>{d}</div>)}
              {cal.blanks.map((_,i)=><div key={"b"+i}/>)}
              {cal.days.map(d=>{
                const ds = `${cal.year}-${String(cal.month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                const isSel = ds === selectedDate;
                const isTod = ds === todayStr;
                const hasTasks = hasTasksForDate(ds);
                return (
                  <div key={d} onClick={()=>{setSelectedDate(ds);setShowCalendar(false);}}
                    style={{...S.calDay,...(isSel?S.calSelected:isTod?S.calToday:{}),cursor:"pointer",position:"relative"}}>
                    {d}
                    {hasTasks && !isSel && <div style={S.calDot}/>}
                  </div>
                );
              })}
            </div>
            {isToday && (<>
              <div style={S.tlTitle}>타임라인</div>
              <div>{HOURS.map(h=>{const ht=allTasks.filter(t=>parseInt(t.time.split(":")[0])===h);return(
                <div key={h} style={S.tlRow}>
                  <div style={S.tlHour}>{String(h).padStart(2,"0")}:00</div>
                  <div style={S.tlBar}>
                    {h===currentHour&&<div style={S.tlNow}/>}
                    {ht.map(t=>{const st=getCatStyle(t.cat);return(
                      <div key={t.id} onClick={()=>setExpandedTask(expandedTask===t.id?null:t.id)}
                        style={{...S.tlTask,background:st.bg,borderLeftColor:st.accent,opacity:t.done?0.5:1,textDecoration:t.done?"line-through":"none",cursor:"pointer"}}>
                        <span style={{fontSize:11}}>{getCat(t.cat).emoji}</span> {t.text}{t.note&&<span style={{marginLeft:4,fontSize:10}}>📌</span>}
                      </div>);})}
                  </div>
                </div>);})}</div>
            </>)}
          </div>
        )}

        {/* Date history strip */}
        <div style={S.historyStrip}>
          {Array.from({length:7},(_,i)=>{
            const ds = addDays(todayStr, -(6-i));
            const di = formatDateKR(ds);
            const hasTasks = hasTasksForDate(ds);
            const isSel = ds === selectedDate;
            return (
              <button key={ds} onClick={()=>setSelectedDate(ds)}
                style={{...S.historyDay,...(isSel?S.historyDayActive:{})}}>
                <div style={{fontSize:10,color:isSel?"#fff":"#B8A060",fontWeight:600}}>{di.day}</div>
                <div style={{fontSize:15,fontWeight:800,color:isSel?"#fff":"#3E2C00"}}>{di.date}</div>
                {hasTasks && !isSel && <div style={S.historyDot}/>}
              </button>
            );
          })}
        </div>
      </>)}

      {/* ════════ PROJECTS TAB ════════ */}
      {tab==="projects"&&(<>
        <div style={S.projHeader}>
          <div style={S.projHeaderTitle}>📊 {THIS_YEAR}년 프로젝트 타임라인</div>
          <div style={S.projHeaderSub}>프로젝트를 연간 일정으로 한눈에 확인하세요</div>
          <div style={S.todayLegend}><div style={S.todayDotLeg}/><span style={{fontSize:12,color:"#8B7340"}}>오늘 ({currentMonth}월 {todayDateNum}일)</span></div>
        </div>
        <div style={S.ganttOuter}>
          <div style={S.ganttWrapper} ref={timelineRef}>
            <div style={S.ganttInner}>
              <div style={S.ganttMonthRow}>
                <div style={S.ganttLabelCol}/>
                {MONTHS.map((m,i)=>(
                  <div key={i} style={{...S.ganttMonthCell,...(i+1===currentMonth?S.ganttMonthCurrent:{})}}>{m}</div>
                ))}
              </div>
              {categories.map(cat=>{
                const st=getCatStyle(cat.id);const cp=projects.filter(p=>p.catId===cat.id);
                return(
                  <div key={cat.id}>
                    <div style={S.ganttCatRow}>
                      <div style={{...S.ganttCatLabel,color:st.color,background:st.bg}}>{cat.emoji} {cat.label}</div>
                      <div style={S.ganttCatLine}/>
                    </div>
                    {cp.map(proj=>(
                      <div key={proj.id}>
                        <div style={S.ganttRow} onClick={()=>setExpandedProject(expandedProject===proj.id?null:proj.id)}>
                          <div style={S.ganttLabelCol}>
                            <div style={S.ganttProjName}>{proj.name}</div>
                            <div style={S.ganttProjMeta}>{proj.startMonth}월 ~ {proj.endMonth}월</div>
                          </div>
                          {MONTHS.map((_,mi)=>{const m=mi+1;const inR=m>=proj.startMonth&&m<=proj.endMonth;const isS=m===proj.startMonth;const isE=m===proj.endMonth;const isCur=m===currentMonth;
                            return(
                              <div key={mi} style={{...S.ganttCell,...(isCur?{background:"rgba(232,184,48,0.06)"}:{})}}>
                                {inR&&(
                                  <div style={{height:28,background:`linear-gradient(90deg,${st.accent}CC,${st.accent}88)`,borderRadius:isS&&isE?8:isS?"8px 0 0 8px":isE?"0 8px 8px 0":0,marginLeft:isS?4:0,marginRight:isE?4:0,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",cursor:"pointer"}}>
                                    <div style={{position:"absolute",left:0,top:0,bottom:0,width:`${proj.progress}%`,background:st.accent,borderRadius:"inherit",transition:"width 0.3s"}}/>
                                    {isS&&<span style={{position:"relative",zIndex:1,fontSize:10,fontWeight:700,color:"#fff",whiteSpace:"nowrap",padding:"0 6px"}}>{proj.progress}%</span>}
                                  </div>
                                )}
                                {isCur&&<div style={{position:"absolute",top:0,bottom:0,left:`${(todayDateNum/31)*100}%`,width:2,background:"#E85830",zIndex:2,opacity:0.6}}/>}
                              </div>);
                          })}
                        </div>
                        {expandedProject===proj.id&&(
                          <div style={{...S.projDetail,background:st.bg,borderLeftColor:st.accent}}>
                            <div style={S.projDetailTop}>
                              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:st.color,marginBottom:4}}>{proj.name}</div><div style={{fontSize:12,color:"#888"}}>{proj.startMonth}월 ~ {proj.endMonth}월 · {getCat(proj.catId).label}</div></div>
                              <button onClick={e=>{e.stopPropagation();deleteProject(proj.id);}} style={S.projDelBtn}>삭제</button>
                            </div>
                            <div style={S.projProgressWrap}>
                              <span style={{fontSize:12,fontWeight:700,color:st.color}}>진행률</span>
                              <div style={S.projSliderWrap}>
                                <input type="range" min={0} max={100} value={proj.progress} onChange={e=>updateProjectProgress(proj.id,parseInt(e.target.value))} style={{...S.projSlider,accentColor:st.accent}}/>
                                {editingProjectProgress===proj.id?(<input type="number" min={0} max={100} value={proj.progress} onChange={e=>updateProjectProgress(proj.id,parseInt(e.target.value)||0)} onBlur={()=>setEditingProjectProgress(null)} onKeyDown={e=>e.key==="Enter"&&setEditingProjectProgress(null)} style={S.projProgressInput} autoFocus/>):(<span onClick={()=>setEditingProjectProgress(proj.id)} style={{...S.projProgressNum,color:st.accent,cursor:"pointer"}}>{proj.progress}%</span>)}
                              </div>
                            </div>
                            {editingProjectNote===proj.id?(
                              <div style={{display:"flex",gap:8,marginTop:8}}>
                                <textarea value={projectNoteValue} onChange={e=>setProjectNoteValue(e.target.value)} style={S.noteTextarea} placeholder="프로젝트 메모..." rows={2} autoFocus/>
                                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                                  <button onClick={()=>saveProjectNote(proj.id)} style={S.noteSaveBtn}>저장</button>
                                  <button onClick={()=>setEditingProjectNote(null)} style={S.noteCancelBtn}>취소</button>
                                </div>
                              </div>
                            ):(
                              <div onClick={()=>{setEditingProjectNote(proj.id);setProjectNoteValue(proj.note);}} style={{...S.noteDisplay,marginTop:8}}>
                                {proj.note?<div style={S.noteText}>{proj.note}</div>:<div style={S.notePlaceholder}>탭하여 메모 추가...</div>}
                                <span style={S.noteEditIcon}>✎</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {cp.length===0&&<div style={{padding:"8px 16px",fontSize:12,color:"#bbb"}}>등록된 프로젝트 없음</div>}
                  </div>);
              })}
            </div>
          </div>
        </div>
        <div style={S.projSummary}>
          {categories.map(cat=>{const st=getCatStyle(cat.id);const cp=projects.filter(p=>p.catId===cat.id);const avg=cp.length?Math.round(cp.reduce((s,p)=>s+p.progress,0)/cp.length):0;
            return(<div key={cat.id} style={{...S.summaryCard,borderTopColor:st.accent}}>
              <div style={{fontSize:18,marginBottom:4}}>{cat.emoji}</div>
              <div style={{fontSize:12,fontWeight:700,color:st.color}}>{cat.label}</div>
              <div style={{fontSize:20,fontWeight:800,color:st.accent,margin:"4px 0"}}>{avg}%</div>
              <div style={{fontSize:11,color:"#aaa"}}>{cp.length}개 프로젝트</div>
            </div>);
          })}
        </div>
        <button onClick={()=>setShowAddProject(!showAddProject)} style={S.fab}>{showAddProject?"✕":"+"}</button>
        {showAddProject&&(
          <div style={S.addPanel}>
            <div style={S.addTitle}>새 프로젝트 추가</div>
            <div style={S.addRow}>
              <input placeholder="프로젝트명" value={newProject.name} onChange={e=>setNewProject({...newProject,name:e.target.value})} style={{...S.addInput,flex:2}}/>
              <select value={newProject.catId} onChange={e=>setNewProject({...newProject,catId:e.target.value})} style={S.addSelect}>
                {categories.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
              </select>
            </div>
            <div style={S.addRow}>
              <div style={{display:"flex",alignItems:"center",gap:4,flex:1}}>
                <span style={{fontSize:12,color:"#888",whiteSpace:"nowrap"}}>시작</span>
                <select value={newProject.startMonth} onChange={e=>setNewProject({...newProject,startMonth:parseInt(e.target.value)})} style={S.addSelect}>
                  {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:4,flex:1}}>
                <span style={{fontSize:12,color:"#888",whiteSpace:"nowrap"}}>종료</span>
                <select value={newProject.endMonth} onChange={e=>setNewProject({...newProject,endMonth:parseInt(e.target.value)})} style={S.addSelect}>
                  {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>
            </div>
            <div style={S.addRow}>
              <input placeholder="메모 (선택사항)" value={newProject.note} onChange={e=>setNewProject({...newProject,note:e.target.value})} style={S.addInput}/>
              <button onClick={addProject} style={S.addBtn}>추가</button>
            </div>
          </div>
        )}
      </>)}

      {/* ════════ CATEGORY EDIT MODAL ════════ */}
      {editingCat&&(
        <div style={S.overlay} onClick={()=>{setEditingCat(null);setShowEmojiPicker(false);}}>
          <div style={S.editModal} onClick={e=>e.stopPropagation()}>
            <div style={S.editModalTitle}>카테고리 수정</div>
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
              <button onClick={()=>setShowEmojiPicker(!showEmojiPicker)} style={S.emojiBtn}>{editCatEmoji}</button>
              <input ref={editRef} value={editCatLabel} onChange={e=>setEditCatLabel(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveCat()} style={S.editInput} placeholder="업무 이름"/>
            </div>
            {showEmojiPicker&&(<div style={S.emojiGrid}>{EMOJI_OPTIONS.map(em=>(<button key={em} onClick={()=>{setEditCatEmoji(em);setShowEmojiPicker(false);}} style={{...S.emojiOption,...(editCatEmoji===em?{background:"#FFF0B0",transform:"scale(1.15)"}:{})}}>{em}</button>))}</div>)}
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <button onClick={saveCat} style={S.editSaveBtn}>저장</button>
              <button onClick={()=>deleteCategory(editingCat)} style={S.editDeleteBtn}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── STYLES ───────── */
const S = {
  container: { fontFamily:"'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif", maxWidth:600, margin:"0 auto", background:"#FFFDF5", minHeight:"100vh", position:"relative", paddingBottom:120 },

  topTabs: { display:"flex", background:"#3E2C00" },
  topTab: { flex:1, padding:"14px 0", border:"none", background:"transparent", color:"#B8A060", fontSize:14, fontWeight:700, cursor:"pointer", transition:"all 0.2s", borderBottom:"3px solid transparent" },
  topTabActive: { color:"#F5D54A", background:"rgba(245,213,74,0.08)", borderBottom:"3px solid #F5D54A" },

  header: { background:"linear-gradient(135deg,#E8B830 0%,#F5D54A 40%,#F0C840 100%)", padding:"20px 20px 16px", color:"#3E2C00" },
  dateNav: { display:"flex", alignItems:"center", gap:8, marginBottom:10 },
  dateNavBtn: { background:"rgba(255,255,255,0.35)", border:"none", borderRadius:10, width:36, height:36, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#3E2C00", fontWeight:700 },
  dateNavCenter: { flex:1, textAlign:"center" },
  headerDate: { fontSize:22, fontWeight:800, letterSpacing:-0.5, color:"#3E2C00" },
  headerYear: { fontSize:12, opacity:0.6, marginTop:2, display:"flex", alignItems:"center", justifyContent:"center", gap:6 },
  pastBadge: { fontSize:10, background:"rgba(0,0,0,0.12)", padding:"2px 8px", borderRadius:10, fontWeight:600 },
  todayBadge: { fontSize:10, background:"rgba(255,255,255,0.5)", padding:"2px 8px", borderRadius:10, fontWeight:700 },
  quickRow: { display:"flex", gap:6, justifyContent:"center", marginBottom:10 },
  quickBtn: { padding:"5px 14px", borderRadius:16, border:"1.5px solid rgba(255,255,255,0.4)", background:"rgba(255,255,255,0.25)", fontSize:11, fontWeight:600, color:"#3E2C00", cursor:"pointer" },
  progWrap: { marginTop:2 },
  progLabel: { display:"flex", justifyContent:"space-between", marginBottom:5 },
  progText: { fontSize:12, opacity:0.7 },
  progCount: { fontSize:13, fontWeight:700 },
  progBar: { height:7, background:"rgba(255,255,255,0.45)", borderRadius:10, overflow:"hidden" },
  progFill: { height:"100%", borderRadius:10, transition:"width 0.5s ease" },

  tabs: { display:"flex", gap:6, padding:"12px 16px", overflowX:"auto", background:"#FFFEF8", borderBottom:"1px solid #F0E6C0", position:"sticky", top:0, zIndex:10 },
  tab: { padding:"7px 13px", borderRadius:20, border:"1.5px solid #E8DFC0", background:"#FFFEF8", fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:4, transition:"all 0.2s", color:"#7A6B40" },
  tabActive: { background:"#E8B830", color:"#fff", borderColor:"#E8B830" },
  tabBadge: { fontSize:10, opacity:0.7, fontWeight:500 },

  emptyState: { padding:"40px 24px", textAlign:"center" },
  copyBtn: { padding:"10px 20px", borderRadius:12, border:"1.5px solid #E8DFC0", background:"#FFFEF8", fontSize:13, fontWeight:700, color:"#7A6210", cursor:"pointer" },

  main: { padding:"8px 16px" },
  section: { marginBottom:14, borderRadius:14, overflow:"hidden", background:"#fff", borderLeft:"4px solid #ccc", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" },
  secHeader: { padding:"11px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" },
  secTitle: { fontSize:14, fontWeight:800 },
  secCount: { fontSize:11, fontWeight:600 },
  editCatBtn: { background:"none", border:"none", fontSize:13, cursor:"pointer", opacity:0.4, padding:"2px 4px" },
  taskList: { padding:"2px 0 6px" },
  taskRow: { display:"flex", alignItems:"center", padding:"9px 16px", gap:10, transition:"opacity 0.3s" },
  checkbox: { width:22, height:22, borderRadius:6, border:"2px solid #E0D8B8", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s" },
  taskTime: { fontSize:11, fontWeight:700, color:"#B8A060", width:40, flexShrink:0, fontVariantNumeric:"tabular-nums" },
  taskText: { fontSize:13, color:"#333", fontWeight:500, transition:"all 0.2s" },
  noteIndicator: { marginLeft:5, fontSize:10 },
  delBtn: { background:"none", border:"none", fontSize:17, color:"#ddd", cursor:"pointer", padding:"0 4px", lineHeight:1 },

  notePanel: { margin:"0 14px 6px", padding:"10px 12px", borderRadius:9, borderLeft:"3px solid #ccc" },
  noteDisplay: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", cursor:"pointer", gap:8 },
  noteText: { fontSize:12, color:"#555", lineHeight:1.6, whiteSpace:"pre-wrap", flex:1 },
  notePlaceholder: { fontSize:12, color:"#bbb", fontStyle:"italic" },
  noteEditIcon: { fontSize:12, opacity:0.4, flexShrink:0, marginTop:2 },
  noteTextarea: { flex:1, padding:"9px 11px", borderRadius:9, border:"1.5px solid #E8DFC0", fontSize:12, resize:"vertical", fontFamily:"inherit", background:"#FFFEF8", outline:"none", lineHeight:1.6 },
  noteSaveBtn: { padding:"7px 13px", borderRadius:8, border:"none", background:"#E8B830", color:"#fff", fontWeight:700, fontSize:11, cursor:"pointer" },
  noteCancelBtn: { padding:"7px 13px", borderRadius:8, border:"1px solid #E0D8B8", background:"#fff", color:"#888", fontWeight:600, fontSize:11, cursor:"pointer" },

  fab: { position:"fixed", bottom:76, right:24, width:54, height:54, borderRadius:"50%", background:"linear-gradient(135deg,#E8B830,#F5D54A)", color:"#3E2C00", fontSize:26, fontWeight:700, border:"none", cursor:"pointer", boxShadow:"0 4px 16px rgba(232,184,48,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:20 },

  addPanel: { position:"fixed", bottom:140, right:16, left:16, maxWidth:520, margin:"0 auto", background:"#FFFEF8", borderRadius:16, padding:18, boxShadow:"0 8px 32px rgba(0,0,0,0.15)", zIndex:20, border:"1px solid #F0E6C0" },
  addTitle: { fontSize:14, fontWeight:800, marginBottom:12, color:"#7A6210" },
  addRow: { display:"flex", gap:8, marginBottom:8 },
  addSelect: { flex:1, padding:"9px 10px", borderRadius:9, border:"1.5px solid #E8DFC0", fontSize:12, fontWeight:600, background:"#FFFDF5" },
  addTime: { width:100, padding:"9px 10px", borderRadius:9, border:"1.5px solid #E8DFC0", fontSize:12, fontWeight:600, background:"#FFFDF5" },
  addInput: { flex:1, padding:"9px 12px", borderRadius:9, border:"1.5px solid #E8DFC0", fontSize:13, background:"#FFFDF5" },
  addBtn: { padding:"9px 18px", borderRadius:9, border:"none", background:"linear-gradient(135deg,#E8B830,#F5D54A)", color:"#3E2C00", fontWeight:700, fontSize:13, cursor:"pointer" },

  calPanel: { margin:"8px 16px", background:"#fff", borderRadius:14, padding:18, boxShadow:"0 1px 3px rgba(0,0,0,0.04)", border:"1px solid #F0E6C0" },
  calTitle: { fontSize:14, fontWeight:800, color:"#7A6210", marginBottom:10, textAlign:"center" },
  calGrid: { display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, textAlign:"center", marginBottom:16 },
  calDayLabel: { fontSize:10, fontWeight:700, color:"#B8A060", padding:"3px 0" },
  calDay: { fontSize:12, padding:"6px 0", borderRadius:8, color:"#7A6B40", fontWeight:500, position:"relative" },
  calSelected: { background:"#E8B830", color:"#fff", fontWeight:800 },
  calToday: { background:"#FAEBC0", color:"#7A6210", fontWeight:800, border:"1.5px solid #E8B830" },
  calDot: { position:"absolute", bottom:2, left:"50%", transform:"translateX(-50%)", width:4, height:4, borderRadius:"50%", background:"#D4A812" },
  tlTitle: { fontSize:12, fontWeight:800, color:"#7A6210", marginBottom:8, borderTop:"1px solid #F0E6C0", paddingTop:14 },
  tlRow: { display:"flex", gap:10, minHeight:32 },
  tlHour: { width:42, fontSize:10, fontWeight:700, color:"#C4B580", textAlign:"right", paddingTop:1, fontVariantNumeric:"tabular-nums", flexShrink:0 },
  tlBar: { flex:1, borderLeft:"2px solid #F0E6C0", paddingLeft:10, paddingBottom:6, position:"relative" },
  tlNow: { position:"absolute", left:-5, top:0, width:8, height:8, borderRadius:"50%", background:"#e74c3c", boxShadow:"0 0 0 3px rgba(231,76,60,0.2)" },
  tlTask: { fontSize:11, padding:"4px 9px", borderRadius:5, marginBottom:3, fontWeight:500, color:"#333", borderLeft:"3px solid #ccc" },

  // History strip
  historyStrip: { position:"fixed", bottom:0, left:0, right:0, background:"#FFFEF8", borderTop:"1px solid #F0E6C0", display:"flex", justifyContent:"center", gap:4, padding:"8px 12px", zIndex:15 },
  historyDay: { width:44, padding:"6px 0", borderRadius:10, border:"1.5px solid #E8DFC0", background:"#fff", cursor:"pointer", textAlign:"center", position:"relative", transition:"all 0.2s" },
  historyDayActive: { background:"#E8B830", borderColor:"#E8B830" },
  historyDot: { position:"absolute", bottom:3, left:"50%", transform:"translateX(-50%)", width:4, height:4, borderRadius:"50%", background:"#D4A812" },

  // Projects
  projHeader: { background:"linear-gradient(135deg,#E8B830 0%,#F5D54A 40%,#F0C840 100%)", padding:"24px 24px 18px" },
  projHeaderTitle: { fontSize:20, fontWeight:800, color:"#3E2C00" },
  projHeaderSub: { fontSize:12, color:"#6B5A20", marginTop:4, opacity:0.8 },
  todayLegend: { display:"flex", alignItems:"center", gap:6, marginTop:10 },
  todayDotLeg: { width:8, height:8, borderRadius:"50%", background:"#E85830" },
  ganttOuter: { padding:"0 0 8px" },
  ganttWrapper: { overflowX:"auto", WebkitOverflowScrolling:"touch" },
  ganttInner: { minWidth:900 },
  ganttMonthRow: { display:"flex", borderBottom:"2px solid #F0E6C0", position:"sticky", top:0, background:"#FFFEF8", zIndex:5 },
  ganttLabelCol: { width:140, minWidth:140, flexShrink:0, padding:"8px 16px" },
  ganttMonthCell: { flex:1, textAlign:"center", padding:"10px 0", fontSize:12, fontWeight:700, color:"#B8A060" },
  ganttMonthCurrent: { color:"#E85830", background:"rgba(232,88,48,0.04)", borderBottom:"2px solid #E85830" },
  ganttCatRow: { display:"flex", alignItems:"center", padding:"6px 0" },
  ganttCatLabel: { width:140, minWidth:140, flexShrink:0, padding:"6px 16px", fontSize:12, fontWeight:800, borderRadius:"0 8px 8px 0" },
  ganttCatLine: { flex:1, height:1, background:"#F0E6C0" },
  ganttRow: { display:"flex", alignItems:"center", cursor:"pointer", transition:"background 0.15s", minHeight:44 },
  ganttProjName: { fontSize:12, fontWeight:600, color:"#3E2C00", lineHeight:1.3 },
  ganttProjMeta: { fontSize:10, color:"#B8A060", marginTop:1 },
  ganttCell: { flex:1, position:"relative", padding:"6px 0" },
  projDetail: { margin:"0 16px 8px", padding:"14px 16px", borderRadius:10, borderLeft:"4px solid #ccc" },
  projDetailTop: { display:"flex", justifyContent:"space-between", alignItems:"flex-start" },
  projDelBtn: { padding:"5px 12px", borderRadius:8, border:"1.5px solid #e8c0c0", background:"#fff", color:"#c44", fontWeight:600, fontSize:11, cursor:"pointer" },
  projProgressWrap: { marginTop:12, display:"flex", alignItems:"center", gap:12 },
  projSliderWrap: { flex:1, display:"flex", alignItems:"center", gap:8 },
  projSlider: { flex:1, height:4, cursor:"pointer" },
  projProgressNum: { fontSize:14, fontWeight:800, width:44, textAlign:"right" },
  projProgressInput: { width:50, padding:"4px 6px", borderRadius:6, border:"1.5px solid #E8DFC0", fontSize:13, fontWeight:700, textAlign:"center", outline:"none", background:"#FFFDF5" },
  projSummary: { display:"flex", gap:10, padding:"12px 16px", overflowX:"auto" },
  summaryCard: { flex:1, minWidth:100, background:"#fff", borderRadius:12, padding:"14px 12px", textAlign:"center", borderTop:"3px solid #ccc", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" },

  overlay: { position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.4)", zIndex:50, display:"flex", alignItems:"center", justifyContent:"center" },
  editModal: { background:"#FFFEF8", borderRadius:18, padding:22, width:"90%", maxWidth:380, boxShadow:"0 16px 48px rgba(0,0,0,0.2)" },
  editModalTitle: { fontSize:16, fontWeight:800, color:"#3E2C00", marginBottom:14 },
  emojiBtn: { width:46, height:46, borderRadius:12, border:"2px solid #E8DFC0", background:"#FFFDF5", fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  editInput: { flex:1, padding:"11px 13px", borderRadius:12, border:"1.5px solid #E8DFC0", fontSize:14, fontWeight:600, background:"#FFFDF5", outline:"none" },
  emojiGrid: { display:"grid", gridTemplateColumns:"repeat(8,1fr)", gap:4, marginBottom:8 },
  emojiOption: { width:36, height:36, borderRadius:8, border:"none", background:"#FFFDF5", fontSize:17, cursor:"pointer", transition:"all 0.15s", display:"flex", alignItems:"center", justifyContent:"center" },
  editSaveBtn: { flex:1, padding:"10px 0", borderRadius:12, border:"none", background:"linear-gradient(135deg,#E8B830,#F5D54A)", color:"#3E2C00", fontWeight:700, fontSize:13, cursor:"pointer" },
  editDeleteBtn: { padding:"10px 18px", borderRadius:12, border:"1.5px solid #e8c0c0", background:"#fff", color:"#c44", fontWeight:600, fontSize:12, cursor:"pointer" },
};
