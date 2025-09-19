# 5. Virtual Clusters with Namespaces

*Understanding how Kubernetes organizes cluster resources through logical separation*

## Table of Contents
1. [Introduction](#1-introduction)
2. [Namespace Fundamentals](#2-namespace-fundamentals)
   - 2.1. [What are Namespaces](#21-what-are-namespaces)
   - 2.2. [Isolation and Multi-tenancy](#22-isolation-and-multi-tenancy)
   - 2.3. [Resource Scope](#23-resource-scope)
3. [Use Cases and Multi-tenancy](#3-use-cases-and-multi-tenancy)
   - 3.1. [Isolation Levels](#31-isolation-levels)
   - 3.2. [Organizational Patterns](#32-organizational-patterns)
4. [Default Namespaces](#4-default-namespaces)
5. [Creating and Managing Namespaces](#5-creating-and-managing-namespaces)
   - 5.1. [Creating Namespaces](#51-creating-namespaces)
   - 5.2. [Context Configuration](#52-context-configuration)
   - 5.3. [Deploying to Namespaces](#53-deploying-to-namespaces)
6. [Summary](#6-summary)

## 1. Introduction

Kubernetes Namespaces provide a mechanism for dividing cluster resources between multiple users, teams, or applications. Think of them like apartments in a building - each namespace has its own identity and resources while sharing the underlying cluster infrastructure.

Namespaces enable organizations to:
- **Organize resources** by team, project, or environment
- **Apply different policies** to different groups of resources
- **Isolate workloads** from each other within the same cluster
- **Manage resource quotas** and access controls separately

This chapter covers namespace fundamentals, common use cases, and practical management techniques for organizing your Kubernetes resources effectively.

> **💡 Insight**
>
> Namespaces enable "soft multi-tenancy" - like having different apartments in the same building. You get separation and organization, but you still share the underlying infrastructure. For complete isolation, you'd need separate buildings (separate clusters).

## 2. Namespace Fundamentals

Namespaces provide logical separation within Kubernetes clusters, allowing multiple virtual clusters to coexist on the same physical infrastructure.

### 2.1. What are Namespaces

A Namespace is a virtual cluster inside a physical Kubernetes cluster that provides scope for resource names and enables resource isolation. Like apartments in a building that share infrastructure while maintaining separate living spaces, namespaces share cluster resources while providing logical boundaries.

Key characteristics:

```
Cluster Level                  Namespace Level
─────────────                 ──────────────
Physical nodes           →    Virtual boundaries
Shared infrastructure    →    Isolated resources
Global networking        →    Scoped services
Central API server       →    Named resource groups
```

**Important distinction:**
- **Kubernetes Namespaces**: Virtual divisions within a cluster
- **Linux kernel namespaces**: Low-level container isolation (completely different concept)

**Resource organization:**
```bash
# Check which resources can live in apartments (namespaced)
$ kubectl api-resources
NAME                     NAMESPACED   KIND
pods                     true         Pod           ← Lives in apartments
services                 true         Service       ← Lives in apartments
nodes                    false        Node          ← Building infrastructure
persistentvolumes        false        PersistentVolume ← Building infrastructure
```

### 2.2. Isolation and Multi-tenancy

Namespaces provide "soft isolation" - logical separation suitable for trusted tenants within the same organization. Like apartment buildings where residents share infrastructure but have separate living spaces, namespaces share cluster resources while providing workload separation.

Isolation characteristics:

**Soft Isolation Features:**
```
Isolation Aspect             Implementation
────────────────            ──────────────
Access control          →   RBAC permissions
Resource limits         →   Resource quotas
Network separation      →   Network policies
Security boundaries     →   Pod security policies
```

**Multi-tenancy levels:**
```
Tenancy Type             Use Case                    Example
───────────────         ─────────────────          ──────────────────
Internal teams      →   Department separation   →   finance, hr, engineering
Development stages  →   Environment isolation   →   dev, test, prod
Application tiers   →   Service organization    →   frontend, backend, database
```

### 2.3. Resource Scope

Kubernetes resources fall into two categories: namespaced resources that belong to specific namespaces, and cluster-scoped resources that are available cluster-wide. Like how apartments have private amenities while sharing building-wide infrastructure, some resources are namespace-specific while others serve the entire cluster.

Resource categorization:

**Namespaced Resources:**
```
Resource Type               Description
─────────────              ───────────
Pods                   →   Application workloads
Services               →   Network access
ConfigMaps & Secrets   →   Configuration data
ResourceQuotas         →   Resource limits
Deployments            →   Application management
```

**Cluster-scoped Resources:**
```
Resource Type              Description
─────────────             ───────────
Nodes                 →   Cluster infrastructure
PersistentVolumes     →   Storage resources
ClusterRoles          →   Global permissions
StorageClasses        →   Storage definitions
CustomResourceDefinitions → API extensions
```

> **💡 Insight**
>
> Understanding which resources are namespaced vs cluster-scoped helps you design proper separation. You can have separate development and production namespaces, but they'll share the same nodes and storage infrastructure.

## 3. Use Cases and Multi-tenancy

Namespaces enable multiple organizational patterns for sharing cluster resources efficiently while maintaining appropriate separation.

### 3.1. Isolation Levels

Choose between namespace-level soft isolation and cluster-level hard isolation based on your security and organizational requirements. Like choosing between apartments in a shared building versus separate houses, the decision depends on your privacy and security needs.

**Soft Isolation (Namespaces):**
```
Benefits                        Trade-offs
────────────────               ──────────────────────
Lower resource overhead    →   Shared infrastructure vulnerabilities
Simple cross-namespace access → Potential performance interference
Shared cluster services    →   Limited customization options
Fast provisioning         →   Soft security boundaries
```

**Hard Isolation (Separate Clusters):**
```
Benefits                       Trade-offs
─────────────────             ───────────────────
Strong security boundaries →  Higher resource overhead
Isolated infrastructure    →  Complex cross-cluster communication
Guaranteed performance     →  Increased management complexity
Full customization         →  Higher operational costs
```

**When to use each approach:**
```
Isolation Level        Use Case                    Solution
──────────────        ────────────────           ─────────────────
Internal teams    →   Same organization      →   Namespaces
Environments      →   Dev/test/prod stages   →   Namespaces or clusters
External clients  →   Customer hosting       →   Separate clusters
Compliance       →   Regulatory requirements →   Separate clusters
```

### 3.2. Organizational Patterns

Organizations commonly structure namespaces to mirror their operational patterns. Like how buildings might dedicate floors to different purposes, namespaces can be organized by department, environment, or project to reflect organizational structure and workflows.

**Departmental Organization:**
```yaml
# Organize by business function
finance:
  - accounting-app
  - budget-tracker
  - payment-processor

hr:
  - employee-portal
  - benefits-system
  - training-platform

engineering:
  - ci-cd-tools
  - monitoring-stack
  - development-environments
```

**Environment-based Organization:**
```yaml
# Organize by deployment stage
development:
  - experimental-features
  - developer-tools
  - test-databases

staging:
  - integration-tests
  - performance-testing
  - user-acceptance-tests

production:
  - customer-applications
  - monitoring-systems
  - backup-services
```

**Project-based Organization:**
```yaml
# Organize by application or initiative
project-apollo:
  - apollo-frontend
  - apollo-backend
  - apollo-database

project-thor:
  - thor-api
  - thor-worker
  - thor-storage
```

## 4. Default Namespaces

Every Kubernetes cluster comes with pre-configured namespaces for different purposes. Like how buildings have designated areas for different functions - lobbies, management offices, utility rooms - these default namespaces serve specific operational needs.

Kubernetes creates four default namespaces with specific purposes:

```bash
# View default namespaces
$ kubectl get namespaces
NAME              STATUS   AGE
default           Active   2d
kube-system       Active   2d
kube-public       Active   2d
kube-node-lease   Active   2d
```

**Default namespace purposes:**

1. **default** - User workloads
   ```
   Purpose: Where objects go without specification
   Contents: User applications and services
   Access: Standard user permissions
   Usage: Development and testing workloads
   ```

2. **kube-system** - System components
   ```
   Purpose: Control plane and system services
   Contents: DNS, metrics server, controllers
   Access: System administrators only
   Usage: Core Kubernetes infrastructure
   ```

3. **kube-public** - Public resources
   ```
   Purpose: Resources readable by everyone
   Contents: Cluster information, public ConfigMaps
   Access: Cluster-wide read access
   Usage: Shared configuration and documentation
   ```

4. **kube-node-lease** - Node management
   ```
   Purpose: Node heartbeat and lease management
   Contents: Node lease objects
   Access: Kubelet and system components
   Usage: Node health monitoring
   ```

**Inspecting default namespaces:**
```bash
# Get details about the default namespace
$ kubectl describe namespace default
Name:         default
Labels:       kubernetes.io/metadata.name=default
Annotations:  <none>
Status:       Active
No resource quota.        ← No resource limits
No LimitRange resource.   ← No size restrictions

# Check system services
$ kubectl get services --namespace kube-system
NAME                 TYPE           CLUSTER-IP     PORT(S)
kube-dns             ClusterIP      10.43.0.10     53/UDP,53/TCP
metrics-server       ClusterIP      10.43.4.203    443/TCP
```

## 5. Creating and Managing Namespaces

This section covers practical namespace management: creation, configuration, and deployment operations.

### 5.1. Creating Namespaces

Create namespaces either imperatively for quick setup or declaratively for production use. Like setting up basic apartments quickly versus following detailed architectural plans, both approaches work but declarative methods provide better documentation and repeatability.

#### Imperative Creation (Quick Setup)
```bash
# Quickly create a new namespace
$ kubectl create namespace development
namespace/development created

# Create another one for testing
$ kubectl create ns testing
namespace/testing created
```

#### Declarative Creation (Production Method)
```yaml
# namespace-manifest.yml - Detailed namespace specification
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    environment: prod
    team: platform
    cost-center: engineering
  annotations:
    description: "Production environment for customer applications"
    contact: "platform-team@company.com"
```

```bash
# Create namespace from manifest
$ kubectl apply -f namespace-manifest.yml
namespace/production created
```

**Verify your new namespaces:**
```bash
$ kubectl get namespaces
NAME              STATUS   AGE
default           Active   2d
development       Active   30s
kube-node-lease   Active   2d
kube-public       Active   2d
kube-system       Active   2d
production        Active   15s
testing           Active   25s
```

### 5.2. Context Configuration

Configure kubectl to default to a specific namespace to avoid typing `-n namespace` on every command. Like setting a default delivery address to save time and reduce mistakes, this streamlines your workflow when working primarily in one namespace.

**Check current context:**
```bash
# See which context you're using
$ kubectl config current-context
docker-desktop
```

**Set your default namespace:**
```bash
# Configure kubectl to use development namespace by default
$ kubectl config set-context --current --namespace development
Context "docker-desktop" modified
```

**Test your configuration:**
```bash
# These commands now automatically target the development namespace
$ kubectl get pods        # No -n flag needed
$ kubectl get services     # Automatically uses development namespace
```

**Reset to default namespace:**
```bash
# Return to the default namespace
$ kubectl config set-context --current --namespace default
Context "docker-desktop" modified
```

### 5.3. Deploying to Namespaces

Deploy applications to specific namespaces either by specifying the target with command flags or by embedding the namespace in the manifest. Like addressing packages with specific apartment numbers, both approaches ensure your resources reach the correct destination.

#### Imperative Deployment (Command flags)
```bash
# Deploy Pod to specific namespace using command flags
$ kubectl run web-app --image=nginx --namespace production

# Deploy from a file to specific namespace
$ kubectl apply -f app.yml --namespace production
```

#### Declarative Deployment (Manifest specification)
```yaml
# app-with-namespace.yml - Application with namespace specified
apiVersion: v1
kind: Pod
metadata:
  name: web-server
  namespace: production     # ← Target namespace
  labels:
    app: website
    env: prod
spec:
  containers:
  - name: nginx
    image: nginx:latest
    ports:
    - containerPort: 80

---
apiVersion: v1
kind: Service
metadata:
  name: web-service
  namespace: production     # ← Same namespace for the service
spec:
  selector:
    app: website
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

**Deploy the application:**
```bash
$ kubectl apply -f app-with-namespace.yml
pod/web-server created
service/web-service created
```

**Verify deployment:**
```bash
# Check the production namespace
$ kubectl get all --namespace production
NAME            READY   STATUS    RESTARTS   AGE
pod/web-server  1/1     Running   0          30s

NAME                  TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)
service/web-service   LoadBalancer   10.43.30.174   localhost     80:31112/TCP

# Verify other namespaces are empty
$ kubectl get all --namespace development
No resources found in development namespace.
```

**Cross-namespace visibility:**
```bash
# See resources across all namespaces
$ kubectl get pods --all-namespaces
NAMESPACE     NAME                          READY   STATUS    RESTARTS   AGE
production    web-server                    1/1     Running   0          2m
kube-system   coredns-5d4dd4b4db-xyz123     1/1     Running   0          2d
kube-system   metrics-server-abc456         1/1     Running   0          2d
```

**Testing your deployed application:**
```bash
# Connect to the application (same as any other namespace)
$ curl localhost:80
<!DOCTYPE html>
<html>
<head>
    <title>Welcome to nginx!</title>
...
```

**Cleanup:**
```bash
# Remove namespace and all its contents
$ kubectl delete namespace production
namespace "production" deleted

# This automatically deletes all Pods, Services, etc. in that namespace
```

> **💡 Insight**
>
> Deleting a namespace is a destructive operation that removes all contained resources automatically. This makes cleanup simple but requires caution in production environments - always verify contents before deletion.

## 6. Summary

**What we've learned:**

Namespaces provide an elegant way to organize and separate resources within a Kubernetes cluster, enabling efficient multi-tenancy and resource organization.

**Core Concepts:**
- **Virtual clusters**: Namespaces divide one cluster into multiple logical clusters
- **Soft isolation**: Separation suitable for trusted tenants within the same organization
- **Resource organization**: Most resources are namespaced, but infrastructure remains shared
- **Multi-tenancy**: Enable multiple teams/projects to share cluster resources safely

**Organizational Patterns:**
```
Pattern Type            Purpose                    Example
────────────           ───────────────────       ─────────────────
Departmental       →   Organizational separation  → finance, hr, engineering
Environmental      →   Lifecycle stages          → dev, test, production
Project-based      →   Application grouping      → project-a, project-b
Functional         →   Service categorization    → frontend, backend, data
```

**Default Namespaces:**
- **default**: Where objects go without explicit namespace specification
- **kube-system**: Control plane components and system services
- **kube-public**: Resources readable by all cluster users
- **kube-node-lease**: Node heartbeat and lease management

**Management Operations:**
- **Creation**: Imperative (`kubectl create ns`) or declarative (YAML manifests)
- **Configuration**: Set default namespace context for convenience
- **Deployment**: Specify namespace via CLI flags or YAML metadata
- **Cleanup**: Delete namespace removes all contained resources

**Best Practices:**
- Use descriptive namespace names that reflect purpose
- Set resource quotas and limits for each namespace
- Implement RBAC for namespace-level access control
- Document namespace purposes and ownership
- Use labels and annotations for namespace metadata

**When to use Namespaces vs. Separate Clusters:**
```
Use Namespaces for:              Use Separate Clusters for:
──────────────────              ─────────────────────────
- Internal team separation      - External customer isolation
- Development environments      - Regulatory compliance
- Application categorization    - Complete security boundaries
- Resource organization         - Independent scaling needs
```

**What's next:**

Now that you understand how to organize your cluster with namespaces, the next chapter explores Deployments - the management layer that adds self-healing, scaling, and rolling updates to your Pod deployments.

> **💡 Final Insight**
>
> Namespaces strike the perfect balance between resource sharing and logical separation. They enable efficient multi-tenancy while maintaining clear boundaries and policies for different teams and use cases.

---

**Previous:** [Chapter 4: Working with Pods](04-working-with-pods.md) | **Next:** [Chapter 6: Kubernetes Deployments](06-kubernetes-deployments.md)