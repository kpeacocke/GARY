# GARY — He's Responsible for the Set Now

GARY is a Red Hat DemoJam 2027 project about governed autonomous operations, presented as a live AI DJ whose only rule is **never drop the beat**.

This repository currently contains **Phase 1: audible topology**. Four procedurally generated musical stems represent four service components. Failing a component removes its stem; recovering it restores the stem against the same master timeline.

## Why Phase 1 comes first

The demo only works if the audience can immediately hear infrastructure degrade and recover. AI agents and AAP integration are deliberately deferred until this behaviour is reliable.

## Run locally

Requires Node.js 22+.

```bash
npm start
```

Open <http://localhost:8080> and press **PLAY**.

No npm packages are required.

## API

```text
GET  /healthz
GET  /api/state
GET  /api/events
POST /api/components/:name/fail
POST /api/components/:name/recover
POST /api/reset
```

Valid component names are `drums`, `bass`, `synth`, and `voice`.

Example:

```bash
curl -X POST http://localhost:8080/api/components/drums/fail
curl -X POST http://localhost:8080/api/components/drums/recover
```

## Container

```bash
podman build -t gary-demojam:dev -f Containerfile .
podman run --rm -p 8080:8080 gary-demojam:dev
```

The image uses Red Hat UBI 9 Node.js 22 minimal and runs non-root.

## OpenShift

1. Build and publish the container image.
2. Replace `quay.io/REPLACE_ME/gary-demojam:latest` in `deploy/openshift/deployment.yaml`.
3. Apply:

```bash
oc apply -f deploy/openshift/deployment.yaml
oc get route gary
```

The manifest contains a Deployment, Service and TLS Route, plus health probes and restricted container security settings.

## Roadmap

### Phase 1 — audible topology

- [x] shared master musical timeline
- [x] four synchronised procedural stems
- [x] component fail/recover API
- [x] stem fail/recover without restarting playback
- [x] CloudEvents-style event records
- [x] OpenShift manifests

### Phase 2 — AAP / EDA recovery

Replace one manual recovery path with:

```text
component failure -> event -> Event-Driven Ansible -> AAP -> deterministic recovery -> stem returns
```

### Phase 3 — OpenShift AI agents

Introduce competing objectives:

- Operations: maximise availability
- Finance: minimise cost
- Security: minimise risk
- Sustainability: minimise energy use

Agents propose. AAP governs and executes.

## Architecture principles

- OpenShift owns platform-native resilience.
- AAP is the governed deterministic execution layer, not a pod restart button.
- AI may reason about actions but must not generate unrestricted infrastructure changes.
- The core demo remains software-defined and reproducible through RHDP.
