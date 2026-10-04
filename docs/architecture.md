# GARY architecture

## Phase 1

Phase 1 proves the core spectacle before adding AI or automation complexity: infrastructure/component health is represented audibly, and individual failures do not stop the master musical timeline.

```text
Browser UI / Web Audio transport
          |
          +-- drums gain  <--- component state: drums
          +-- bass gain   <--- component state: bass
          +-- synth gain  <--- component state: synth
          +-- voice gain  <--- component state: voice
          |
          +-- REST API ---- GARY Node.js service ---- in-memory state/event log
```

The audio transport is deliberately browser-side. All musical voices are scheduled against one Web Audio clock. Failing a component changes only that stem's gain. Recovering it brings the stem back against the existing master clock, rather than restarting playback.

## Intended final architecture

```text
Audience / telemetry
        |
        v
OpenShift AI multi-agent reasoning
  | Operations
  | Finance
  | Security
  | Sustainability
        |
        v
AAP + Event-Driven Ansible
  | policy / governance
  | deterministic workflows
  | audit / validation
        |
        v
OpenShift + RHEL + external systems
        |
        +------ telemetry ------> GARY UI / audio
```

**Core principle:** AI agents can disagree. AAP controls what is actually allowed to happen.

**Theatrical rule:** The music must never stop.

## Event contract

Phase 1 already emits CloudEvents-style state-change records through `/api/events`:

```json
{
  "specversion": "1.0",
  "type": "com.redhat.gary.component.failed",
  "source": "/gary/simulator",
  "subject": "audio/drums",
  "id": "<uuid>",
  "time": "<RFC3339>",
  "data": {
    "component": "drums",
    "status": "failed",
    "reason": "audience"
  }
}
```

The next integration replaces one manual recovery with:

```text
FAIL bass -> event -> EDA -> AAP workflow -> recovery endpoint/action -> bass returns
```

AAP must not be used as a fake pod restarter. OpenShift owns platform-native resilience; AAP owns governed cross-domain response and deterministic operational action.
