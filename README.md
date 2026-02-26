# 📋 일일 스케줄 앱

오늘의 할 일 체크리스트 & 연간 프로젝트 타임라인을 관리하는 개인 스케줄 앱입니다.

## ✨ 주요 기능

- **카테고리별 할 일 관리** — 서울경제, 뉴스쿨, 육아 등 업무별 구분 (이름/이모지 자유 변경 가능)
- **날짜 이동** — 과거/미래 일정 조회, 전날 일정 복사
- **연간 프로젝트 타임라인** — 간트 차트 스타일 프로젝트 관리
- **자정 자동 갱신** — 한국시간(KST) 기준 자동 날짜 전환
- **데이터 영구 저장** — localStorage에 저장되어 새로고침해도 유지
- **PWA 지원** — 모바일 홈 화면에 앱처럼 설치 가능

---

## 🚀 배포 방법

### 방법 1: Netlify (가장 쉬움, 무료)

1. **GitHub에 코드 올리기**
   ```bash
   # 이 폴더에서
   git init
   git add .
   git commit -m "initial commit"
   
   # GitHub에서 새 저장소 만든 후
   git remote add origin https://github.com/내아이디/daily-schedule.git
   git branch -M main
   git push -u origin main
   ```

2. **Netlify 배포**
   - https://app.netlify.com 접속 → GitHub 로그인
   - "Add new site" → "Import an existing project"
   - GitHub 저장소 선택
   - Build settings:
     - **Build command:** `npm run build`
     - **Publish directory:** `dist`
   - "Deploy site" 클릭
   - 완료! `https://내사이트명.netlify.app` 에서 접속 가능

3. **커스텀 도메인 (선택)**
   - Netlify 대시보드 → Domain settings → Add custom domain

### 방법 2: Vercel (무료)

1. GitHub에 코드 올리기 (위와 동일)
2. https://vercel.com 접속 → GitHub 로그인
3. "New Project" → 저장소 선택
4. Framework: Vite 자동 감지됨
5. "Deploy" 클릭 → 완료!

### 방법 3: 로컬에서 먼저 테스트

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 브라우저에서 http://localhost:5173 접속
```

---

## 📱 모바일 홈 화면에 설치하기

배포 후 모바일에서:

**iOS (iPhone/iPad):**
1. Safari에서 배포된 URL 접속
2. 하단 공유 버튼 (□↑) 탭
3. "홈 화면에 추가" 선택

**Android:**
1. Chrome에서 배포된 URL 접속  
2. 상단에 "홈 화면에 추가" 배너 탭 (또는 ⋮ 메뉴 → "앱 설치")

---

## 📁 프로젝트 구조

```
deploy-project/
├── index.html          # HTML 진입점
├── package.json        # 의존성 & 스크립트
├── vite.config.js      # Vite 설정
├── public/
│   ├── manifest.json   # PWA 매니페스트
│   └── icon.svg        # 앱 아이콘 (PNG로 교체 권장)
├── src/
│   ├── main.jsx        # React 진입점
│   └── App.jsx         # 메인 앱 컴포넌트
└── README.md           # 이 파일
```

---

## ⚙️ 커스터마이즈

- **카테고리 기본값 변경:** `App.jsx` 상단의 `DEFAULT_CATEGORIES` 수정
- **앱 아이콘 변경:** `public/icon.svg`를 원하는 이미지로 교체하고 `icon-192.png`, `icon-512.png` 추가
- **색상 변경:** `App.jsx` 하단의 스타일 객체(`S`) 수정
