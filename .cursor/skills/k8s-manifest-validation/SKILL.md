---
name: k8s-manifest-validation
description: Validates Kubernetes manifests and Helm charts locally, then verifies a rollout with read-only cluster inspection. Use when writing or reviewing manifests, Kustomize overlays, or Helm charts, when preparing a deployment, or when debugging CrashLoopBackOff, ImagePullBackOff, a stuck rollout, or failing probes.
---

# Kubernetes manifest validation

Validate locally before anything reaches a cluster. Cluster reads are free; cluster writes need explicit user approval, per action.

## Static gate

```
- [ ] 1. Renders (kustomize build / helm template)
- [ ] 2. Schema-valid (kubeconform -strict)
- [ ] 3. Required-fields checklist passes
- [ ] 4. Diff against the live cluster reviewed
```

**1. Render** — always validate the rendered output, never the template source:

```bash
kustomize build infra/k8s/overlays/dev
helm template api infra/helm/api -f infra/helm/api/values-dev.yaml
```

A template that renders empty or drops a resource is the most common silent failure. Confirm the expected kinds are present.

**2. Schema-validate**:

```bash
kustomize build infra/k8s/overlays/dev | kubeconform -strict -summary -
helm lint infra/helm/api
```

`-strict` rejects unknown fields, which catches the misindented and misspelled keys Kubernetes would otherwise ignore.

**3. Required-fields checklist** — read the rendered YAML and reject a workload missing any of:

- `resources.requests` and `resources.limits` (CPU + memory)
- `readinessProbe` and `livenessProbe` — Spring Boot: `/actuator/health/readiness` and `/actuator/health/liveness`; Next.js: a dedicated lightweight route
- Immutable image (digest or release tag, never `:latest`)
- `securityContext`: `runAsNonRoot: true`, `allowPrivilegeEscalation: false`
- Labels `app.kubernetes.io/name`, `app.kubernetes.io/component`, `app.kubernetes.io/version`
- `RollingUpdate` with `maxUnavailable: 0` for user-facing services
- No literal secret values; every credential comes from a `Secret` reference

**4. Diff against live** — via the `kubernetes` MCP server, read the current Deployment and compare replicas, image, env, and resources with the rendered output. Report what would change **before** proposing an apply.

## Applying

Propose the exact command and wait for approval. Confirm the current context first and name it in the proposal.

```bash
kubectl config current-context
kustomize build infra/k8s/overlays/dev | kubectl apply --dry-run=server -f -   # server-side validation, no mutation
```

Never apply to a production context unless the user names that context in the request.

## Rollout verification (read-only)

After an approved apply, use the `kubernetes` MCP server in this order and quote real output:

1. `rollout status` on the Deployment — did it converge?
2. Pod list — `READY` counts and restart counts
3. Pod events — scheduling, image pull, and probe failures surface here first
4. Container logs — including `--previous` for a crashed container

## Debug decision table

| Symptom | Look at | Usual cause |
| --- | --- | --- |
| `ImagePullBackOff` | Pod events | Wrong tag/digest, missing `imagePullSecrets`, wrong registry |
| `CrashLoopBackOff` | Previous container logs | Missing env var or secret, DB unreachable, bad config profile |
| Pod running but not `READY` | Probe config + app logs | Readiness path wrong, port mismatch, `initialDelaySeconds` too short for JVM start |
| Rollout stuck at partial replicas | Events + resource requests | Unschedulable — insufficient CPU/memory, node selector, or PDB blocking |
| `OOMKilled` | Pod status + limits | Memory limit below JVM heap + overhead |
| Frontend cannot reach API | Service and Endpoints | Selector mismatch, wrong port name, wrong in-cluster DNS name |

For a JVM container, memory limit must exceed heap plus metaspace and thread stacks — set `-XX:MaxRAMPercentage` rather than a fixed `-Xmx` that ignores the limit.

## Report format

State: what was rendered, which validators passed with their output, the required-fields checklist result, the diff versus live, and the exact command awaiting approval. Record the deployment spec in `docs/specs/k8s/`.
