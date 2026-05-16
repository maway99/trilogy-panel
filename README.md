# Trilogy Panel

Touch-panel control interface for Trilogy Nightclub (Hereford). Drives grandMA2 (via telnet) and Resolume (via REST) from a 1920×1080 touchscreen connected to the MA2 PC.

This README is for whoever maintains the venue PC. Architecture and design rationale live in `trilogy-touch-panel-brief.md`.

---

## What runs where

| Process          | Where               | How it starts                              |
|------------------|---------------------|--------------------------------------------|
| grandMA2 onPC    | MA2 PC              | Existing Task Scheduler entry (not ours)   |
| Node server      | MA2 PC              | PM2 — auto-restart on crash, resurrect at logon |
| Chrome kiosk     | MA2 PC              | Task Scheduler at logon, waits for server  |
| Resolume         | Resolume PC (LAN)   | Managed separately                         |

Panel talks to its own backend on `localhost:3000` via WebSocket. Backend talks to grandMA2 on `127.0.0.1:30000` (telnet) and to Resolume at the configured LAN IP on port 8080 (HTTP).

---

## First-time install

**Right-click `setup.bat` → Run as administrator** (do not double-click `setup.ps1` directly — Windows may block scripts).

`setup.bat` runs the installer with PowerShell execution policy bypassed for this session only.

This installs dependencies, builds the client, registers PM2 + Chrome kiosk in Task Scheduler, and saves the PM2 process list. Reboot once afterwards to verify the full auto-start chain.

If you prefer PowerShell manually:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

Prerequisites (install manually before running setup):

- Node.js LTS (20.x or 22.x)
- Git (only required if you want to use `update.bat` for one-click updates)
- Google Chrome
- grandMA2 onPC with **Telnet Remote → Login Enabled** in Global Settings

---

## Public repo + venue PC (no GitHub login)

Repo: **https://github.com/maway99/trilogy-panel** (public). `git pull` on the venue PC needs no GitHub account. `config.json` is included in the repo.

**First time on a venue PC:**

```bat
cd C:\
git clone https://github.com/maway99/trilogy-panel.git
cd trilogy-panel
```

Review `config.json` if this PC’s IPs differ, then **right-click `setup.bat` → Run as administrator**, reboot.

**Updates on the venue PC (no login):**

```bat
cd C:\trilogy-panel
update.bat
```

`update.bat` runs `git pull` (no credentials) then rebuilds and restarts the server. Edits you make to `config.json` on the PC will be overwritten if the same file changed on GitHub — edit `config.json` in git on your laptop if you want pulls to apply everywhere.

---

## Moving to another PC

PM2 remembers processes **per Windows user account**, not inside this project folder. On a new machine you will see `process or namespace trilogy-panel not found` until the app is registered once.

**On each new PC (once):**

1. Install **Node.js LTS** and **Google Chrome**
2. Copy or clone the project (e.g. `C:\trilogy-panel\`)
3. Edit `config.json` if IPs differ
4. **Right-click `setup.bat` → Run as administrator**
5. Reboot to test auto-start

**After that:** use `update.bat` for code changes, or `start-panel.bat` to start/restart the server only.

Do **not** rely on `pm2 restart trilogy-panel` alone on a PC that has never run `setup.bat`.

---

## Updating

Double-click `update.bat`. It runs `git pull`, reinstalls any changed dependencies, rebuilds the client, and restarts the server via PM2. The Chrome kiosk reconnects to the new server automatically — no need to relaunch it.

If you only edited `config.json` (cue mappings, IPs, labels), you don't need a rebuild:

```
pm2 restart trilogy-panel
```

Config-only edits take effect on the next server start. The client picks up the new config on its next WebSocket connect.

---

## Configuration — `config.json`

All venue-specific values live here. **No hardcoded values in code.**

| Section          | What to set                                                                 |
|------------------|------------------------------------------------------------------------------|
| `ma2.ip`         | `127.0.0.1` if panel is on the same PC as onPC (recommended)                |
| `ma2.password`   | Whatever you set in MA2's Telnet Remote settings                            |
| `resolume.ip`    | Static IP of the Resolume PC                                                |
| `cueStack`       | Page/exec of the single cue stack the panel drives                          |
| `cueBanks.*`     | List of cue numbers per bank — these are the buttons on the Lighting tab    |
| `executors.haze` | Fader executor for haze level                                               |
| `executors.endOfNight` | Toggle exec for the End-of-Night sequence                             |
| `executors.confetti` | One entry per cannon, with `side: "left" \| "right"` for UI grouping    |
| `executors.disables` | Inhibitive submaster execs per fixture group                            |
| `defaults.fadeTime`  | Fade time on first launch (currently 0.5s)                              |

`config.json` is read once at server start. Restart PM2 after editing.

---

## Daily operations

**Normal start:** PC boots → MA2 launches → PM2 brings the server up → Chrome opens in kiosk mode → panel shows ✅ MA2 + ✅ Resolume in the sidebar.

**Server crashed silently:** PM2 will have restarted it within ~2s. Verify with `pm2 status`. The panel UI auto-reconnects.

**MA2 crashed or restarted:** Panel shows a full-screen **CONSOLE OFFLINE — Reconnecting…** overlay. All state resets to neutral. When MA2 comes back, the overlay dismisses automatically. Staff re-select the cue they want — the panel does **not** try to replay stale state into a freshly-loaded show file.

**Resolume crashed:** Video tab grays out. Lighting tab unaffected. When Resolume returns, brightness fader does a one-time sync from Resolume.

**Exit kiosk to use the PC:** `Alt+F4` closes Chrome. PM2 keeps the server running in the background.

---

## Troubleshooting

| Symptom                                          | First check                                                            |
|--------------------------------------------------|------------------------------------------------------------------------|
| Panel stuck on "CONSOLE OFFLINE"                 | `pm2 logs trilogy-panel` → look for `ECONNREFUSED` (MA2 not listening on 30000) or login rejection. Verify MA2 → Setup → Network → Telnet Remote → Login Enabled. |
| Buttons press but nothing happens in MA2         | Status tab → Last MA2 response. If empty, login didn't complete. If you see `Error :` the executor number in `config.json` doesn't match the show file. Use the **Send Raw MA2 Command** box on the Status tab to test syntax. |
| Resolume offline overlay won't clear             | Resolume → Preferences → Webserver → Enable. Confirm port 8080. Firewall on Resolume PC must allow inbound from the MA2 PC. |
| Panel server offline overlay                     | `pm2 status`. If missing: double-click `start-panel.bat` or run `setup.bat`. If looping: `pm2 logs trilogy-panel`. |
| Chrome didn't auto-launch on boot                | `Task Scheduler → Trilogy Chrome Kiosk → Last Run Result`. Check `logs\kiosk-startup.log`. |
| Need to update on the fly                        | Double-click `update.bat`. |

The **Status tab** in the panel itself is the primary diagnostic surface — connection states, last MA2 command/response, last Resolume HTTP code, and a raw-command input.

---

## File map

```
server.js              # Express + WS + MA2 telnet + Resolume HTTP
config.json            # All venue-specific mappings + IPs + labels
ecosystem.config.js    # PM2 process definition
setup.bat              # First-time installer (run as admin)
setup.ps1              # Installer logic (called by setup.bat)
start-panel.bat        # Start/restart server only (new PC after Node installed)
scripts/pm2-ensure-panel.bat  # PM2 helper (used by setup/update/startup)
update.bat             # One-click updater
startup-chrome.bat     # Chrome kiosk launcher (Task Scheduler runs this)
startup.bat            # Calls startup-chrome.bat
client/                # React + Vite source
client/dist/           # Built frontend (Express serves from here)
LAUNCH_CHECKLIST.md    # Pre-go-live verification checklist
```
