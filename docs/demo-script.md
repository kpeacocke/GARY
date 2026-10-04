# Phase 1 demo script

1. Open GARY. State the rule: **never drop the beat**.
2. Press **PLAY**. All four services are healthy and all four musical layers are audible.
3. Press **FAIL** on Drums. The beat thins immediately, while Bass, Synth and Voice/FX continue on the master timeline.
4. Press **RECOVER** on Drums. Drums return in time; the track does not restart.
5. Repeat with another component to show that health is the mix.
6. Explain the next commit: failure emits an event, EDA receives it, AAP executes governed remediation, and recovery restores the stem.

Do not introduce the AI agents until the EDA/AAP recovery path is working.
