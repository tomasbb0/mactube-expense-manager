# 🧑‍💻 Vibe Coder's Guide to Not Breaking Everything

> _"大道至简 — The greatest principles are the simplest."_
> — Your Chinese mother

This guide uses **your Maktub project** as the case study. Every example is real.

---

## 📍 Where You Are Right Now

```
✅  main          ← your ONE branch (the golden version)
📦  3 backup branches (safe snapshots, don't touch)
🌐  GitHub Pages deploys from main automatically
```

**You are on `main`.** All old branches (`liquid-glass`, `ux-transform`, `feature/bandidos-real-data`) have been merged and deleted. Clean slate.

---

## 📖 Chapter 1: What Is Git? (The School Version)

Imagine you're writing an essay in Google Docs. Every time you press Ctrl+S, Google saves a version. You can go back to any version. That's basically Git — but for code, and YOU decide when to save.

The difference: Git doesn't save automatically. **You** choose what to save and when, by making **commits**.

---

## 📦 Chapter 2: The 5 Git Actions (And ONLY These 5)

There are only 5 things you'll ever do. Everything else is built on these.

### Action 1: `commit` — Take a Snapshot

A **commit** is a save point. It captures the state of ALL your files at that moment.

```
Think of it like a photo:
📸 Click! → "This is what my project looked like at 3:42 PM on Feb 15"
```

**A commit lives ONLY on your computer.** Nobody else can see it yet. GitHub doesn't know about it.

```bash
git add -A                              # "Select all files for the photo"
git commit -m "fix: topbar too wide"    # "Take the photo and label it"
```

### Action 2: `push` — Upload to GitHub

A **push** sends your commits from your computer → GitHub. That's ALL it does. It's like pressing "Upload" on Dropbox.

```
YOUR COMPUTER                    GITHUB
┌─────────────┐   git push     ┌─────────────┐
│ commit A    ─┼───────────►   │ commit A     │
│ commit B    ─┼───────────►   │ commit B     │
│ commit C    ─┼───────────►   │ commit C     │
└─────────────┘                └─────────────┘
```

**After you push to `main`, GitHub Pages automatically rebuilds your live site.** That's why pushing to main = going live.

```bash
git push    # "Upload my commits to GitHub"
```

### Action 3: `pull` — Download from GitHub

A **pull** downloads commits from GitHub → your computer. It's the reverse of push.

```bash
git pull    # "Download any new commits from GitHub"
```

When would you need this? If you made changes on GitHub directly (like editing a file in the browser), or if a collaborator pushed something.

### Action 4: `branch` — Create a Parallel Version

A **branch** is a separate timeline. You can make changes without affecting `main`.

```
                    ┌── commit X ── commit Y    (feat/new-login)
                    │
main: ── A ── B ── C ── D                       (main continues)
```

Both timelines exist. Changes in `feat/new-login` don't affect `main` until you merge them.

```bash
git checkout -b feat/new-login    # "Create and switch to new branch"
```

### Action 5: `merge` — Combine Branches

When your branch is done, you **merge** it back into `main`.

```
                    ┌── X ── Y ─┐
                    │            │  MERGE
main: ── A ── B ── C ── D ─────M
```

After the merge, `main` has everything: A, B, C, D, X, Y.

```bash
git checkout main             # "Switch to main"
git merge feat/new-login      # "Bring in the branch's changes"
git push                      # "Upload the merged result"
```

---

## 🔗 How They Connect (The Logic Tree)

Here's the full flow, step by step:

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR WORKFLOW                         │
│                                                         │
│  1. EDIT FILES                                          │
│       │                                                 │
│       ▼                                                 │
│  2. git add -A          (stage: "I want to save these") │
│       │                                                 │
│       ▼                                                 │
│  3. git commit -m "..."  (snapshot: saved LOCALLY)      │
│       │                                                 │
│       │  ← You can repeat 1-3 many times before pushing │
│       │                                                 │
│       ▼                                                 │
│  4. git push             (upload: saved on GITHUB)      │
│       │                                                 │
│       ▼                                                 │
│  5. GitHub Pages rebuilds (LIVE on the internet)        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key insight:** You can make 10 commits before pushing. They all upload at once when you push. Think of it like writing 10 emails and hitting "Send All".

---

## 🌳 Chapter 3: Branch Tree for YOUR Maktub Project

Here's what your repo history actually looked like before cleanup:

```
      feature/bandidos-real-data (deleted ✓)
           │
    ux-transform (deleted ✓)
           │
           │    liquid-glass (deleted ✓)
           │         │
           │         │    ┌── c7d3b8c "fix: glass overlay border-radius"
           │         │    ├── 10e43a4 "feat: placeholder info bars"
           │         │    ├── e8fa28e "feat: glass overlay on cards"
           │         │    ├── d31f870 "fix: access panel popup"
           │         │    ├── ... (80+ commits)
           │         │    │
main: ─────●─────────●────M  ← MERGED HERE (now main has everything)
           │              │
        old work     current: c7d3b8c
```

**After cleanup (NOW):**

```
main: ── A ── B ── C ── ... ── c7d3b8c    (single clean line)
                                  │
                                  └── THIS IS YOU. This is the live site.
```

### What about your 3 backup branches?

```
main: ────────────────────── c7d3b8c    (active, your work goes here)

backup/all-artists-demo-data ─── 📦      (frozen snapshot, don't touch)
backup/dama-and-bandidos-data ── 📦      (frozen snapshot, don't touch)
backup/main-pre-ux-transform ── 📦      (frozen snapshot, don't touch)
```

These are like old photos in a drawer. They don't affect anything. They're there in case you ever need to go back to that specific state.

---

## 🧩 Chapter 4: Why "One Commit = One Change" Matters

### The Problem (Real Example From Your Code)

Your commit `db5aad6` had this message:

```
"access popup, burnay link, cache buster v=31, debug logging"
```

That's **4 separate changes** in one commit. Now imagine:

- The access popup works great ✅
- But the debug logging broke something ❌

**You can't undo JUST the debug logging.** You'd have to undo ALL 4 changes. The popup, the link, the cache buster — all gone.

### The Solution

Make 4 separate commits:

```bash
# Change 1: Access popup
git add -A
git commit -m "feat: convert access dropdown to floating popup"

# Change 2: Burnay link
git add -A
git commit -m "feat: add Burnay Labs clickable link"

# Change 3: Cache buster
git add -A
git commit -m "chore: bump cache busters to v31"

# Change 4: Debug logging
git add -A
git commit -m "debug: add console logging for data load"
```

Now if logging breaks something:

```bash
git revert HEAD    # Undo ONLY the last commit (the logging)
                   # Everything else stays intact ✅
```

### Visual:

```
ONE BIG COMMIT (bad):
  ┌─────────────────────────────────────┐
  │ popup + link + cache + logging      │  ← Can only undo ALL or NOTHING
  └─────────────────────────────────────┘

FOUR SMALL COMMITS (good):
  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │  popup   │ │   link   │ │  cache   │ │ logging  │
  └──────────┘ └──────────┘ └──────────┘ └──────────┘
       ✅            ✅           ✅         ❌ ← undo JUST this one
```

### The Analogy

Imagine you're packing a suitcase for a trip:

- **Bad:** Throw everything in one giant garbage bag. Need your passport? Dump the whole bag.
- **Good:** Use packing cubes. Need your passport? Open just the documents cube.

Commits are packing cubes for your code.

---

## 🔁 Chapter 5: Your Daily Workflow

### Option A: Quick Fix (small change, < 30 min)

Work directly on `main`. This is fine for small stuff.

```bash
# 1. Make sure you're on main
git checkout main
git pull

# 2. Make your changes in VS Code

# 3. Commit + push
git add -A
git commit -m "fix: topbar padding on mobile"
git push
```

**Real example from your project:**

```bash
git commit -m "fix: remove email prompt on login"
git push
# → GitHub Pages updates in ~2 minutes
```

### Option B: Big Feature (> 1 hour, might break things)

Use a branch. One branch at a time.

```bash
# 1. Create branch from main
git checkout main
git pull
git checkout -b feat/new-dashboard

# 2. Work, commit often
git add -A
git commit -m "wip: dashboard layout"
# ... more work ...
git commit -m "feat: add chart to dashboard"

# 3. When done, merge to main
git checkout main
git merge feat/new-dashboard
git push

# 4. Delete the branch (CRITICAL - don't hoard branches!)
git branch -d feat/new-dashboard
git push origin --delete feat/new-dashboard
```

### ⚠️ The Rule You Keep Breaking

> **After merging, DELETE the branch.** No branch museum.

---

## ✍️ Chapter 6: Commit Message Cheat Sheet

Use this format:

```
type: short description
```

| Prefix      | When to use                      | Example                               |
| ----------- | -------------------------------- | ------------------------------------- |
| `feat:`     | New feature                      | `feat: add project request form`      |
| `fix:`      | Bug fix                          | `fix: cursor freezing at iframe edge` |
| `style:`    | Visual only                      | `style: reduce stat card font size`   |
| `refactor:` | Code rewrite, no behavior change | `refactor: extract login logic`       |
| `chore:`    | Maintenance                      | `chore: update cache busters to v51`  |

**Bad (your old commits):**

```
❌ "access popup, burnay link, cache buster v=31, debug logging"
```

This is 4 separate things in 1 commit. If one breaks, you can't undo just one.

**Good:**

```
✅ "feat: convert access dropdown to floating popup"
✅ "feat: add Burnay Labs clickable link"
✅ "chore: bump cache busters to v31"
```

> See **Chapter 4** above for why this matters (with real examples from your code).

---

## 📁 Chapter 7: Your .gitignore

Your current `.gitignore` should have:

```gitignore
# Dependencies
node_modules/
.venv/
__pycache__/

# Build output
dist/
build/

# Environment & secrets
.env
.env.local

# OS junk
.DS_Store
Thumbs.db

# Editor
.vscode/settings.json

# Temp files
/tmp/
*.pyc
```

**Check right now** — run this in terminal:

```bash
git ls-files | grep -E 'node_modules|\.env|\.DS_Store|__pycache__|\.venv'
```

If anything shows up, you accidentally tracked junk. Fix with:

```bash
git rm -r --cached node_modules/  # remove from git, keep files
echo "node_modules/" >> .gitignore
git commit -m "chore: remove tracked junk, update gitignore"
```

---

## 🔧 Chapter 8: VS Code Extensions You MUST Install

### 1. **Git Graph** (essential)

> `mhutchie.git-graph`

Shows your commit history as a visual graph. You can literally SEE what's on which branch.

**How to use:** `Cmd+Shift+P` → "Git Graph: View Git Graph"

### 2. **GitLens** (you already have this)

> `eamodio.gitlens`

Shows who wrote each line, when, and in which commit. Hover any line to see its history.

**How to use:** Just hover over any line of code. The blame annotation appears automatically.

### 3. **Error Lens** (essential)

> `usernamehw.errorlens`

Shows errors INLINE right next to the code, not hidden in the Problems panel.

**How to use:** Install it. It works automatically. Red text appears right on the line with the error.

### 4. **Prettier** (code formatter)

> `esbenp.prettier-vscode`

Auto-formats your code on save. No more inconsistent indentation.

**Setup after install:**

1. `Cmd+Shift+P` → "Preferences: Open Settings (JSON)"
2. Add:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### 5. **Live Server** (preview locally)

> `ritwickdey.LiveServer`

Launch your site locally with hot reload. No more pushing to GitHub just to see changes.

**How to use:** Right-click `hub.html` → "Open with Live Server"

### 6. **Todo Tree** (track TODOs in code)

> `Gruntfuggly.todo-tree`

Finds every `TODO`, `FIXME`, `HACK` comment in your code and lists them in a panel.

---

## 🏗️ Chapter 9: Project Structure Best Practices

### Your current structure (messy but functional):

```
MadalenaCruzProject/
├── hub.html          ← 5700+ lines (too big!)
├── index.html        ← 3200+ lines (expense manager)
├── app.v14.js        ← 5600+ lines (app logic)
├── styles.v14.css    ← 3900+ lines (styles)
└── ... misc files
```

### What you should eventually do:

```
MadalenaCruzProject/
├── index.html           ← hub entry point (< 100 lines)
├── despesas.html        ← expense manager (< 100 lines)
├── css/
│   ├── hub.css
│   ├── despesas.css
│   └── shared.css
├── js/
│   ├── hub.js
│   ├── despesas.js
│   ├── auth.js
│   └── data.js
├── assets/
│   └── images/
└── .gitignore
```

**Why?** A 5700-line HTML file with inline CSS and JS is:

- Hard to debug (where is that function?)
- Hard to search (everything matches everything)
- Easy to break (one typo kills the whole page)

> **Don't refactor now.** Ship first, clean later. But know the direction.

---

## 🐛 Chapter 10: Debugging Workflow

### When something breaks on the live site:

1. **Open DevTools** (`Cmd+Option+I` in Chrome)
2. **Console tab** → look for red errors
3. **Network tab** → check if files loaded (status 200) or cached (304) or failed (404)
4. **Hard refresh** → `Cmd+Shift+R` (ignores cache)

### When CSS changes don't show up:

The #1 reason: **browser cache**. Your file has `?v=51` but the browser cached `?v=50`.

Fix: bump the version number in your `<link>` and `<script>` tags:

```html
<!-- Before -->
<link rel="stylesheet" href="styles.v14.css?v=51" />

<!-- After -->
<link rel="stylesheet" href="styles.v14.css?v=52" />
```

### When JS changes don't show up:

Same thing — bump the `?v=` number:

```html
<script src="app.v14.js?v=52"></script>
```

---

## 📅 Chapter 11: The Calendar Method (Your Mom Is Right)

### Step 1: List your tasks

```
- [ ] Fix mobile responsive layout
- [ ] Add artist profile photos
- [ ] Fix expense data filtering
```

### Step 2: Estimate time (multiply by 2x because you'll underestimate)

```
- [ ] Fix mobile responsive layout    → 2 hours
- [ ] Add artist profile photos       → 1 hour
- [ ] Fix expense data filtering      → 3 hours
```

### Step 3: Block on calendar

```
Monday    10:00-12:00   Mobile layout fix
Monday    14:00-15:00   Artist photos
Tuesday   10:00-13:00   Data filtering
```

### Step 4: One task per block. No multitasking.

> **Set a timer.** When it rings, commit what you have, even if it's not done. `git commit -m "wip: mobile layout in progress"`

---

## 🚫 Chapter 12: Things To Stop Doing

| Stop                                 | Start                                |
| ------------------------------------ | ------------------------------------ |
| Pushing to random branches           | Work on `main` or ONE feature branch |
| 10 changes in 1 commit               | 1 change per commit                  |
| Ignoring the bottom-left branch name | Check it before every commit         |
| Testing on GitHub Pages              | Use Live Server locally              |
| Keeping old branches forever         | Delete after merge                   |
| Writing 5000-line files              | Split when you can (future goal)     |
| Committing without a message plan    | Think "what did I change?" first     |

---

## ⚡ Chapter 13: Quick Reference (Print This)

```bash
# Where am I?
git status

# Save my work
git add -A && git commit -m "fix: description" && git push

# Start a feature
git checkout -b feat/thing

# Merge feature to main
git checkout main && git merge feat/thing && git push

# Delete merged branch
git branch -d feat/thing && git push origin --delete feat/thing

# See history
git log --oneline -10

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard all local changes (DANGER)
git checkout -- .

# Hard refresh browser
Cmd+Shift+R
```

---

## 🎯 Your Action Items Right Now

- [x] ~~Merge liquid-glass into main~~ ✅ Done
- [x] ~~Delete stale branches~~ ✅ Done
- [x] ~~Install **Git Graph** extension~~ ✅ Done
- [x] ~~Install **Error Lens** extension~~ ✅ Done
- [x] ~~Install **Live Server** extension~~ ✅ Done
- [ ] Open Git Graph (`Cmd+Shift+P` → "Git Graph: View Git Graph")
- [ ] Check `.gitignore` for missing entries
- [ ] Read this guide end-to-end
- [ ] Take the quiz (Chapter 14)

---

---

## 🧪 Chapter 14: Test Yourself (Quiz)

**Answer these without scrolling up. If you can't, re-read.**

1. **What's the difference between `commit` and `push`?**

   > commit = save locally. push = upload to GitHub. A commit doesn't go anywhere until you push.

2. **If you're on branch `feat/popup` and you push, does that change `main`?**

   > No. Pushing only uploads the branch you're currently on. `main` is untouched until you merge.

3. **You committed 5 things in one commit and one of them is broken. What do you do?**

   > You're stuck. You can only revert all 5 or none. That's why you make small commits.

4. **Your CSS changes aren't showing on the live site. First thing to check?**

   > Browser cache. Bump `?v=51` to `?v=52` in the `<link>` tag and push.

5. **You see `* liquid-glass` in the bottom-left of VS Code. Is your next push going to main?**

   > No! You're on liquid-glass. `git checkout main` first.

6. **What does `git branch -d feat/thing` do?**

   > Deletes the local branch. Add `git push origin --delete feat/thing` to also delete it on GitHub.

7. **Your hub.html is 5700 lines. Is that good?**
   > No, but ship first, clean later. Know the direction: split into separate HTML/CSS/JS files.

---

## 🗺️ Table of Contents

1. [What Is Git?](#-chapter-1-what-is-git-the-school-version)
2. [The 5 Git Actions](#-chapter-2-the-5-git-actions-and-only-these-5)
3. [How They Connect (Logic Tree)](#-how-they-connect-the-logic-tree)
4. [Branch Tree for Maktub](#-chapter-3-branch-tree-for-your-maktub-project)
5. [Why One Commit = One Change](#-chapter-4-why-one-commit--one-change-matters)
6. [Daily Workflow](#-chapter-5-your-daily-workflow)
7. [Commit Message Cheat Sheet](#️-chapter-6-commit-message-cheat-sheet)
8. [.gitignore](#-chapter-7-your-gitignore)
9. [VS Code Extensions](#-chapter-8-vs-code-extensions-you-must-install)
10. [Project Structure](#️-chapter-9-project-structure-best-practices)
11. [Debugging](#-chapter-10-debugging-workflow)
12. [Calendar Method](#-chapter-11-the-calendar-method-your-mom-is-right)
13. [Things To Stop Doing](#-chapter-12-things-to-stop-doing)
14. [Quick Reference](#-chapter-13-quick-reference-print-this)
15. [Quiz](#-chapter-14-test-yourself-quiz)

---

_Now stop reading and go work. 勿以恶小而为之，勿以善小而不为。_
