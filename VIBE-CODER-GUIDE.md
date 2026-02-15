# 🧑‍💻 Vibe Coder's Guide to Not Breaking Everything

> *"大道至简 — The greatest principles are the simplest."*
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

## 🧠 The Mental Model (Burn This Into Your Brain)

```
         YOU                    GITHUB
    ┌──────────┐           ┌──────────┐
    │  local   │  git push │  remote  │
    │  main   ─┼──────────►│  main    │──► GitHub Pages (LIVE)
    │          │           │          │
    │  branch ─┼──────────►│  branch  │   (not live, just backup)
    └──────────┘  git pull └──────────┘
```

| Action | What it does | Analogy |
|--------|-------------|---------|
| `commit` | Save a checkpoint locally | Ctrl+S for your whole project |
| `push` | Upload your commits to GitHub | Sync to cloud |
| `branch` | Create a parallel universe | Copy folder, but smarter |
| `merge` | Combine branch into main | Fold parallel universe back |
| `pull` | Download latest from GitHub | Get teammate's changes |

### The Rule

> **Nothing goes live until you push to `main`.** GitHub Pages only deploys from `main`.

---

## 🔁 Your Daily Workflow (The Only One You Need)

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

## ✍️ Commit Messages That Don't Suck

Use this format:

```
type: short description
```

| Prefix | When to use | Example |
|--------|------------|---------|
| `feat:` | New feature | `feat: add project request form` |
| `fix:` | Bug fix | `fix: cursor freezing at iframe edge` |
| `style:` | Visual only | `style: reduce stat card font size` |
| `refactor:` | Code rewrite, no behavior change | `refactor: extract login logic` |
| `chore:` | Maintenance | `chore: update cache busters to v51` |

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

### The Rule

> **One commit = one logical change.** If you need "and" in the message, make two commits.

---

## 📁 Your .gitignore (Things Git Should NEVER Track)

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

## 🔧 VS Code Extensions You MUST Install

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

## 🏗️ Project Structure Best Practices

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

## 🐛 Debugging Workflow

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
<link rel="stylesheet" href="styles.v14.css?v=51">

<!-- After -->
<link rel="stylesheet" href="styles.v14.css?v=52">
```

### When JS changes don't show up:

Same thing — bump the `?v=` number:
```html
<script src="app.v14.js?v=52"></script>
```

---

## 📅 The Calendar Method (Your Mom Is Right)

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

## 🚫 Things To Stop Doing

| Stop | Start |
|------|-------|
| Pushing to random branches | Work on `main` or ONE feature branch |
| 10 changes in 1 commit | 1 change per commit |
| Ignoring the bottom-left branch name | Check it before every commit |
| Testing on GitHub Pages | Use Live Server locally |
| Keeping old branches forever | Delete after merge |
| Writing 5000-line files | Split when you can (future goal) |
| Committing without a message plan | Think "what did I change?" first |

---

## ⚡ Quick Reference (Print This)

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
- [ ] Install **Git Graph** extension
- [ ] Install **Error Lens** extension
- [ ] Install **Live Server** extension
- [ ] Open Git Graph (`Cmd+Shift+P` → "Git Graph")
- [ ] Check `.gitignore` for missing entries
- [ ] Bookmark this file

---

*Now stop reading and go work. 勿以恶小而为之，勿以善小而不为。*
