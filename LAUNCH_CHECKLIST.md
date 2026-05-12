# Launch Checklist — Trilogy Panel

Run through this **on-site, on the actual lighting PC, with the MA2 show file finalised**. Anything unchecked is a known risk to opening night.

---

## Pre-install

- [ ] grandMA2 show file is finalised; every cue/executor referenced in `config.json` exists in the show
- [ ] MA2 → Setup → Network → **Telnet Remote → Login Enabled = Yes**
- [ ] A `password` is set in MA2 for the panel's user (not blank for production)
- [ ] Resolume PC has a **static IP**; that IP is in `config.json`
- [ ] Resolume → Preferences → Webserver → Enabled, port 8080
- [ ] Windows Firewall on the Resolume PC allows inbound 8080 from the MA2 PC's IP
- [ ] Node.js LTS installed on the MA2 PC
- [ ] Google Chrome installed on the MA2 PC

## Install

- [ ] Project copied to a permanent path (e.g. `C:\trilogy-panel\`)
- [ ] `config.json` reviewed end-to-end — every executor number cross-checked against the show file
- [ ] `setup.ps1` run from elevated PowerShell, no errors
- [ ] `pm2 status` shows `trilogy-panel` as `online`
- [ ] `http://localhost:3000` loads — Status tab shows green dots for MA2 and Resolume

## Smoke test (server connected, panel open)

For each, press the panel control and confirm the **MA2 command line** (or Resolume preview) reacts correctly:

- [ ] **Haze slider** — drag to 50, release. MA2 Fader for haze exec moves. Drag to 0.
- [ ] **Fade Time** — switch between 0s / 0.5s / 2s. Pick 0s for next test.
- [ ] **Cue from each bank** — Static, Slow, Main, Strobing, Lasers Slow, Lasers Drop, Buildups (1 cue per bank minimum). Confirm the right rig look comes up each time.
- [ ] **Cue swap** — fire a cue, then a different one. Previous deactivates, new one activates.
- [ ] **Blackout** — toggle on, rig blacks out. Toggle off, rig comes back to last cue.
- [ ] **End of Night** — fire while a cue is active. EOTN sequence runs, previous cue + confetti tracking clear.
- [ ] **EOTN release** — with EOTN active, press any cue. EOTN goes off, new cue fires.
- [ ] **Disables** — toggle each fixture group off. That group goes dark. Toggle back on, returns. Sidebar badge increments correctly.
- [ ] **Confetti** — fire each cannon. Physical cannon discharges (NB: do this *before* a public night, not during). Fired indicator shows. Reset clears indicators.
- [ ] **Video — DJ Source** — switch between Generic Trilogy / Custom Logo / Myles Away. Confirm the right clip plays in Resolume.
- [ ] **Video — Brightness** — slide to 50, then back to 100. Master opacity moves in Resolume.

## Failure-mode test

- [ ] Stop MA2 onPC. Panel shows **CONSOLE OFFLINE** overlay within ~5s. All Lighting controls reset.
- [ ] Relaunch MA2. Overlay dismisses automatically. Verify cues fire again.
- [ ] Stop Resolume. Video tab shows **RESOLUME OFFLINE** within ~2s. Other tabs still operational.
- [ ] Relaunch Resolume. Video tab returns. Brightness reads back current Resolume value.
- [ ] `pm2 stop trilogy-panel` → panel shows **PANEL SERVER OFFLINE**. `pm2 start trilogy-panel` → panel reconnects within ~2s.
- [ ] Kill the Node process with Task Manager (not pm2). PM2 should auto-restart within 2s.

## Reboot test (most important)

- [ ] Reboot the MA2 PC.
- [ ] No manual intervention needed — within ~90s of logon you should see the kiosk panel with green status.
- [ ] If anything is red after 2 minutes, check Task Scheduler → "Last Run Result" for both Trilogy entries.

## Hardening for go-live

- [ ] Disable Windows Update auto-restart during venue hours
- [ ] Disable Windows notification toasts (do not let them pop over the kiosk)
- [ ] Set the PC's display sleep to **Never** while plugged in
- [ ] Disable screensaver
- [ ] Disable Windows tablet on-screen keyboard auto-popup (it can steal taps)
- [ ] Test that the touchscreen tap registers as a single click event (some panels send right-click on long press — change driver settings if needed)
- [ ] Document the MA2 telnet password somewhere only the venue team can access
- [ ] Take a snapshot copy of the working `config.json` and stash it in the project root as `config.golden.json`

## Night 1

- [ ] Be physically on-site for the first hour
- [ ] Have a laptop ready that can SSH into / RDP onto the PC to run `pm2 logs` if something goes wrong
- [ ] Print this page and circle anything you skipped
