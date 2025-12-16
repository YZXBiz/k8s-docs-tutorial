# Chapter 6: Kubernetes Deployments

**Previous:** [Chapter 5: Virtual Clusters with Namespaces](05-virtual-clusters-namespaces.md) | **Next:** [Chapter 7: Kubernetes Services](07-kubernetes-services.md)

---

## 📋 Table of Contents

1. [Deployment Fundamentals](#1-deployment-fundamentals)
   - 1.1. [What are Deployments](#11-what-are-deployments)
   - 1.2. [Deployment Architecture](#12-deployment-architecture)
   - 1.3. [Self-Healing and Scaling](#13-self-healing-and-scaling)
2. [Desired State Management](#2-desired-state-management)
   - 2.1. [Declarative Configuration](#21-declarative-configuration)
   - 2.2. [Controller Reconciliation](#22-controller-reconciliation)
   - 2.3. [Monitoring and Maintenance](#23-monitoring-and-maintenance)
3. [Rolling Updates and Rollbacks](#3-rolling-updates-and-rollbacks)
   - 3.1. [Rolling Update Strategy](#31-rolling-update-strategy)
   - 3.2. [Update Configuration](#32-update-configuration)
   - 3.3. [Rollback Operations](#33-rollback-operations)
4. [Deployment Operations](#4-deployment-operations)
   - 4.1. [Creating Your First Deployment](#41-creating-your-first-deployment)
   - 4.2. [Scaling Deployments](#42-scaling-deployments)
   - 4.3. [Updating Applications](#43-updating-applications)
   - 4.4. [Managing Rollbacks](#44-managing-rollbacks)
5. [Deployment Troubleshooting](#5-deployment-troubleshooting)
   - 5.1. [Common Issues](#51-common-issues)
   - 5.2. [Debugging Deployments](#52-debugging-deployments)
   - 5.3. [Best Practices](#53-best-practices)

---

## 1. Deployment Fundamentals

### 1.1. What are Deployments

Kubernetes Deployments provide declarative management for Pods and ReplicaSets. They enable you to describe a desired state for your application, and the Deployment controller continuously works to maintain that state.

Think of a Deployment like a restaurant manager who ensures consistent service. Just as a manager doesn't cook or serve tables directly but orchestrates everything to deliver a reliable dining experience, a Deployment doesn't run applications directly but manages Pods to ensure your application is resilient, scalable, and updatable.

**Key Deployment Capabilities:**
- **Self-healing**: Automatically replaces failed Pods
- **Scaling**: Increases or decreases Pod replicas based on demand
- **Rolling updates**: Updates applications without downtime
- **Rollbacks**: Reverts to previous versions when issues occur

### 1.2. Deployment Architecture

Deployments work through a hierarchical management structure:

```
Deployment
     └── ReplicaSet
             └── Pod 1
             └── Pod 2
             └── Pod 3
```

This is similar to restaurant management hierarchy:
- **Deployment** = Restaurant Manager (sets overall policy)
- **ReplicaSet** = Shift Supervisor (ensures right number of staff)
- **Pods** = Waiters/Cooks (do the actual work)

The Deployment controller watches for changes and ensures the ReplicaSet maintains the desired number of Pod replicas.

:::info[Insight]
**Deployments never manage Pods directly** - they always work through ReplicaSets. When you update a Deployment, it creates a new ReplicaSet with the updated configuration while gradually scaling down the old one. This enables rolling updates and easy rollbacks.
:::

### 1.3. Self-Healing and Scaling

One of the most powerful features of Deployments is their ability to automatically maintain the desired state of your application.

**Self-Healing in Action:**
If a Pod fails, the Deployment controller immediately notices and instructs the ReplicaSet to create a replacement. This is like a restaurant manager who immediately calls in a backup waiter when someone calls in sick - the service continues uninterrupted.

**Scaling Operations:**
You can scale Deployments up or down by changing the replica count. During busy periods (high traffic), you scale up. During quiet periods (low traffic), you scale down to save resources.

```yaml
# Scale to 5 replicas
kubectl scale deployment myapp --replicas=5

# Scale down to 2 replicas
kubectl scale deployment myapp --replicas=2
```

## 2. Desired State Management

### 2.1. Declarative Configuration

Kubernetes Deployments use a declarative approach where you specify the desired end state rather than the steps to achieve it. You describe what you want, and Kubernetes figures out how to make it happen.

This is like describing the desired state of a restaurant's dinner service to a manager: "I want 3 waiters, 2 cooks, and tables cleaned every 30 minutes" rather than giving step-by-step instructions. The manager figures out how to achieve and maintain this state.

**Deployment YAML Example:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  replicas: 3                    # Desired state: 3 Pod instances
  selector:
     matchLabels:
       app: webapp
  template:
     metadata:
       labels:
         app: webapp
     spec:
       containers:
       - name: web
         image: nginx:1.21
         ports:
         - containerPort: 80
```

### 2.2. Controller Reconciliation

The Deployment controller continuously monitors the actual state and compares it to the desired state. When they differ, it takes action to reconcile them.

**The Reconciliation Loop:**
1. **Observe**: Check current state (how many Pods are running?)
2. **Compare**: Does current state match desired state?
3. **Act**: If not, make changes to align with desired state
4. **Repeat**: Continuously monitor and adjust

This is similar to how a restaurant manager continuously walks the floor, checking if the right number of staff are working, if service quality is maintained, and making adjustments when needed.

:::info[Insight]
**The controller pattern is fundamental to Kubernetes** - controllers continuously reconcile desired state with actual state. This self-healing behavior ensures your applications maintain the configuration you specified, even when individual components fail.
:::

### 2.3. Monitoring and Maintenance

Deployments provide built-in monitoring and status reporting to help you understand the health of your applications.

**Key Status Information:**
- **Available replicas**: How many Pods are ready to serve traffic
- **Ready replicas**: How many Pods have passed health checks
- **Updated replicas**: How many Pods are running the latest version

```bash
# Check Deployment status
kubectl get deployments
kubectl describe deployment webapp
kubectl rollout status deployment webapp
```
## 3. Rolling Updates and Rollbacks

### 3.1. Rolling Update Strategy

Rolling updates allow you to update your application without downtime by gradually replacing old Pods with new ones. This ensures that some instances of your application are always available to serve traffic.

Think of this like updating a restaurant's menu during dinner service. Instead of shutting down to print new menus, you gradually replace old menus at tables as customers finish courses - the restaurant never stops serving, and there's always a menu available at every table.

**How Rolling Updates Work:**
1. Create new ReplicaSet with updated Pod template
2. Scale up new ReplicaSet (create new Pods)
3. Scale down old ReplicaSet (terminate old Pods)
4. Repeat until all Pods are updated

```bash
# Update the application image
kubectl set image deployment/webapp web=nginx:1.22

# Watch the rollout progress
kubectl rollout status deployment/webapp
```

### 3.2. Update Configuration

You can configure how rolling updates behave using deployment strategy settings:

```yaml
spec:
  strategy:
     type: RollingUpdate
     rollingUpdate:
       maxUnavailable: 25%     # Max 25% of desired Pods can be unavailable
       maxSurge: 25%          # Max 25% extra Pods can be created temporarily
```

**Update Strategy Options:**
- **maxUnavailable**: Maximum number of Pods that can be unavailable during updates
- **maxSurge**: Maximum number of Pods that can be created above desired replica count

:::info[Insight]
**Rolling updates use two ReplicaSets** - the old one scales down while the new one scales up. This dual-ReplicaSet approach enables zero-downtime updates and makes rollbacks simple - just scale the old ReplicaSet back up and the new one down.
:::

### 3.3. Rollback Operations

When an update introduces problems, you can quickly rollback to a previous version. This is like a restaurant reverting to yesterday's menu when customers complain about today's new dishes.

```bash
# View rollout history
kubectl rollout history deployment/webapp

# Rollback to previous version
kubectl rollout undo deployment/webapp

# Rollback to specific revision
kubectl rollout undo deployment/webapp --to-revision=2

# Check rollback status
kubectl rollout status deployment/webapp
```
## 4. Deployment Operations

### 4.1. Creating Your First Deployment

Let's create a simple web application deployment to demonstrate core concepts:

**Basic Deployment YAML:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  labels:
     app: web-app
spec:
  replicas: 3
  selector:
     matchLabels:
       app: web-app
  template:
     metadata:
       labels:
         app: web-app
     spec:
       containers:
       - name: web
         image: nginx:1.21
         ports:
         - containerPort: 80
         resources:
           requests:
             memory: 64Mi
             cpu: 250m
           limits:
             memory: 128Mi
             cpu: 500m
```

**Deploy and verify:**
```bash
# Create the deployment
kubectl apply -f web-app-deployment.yaml

# Check deployment status
kubectl get deployments
kubectl get replicasets
kubectl get pods

# Watch deployment progress
kubectl rollout status deployment/web-app
```

This creates a deployment that manages 3 Pod replicas, just like a restaurant manager ensuring 3 waiters are always on duty during dinner service.

### 4.2. Scaling Deployments

Scaling adjusts the number of Pod replicas to handle varying load levels:

**Manual Scaling:**
```bash
# Scale up for high traffic
kubectl scale deployment web-app --replicas=5

# Scale down during quiet periods
kubectl scale deployment web-app --replicas=2

# Check scaling progress
kubectl get deployments -w
```

**Declarative Scaling:**
```yaml
# Update deployment YAML
spec:
  replicas: 5  # Changed from 3 to 5
```

```bash
kubectl apply -f web-app-deployment.yaml
```

### 4.3. Updating Applications

Rolling updates enable you to update applications without service interruption:

**Image Updates:**
```bash
# Update to newer version
kubectl set image deployment/web-app web=nginx:1.22

# Monitor update progress
kubectl rollout status deployment/web-app

# Check rollout history
kubectl rollout history deployment/web-app
```

**Configuration Updates:**
Update your deployment YAML with new configuration and apply:
```bash
kubectl apply -f web-app-deployment.yaml
```

### 4.4. Managing Rollbacks

When updates cause problems, rollbacks provide quick recovery:

```bash
# Rollback to previous version
kubectl rollout undo deployment/web-app

# Rollback to specific revision
kubectl rollout undo deployment/web-app --to-revision=2

# Pause an ongoing rollout
kubectl rollout pause deployment/web-app

# Resume a paused rollout
kubectl rollout resume deployment/web-app
```

## 5. Deployment Troubleshooting

### 5.1. Common Issues

When Deployments don't work as expected, here are the most common problems and their solutions:

**Pod Creation Failures:**
```bash
# Check deployment status
kubectl get deployments
kubectl describe deployment web-app

# Common issues:
# - Image pull errors (wrong image name/tag)
# - Resource constraints (insufficient CPU/memory)
# - Node availability problems
```

**Stuck Rolling Updates:**
```bash
# Check rollout status
kubectl rollout status deployment web-app --timeout=300s

# If stuck, investigate:
kubectl get replicasets
kubectl describe replicaset <new-rs-name>
kubectl get events --sort-by=.metadata.creationTimestamp
```

### 5.2. Debugging Deployments

**Systematic Debugging Approach:**

1. **Check Deployment Status:**
```bash
kubectl get deployment web-app -o wide
kubectl describe deployment web-app
```

2. **Examine ReplicaSets:**
```bash
kubectl get replicasets
kubectl describe replicaset <rs-name>
```

3. **Investigate Pod Issues:**
```bash
kubectl get pods -l app=web-app
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

4. **Review Events:**
```bash
kubectl get events --field-selector involvedObject.name=web-app
```

### 5.3. Best Practices

**Deployment Configuration:**
- Set appropriate resource requests and limits
- Configure health checks (readiness and liveness probes)
- Use meaningful labels and annotations
- Set reasonable rollout parameters

**Update Strategy:**
- Test updates in staging environments first
- Use gradual rollout settings (maxUnavailable, maxSurge)
- Monitor metrics during updates
- Have rollback plan ready

**Example Best Practice Configuration:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  strategy:
     type: RollingUpdate
     rollingUpdate:
       maxUnavailable: 1
       maxSurge: 1
  template:
     spec:
       containers:
       - name: web
         image: nginx:1.21
         resources:
           requests:
             memory: 64Mi
             cpu: 250m
           limits:
             memory: 128Mi
             cpu: 500m
         readinessProbe:
           httpGet:
             path: /health
             port: 80
           initialDelaySeconds: 5
           periodSeconds: 10
         livenessProbe:
           httpGet:
             path: /health
             port: 80
           initialDelaySeconds: 15
           periodSeconds: 20
```

:::info[Insight]
**Health checks are crucial for reliable deployments** - readiness probes ensure Pods are ready to serve traffic before routing requests to them, while liveness probes restart Pods that become unresponsive. Without proper health checks, rolling updates can deploy broken versions.
:::

---

## Chapter Summary

Kubernetes Deployments provide powerful declarative management for running applications at scale. They abstract away the complexity of managing individual Pods and ReplicaSets, giving you high-level controls for scaling, updating, and maintaining applications.

**Key Deployment Concepts:**
- **Declarative Management**: Describe desired state, let Kubernetes handle the details
- **Self-Healing**: Automatically replace failed Pods to maintain desired replica count
- **Rolling Updates**: Update applications without downtime using gradual replacement
- **Rollbacks**: Quickly revert to previous versions when problems occur
- **Scaling**: Easily adjust replica count for varying load demands

**Deployment Architecture:**
- Deployments manage ReplicaSets
- ReplicaSets manage Pods
- Controllers continuously reconcile desired vs actual state

**When to Use Deployments:**
- Stateless applications requiring high availability
- Applications needing frequent updates
- Services requiring scaling capabilities
- Production workloads needing reliability guarantees

The restaurant manager analogy helps illustrate how Deployments orchestrate application lifecycle - just as a skilled manager ensures consistent service through staff management, training, and continuous improvement, Deployments ensure your applications remain available, updated, and responsive to changing demands.

---

**Navigation:**
- **Previous:** [5. Virtual Clusters with Namespaces](05-virtual-clusters-namespaces.md)
- **Next:** [7. Kubernetes Services](07-kubernetes-services.md)
- **Up:** [Table of Contents](intro.md)
