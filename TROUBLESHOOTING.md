# Maktub Art Group — Troubleshooting Tracker

> **Workflow**: Issues are reported below. Once explicitly confirmed as fixed, they move to the **Resolved** table at the bottom.

---

## Active Issues

| #   | Issue                                    | Details                                                                                                                                                                                                                                                              | Status                               | Date Reported |
| --- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------- |
| 1   | Cache clearing button not working        | User clicks "Limpar Cache" but nothing appears to happen. Possible cause: JS error blocking execution, or confirm dialog not appearing.                                                                                                                              | Investigating                        | 2025-02-13    |
| 2   | No expenses appear after cache clear     | After clearing cache and reloading, expense table is empty. `loadData()` should regenerate from `getAllDemoData()` — may be related to timing of `window.location.reload(true)`.                                                                                     | Investigating                        | 2025-02-13    |
| 3   | Keeps asking for new password + email    | After user already set password and email, the modals re-appear on next login. **Root cause found**: `clearAppCache()` was deleting `maktub_hub_userdata_*` (email storage) during cache clear. **Fix applied**: Now preserves userdata, access, and shortcuts keys. | Fix deployed — awaiting confirmation | 2025-02-13    |
| 4   | Atalhos popup appears at static position | The shortcut dropdown always appears at the same position relative to the quick actions bar, not next to the Atalho button. **Fix applied**: Dropdown now uses `position: fixed` and calculates position from the Atalho button's `getBoundingClientRect()`.         | Fix deployed — awaiting confirmation | 2025-02-13    |

---

## Notes

- **Data version**: DATA_VERSION=15, REQUIRED_VERSION=15
- **Cache buster**: `?v=16` on script + CSS in index.html
- **Deployment**: GitHub Pages at `https://tomasbb0.github.io/mactube-expense-manager/`
- **Branch**: `ux-transform` (synced with `main`)

---

## Resolved Issues

| #   | Issue                                            | Resolution                                                                                                                            | Date Resolved |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| —   | Data not showing on website (not even incognito) | Bulk delete/add JS code (~1030 lines) existed locally but was never committed. Committed in `0b32869`, cache busters bumped to v16.   | 2025-02-13    |
| —   | Uncommitted bulk features code                   | 2102 lines of insertions (bulk delete modal, bulk add CSV+AI, custom cursor, animation) committed and deployed.                       | 2025-02-13    |
| —   | CSV project name quotes stripped                 | `csv_to_js.py` had `.strip('"')` removing closing quotes from names like `ÁLBUM GERAL - "BAIRRO DAS FLORES"`. Removed the strip call. | 2025-02-13    |
| —   | .kilocode files accidentally committed           | Removed via `git rm --cached`, added to `.gitignore`.                                                                                 | 2025-02-13    |
