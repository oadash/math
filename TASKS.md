# Math Adventure — Task List for Cursor

## Project Overview
Adaptive math trainer for kids 7-10. Core mechanic: spiral topic introduction.
Stack: Node.js/Express backend + React/Vite frontend, PostgreSQL, deploy to Railway.
Monorepo structure: /server and /client folders.

---

## PHASE 1 — Project Scaffold

### TASK-001: Initialize monorepo
- Create root package.json with workspaces: ["server", "client"]
- Create /server with Express + pg + dotenv + cors + cookie-parser
- Create /client with Vite + React + React Router
- Add root .gitignore
- Add railway.toml pointing build/start to server

### TASK-002: Database schema
Create /server/db/schema.sql with tables:
- users (id, name, age, created_at)
- topics (id, slug, title_ru, prerequisite_topic_id, sort_order)
- user_topic_state (user_id, topic_id, state ENUM('locked','introducing','practicing','mastered'), correct_streak, total_correct, total_attempts)
- sessions (id, user_id, started_at, ended_at)
- answers (id, user_id, topic_id, problem_json, answer_given, is_correct, created_at)

### TASK-003: Seed topics
Create /server/db/seed.sql with initial topics:
- addition_10 (сложение до 10)
- addition_20 (до 20, requires addition_10)
- subtraction_10 (до 10, requires addition_10)
- addition_100 (до 100, requires addition_20)
- subtraction_20 (до 20, requires subtraction_10 + addition_20)
- multiplication_2 (на 2, requires addition_20)
- multiplication_5 (на 5, requires multiplication_2)
- multiplication_3 (на 3, requires multiplication_2)
- multiplication_10 (на 10, requires multiplication_5)
- multiplication_full (таблица, requires all above)
- division_simple (requires multiplication_full)

---

## PHASE 2 — Core Backend

### TASK-004: Problem generator
Create /server/services/problemGenerator.js
For each topic slug, export a function generateProblem(topic) that returns:
{ id: uuid, topic_slug, display: "3 + 4 = ?", answer: 7, choices: [5,6,7,8] }
choices = 1 correct + 3 plausible wrong (within ±3, never negative, never same)
Topics to implement: all from seed

### TASK-005: Spiral scheduler
Create /server/services/spiralScheduler.js
Input: userId
Logic:
  1. Load all user_topic_states for user
  2. Find ACTIVE topics (introducing or practicing)
  3. Based on correct_streak, calculate topic weights:
     - mastered: 5% (review)
     - practicing: 60%
     - introducing: 35%
  4. Check if any practicing topic has streak >= 10 of last 12 → promote to mastered
  5. Check if any practicing topic has streak >= 5 of last 7 → unlock next topic, set to 'introducing'
  6. Weighted random pick of topic
  7. Return { topic, isFirstIntroduction: bool }

### TASK-006: REST API routes
Create /server/routes/:
  POST /api/users — create user (name, age), return JWT
  GET  /api/me — return user + topic states
  GET  /api/problem — return next problem via spiralScheduler
  POST /api/answer — { problemId, topicSlug, answerGiven }
    → save to answers table
    → update user_topic_state (streak, counts)
    → run spiral scheduler promotion checks
    → return { correct: bool, correctAnswer, updatedTopicState }
  GET  /api/progress — return all topic states for user

### TASK-007: Railway config
- Add Procfile: web: node server/index.js
- Add railway.toml with build/deploy settings
- Document env vars: DATABASE_URL, JWT_SECRET, PORT
- Add /server/db/migrate.js script that runs schema.sql on startup if tables missing

---

## PHASE 3 — Frontend Core

### TASK-008: App shell + routing
/client/src/App.jsx with React Router routes:
  / → WelcomeScreen (pick or create profile)
  /play → GameScreen
  /progress → ProgressScreen
Simple bottom nav for /play and /progress
No auth forms — just name entry, kid-friendly

### TASK-009: WelcomeScreen
- Large friendly text input "Как тебя зовут?"
- Big colorful button "Играть!"
- On submit: POST /api/users, store JWT in localStorage
- If JWT exists → skip to /play

### TASK-010: GameScreen — problem display
Fetch GET /api/problem on mount and after each answer
Display:
  - Topic pill (subtle, top corner) — show topic name only during introduction
  - Problem text centered, large font (min 32px)
  - 4 answer buttons in 2x2 grid, big tap targets
  - Correct → green flash + encouraging word (randomly picked from array)
  - Wrong → red shake + show correct answer for 1.5s
  - Then fetch next problem

### TASK-011: Introduction card
When API returns isFirstIntroduction: true, show before problem:
  - Full-screen friendly card explaining the new topic
  - Simple illustration (emoji-based is fine)
  - "Попробуем!" button
  - Store in sessionStorage so it only shows once per session per topic

### TASK-012: ProgressScreen
Visual topic tree — show all topics as nodes
Color coding:
  - grey = locked
  - yellow = introducing
  - blue = practicing  
  - green = mastered
Show simple stats: всего решено задач, серия сегодня
No competitive elements, no scores vs others

### TASK-013: Encouraging feedback system
Create /client/src/utils/encouragement.js
Arrays of phrases in Russian for:
  - correct answer: ["Отлично!", "Верно!", "Молодец!", "Так держать!", "Супер!"]
  - streak milestones (5, 10, 20): special celebration animation
  - wrong answer (gentle): ["Почти!", "Попробуй ещё", "Не беда!"]
No negative language, no "Wrong!", no skull/sad emojis

---

## PHASE 4 — Polish

### TASK-014: Mobile/tablet layout
- All tap targets min 56px height
- Font size responsive (clamp)
- Test at 768px (iPad) and 390px (iPhone)
- Prevent double-tap zoom on buttons

### TASK-015: PWA setup
- Add /client/public/manifest.json (name, icons, theme_color, display: standalone)
- Add service worker for offline caching of shell
- Add to index.html

### TASK-016: Simple parent view
Route /parent (no nav link, accessed manually):
  - Show last 7 days activity: problems attempted, % correct per topic
  - No account needed — just reads same JWT user data
  - Printable summary

---

## PHASE 5 — Deploy

### TASK-017: Railway deployment
- Push to GitHub
- Connect repo to Railway
- Add PostgreSQL plugin in Railway dashboard
- Set env vars: DATABASE_URL (auto), JWT_SECRET, NODE_ENV=production
- Verify migrate.js runs on deploy
- Test full flow on production URL

### TASK-018: Smoke test checklist
- [ ] Create user → receive JWT
- [ ] First problem is addition_10
- [ ] Answer 10 correctly → addition_20 gets unlocked and introduced
- [ ] Wrong answers don't crash, show correct answer
- [ ] Progress screen shows topic states correctly
- [ ] Works on mobile Safari (iOS)
- [ ] Works on Chrome Android

---

## Definition of Done
- Single Railway URL, works in browser
- No login friction (name only)
- Spiral mechanic provably works (check DB after 15 answers)
- Zero ads, zero streak punishment, zero timers