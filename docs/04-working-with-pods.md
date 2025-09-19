# Chapter 4: Working with Pods

**Previous:** [Chapter 3: Getting Kubernetes](03-getting-kubernetes.md) | **Next:** [Chapter 5: Virtual Clusters and Namespaces](05-virtual-clusters-namespaces.md)

---

## Table of Contents

1. [Pod Fundamentals](#1-pod-fundamentals)
   1.1. [Abstraction Layer](#11-abstraction-layer)
   1.2. [Resource Sharing](#12-resource-sharing)
   1.3. [Pod Scheduling](#13-pod-scheduling)
   1.4. [Pod Lifecycle](#14-pod-lifecycle)

2. [Pod Networking](#2-pod-networking)

3. [Multi-Container Pods](#3-multi-container-pods)
   3.1. [Init Containers](#31-init-containers)
   3.2. [Sidecar Containers](#32-sidecar-containers)

4. [Hands-on with Pods](#4-hands-on-with-pods)
   4.1. [Pod Manifest Files](#41-pod-manifest-files)
   4.2. [Deploying Pods](#42-deploying-pods)
   4.3. [Pod Introspection](#43-pod-introspection)
   4.4. [Multi-Container Examples](#44-multi-container-examples)

5. [Chapter Summary](#5-chapter-summary)

---

## 1. Pod Fundamentals

Every application on Kubernetes runs inside a Pod. Pods are the atomic unit of scheduling and the fundamental building block that wraps your applications and provides everything needed to run them in the Kubernetes infrastructure.

Like shipping containers that revolutionized global trade by standardizing how goods are packaged and moved, Pods revolutionize application deployment by providing a standard way to package and run software.

**Key Pod Concepts:**
- Pods are the smallest deployable units in Kubernetes
- All scaling, updating, and management operations work at the Pod level
- Understanding Pods is essential as they underpin all other Kubernetes resources

### 1.1. Abstraction Layer

Pods abstract the details of what's running inside them, providing a universal interface for different workload types. Like shipping containers that can hold any type of cargo while using the same handling equipment, Pods can run various application types using the same Kubernetes operations.

**Supported Workload Types:**
- **Containers**: Most common, using Docker or OCI-compliant images
- **Virtual Machines**: Through KubeVirt extension
- **Serverless Functions**: Through Knative framework
- **WebAssembly Applications**: Through specialized runtimes

**Abstraction Benefits:**

| Stakeholder | Benefit | Example |
|-------------|---------|----------|
| **Kubernetes** | Focus on orchestration without workload details | Same scheduling logic for all types |
| **Applications** | Access to full Kubernetes API and ecosystem | Standard networking, storage, security |
| **Operations** | Consistent tools and processes | Same kubectl commands for all workloads |

**Workload Extensions:**
Some workload types require API extensions:
- **Serverless functions**: Knative provides custom resources and controllers
- **Virtual machines**: KubeVirt wraps VMs in VirtualMachineInstance (VMI) objects
- **Standard containers**: Work directly with native Pod specifications

Pods provide lightweight abstraction with minimal overhead while enabling advanced scheduling, health probes, restart policies, security policies, and volume management.

### 1.2. Resource Sharing

Pods enable resource sharing by providing a shared execution environment for one or more containers. Like shipping related items together in the same container so they arrive together, containers in a Pod share the Pod's resources and lifecycle.

**Shared Pod Resources:**
- **Network Stack**: All containers share the same IP address and port space
- **Storage Volumes**: Mounted volumes are accessible to all containers
- **IPC Namespace**: Shared memory for inter-process communication
- **Process Namespace**: Shared process tree visibility
- **Hostname**: All containers use the Pod name as hostname

**Multi-Container Pod Architecture:**

```
Pod: web-application (IP: 10.244.1.5)
┌─────────────────────────────────────────┐
│                                         │
│  ┌─────────────┐    ┌─────────────────┐ │
│  │ Web Server  │    │ Log Collector   │ │
│  │ Port: 8080  │    │ Port: 5005      │ │
│  │             │    │                 │ │
│  └─────────────┘    └─────────────────┘ │
│           │                    │        │
│           └── Shared Volume ───┘        │
│                                         │
└─────────────────────────────────────────┘
```

**Container Communication Patterns:**
- **External Access**: `10.244.1.5:8080` (web) and `10.244.1.5:5005` (logs)
- **Internal Communication**: `localhost:8080` or `localhost:5005`
- **Data Sharing**: Common volumes for file-based communication

**Multi-Container Use Cases:**

| Pattern | Description | Example |
|---------|-------------|----------|
| **Tightly Coupled** | Applications requiring resource sharing | App + cache, web + database |
| **Helper Services** | Auxiliary functionality | Log collection, monitoring |
| **Data Sync** | Content synchronization | Git sync + web server |

**When to Avoid Multi-Container Pods:**
- Applications that can communicate over network
- Different scaling requirements (scale independently)
- Different update cycles or lifecycles
- Services that don't need shared resources

### 1.3. Pod Scheduling

The Kubernetes scheduler intelligently places Pods on nodes based on resource requirements, constraints, and optimization criteria. Like a logistics company that considers cargo requirements and ship capabilities, the scheduler ensures optimal placement decisions.

**Scheduling Process:**
1. **API Server**: Receives Pod creation request
2. **Scheduler**: Evaluates available nodes
3. **Filtering**: Eliminates unsuitable nodes
4. **Scoring**: Ranks remaining nodes
5. **Assignment**: Selects highest-scoring node
6. **Binding**: Assigns Pod to chosen node

**Scheduling Factors:**

| Factor | Description | Example |
|--------|-------------|----------|
| **Resource Requests** | Minimum CPU/memory requirements | `cpu: 500m, memory: 1Gi` |
| **Node Capabilities** | Available resources and features | GPU nodes, SSD storage |
| **Constraints** | Placement restrictions | Node selectors, taints |
| **Affinity Rules** | Attraction/repulsion preferences | Co-locate or separate Pods |
| **Topology** | Distribution requirements | Spread across zones |

**Basic Node Selection:**

```yaml
# nodeSelector: Basic node targeting
apiVersion: v1
kind: Pod
spec:
  nodeSelector:
    disktype: ssd
    zone: us-west-1a
  containers:
  - name: app
    image: my-app:1.0
```

**Advanced Affinity Rules:**

```yaml
# Node affinity: Advanced node selection
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: kubernetes.io/arch
            operator: In
            values: ["amd64"]
```

**Resource Specifications:**

```yaml
# Resource requests and limits
spec:
  containers:
  - name: app
    resources:
      requests:          # Minimum guaranteed resources
        cpu: 250m
        memory: 256Mi
      limits:            # Maximum allowed resources
        cpu: 500m
        memory: 512Mi
```

**Scheduling Outcomes:**
- **Scheduled**: Pod assigned to suitable node
- **Pending**: No suitable node found (check resources/constraints)
- **Failed**: Scheduling impossible (insufficient cluster capacity)

`★ Insight ─────────────────────────────────────`
Resource requests and limits are critical for scheduling efficiency. Without them, the scheduler cannot make optimal decisions and may place workloads on inadequate nodes, leading to performance issues.
`─────────────────────────────────────────────────`

### 1.4. Pod Lifecycle

Pods are designed to be mortal and immutable, following a predictable lifecycle from creation to termination. Like shipping containers that are replaced rather than repaired when damaged, Pods are recreated rather than modified when changes are needed.

**Pod Lifecycle Phases:**

| Phase | Description | Container State |
|-------|-------------|----------------|
| **Pending** | Pod accepted, awaiting scheduling | Not started |
| **Running** | Pod bound to node, containers starting/running | At least one running |
| **Succeeded** | All containers terminated successfully | Exit code 0 |
| **Failed** | All containers terminated, at least one failed | Non-zero exit code |
| **Unknown** | Pod state cannot be determined | Communication issues |

**Pod Lifecycle Principles:**

1. **Mortal**: Pods cannot be "repaired" - they're replaced with new instances
2. **Immutable**: Pod configuration cannot be changed after deployment
3. **Atomic**: All containers start together or the Pod fails
4. **Ephemeral**: Pods can disappear and be recreated at any time

**Container Restart vs Pod Replacement:**

| Scenario | Restart Method | Pod Identity | Trigger |
|----------|----------------|--------------|----------|
| **Container Crash** | Container restart within same Pod | Preserved | kubelet + restartPolicy |
| **Node Failure** | New Pod on different node | New Pod created | Controller |
| **Pod Update** | Replace entire Pod | New Pod created | Deployment |
| **Scaling** | Add/remove Pods | New/removed Pods | Controller |

**Restart Policies:**

```yaml
spec:
  restartPolicy: Always     # Default: restart containers on failure
  # restartPolicy: OnFailure # Restart only on non-zero exit
  # restartPolicy: Never     # Never restart containers
```

**Restart Policy Applications:**
- **Always**: Long-running services (web servers, databases)
- **OnFailure**: Batch jobs, data processing tasks
- **Never**: One-time tasks, debugging containers

**Pod Deployment Methods:**

| Method | Description | Self-Healing | Use Case |
|--------|-------------|--------------|----------|
| **Direct Pod** | Manual Pod manifest | No | Testing, debugging |
| **Controller-managed** | Deployment, Job, DaemonSet | Yes | Production workloads |

**Important Distinctions:**
- **Container restart**: Same Pod, same IP, handled by kubelet
- **Pod replacement**: New Pod, new IP, handled by controllers
- **Immutability**: Pods cannot be modified, only replaced

---

## 2. Pod Networking

Every Kubernetes cluster implements a pod network that automatically connects all Pods, enabling direct communication regardless of which node they're running on. Like a global shipping network where containers can be routed between any ports, the pod network provides universal connectivity.

**Pod Network Characteristics:**
- **Universal Connectivity**: Any Pod can communicate with any other Pod
- **Unique Addressing**: Each Pod receives a unique cluster IP address
- **Network Plugins**: Container Network Interface (CNI) provides implementation
- **Security Policies**: Network policies control traffic flow

**Network Architecture:**

```
Kubernetes Cluster Network
┌──────────────────────────────────────────────────┐
│                                                  │
│ Node 1           Node 2           Node 3         │
│ ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│ │ Pod A    │    │ Pod B    │    │ Pod C    │     │
│ │ 10.1.1.2 │◄──►│ 10.1.2.5 │◄──►│ 10.1.3.8 │     │
│ └──────────┘    └──────────┘    └──────────┘     │
│                                                  │
│ Pod Network: Direct communication across nodes   │
└──────────────────────────────────────────────────┘
```

**CNI Plugin Options:**

| Plugin | Features | Use Cases |
|--------|----------|----------|
| **Cilium** | eBPF-based, advanced security, observability | Production environments, security-focused |
| **Calico** | BGP routing, network policies, scalability | Large clusters, policy enforcement |
| **Flannel** | Simple overlay, easy setup | Development, basic networking |
| **Weave** | Automatic discovery, encryption | Multi-cloud, encrypted networks |

**Network Policy Example:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
spec:
  podSelector: {}    # Apply to all Pods
  policyTypes:
  - Ingress
  - Egress
  # No ingress/egress rules = deny all traffic
```

**Network Security Evolution:**

| Stage | Security Level | Description |
|-------|----------------|-------------|
| **Default** | Open | All Pods can communicate |
| **Basic Policies** | Segmented | Namespace-based isolation |
| **Micro-segmentation** | Strict | Pod-to-Pod access control |
| **Zero Trust** | Verified | Every connection authenticated |

**Common Network Patterns:**
- **Flat Network**: All Pods directly reachable (default)
- **Namespace Isolation**: Separate namespaces with network boundaries
- **Application Segmentation**: Multi-tier applications with controlled access
- **Service Mesh**: Advanced traffic management and security

`★ Insight ─────────────────────────────────────`
The pod network starts completely open for ease of use and learning. In production environments, implement network policies to control traffic flow, just like security checkpoints in logistics networks.
`─────────────────────────────────────────────────`

---

## 3. Multi-Container Pods

Sometimes applications require specialized handling patterns - preparation tasks before starting or support services during operation. Kubernetes provides init containers and sidecar containers for these scenarios.

### 3.1. Init Containers

Init containers run before application containers and must complete successfully before the main application starts. Like preparation tasks that must finish before shipping cargo, init containers handle setup work that applications depend on.

**Init Container Characteristics:**
- **Sequential Execution**: Run in order defined in manifest
- **Must Succeed**: All init containers must complete with exit code 0
- **Run Once**: Execute only during Pod startup
- **Separate Images**: Can use different images than app containers

**Common Use Cases:**

| Use Case | Description | Example |
|----------|-------------|----------|
| **Environment Setup** | Prepare runtime environment | Database schema creation |
| **Dependency Checking** | Wait for external services | API availability checks |
| **Data Migration** | One-time data transformations | Database migrations |
| **Security Scanning** | Pre-flight security checks | Vulnerability assessments |
| **Configuration** | Generate config files | Template processing |

**Execution Flow:**

```
Init Container Sequence:
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Init 1    │→ │   Init 2    │→ │ Application │
│ Setup DB    │  │ Check API   │  │   Server    │
│ (must pass) │  │ (must pass) │  │ (starts)    │
└─────────────┘  └─────────────┘  └─────────────┘
```

**Init Container Example:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: webapp-with-init
spec:
  initContainers:
  - name: check-db
    image: busybox:1.28.4
    command:
    - sh
    - -c
    - |
      until nslookup database-service.default.svc.cluster.local; do
        echo "Waiting for database service..."
        sleep 2
      done
      echo "Database service found!"
  - name: setup-config
    image: busybox:1.28.4
    command:
    - sh
    - -c
    - echo "Generating configuration..." && echo "config: ready" > /shared/config.txt
    volumeMounts:
    - name: config-volume
      mountPath: /shared
  containers:
  - name: webapp
    image: nginx:1.21
    volumeMounts:
    - name: config-volume
      mountPath: /etc/config
  volumes:
  - name: config-volume
    emptyDir: {}
```

**Init Container Failure Handling:**
- **Restart Policy**: Controlled by Pod's `restartPolicy`
- **Always**: Retry failed init containers
- **OnFailure**: Retry only on non-zero exit codes
- **Never**: Pod fails if any init container fails

### 3.2. Sidecar Containers

Sidecar containers provide auxiliary services that enhance the main application throughout its lifecycle. Like support services that run alongside cargo during shipping, sidecars run continuously with the main application.

**Sidecar Implementation:**
Sidecars are defined as init containers with `restartPolicy: Always`, which makes them run continuously rather than just during startup.

**Common Sidecar Patterns:**

| Pattern | Purpose | Example |
|---------|---------|----------|
| **Service Mesh** | Traffic management and security | Istio, Linkerd proxies |
| **Log Collection** | Centralized logging | Fluent Bit, Filebeat |
| **Monitoring** | Metrics collection | Prometheus exporters |
| **Content Sync** | Data synchronization | Git sync, file watchers |
| **Security** | Authentication/authorization | OAuth proxies |

**Sidecar Lifecycle:**

```
Sidecar Container Lifecycle:
┌─────────────────────────────────────────────┐
│ 1. Sidecar starts first                     │
│ 2. Main application starts after sidecar   │
│ 3. Both containers run together             │
│ 4. Main application shuts down              │
│ 5. Sidecar shuts down after main app       │
└─────────────────────────────────────────────┘
```

**Content Synchronization Example:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: dynamic-website
spec:
  initContainers:                           # Sidecar container
  - name: git-sync
    restartPolicy: Always                    # Makes it a sidecar
    image: k8s.gcr.io/git-sync:v3.1.6
    env:
    - name: GIT_SYNC_REPO
      value: https://github.com/example/website-content
    - name: GIT_SYNC_BRANCH
      value: main
    - name: GIT_SYNC_DEST
      value: html
    - name: GIT_SYNC_PERIOD
      value: "10"                           # Sync every 10 seconds
    volumeMounts:
    - name: content-volume
      mountPath: /tmp/git
  containers:                               # Main application
  - name: web-server
    image: nginx:1.21
    ports:
    - containerPort: 80
    volumeMounts:
    - name: content-volume
      mountPath: /usr/share/nginx/html
      subPath: html
  volumes:
  - name: content-volume
    emptyDir: {}
```

**Sidecar Benefits:**
- **Separation of Concerns**: Each container has single responsibility
- **Reusability**: Sidecars can be shared across applications
- **Independent Updates**: Update sidecar without changing main app
- **Resource Isolation**: Separate resource limits for each function

**Kubernetes Native Sidecars:**
As of Kubernetes v1.29+, native sidecar support is in beta, providing:
- **Guaranteed Startup Order**: Sidecar starts before main containers
- **Lifecycle Management**: Proper shutdown sequencing
- **Status Tracking**: Clear sidecar vs main container status

`★ Insight ─────────────────────────────────────`
Sidecar containers implement the single responsibility principle - each container has one focused job. This separation makes components simpler, more reusable, and easier to troubleshoot than monolithic applications.
`─────────────────────────────────────────────────`

---

## 4. Hands-on with Pods

Let's gain practical experience managing Pods, starting with creating Pod manifests and deploying them to Kubernetes clusters.

### 4.1. Pod Manifest Files

Pod manifests are YAML files that describe exactly what you want Kubernetes to run. Like shipping manifests that detail cargo contents and handling requirements, Pod manifests provide complete specifications for application deployment.

**Basic Pod Manifest Structure:**

```yaml
# pod.yml - Basic Pod definition
apiVersion: v1              # Kubernetes API version
kind: Pod                   # Resource type
metadata:
  name: hello-pod           # Pod identifier
  labels:                   # Organizational labels
    app: hello
    version: v1
    environment: production
spec:                       # Pod specification
  containers:
  - name: hello-container   # Container name
    image: nigelpoulton/k8sbook:1.0  # Container image
    ports:
    - containerPort: 8080   # Application port
    resources:              # Resource requirements
      requests:             # Minimum guaranteed
        memory: 64Mi
        cpu: 250m
      limits:               # Maximum allowed
        memory: 128Mi
        cpu: 500m
```

**Manifest Structure Breakdown:**

| Section | Purpose | Example |
|---------|---------|----------|
| **apiVersion** | API version to use | `v1` for core resources |
| **kind** | Resource type | `Pod`, `Deployment`, `Service` |
| **metadata** | Object metadata | Name, labels, annotations |
| **spec** | Desired state specification | Containers, volumes, policies |

**Resource Specification Best Practices:**

```yaml
resources:
  requests:                 # Scheduler uses for placement
    cpu: 100m              # 0.1 CPU cores
    memory: 128Mi           # 128 mebibytes
  limits:                   # Runtime enforcement
    cpu: 500m              # 0.5 CPU cores
    memory: 256Mi           # 256 mebibytes
```

**Labels and Selectors:**

```yaml
metadata:
  labels:
    app: web-server         # Application identifier
    tier: frontend          # Architecture tier
    version: "1.2"          # Version tracking
    environment: production # Environment designation
```

**"Empathy as Code" Benefits:**
Pod manifests serve as living documentation:
- **Application Requirements**: Resource needs, network ports
- **Configuration Details**: Environment variables, volume mounts
- **Deployment Context**: Labels, naming conventions
- **Operational Insights**: Health checks, security policies

### 4.2. Deploying Pods

Deploy Pods using kubectl and monitor their progress through the Kubernetes API. Like submitting shipping manifests and tracking progress, Pod deployment follows a predictable workflow.

**Deployment Process:**

```bash
# Deploy Pod from manifest file
$ kubectl apply -f pod.yml
pod/hello-pod created

# Monitor deployment progress
$ kubectl get pods
NAME        READY   STATUS              RESTARTS   AGE
hello-pod   0/1     ContainerCreating   0          15s

# Check final status
$ kubectl get pods
NAME        READY   STATUS    RESTARTS   AGE
hello-pod   1/1     Running   0          45s
```

**Pod Status Progression:**

| Status | Description | Next Step |
|--------|-------------|----------|
| **Pending** | Pod accepted, awaiting scheduling | Scheduler assigns node |
| **ContainerCreating** | Node assigned, pulling images | Runtime starts containers |
| **Running** | Containers started successfully | Application serving traffic |
| **Succeeded** | All containers completed (batch jobs) | Pod lifecycle complete |
| **Failed** | One or more containers failed | Check logs for errors |

**Behind the Scenes Workflow:**

```
Deployment Sequence:
1. kubectl → API Server (manifest validation)
2. API Server → etcd (store desired state)
3. Scheduler → Node Selection (find suitable node)
4. kubelet → Container Runtime (pull images, start containers)
5. kubelet → API Server (report status updates)
```

**Extended Pod Information:**

```bash
# Basic Pod listing
$ kubectl get pods

# Extended information
$ kubectl get pods -o wide
NAME        READY   STATUS    RESTARTS   AGE   IP          NODE
hello-pod   1/1     Running   0          2m    10.1.0.15   worker-1

# Watch Pod status changes in real-time
$ kubectl get pods --watch
```

**Pod Lifecycle Events:**

```bash
# View Pod events
$ kubectl get events --field-selector involvedObject.name=hello-pod
TYPE     REASON      AGE   FROM        MESSAGE
Normal   Scheduled   2m    scheduler   Successfully assigned default/hello-pod to worker-1
Normal   Pulling     2m    kubelet     Pulling image "nigelpoulton/k8sbook:1.0"
Normal   Pulled      1m    kubelet     Successfully pulled image
Normal   Created     1m    kubelet     Created container hello-container
Normal   Started     1m    kubelet     Started container hello-container
```

### 4.3. Pod Introspection

kubectl provides multiple commands for Pod inspection and debugging. Like shipping companies that offer various tracking and inspection services, Kubernetes offers different levels of Pod visibility.

**Quick Status Checks:**

```bash
# Basic Pod listing
$ kubectl get pods
NAME        READY   STATUS    RESTARTS   AGE
hello-pod   1/1     Running   0          5m

# Extended information
$ kubectl get pods -o wide
NAME        READY   STATUS    RESTARTS   AGE   IP          NODE
hello-pod   1/1     Running   0          5m    10.1.0.103  worker-1

# YAML output (complete Pod specification)
$ kubectl get pod hello-pod -o yaml

# JSON output (programmatic access)
$ kubectl get pod hello-pod -o json
```

**Detailed Pod Inspection:**

```bash
# Human-readable Pod overview
$ kubectl describe pod hello-pod
```

**Sample describe Output:**

```
Name:         hello-pod
Namespace:    default
Priority:     0
Node:         worker-1/192.168.1.10
Start Time:   Mon, 15 Jan 2024 10:30:00 +0000
Labels:       app=hello
              version=v1
Annotations:  <none>
Status:       Running
IP:           10.1.0.103
IPs:
  IP:  10.1.0.103
Containers:
  hello-container:
    Container ID:   containerd://abc123...
    Image:          nigelpoulton/k8sbook:1.0
    Image ID:       docker.io/nigelpoulton/k8sbook@sha256:def456...
    Port:           8080/TCP
    Host Port:      0/TCP
    State:          Running
      Started:      Mon, 15 Jan 2024 10:30:15 +0000
    Ready:          True
    Restart Count:  0
    Limits:
      cpu:     500m
      memory:  128Mi
    Requests:
      cpu:        250m
      memory:     64Mi
    Environment:  <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-xyz (ro)
Conditions:
  Type              Status
  Initialized       True
  Ready             True
  ContainersReady   True
  PodScheduled      True
Events:
  Type    Reason     Age   From     Message
  ----    ------     ----  ----     -------
  Normal  Scheduled  5m    scheduler Successfully assigned default/hello-pod to worker-1
  Normal  Pulling    5m    kubelet   Pulling image "nigelpoulton/k8sbook:1.0"
  Normal  Pulled     4m    kubelet   Successfully pulled image
  Normal  Created    4m    kubelet   Created container hello-container
  Normal  Started    4m    kubelet   Started container hello-container
```

**Container Logs and Debugging:**

```bash
# View container logs
$ kubectl logs hello-pod

# Follow logs in real-time
$ kubectl logs -f hello-pod

# View logs from previous container instance
$ kubectl logs hello-pod --previous

# Multi-container Pod: specify container
$ kubectl logs hello-pod -c specific-container
```

**Container Access and Debugging:**

```bash
# Execute single command
$ kubectl exec hello-pod -- ps aux
PID   USER     TIME  COMMAND
    1 root      0:00 node ./app.js
   17 root      0:00 ps aux

# Interactive shell session
$ kubectl exec -it hello-pod -- sh
# (now inside container)

# Test application connectivity
# curl localhost:8080
<html><head><title>K8s rocks!</title>...

# Check container hostname
# env | grep HOSTNAME
HOSTNAME=hello-pod

# Exit container
# exit
```

**Pod Networking and Hostname:**
- Pod name becomes hostname for all containers
- All containers share the same IP address
- Container communication via localhost
- External access via Pod IP and port

**Debugging Commands Summary:**

| Command | Purpose | Example |
|---------|---------|----------|
| `kubectl get pods` | List Pod status | Basic health check |
| `kubectl describe pod` | Detailed Pod info | Troubleshooting |
| `kubectl logs` | Container output | Application debugging |
| `kubectl exec` | Container access | Interactive debugging |

`★ Insight ─────────────────────────────────────`
The Pod name becomes the hostname for all containers inside it, making networking and debugging intuitive. A Pod named "web-server" has hostname "web-server" for all its containers.
`─────────────────────────────────────────────────`

### 4.4. Multi-Container Examples

Let's explore practical examples of init containers and sidecar containers working together to solve real-world application requirements.

#### Init Container Example: Service Dependency

**Scenario**: Deploy an application that requires a database service to be available before it can start.

```yaml
# initpod.yml
apiVersion: v1
kind: Pod
metadata:
  name: webapp-with-dependency
  labels:
    app: dependency-demo
spec:
  initContainers:
  - name: wait-for-db
    image: busybox:1.28.4
    command:
    - sh
    - -c
    - |
      until nslookup database-service.default.svc.cluster.local; do
        echo "Waiting for database service to be available..."
        sleep 2
      done
      echo "Database service is ready!"
  containers:
  - name: web-application
    image: nigelpoulton/web-app:1.0
    ports:
    - containerPort: 8080
    env:
    - name: DATABASE_URL
      value: "database-service.default.svc.cluster.local"
```

**Deployment and Monitoring:**

```bash
# Deploy the Pod (will stay in Init status)
$ kubectl apply -f initpod.yml
pod/webapp-with-dependency created

# Check Pod status
$ kubectl get pods
NAME                     READY   STATUS     RESTARTS   AGE
webapp-with-dependency   0/1     Init:0/1   0          15s

# Create the required service
$ kubectl apply -f database-service.yml
service/database-service created

# Watch Pod transition to Running
$ kubectl get pods --watch
NAME                     READY   STATUS            RESTARTS   AGE
webapp-with-dependency   0/1     PodInitializing   0          45s
webapp-with-dependency   1/1     Running           0          50s
```

#### Sidecar Container Example: Content Synchronization

**Scenario**: Deploy a web server that automatically updates content from a Git repository.

```yaml
# sidecar-demo.yml
apiVersion: v1
kind: Pod
metadata:
  name: dynamic-content-server
spec:
  initContainers:                       # Sidecar definition
  - name: git-sync-sidecar
    restartPolicy: Always               # Critical: makes it a sidecar
    image: k8s.gcr.io/git-sync:v3.1.6
    env:
    - name: GIT_SYNC_REPO
      value: https://github.com/nigelpoulton/ps-sidecar
    - name: GIT_SYNC_BRANCH
      value: master
    - name: GIT_SYNC_DEST
      value: html
    - name: GIT_SYNC_PERIOD
      value: "30"                      # Sync every 30 seconds
    volumeMounts:
    - name: content-volume
      mountPath: /tmp/git
  containers:                           # Main application
  - name: nginx-server
    image: nginx:1.21
    ports:
    - containerPort: 80
    volumeMounts:
    - name: content-volume
      mountPath: /usr/share/nginx/html
      subPath: html                     # Serve from html subdirectory
  volumes:
  - name: content-volume
    emptyDir: {}                        # Shared temporary storage
```

**Verification and Testing:**

```bash
# Deploy the sidecar application
$ kubectl apply -f sidecar-demo.yml
pod/dynamic-content-server created

# Verify both containers are running
$ kubectl get pods
NAME                     READY   STATUS    RESTARTS   AGE
dynamic-content-server   2/2     Running   0          1m

# Check container details
$ kubectl get pod dynamic-content-server \
  -o custom-columns="NAME:.metadata.name,INIT:.spec.initContainers[*].name,CONTAINERS:.spec.containers[*].name"
NAME                     INIT               CONTAINERS
dynamic-content-server   git-sync-sidecar   nginx-server

# View startup sequence
$ kubectl describe pod dynamic-content-server
Events:
  Type    Reason     Age   From     Message
  ----    ------     ----  ----     -------
  Normal  Created    1m    kubelet  Created container git-sync-sidecar
  Normal  Started    1m    kubelet  Started container git-sync-sidecar
  Normal  Pulling    59s   kubelet  Pulling image "nginx:1.21"
  Normal  Created    58s   kubelet  Created container nginx-server
  Normal  Started    58s   kubelet  Started container nginx-server
```

**Testing Content Synchronization:**

```bash
# Port-forward to access the web server
$ kubectl port-forward pod/dynamic-content-server 8080:80
Forwarding from 127.0.0.1:8080 -> 80

# In another terminal, test the web server
$ curl localhost:8080
<html>
<head><title>Sidecar Demo</title></head>
<body><h1>This is version 1.0</h1></body>
</html>

# Update the Git repository content
# (modify index.html in the source repository)

# Wait 30 seconds for sync, then test again
$ curl localhost:8080
<html>
<head><title>Sidecar Demo</title></head>
<body><h1>This is the updated version!</h1></body>
</html>
```

**Resource Cleanup:**

```bash
# Delete the demo Pods
$ kubectl delete pod webapp-with-dependency dynamic-content-server
pod "webapp-with-dependency" deleted
pod "dynamic-content-server" deleted

# Delete associated services
$ kubectl delete service database-service
service "database-service" deleted
```

**Multi-Container Patterns Summary:**

| Pattern | When to Use | Implementation |
|---------|-------------|----------------|
| **Init Containers** | One-time setup tasks | `spec.initContainers` |
| **Sidecar Containers** | Ongoing auxiliary services | `restartPolicy: Always` |
| **Shared Volumes** | Data sharing between containers | `volumes` + `volumeMounts` |
| **Resource Isolation** | Different resource needs | Separate `resources` per container |

---

## 5. Chapter Summary

Pods are the fundamental building blocks of Kubernetes, providing a standardized way to package, deploy, and manage applications. Every application on Kubernetes runs inside a Pod, making them essential to understand.

**Core Pod Concepts:**

**Abstraction and Resource Sharing:**
- **Universal Interface**: Pods abstract different workload types (containers, VMs, serverless, Wasm)
- **Resource Sharing**: Multi-container Pods share IP, storage, and lifecycle
- **Network Identity**: Each Pod receives unique cluster IP address
- **Hostname**: Pod name becomes hostname for all containers

**Scheduling and Lifecycle:**
- **Intelligent Placement**: Scheduler considers resources, constraints, and optimization
- **Mortal Design**: Pods are replaced, not repaired when issues occur
- **Immutable Configuration**: Pod specs cannot be changed after deployment
- **Atomic Operations**: All containers start together or Pod fails

**Pod Patterns and Use Cases:**

| Pattern | Purpose | Implementation | When to Use |
|---------|---------|----------------|-------------|
| **Single Container** | Basic applications | One container per Pod | Most common scenario |
| **Multi-Container** | Tightly coupled services | Multiple containers sharing resources | Shared storage/network needed |
| **Init Containers** | Setup and preparation | `spec.initContainers` | One-time initialization tasks |
| **Sidecar Containers** | Auxiliary services | `restartPolicy: Always` | Ongoing support functions |

**Essential kubectl Operations:**

| Command | Purpose | Example |
|---------|---------|----------|
| `kubectl apply` | Deploy Pod from manifest | `kubectl apply -f pod.yml` |
| `kubectl get pods` | List Pod status | Basic health monitoring |
| `kubectl describe pod` | Detailed Pod information | Troubleshooting |
| `kubectl logs` | View container output | Application debugging |
| `kubectl exec` | Access running containers | Interactive debugging |
| `kubectl delete pod` | Remove Pod | Resource cleanup |

**Design Principles:**

1. **Declarative Management**: Describe desired state in YAML manifests
2. **Resource Specifications**: Always define requests and limits
3. **Separation of Concerns**: Each container has single responsibility
4. **Stateless Design**: Applications should not depend on local storage
5. **Cloud-Native Patterns**: Design for distributed, ephemeral environments

**Best Practices:**
- **Resource Management**: Specify CPU and memory requests/limits
- **Single Responsibility**: Use single-container Pods unless tight coupling required
- **Manifest Storage**: Version control Pod manifests for documentation
- **Monitoring**: Implement health checks and logging
- **Security**: Apply least privilege and security policies

**Networking and Communication:**
- **Pod Network**: Flat network enabling any-to-any Pod communication
- **Service Discovery**: Use Services for stable networking endpoints
- **Network Policies**: Implement micro-segmentation for security
- **CNI Plugins**: Choose appropriate network implementation for requirements

**Looking Forward:**
While Pods are fundamental, production deployments typically use higher-level controllers like Deployments, StatefulSets, and DaemonSets that provide additional capabilities like self-healing, scaling, and rolling updates.

`★ Insight ─────────────────────────────────────`
Pods embody the separation of concerns principle - they handle application packaging and resource sharing while letting Kubernetes manage scheduling and orchestration. This separation enables the flexibility and power of the Kubernetes platform.
`─────────────────────────────────────────────────`

---

**Previous:** [Chapter 3: Getting Kubernetes](03-getting-kubernetes.md) | **Next:** [Chapter 5: Virtual Clusters and Namespaces](05-virtual-clusters-namespaces.md)