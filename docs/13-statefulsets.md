# 13. StatefulSets

## 📋 Table of Contents

- [StatefulSet Fundamentals](#1-statefulset-fundamentals)
  - [Stateful vs Stateless Applications](#11-stateful-vs-stateless-applications)
  - [StatefulSet Architecture](#12-statefulset-architecture)
  - [StatefulSet vs Deployment](#13-statefulset-vs-deployment)

- [StatefulSet Components](#2-statefulset-components)
  - [Pod Identity and Naming](#21-pod-identity-and-naming)
  - [Persistent Storage](#22-persistent-storage)
  - [Ordered Operations](#23-ordered-operations)

- [StatefulSet Configuration](#3-statefulset-configuration)
  - [Creating StatefulSets](#31-creating-statefulsets)
  - [Service Configuration](#32-service-configuration)
  - [Storage Templates](#33-storage-templates)

- [StatefulSet Operations](#4-statefulset-operations)
  - [Scaling StatefulSets](#41-scaling-statefulsets)
  - [Updates and Rollbacks](#42-updates-and-rollbacks)
  - [Pod Management Policies](#43-pod-management-policies)

- [Advanced StatefulSet Features](#5-advanced-statefulset-features)
  - [Headless Services](#51-headless-services)
  - [StatefulSet Partitioning](#52-statefulset-partitioning)
  - [Troubleshooting StatefulSets](#53-troubleshooting-statefulsets)

---

## 1. StatefulSet Fundamentals

### 1.1. Stateful vs Stateless Applications

StatefulSets manage applications that require persistent identity, stable network addresses, and ordered deployment/scaling. Unlike stateless applications that can be recreated identically, stateful applications maintain unique characteristics that must persist across Pod lifecycle events.

Think of StatefulSets like reserved theater seating where each audience member (Pod) has a specific assigned seat number that they return to even if they leave and come back during intermission. The seat number, location, and any personal items left there remain consistent, unlike general admission where people can sit anywhere.

**Stateless Application Characteristics:**
- No persistent data requirements
- Pods are interchangeable and fungible
- Can be created, destroyed, and recreated without data loss
- Examples: Web frontends, API gateways, load balancers

**Stateful Application Characteristics:**
- Require persistent data storage
- Each Pod has unique identity and requirements
- Data and state must survive Pod restarts and rescheduling
- Examples: Databases, message queues, distributed storage systems

**State Requirements:**

```yaml
# Stateless Application (Deployment)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
spec:
  replicas: 3
  template:
     spec:
       containers:
       - name: web
         image: nginx:latest
         # No persistent storage needed
         # Pods are identical and interchangeable

---
# Stateful Application (StatefulSet)
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  replicas: 3
  template:
     spec:
       containers:
       - name: db
         image: postgres:13
         # Requires persistent storage
         # Each Pod needs unique identity
```

### 1.2. StatefulSet Architecture

StatefulSets provide three key guarantees that enable stateful application deployment: stable network identity, persistent storage, and ordered operations.

Like a theater where each seat has a permanent number, assigned storage compartment underneath, and specific entry/exit procedures, StatefulSets ensure each Pod maintains consistent identity and resources throughout its lifecycle.

**StatefulSet Architecture Components:**

```
StatefulSet Controller
         │
         ▼
┌─────────────────────────────────────────────────────┐
│               StatefulSet                           │
│  ┌─────────────┬─────────────┬─────────────────┐   │
│  │    Pod-0    │    Pod-1    │     Pod-2       │   │
│  │             │             │                 │   │
│  │ Stable ID   │ Stable ID   │  Stable ID      │   │
│  │ PVC-0       │ PVC-1       │  PVC-2          │   │
│  │ DNS Name    │ DNS Name    │  DNS Name       │   │
│  └─────────────┴─────────────┴─────────────────┘   │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│            Headless Service                         │
│         (Stable Network Identity)                   │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│         PersistentVolumes                           │
│      (Persistent Storage)                           │
└─────────────────────────────────────────────────────┘
```

**Key StatefulSet Features:**

- **Stable Pod Names**: Pods named sequentially (pod-0, pod-1, pod-2)
- **Stable DNS Names**: Each Pod gets predictable DNS hostname
- **Persistent Storage**: Each Pod bound to dedicated PersistentVolumeClaim
- **Ordered Operations**: Sequential startup, shutdown, and updates

### 1.3. StatefulSet vs Deployment

Understanding when to use StatefulSets versus Deployments is crucial for proper application architecture decisions.

**Comparison Matrix:**

| Aspect | Deployment | StatefulSet |
|--------|------------|-------------|
| **Pod Names** | Random suffix | Sequential index |
| **Pod Identity** | Interchangeable | Unique and stable |
| **Storage** | Shared or ephemeral | Individual persistent volumes |
| **Scaling** | Parallel | Sequential (ordered) |
| **Updates** | Rolling (parallel) | Rolling (ordered) |
| **Network** | Load-balanced service | Individual DNS names |
| **Use Cases** | Stateless apps | Databases, clustered apps |

**When to Use StatefulSets:**

- Database clusters (PostgreSQL, MySQL, MongoDB)
- Distributed storage systems (Cassandra, HDFS)
- Message queues requiring ordering (Kafka, RabbitMQ)
- Applications requiring stable network identity
- Systems where Pod startup order matters

`★ Insight ─────────────────────────────────────`
**StatefulSets trade simplicity for stability** - while Deployments optimize for fungibility and parallel operations, StatefulSets prioritize persistent identity and ordered operations, making them essential for applications where data consistency and node identity matter more than deployment speed.
`─────────────────────────────────────────────────`

## 2. StatefulSet Components

### 2.1. Pod Identity and Naming

StatefulSet Pods receive predictable, sequential names that persist across restarts and rescheduling events. This stable identity is fundamental to stateful application clustering and data consistency.

Like theater seats numbered consecutively (A-1, A-2, A-3), StatefulSet Pods are named with predictable patterns that allow applications to discover and communicate with specific instances.

**Pod Naming Convention:**

```
StatefulSet Name: database
Pod Names: database-0, database-1, database-2

StatefulSet Name: kafka-cluster
Pod Names: kafka-cluster-0, kafka-cluster-1, kafka-cluster-2
```

**DNS Name Resolution:**

```bash
# Each Pod gets individual DNS name
database-0.database-service.default.svc.cluster.local
database-1.database-service.default.svc.cluster.local
database-2.database-service.default.svc.cluster.local

# Applications can target specific Pods
curl http://database-0.database-service:5432
```

**Pod Identity Persistence:**

```yaml
# Even if Pod fails and is recreated
Original Pod: database-1 (IP: 10.244.1.10)
Failed Pod:   database-1 (terminated)
New Pod:      database-1 (IP: 10.244.2.15) # Same name, new IP
```

### 2.2. Persistent Storage

Each StatefulSet Pod is bound to its own PersistentVolumeClaim, ensuring data persists across Pod lifecycle events. Storage associations remain stable even when Pods are rescheduled to different nodes.

Like theater seats with personal storage compartments underneath that remain assigned to the same seat number regardless of who currently occupies the seat, StatefulSet storage maintains Pod associations through restarts and failures.

**Storage Binding Pattern:**

```yaml
# StatefulSet with volumeClaimTemplates
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  replicas: 3
  volumeClaimTemplates:
  - metadata:
       name: data
     spec:
       accessModes: ["ReadWriteOnce"]
       resources:
         requests:
           storage: 10Gi
```

**Resulting PVC Creation:**

```
Pod Name        PVC Name           PV Binding
database-0  ->  data-database-0  ->  pv-001
database-1  ->  data-database-1  ->  pv-002
database-2  ->  data-database-2  ->  pv-003
```

**Storage Persistence Example:**

```bash
# Check PVC bindings
kubectl get pvc
NAME             STATUS   VOLUME                     CAPACITY
data-database-0  Bound    pvc-123-456-789            10Gi
data-database-1  Bound    pvc-234-567-890            10Gi
data-database-2  Bound    pvc-345-678-901            10Gi

# Even after Pod restart, same PVC is rebound
kubectl delete pod database-1
# New database-1 Pod automatically gets data-database-1 PVC
```

### 2.3. Ordered Operations

StatefulSets perform operations in sequential order, ensuring dependencies between Pods are respected during startup, shutdown, and scaling operations.

Like theater patrons entering and exiting row by row to avoid chaos, StatefulSet operations follow specific ordering to maintain application consistency and prevent data corruption.

**Startup Order:**

```
Time: T0    T1    T2    T3
Pod:  0  -> 1  -> 2  -> Complete

database-0 starts first and becomes ready
database-1 starts only after database-0 is ready
database-2 starts only after database-1 is ready
```

**Shutdown Order:**

```
Time: T0    T1    T2    T3
Pod:  2  -> 1  -> 0  -> Complete

database-2 terminates first
database-1 terminates after database-2 is gone
database-0 terminates last (reverse startup order)
```

**Scaling Operations:**

```bash
# Scale up: Adds Pods sequentially
kubectl scale statefulset database --replicas=5
# Creates database-3, then database-4

# Scale down: Removes Pods in reverse order
kubectl scale statefulset database --replicas=2
# Removes database-4, then database-3
```

## 3. StatefulSet Configuration

### 3.1. Creating StatefulSets

StatefulSet creation requires careful configuration of Pod templates, service definitions, and storage requirements to ensure proper stateful behavior.

**Complete StatefulSet Example:**

```yaml
# mongodb-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: production
spec:
  # Service name for DNS resolution
  serviceName: mongodb-service

  # Number of replicas
  replicas: 3

  # Pod selector
  selector:
     matchLabels:
       app: mongodb

  # Pod template
  template:
     metadata:
       labels:
         app: mongodb
     spec:
       containers:
       - name: mongodb
         image: mongo:4.4
         ports:
         - containerPort: 27017
           name: mongodb

         # Environment variables
         env:
         - name: MONGO_INITDB_ROOT_USERNAME
           value: "admin"
         - name: MONGO_INITDB_ROOT_PASSWORD
           valueFrom:
             secretKeyRef:
               name: mongodb-secret
               key: password

         # Volume mounts
         volumeMounts:
         - name: data
           mountPath: /data/db

         # Resource requirements
         resources:
           requests:
             memory: "512Mi"
             cpu: "250m"
           limits:
             memory: "1Gi"
             cpu: "500m"

         # Liveness probe
         livenessProbe:
           exec:
             command:
             - mongo
             - --eval
             - "db.adminCommand('ping')"
           initialDelaySeconds: 30
           periodSeconds: 10

  # Storage template
  volumeClaimTemplates:
  - metadata:
       name: data
     spec:
       accessModes: ["ReadWriteOnce"]
       storageClassName: "fast-ssd"
       resources:
         requests:
           storage: 20Gi
```

### 3.2. Service Configuration

StatefulSets typically use headless Services to provide stable DNS names for individual Pods while optionally exposing the entire set through regular Services.

**Headless Service for StatefulSet:**

```yaml
# mongodb-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mongodb-service
  namespace: production
spec:
  clusterIP: None  # Headless service
  selector:
     app: mongodb
  ports:
  - port: 27017
     targetPort: 27017
     name: mongodb

---
# Optional: Regular service for load balancing
apiVersion: v1
kind: Service
metadata:
  name: mongodb-lb
  namespace: production
spec:
  selector:
     app: mongodb
  ports:
  - port: 27017
     targetPort: 27017
     name: mongodb
  type: ClusterIP
```

### 3.3. Storage Templates

VolumeClaimTemplates automatically create PersistentVolumeClaims for each StatefulSet Pod, ensuring dedicated storage for stateful data.

**Storage Template Configuration:**

```yaml
# Advanced storage template
volumeClaimTemplates:
- metadata:
     name: data
     annotations:
       # Storage-specific annotations
       volume.beta.kubernetes.io/storage-class: "fast-ssd"
  spec:
     accessModes:
     - ReadWriteOnce
     storageClassName: fast-ssd
     resources:
       requests:
         storage: 50Gi

- metadata:
     name: logs
  spec:
     accessModes:
     - ReadWriteOnce
     storageClassName: standard-hdd
     resources:
       requests:
         storage: 10Gi
```

## 4. StatefulSet Operations

### 4.1. Scaling StatefulSets

StatefulSet scaling operations occur sequentially to maintain ordering guarantees and prevent data inconsistency during cluster membership changes.

**Manual Scaling:**

```bash
# Scale up (adds Pods sequentially)
kubectl scale statefulset mongodb --replicas=5

# Check scaling progress
kubectl get pods -l app=mongodb -w
NAME        READY   STATUS    RESTARTS   AGE
mongodb-0   1/1     Running   0          5m
mongodb-1   1/1     Running   0          4m
mongodb-2   1/1     Running   0          3m
mongodb-3   0/1     Pending   0          1m  # Creating
mongodb-4   0/1     Pending   0          0s  # Waiting

# Scale down (removes Pods in reverse order)
kubectl scale statefulset mongodb --replicas=2
# Removes mongodb-4 first, then mongodb-3
```

**Declarative Scaling:**

```yaml
# Update StatefulSet manifest
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
spec:
  replicas: 5  # Changed from 3 to 5

# Apply changes
kubectl apply -f mongodb-statefulset.yaml
```

### 4.2. Updates and Rollbacks

StatefulSet updates follow the same ordered approach as scaling, ensuring application consistency during version upgrades.

**Rolling Update Strategy:**

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
spec:
  updateStrategy:
     type: RollingUpdate
     rollingUpdate:
       # Maximum number of Pods unavailable during update
       maxUnavailable: 1

       # Update partition (advanced feature)
       partition: 0

  template:
     spec:
       containers:
       - name: mongodb
         image: mongo:5.0  # Updated version
```

**Update Operations:**

```bash
# Update container image
kubectl patch statefulset mongodb -p '{"spec":{"template":{"spec":{"containers":[{"name":"mongodb","image":"mongo:5.0"}]}}}}'

# Check rollout status
kubectl rollout status statefulset/mongodb

# View rollout history
kubectl rollout history statefulset/mongodb

# Rollback to previous version
kubectl rollout undo statefulset/mongodb
```

### 4.3. Pod Management Policies

StatefulSets support different Pod management policies to control how operations are performed on the Pod set.

**Pod Management Policy Options:**

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
spec:
  podManagementPolicy: OrderedReady  # Default: sequential operations
  # podManagementPolicy: Parallel    # Alternative: parallel operations

  # OrderedReady ensures:
  # - Pods start in sequence (0, 1, 2...)
  # - Each Pod must be Ready before next starts
  # - Updates proceed in sequence

  # Parallel allows:
  # - All Pods start simultaneously
  # - Faster scaling operations
  # - Less ordering guarantees
```

## 5. Advanced StatefulSet Features

### 5.1. Headless Services

Headless Services provide DNS resolution for individual StatefulSet Pods without load balancing, enabling direct Pod-to-Pod communication.

Like theater ushers who can direct you to specific seat numbers instead of just "any available seat," headless Services enable applications to reach specific StatefulSet Pods by name.

**Headless Service Configuration:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: cassandra-headless
spec:
  clusterIP: None  # This makes it headless
  selector:
     app: cassandra
  ports:
  - port: 9042
     name: cql
  - port: 9160
     name: thrift
```

**DNS Resolution Behavior:**

```bash
# Regular Service returns single ClusterIP
nslookup mysql-service
# Returns: 10.96.1.100

# Headless Service returns individual Pod IPs
nslookup cassandra-headless
# Returns: 10.244.1.10, 10.244.1.11, 10.244.1.12

# Individual Pod DNS names
nslookup cassandra-0.cassandra-headless
# Returns: 10.244.1.10 (specific Pod IP)
```

### 5.2. StatefulSet Partitioning

Partitioning allows selective updates to subsets of StatefulSet Pods, enabling canary deployments and gradual rollouts for stateful applications.

**Partition Update Strategy:**

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
spec:
  replicas: 6
  updateStrategy:
     type: RollingUpdate
     rollingUpdate:
       partition: 3  # Only update Pods with ordinal >= 3

  template:
     spec:
       containers:
       - name: mongodb
         image: mongo:5.0  # New version
```

**Partition Behavior:**

```
Pods:      0   1   2   3   4   5
Version:  4.4 4.4 4.4 5.0 5.0 5.0
           └─────────┘ └─────────┘
            Old Ver    New Ver

# Only Pods 3, 4, 5 get updated
# Pods 0, 1, 2 remain on old version
```

### 5.3. Troubleshooting StatefulSets

Common StatefulSet issues often relate to storage, ordering, or network configuration problems.

**Common Issues and Solutions:**

1. **Pod Stuck in Pending:**
```bash
# Check PVC status
kubectl get pvc
kubectl describe pvc data-mongodb-1

# Common causes:
# - No available PersistentVolumes
# - StorageClass issues
# - Resource constraints
```

2. **Pods Not Starting in Order:**
```bash
# Check Pod readiness probes
kubectl describe pod mongodb-1

# Verify previous Pod is ready
kubectl get pods -l app=mongodb

# Check StatefulSet events
kubectl describe statefulset mongodb
```

3. **Storage Not Binding:**
```bash
# Check StorageClass availability
kubectl get storageclass

# Verify PV availability
kubectl get pv

# Check volumeClaimTemplate configuration
kubectl describe statefulset mongodb
```

4. **DNS Resolution Issues:**
```bash
# Test headless service DNS
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup mongodb-headless

# Test individual Pod DNS
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup mongodb-0.mongodb-headless
```

**StatefulSet Troubleshooting Commands:**

```bash
# Monitor StatefulSet status
kubectl get statefulset -w

# Check Pod readiness and ordering
kubectl get pods -l app=mongodb -o wide

# View StatefulSet events
kubectl describe statefulset mongodb

# Check PVC bindings
kubectl get pvc -l app=mongodb

# Debug Pod startup issues
kubectl logs mongodb-1 -f

# Test connectivity between Pods
kubectl exec mongodb-0 -- ping mongodb-1.mongodb-headless
```

`★ Insight ─────────────────────────────────────`
**StatefulSet troubleshooting requires understanding the interdependencies** - Pod identity, storage binding, and network configuration work together to enable stateful applications. Issues in one area often cascade to others, making systematic diagnosis essential.
`─────────────────────────────────────────────────`

---

## Chapter Summary

StatefulSets provide the foundation for deploying stateful applications in Kubernetes by offering stable Pod identity, persistent storage, and ordered operations. These guarantees enable complex distributed systems to maintain data consistency and cluster coordination.

Like a well-organized theater with assigned seating, personal storage, and orderly entry/exit procedures, StatefulSets ensure each application instance maintains its identity and resources throughout the dynamic lifecycle of a Kubernetes cluster.

**Key StatefulSet Concepts:**

- **Stable Identity**: Predictable Pod names and DNS hostnames that persist across restarts
- **Persistent Storage**: Individual PersistentVolumeClaims bound to specific Pods
- **Ordered Operations**: Sequential startup, shutdown, and scaling to maintain consistency
- **Network Identity**: Headless Services providing direct Pod-to-Pod communication
- **State Persistence**: Data and identity survive Pod failures and rescheduling

**StatefulSet Components:**

- **Pod Templates**: Define the application containers and configuration
- **VolumeClaimTemplates**: Automatically provision storage for each Pod
- **Headless Services**: Provide stable DNS names for individual Pods
- **Update Strategies**: Control how rolling updates are performed
- **Pod Management Policies**: Configure ordering vs parallel operations

**When to Use StatefulSets:**

- Database clusters requiring stable hostnames and persistent data
- Distributed storage systems with node identity requirements
- Message queues where ordering and persistence matter
- Applications requiring predictable startup sequences
- Systems where direct Pod-to-Pod communication is necessary

**StatefulSet Best Practices:**

- Use headless Services for Pod discovery and communication
- Configure appropriate readiness and liveness probes
- Plan for storage capacity and performance requirements
- Implement proper backup strategies for persistent data
- Test scaling and update procedures in non-production environments
- Monitor Pod ordering and readiness during operations

**Common Use Cases:**

- **Databases**: PostgreSQL, MySQL, MongoDB clusters
- **Distributed Storage**: Cassandra, HDFS, CephFS
- **Message Queues**: Kafka, RabbitMQ, Redis clusters
- **Search Engines**: Elasticsearch clusters
- **Analytics**: ClickHouse, TimescaleDB

StatefulSets bridge the gap between traditional infrastructure and cloud-native architectures, enabling stateful applications to benefit from Kubernetes orchestration while maintaining the data consistency and identity requirements essential for distributed systems.

---

**Navigation:**
- **Previous:** [12. ConfigMaps and Secrets](12-configmaps-secrets.md)
- **Next:** [14. API Security and RBAC](14-api-security-rbac.md)
- **Up:** [Table of Contents](index.md)