# 11. Kubernetes Storage

## Table of Contents

1. [Storage Fundamentals](#1-storage-fundamentals)
   1.1. [Persistent Storage Requirements](#11-persistent-storage-requirements)
   1.2. [Storage Architecture Overview](#12-storage-architecture-overview)
   1.3. [Storage vs Compute Lifecycle](#13-storage-vs-compute-lifecycle)

2. [Storage Provisioning](#2-storage-provisioning)
   2.1. [PersistentVolumes (PV)](#21-persistentvolumes-pv)
   2.2. [PersistentVolumeClaims (PVC)](#22-persistentvolumeclaims-pvc)
   2.3. [StorageClasses](#23-storageclasses)

3. [Dynamic Storage Management](#3-dynamic-storage-management)
   3.1. [Container Storage Interface (CSI)](#31-container-storage-interface-csi)
   3.2. [Dynamic Provisioning](#32-dynamic-provisioning)
   3.3. [Storage Lifecycle Management](#33-storage-lifecycle-management)

4. [Storage Operations](#4-storage-operations)
   4.1. [Creating Storage Resources](#41-creating-storage-resources)
   4.2. [Mounting Volumes in Pods](#42-mounting-volumes-in-pods)
   4.3. [Storage Configuration Examples](#43-storage-configuration-examples)

5. [Advanced Storage Features](#5-advanced-storage-features)
   5.1. [Access Modes and Binding](#51-access-modes-and-binding)
   5.2. [Volume Snapshots](#52-volume-snapshots)
   5.3. [Storage Monitoring and Troubleshooting](#53-storage-monitoring-and-troubleshooting)

---

## 1. Storage Fundamentals

### 1.1. Persistent Storage Requirements

Kubernetes storage provides persistent data management capabilities that survive Pod restarts, rescheduling, and failures. Unlike ephemeral container storage, persistent storage maintains data across the dynamic lifecycle of containerized applications.

Think of Kubernetes storage like a sophisticated filing cabinet system in a large corporation. While employees (Pods) come and go, get transferred to different departments, or work from different offices, important documents (data) must remain accessible and organized in a central filing system that everyone can access when needed.

**Core Storage Requirements:**

- **Data Persistence**: Information survives Pod lifecycle changes
- **Cross-Pod Access**: Multiple applications can access shared data
- **Storage Portability**: Volumes can move between nodes with Pods
- **Dynamic Provisioning**: Storage allocated automatically based on requirements
- **Performance Guarantees**: Consistent storage performance characteristics

**Storage Challenges in Kubernetes:**

```yaml
# Problem: Pods are ephemeral, data needs persistence
apiVersion: v1
kind: Pod
metadata:
  name: database-pod
spec:
  containers:
  - name: database
    image: postgres:13
    volumeMounts:
    - name: data-volume
      mountPath: /var/lib/postgresql/data  # Critical data location
  volumes:
  - name: data-volume
    emptyDir: {}  # ⚠️ Data lost when Pod restarts!
```

### 1.2. Storage Architecture Overview

Kubernetes storage architecture separates storage provisioning from consumption through a multi-layered system that abstracts underlying storage technologies.

Like a corporate filing system where the filing cabinets (storage hardware) are managed by facilities, the filing system organization (storage classes) is managed by records management, and individual document access (persistent volume claims) is managed by employees who need the documents.

**Storage Architecture Components:**

```
External Storage Providers
        │
        ▼
Container Storage Interface (CSI)
        │
        ▼
Kubernetes Storage Subsystem
├── StorageClasses (SC)      ← Storage types and policies
├── PersistentVolumes (PV)   ← Actual storage instances
└── PersistentVolumeClaims   ← Storage requests/reservations
        │
        ▼
Pod Volume Mounts            ← Application data access
```

**Key Storage Objects:**

- **StorageClass**: Defines storage types and provisioning policies
- **PersistentVolume (PV)**: Represents actual storage resources
- **PersistentVolumeClaim (PVC)**: Requests for storage by applications
- **CSI Drivers**: Interface between Kubernetes and storage providers

### 1.3. Storage vs Compute Lifecycle

One of the key concepts in Kubernetes storage is that storage has a different lifecycle than compute resources. While Pods are ephemeral and frequently recreated, storage volumes persist across Pod lifecycle events.

**Lifecycle Separation:**

```
Pod Lifecycle:    Create → Run → Terminate → Recreate
                     ↕        ↕        ↕        ↕
Storage Lifecycle: Create ──────────────────── Persist ──→ Delete
```

This separation enables:
- **Data durability** across application updates
- **Stateful application** support (databases, file systems)
- **Backup and recovery** independent of application state
- **Storage migration** between nodes and availability zones

`★ Insight ─────────────────────────────────────`
**Storage lifecycle independence is crucial for stateful applications** - databases, file systems, and other persistent workloads depend on data surviving longer than individual Pod instances. This separation allows Kubernetes to manage compute and storage resources independently.
`─────────────────────────────────────────────────`

## 2. Storage Provisioning

### 2.1. PersistentVolumes (PV)

PersistentVolumes represent actual storage resources in the cluster. They are cluster-wide resources that map to external storage systems and define storage capacity, access modes, and other characteristics.

Think of PVs like individual filing cabinets in a corporate records room - each cabinet has specific characteristics (size, security level, location) and can store documents according to its specifications.

**PersistentVolume Example:**

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: example-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: fast-ssd
  csi:
    driver: ebs.csi.aws.com
    volumeHandle: vol-1234567890abcdef0
    fsType: ext4
```

**PV Characteristics:**

- **Capacity**: Storage size (e.g., 10Gi, 100Gi)
- **Access Modes**: How the volume can be mounted
  - `ReadWriteOnce` (RWO): Single node read-write
  - `ReadOnlyMany` (ROX): Multiple nodes read-only
  - `ReadWriteMany` (RWX): Multiple nodes read-write
- **Reclaim Policy**: What happens when PVC is deleted
  - `Retain`: Manual cleanup required
  - `Delete`: Automatic cleanup
  - `Recycle`: Deprecated automatic cleanup

### 2.2. PersistentVolumeClaims (PVC)

PersistentVolumeClaims are requests for storage by applications. They specify storage requirements and are bound to PersistentVolumes that satisfy those requirements.

PVCs are like storage request forms that employees fill out when they need filing space - they specify how much space they need, what type of access they require, and any special requirements.

**PersistentVolumeClaim Example:**

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: webapp-storage
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
  storageClassName: fast-ssd
```

**PVC Binding Process:**

```
1. PVC Created → 2. Scheduler Finds → 3. PV Bound → 4. Pod Mounts
   │               Matching PV          │           │
   │                    │               │           │
   ▼                    ▼               ▼           ▼
 Storage            PV matches       PVC bound   Volume ready
 Request            requirements     to PV       for use
```

**PVC States:**

- **Pending**: Looking for matching PV
- **Bound**: Successfully matched to PV
- **Lost**: Associated PV deleted

### 2.3. StorageClasses

StorageClasses define different types of storage available in the cluster and enable dynamic provisioning of PersistentVolumes based on application requirements.

StorageClasses are like the filing system's organization policies - they define what types of filing cabinets are available (fast access, long-term archive, secure storage) and how new cabinets should be procured when needed.

**StorageClass Example:**

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete
```

**StorageClass Features:**

- **Dynamic Provisioning**: Automatically creates PVs when needed
- **Storage Types**: Different performance and cost characteristics
- **Provider Integration**: Works with cloud and on-premises storage
- **Policy Enforcement**: Consistent storage configuration across applications

## 3. Dynamic Storage Management

### 3.1. Container Storage Interface (CSI)

The Container Storage Interface provides a standardized API for storage vendors to integrate with Kubernetes without modifying core Kubernetes code.

CSI is like having standardized filing cabinet specifications that allow any cabinet manufacturer to create filing systems that work with the corporate records management system.

**CSI Architecture:**

```
┌─────────────────────────────────────────────────────────┐
│                  Kubernetes                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │            CSI API                               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│               CSI Driver                                │
│  ┌─────────────────┬─────────────────┬─────────────────┐│
│  │  CSI Controller │   CSI Node      │   Identity      ││
│  │  Plugin        │   Plugin        │   Plugin        ││
│  └─────────────────┴─────────────────┴─────────────────┘│
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│            External Storage Provider                    │
│         (AWS EBS, Azure Disk, etc.)                    │
└─────────────────────────────────────────────────────────┘
```

**CSI Components:**

- **CSI Controller Plugin**: Handles volume lifecycle operations
- **CSI Node Plugin**: Handles volume mounting on specific nodes
- **Identity Plugin**: Provides driver identification and capabilities

### 3.2. Dynamic Provisioning

Dynamic provisioning automatically creates storage resources when applications request them through PersistentVolumeClaims.

**Dynamic Provisioning Workflow:**

```
┌──────────────────────────────────────────────────────────┐
│ Step 1: Application Requests Storage                     │
│ ─────────────────────────────────────────────────────── │
│ PVC created with storage requirements                   │
└──────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│ Step 2: StorageClass Triggered                          │
│ ─────────────────────────────────────────────────────── │
│ CSI provisioner detects unbound PVC                    │
└──────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│ Step 3: External Storage Created                        │
│ ─────────────────────────────────────────────────────── │
│ CSI driver creates volume on storage backend           │
└──────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│ Step 4: PV Created and Bound                            │
│ ─────────────────────────────────────────────────────── │
│ PV created and bound to PVC automatically              │
└──────────────────────────────────────────────────────────┘
```

### 3.3. Storage Lifecycle Management

Kubernetes manages the complete lifecycle of storage resources from creation through deletion, including volume expansion, snapshotting, and cleanup.

**Lifecycle Stages:**

1. **Provisioning**: Storage resource creation
2. **Binding**: Matching PVCs to PVs
3. **Using**: Active volume mounting and data operations
4. **Releasing**: PVC deletion and unbinding
5. **Reclaiming**: PV cleanup according to reclaim policy

## 4. Storage Operations

### 4.1. Creating Storage Resources

Let's walk through creating a complete storage configuration for a stateful application.

**Step 1: Define StorageClass**

```yaml
# storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: database-storage
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "250"
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Retain
```

**Step 2: Create PersistentVolumeClaim**

```yaml
# database-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-storage
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: database-storage
```

### 4.2. Mounting Volumes in Pods

**Database Deployment with Storage:**

```yaml
# database-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database
spec:
  replicas: 1
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
      - name: postgres
        image: postgres:13
        env:
        - name: POSTGRES_DB
          value: "appdb"
        - name: POSTGRES_USER
          value: "appuser"
        - name: POSTGRES_PASSWORD
          value: "securepassword"
        volumeMounts:
        - name: database-storage
          mountPath: /var/lib/postgresql/data
        ports:
        - containerPort: 5432
      volumes:
      - name: database-storage
        persistentVolumeClaim:
          claimName: database-storage
```

### 4.3. Storage Configuration Examples

**Deploy the complete storage stack:**

```bash
# Create StorageClass
kubectl apply -f storage-class.yaml

# Create PVC (triggers dynamic provisioning)
kubectl apply -f database-pvc.yaml

# Deploy application with storage
kubectl apply -f database-deployment.yaml

# Verify storage resources
kubectl get storageclass
kubectl get pvc
kubectl get pv
kubectl get pods
```

**Check volume binding:**

```bash
# Verify PVC is bound
kubectl get pvc database-storage
NAME               STATUS   VOLUME                     CAPACITY   ACCESS MODES
database-storage   Bound    pvc-abc123def456789        50Gi       RWO

# Check Pod volume mounts
kubectl describe pod <database-pod-name>
```

## 5. Advanced Storage Features

### 5.1. Access Modes and Binding

Storage access modes define how volumes can be mounted across nodes and Pods.

**Access Mode Characteristics:**

```yaml
# ReadWriteOnce (RWO) - Single node access
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: single-node-storage
spec:
  accessModes:
    - ReadWriteOnce  # Only one node can mount read-write
  resources:
    requests:
      storage: 10Gi

---
# ReadWriteMany (RWX) - Multi-node access
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-storage
spec:
  accessModes:
    - ReadWriteMany  # Multiple nodes can mount read-write
  resources:
    requests:
      storage: 100Gi
  storageClassName: nfs-storage
```

### 5.2. Volume Snapshots

Volume snapshots provide point-in-time copies of persistent volumes for backup and restore operations.

**VolumeSnapshot Example:**

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: database-snapshot
spec:
  volumeSnapshotClassName: csi-snapshotter
  source:
    persistentVolumeClaimName: database-storage
```

**Restore from Snapshot:**

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: restored-database
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  dataSource:
    name: database-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

### 5.3. Storage Monitoring and Troubleshooting

**Common Storage Issues:**

1. **PVC Stuck in Pending:**
```bash
# Check PVC status
kubectl describe pvc <pvc-name>

# Common causes:
# - No matching StorageClass
# - Insufficient storage capacity
# - Node scheduling constraints
```

2. **Pod Cannot Mount Volume:**
```bash
# Check Pod events
kubectl describe pod <pod-name>

# Common causes:
# - PVC not bound
# - Access mode conflicts
# - Node affinity issues
```

3. **Storage Performance Issues:**
```bash
# Monitor storage metrics
kubectl top nodes
kubectl describe pv <pv-name>

# Check storage provider metrics in cloud console
```

**Storage Troubleshooting Commands:**

```bash
# List all storage resources
kubectl get storageclass,pv,pvc

# Check dynamic provisioning
kubectl get events --field-selector reason=ProvisioningSucceeded

# Monitor CSI driver pods
kubectl get pods -n kube-system | grep csi

# Check volume attachment
kubectl get volumeattachment
```

`★ Insight ─────────────────────────────────────`
**Storage troubleshooting requires understanding the entire stack** - from application PVC requests through Kubernetes storage objects to external storage providers. Most issues stem from mismatched requirements, access mode conflicts, or provider-specific limitations.
`─────────────────────────────────────────────────`

---

## Chapter Summary

Kubernetes storage provides robust persistent data management through a layered architecture that separates storage provisioning from consumption. The system abstracts underlying storage technologies while providing consistent APIs for applications.

Like a sophisticated corporate filing system, Kubernetes storage manages different types of storage (filing cabinets) through centralized policies (StorageClasses) while allowing individual departments (applications) to request storage space (PVCs) as needed, with automatic provisioning handling the details.

**Key Storage Concepts:**

- **Persistent Storage**: Data survives Pod lifecycle changes and rescheduling
- **Dynamic Provisioning**: Automatic storage creation based on application requests
- **Storage Abstraction**: Consistent APIs across different storage providers
- **Lifecycle Independence**: Storage and compute resources managed separately
- **CSI Integration**: Standardized interface for storage vendor integration

**Storage Components:**

- **PersistentVolumes (PV)**: Actual storage resources mapped to external systems
- **PersistentVolumeClaims (PVC)**: Application requests for storage resources
- **StorageClasses**: Storage types and dynamic provisioning policies
- **CSI Drivers**: Interface layer between Kubernetes and storage providers

**When to Use Persistent Storage:**

- Database applications requiring data durability
- File systems and content management applications
- Stateful applications with configuration or state data
- Applications requiring shared storage across multiple Pods
- Backup and disaster recovery scenarios

**Storage Best Practices:**

- Use appropriate access modes for application requirements
- Implement proper backup and snapshot strategies
- Monitor storage performance and capacity
- Choose storage classes based on performance and cost requirements
- Plan for storage lifecycle management and cleanup policies

Kubernetes storage enables true stateful application deployment in containerized environments, providing the persistence and reliability that enterprise applications require while maintaining the flexibility and scalability of cloud-native architectures.

---

**Navigation:**
- **Previous:** [10. Service Discovery Deep Dive](10-service-discovery.md)
- **Next:** [12. ConfigMaps and Secrets](12-configmaps-secrets.md)
- **Up:** [Table of Contents](index.md)