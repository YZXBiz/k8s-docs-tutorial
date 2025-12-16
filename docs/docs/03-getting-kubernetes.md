# Chapter 3: Getting Kubernetes

**Previous:** [Chapter 2: Kubernetes Principles](02-kubernetes-principles.md) | **Next:** [Chapter 4: Working with Pods](04-working-with-pods.md)

---

## 📋 Table of Contents

1. [Installation Requirements](#1-installation-requirements)
   - 1.1. [Essential Tools Overview](#11-essential-tools-overview)
   - 1.2. [Development Strategy](#12-development-strategy)
2. [Docker Desktop Installation](#2-docker-desktop-installation)
   - 2.1. [Docker Account Setup](#21-docker-account-setup)
   - 2.2. [Software Installation](#22-software-installation)
   - 2.3. [Multi-Node Cluster Deployment](#23-multi-node-cluster-deployment)
   - 2.4. [Local Cluster Verification](#24-local-cluster-verification)
3. [Cloud Cluster Setup](#3-cloud-cluster-setup)
   - 3.1. [Cloud Requirements](#31-cloud-requirements)
   - 3.2. [Linode Account Configuration](#32-linode-account-configuration)
   - 3.3. [LKE Cluster Creation](#33-lke-cluster-creation)
   - 3.4. [kubectl Configuration](#34-kubectl-configuration)
4. [kubectl and kubeconfig Management](#4-kubectl-and-kubeconfig-management)
   - 4.1. [kubectl Command-Line Tool](#41-kubectl-command-line-tool)
   - 4.2. [kubeconfig File Structure](#42-kubeconfig-file-structure)
5. [Chapter Summary](#5-chapter-summary)

---

## 1. Installation Requirements

Getting started with Kubernetes requires setting up the right development environment. This chapter shows you how to install and configure the tools needed to follow every example in this book.

Like building a workshop that starts simple and expands as needed, you'll begin with local tools and gradually add cloud capabilities when required for advanced features.

### 1.1. Essential Tools Overview

You need three core components for Kubernetes development:

1. **Docker**: Containerization platform for building and running container images
2. **Kubernetes Cluster**: Orchestration platform for managing containerized applications
3. **kubectl**: Command-line interface for interacting with Kubernetes clusters

**Recommended Solution:** Docker Desktop provides all three components in a single installation package, simplifying setup and configuration.

**Tool Functions:**

| Component | Purpose | Usage |
|-----------|---------|-------|
| **Docker** | Container creation and management | Build and test container images |
| **Kubernetes Cluster** | Application orchestration | Deploy and manage applications |
| **kubectl** | Cluster interaction | Execute commands against clusters |

### 1.2. Development Strategy

Your Kubernetes learning environment should progress from simple to complex based on feature requirements.

**Environment Progression:**

| Stage | Environment | Capabilities | Use Cases |
|-------|-------------|--------------|----------|
| **Local Development** | Docker Desktop | Basic Kubernetes features, Pod management, Service networking | Most learning scenarios |
| **Cloud Testing** | Hosted Kubernetes | Load balancers, persistent storage, auto-scaling | Advanced features, production testing |

**Feature Requirements by Environment:**

**Local Environment (Docker Desktop):**
- Pod lifecycle management
- Deployment and ReplicaSet operations
- Service networking (ClusterIP, NodePort)
- ConfigMap and Secret management
- Basic resource management

**Cloud Environment (Required for specific features):**
- LoadBalancer Service types (Chapter 8: Ingress)
- Persistent storage with cloud providers (Chapter 11: Storage)
- Cluster autoscaling
- External load balancer integration

**Cost-Effective Approach:**
Start with local development for foundational concepts, then use cloud environments only when specific cloud-native features are required.

:::info[Insight]
Master fundamentals locally before moving to cloud environments. This approach builds solid foundations while minimizing costs and complexity during the learning process.
:::

---

## 2. Docker Desktop Installation

Docker Desktop provides the easiest way to get Docker, Kubernetes, and kubectl in a single installation. This section covers complete setup and configuration.

### 2.1. Docker Account Setup

Docker requires a free account for downloads and access to certain features.

**Account Creation Steps:**
1. Navigate to `app.docker.com/signup`
2. Complete the registration form for a free Personal account
3. Verify your email address
4. Sign in to activate your account

**Licensing Requirements:**
Docker Desktop is free for:
- **Personal use**: Individual learning and non-commercial projects
- **Educational use**: Academic institutions and students
- **Small businesses**: Organizations with fewer than 250 employees AND less than $10M annual revenue

**Commercial Licensing:**
Larger organizations require paid Docker Desktop licenses for commercial use.

### 2.2. Software Installation

Docker Desktop installs Docker, Kubernetes, and kubectl as an integrated package.

**Installation Process:**
1. **Download**: Search for "Docker Desktop" and download the installer for your operating system
2. **Install**: Run the installer and follow the setup wizard
3. **Windows Specific**: Install WSL 2 (Windows Subsystem for Linux) when prompted
4. **Launch**: Start Docker Desktop application after installation completes

**System Requirements:**
- **Docker Desktop**: Version 4.38 or newer required
- **Windows**: WSL 2 backend for optimal performance
- **macOS**: Recent macOS version with sufficient RAM
- **Linux**: Native Docker Desktop support

**Installation Verification:**

After installation, verify both Docker and kubectl are available:

```bash
# Verify Docker installation
$ docker --version
Docker version 27.5.1, build 9f9e405

# Verify kubectl installation
$ kubectl version --client=true -o yaml
clientVersion:
  major: "1"
  minor: "31"
  platform: darwin/arm64
```

**Expected Results:**
Both commands should return version information without errors, confirming successful installation.

### 2.3. Multi-Node Cluster Deployment

Docker Desktop can create a multi-node Kubernetes cluster that simulates production environments with separate control plane and worker nodes.

**Configuration Steps:**

1. **Docker Desktop Authentication**
    - Click the Docker whale icon in menu bar/system tray
    - Sign in with your Docker account credentials

2. **Enable Container Runtime Features**
    - Open Docker Desktop Settings → General tab
    - Ensure "Use containerd for pulling and storing images" is enabled
    - Apply changes and restart if prompted

3. **Kubernetes Cluster Configuration**
    - Navigate to Settings → Kubernetes tab
    - Check "Enable Kubernetes" option
    - **Critical**: Select "kind (sign-in required)" option for multi-node support
    - Adjust Node(s) slider to 3 nodes
    - Enable "Show system containers (advanced)" for visibility

4. **Alternative Activation** (if kind option not visible):
    - From Kubernetes settings page, enter: ↑↑↓↓←→←→ba (konami code)
    - This enables experimental features including MultiNodeKubernetes
    - Return to Kubernetes settings and retry kind configuration

**Resulting Cluster Architecture:**

```
Multi-Node Configuration:
┌─────────────────────────┐
│   Control Plane Node    │ ← Cluster management
│ (desktop-control-plane) │
└─────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
┌────▼───┐    ┌────▼────┐
│Worker  │    │Worker   │ ← Application execution
│Node 1  │    │Node 2   │
└────────┘    └─────────┘
```

**Configuration Benefits:**
- **Realistic Environment**: Simulates production cluster topology
- **High Availability Testing**: Practice multi-node deployment patterns
- **Resource Distribution**: Understand workload distribution across nodes

### 2.4. Local Cluster Verification

After configuration, verify your multi-node cluster is operational and accessible.

**Cluster Status Verification:**

```bash
# List all cluster nodes
$ kubectl get nodes
NAME                    STATUS   ROLES           AGE   VERSION
desktop-control-plane   Ready    control-plane   10m   v1.32.2
desktop-worker          Ready    <none>          10m   v1.32.2
desktop-worker2         Ready    <none>          10m   v1.32.2
```

**Expected Output Analysis:**
- **Node Count**: Three nodes with descriptive names
- **Status**: All nodes show "Ready" status
- **Roles**: One control-plane node, two worker nodes
- **Version**: All nodes running same Kubernetes version

**Container Implementation:**
Docker Desktop implements Kubernetes nodes as containers. View them in Docker Desktop's Containers tab - container names match kubectl node names.

**Troubleshooting:**
- **Missing nodes**: Verify kind option was selected during setup
- **Not Ready status**: Wait additional time for initialization
- **Version mismatch**: Restart Docker Desktop to synchronize versions

**Cluster Capabilities:**
This local setup supports:
- Pod deployment and management
- Service networking (ClusterIP, NodePort)
- Deployment and ReplicaSet operations
- ConfigMap and Secret management
- Most Kubernetes learning scenarios

:::info[Insight]
This local cluster handles 90% of Kubernetes learning scenarios. Master Pods, Deployments, Services, and advanced concepts locally before moving to cloud environments for specific integrations.
:::

---

## 3. Cloud Cluster Setup

Some Kubernetes features require cloud infrastructure that local environments cannot replicate. This section covers setting up a production-like cluster using Linode Kubernetes Engine (LKE).

### 3.1. Cloud Requirements

Certain Kubernetes features require cloud infrastructure capabilities that local environments cannot provide.

**Local Environment Limitations:**

| Limitation | Cloud Solution | Impact |
|------------|----------------|--------|
| **No LoadBalancer Services** | Cloud load balancers | Cannot expose services externally |
| **No persistent storage** | Cloud storage volumes | Cannot test stateful applications |
| **No cluster autoscaling** | Node autoscaling | Cannot test dynamic scaling |
| **No external IPs** | Public IP addresses | Cannot test internet-facing services |

**Cloud-Required Features:**
- **Chapter 8 (Ingress)**: Requires real load balancers for external traffic routing
- **Chapter 11 (Storage)**: Requires cloud persistent volumes for stateful workloads
- **Production Testing**: Requires external connectivity and scaling behaviors

**When to Use Cloud Clusters:**
- Testing LoadBalancer Service types
- Implementing persistent storage solutions
- Validating ingress controllers with real load balancers
- Testing cluster autoscaling behaviors
- Simulating production-like networking scenarios

### 3.2. Linode Account Configuration

Linode provides managed Kubernetes service (LKE) with new user credits sufficient for all book examples.

**Account Setup Process:**

1. **Free Credit Registration**
    - Primary link: `https://bit.ly/4b7YZix`
    - Alternative: `https://www.linode.com/lp/refer/?r=6107b344722dbd6017ea12da672510a85f8b5e84`
    - Provides $100 free credit valid for 60 days

2. **Account Requirements**
    - Valid email address for verification
    - Payment method (required even with free credits)
    - Account verification through email confirmation

3. **Cost Management**
    - Free credit covers all book examples with surplus
    - Monitor usage through Linode dashboard
    - Delete resources when experiments complete
    - Set up billing alerts for cost awareness

**Account Benefits:**
- **Managed Infrastructure**: Linode handles control plane management
- **Production Features**: Real load balancers and persistent storage
- **Global Regions**: Choose location closest to you
- **Scalable Resources**: Easy cluster and node scaling

### 3.3. LKE Cluster Creation

Linode Kubernetes Engine (LKE) provides managed Kubernetes clusters where Linode handles control plane infrastructure while you manage applications.

**Cluster Configuration Steps:**

1. **Navigate to Cluster Creation**
    - Access `cloud.linode.com`
    - Select "Kubernetes" from left navigation panel
    - Click "Create Cluster" button

2. **Basic Cluster Settings**
    - **Cluster Label**: `tkb` (The Kubernetes Book)
    - **Region**: Select region closest to your location
    - **Kubernetes Version**: Choose latest stable release
    - **HA Control Plane**: Disabled (cost optimization for learning)
    - **Control Plane ACL**: Disabled (allows access from any IP)

3. **Worker Node Configuration**
    - Navigate to "Add Node Pools" section
    - Select "Shared CPU" tab for cost-effective resources
    - Configure: 3 × Linode 2GB nodes
    - Review estimated monthly costs

4. **Cluster Provisioning**
    - Click "Create Cluster" to begin provisioning
    - Monitor progress in Linode dashboard
    - Provisioning typically takes 2-3 minutes

**LKE Architecture Model:**

```
Managed Kubernetes Architecture:
┌─────────────────────────┐
│     Control Plane       │ ← Managed by Linode
│   (Hidden/Abstracted)   │   (Not visible to users)
└─────────────────────────┘
             │
      ┌──────┼──────┐
      │      │      │
┌────▼──┐ ┌─▼───┐ ┌─▼───┐
│Worker │ │Work │ │Work │ ← User-managed nodes
│Node 1 │ │er 2 │ │er 3 │   (Run applications)
└───────┘ └─────┘ └─────┘
```

**Managed Service Benefits:**
- **Control Plane Management**: Linode handles etcd, API server, scheduler
- **Infrastructure Maintenance**: Automated updates and security patches
- **High Availability**: Built-in control plane redundancy
- **Cost Optimization**: Pay only for worker nodes, not control plane

### 3.4. kubectl Configuration

Configure kubectl to connect to your LKE cluster using authentication credentials downloaded from the Linode dashboard.

**Connection Process Overview:**

```
kubectl Command Flow:
Your Command → kubectl → HTTP API Request → Kubernetes Cluster
       ↑                                              ↓
Authentication credentials                    Response/Results
```

**Configuration Scenarios:**

#### Scenario 1: First kubectl Setup

For users without existing kubectl configuration:

```bash
# 1. Create kubectl configuration directory
mkdir -p ~/.kube

# 2. Download kubeconfig from Linode dashboard
# (Save file as ~/.kube/config)

# 3. Verify cluster connectivity
kubectl get nodes
```

#### Scenario 2: Multiple Cluster Management

For users with existing kubeconfig files:

```bash
# 1. Backup existing configuration
mv ~/.kube/config ~/.kube/config-bkp

# 2. Download LKE kubeconfig as tkb-kubeconfig.yaml

# 3. Merge configurations temporarily
export KUBECONFIG=~/.kube/config-bkp:~/.kube/tkb-kubeconfig.yaml
kubectl config view

# 4. Create unified configuration
kubectl config view --flatten > ~/.kube/config
export KUBECONFIG=~/.kube/config

# 5. Switch to LKE cluster context
kubectl config use-context lke349416-ctx
```

**Cluster Verification:**

```bash
$ kubectl get nodes
NAME                             STATUS    ROLES     AGE    VERSION
lke349416-551020-184a46360000    Ready     <none>    19m    v1.32.1
lke349416-551020-1c6f99c20000    Ready     <none>    19m    v1.32.1
lke349416-551020-47ad6c5c0000    Ready     <none>    19m    v1.32.1
```

**Expected Results:**
- **Node Count**: Three nodes with `lke` prefix in names
- **Role Status**: All nodes show `<none>` (control plane managed by Linode)
- **Operational Status**: All nodes display "Ready" status
- **Version Consistency**: All nodes running same Kubernetes version

**Troubleshooting:**
- **Connection errors**: Verify kubeconfig file location and contents
- **Authentication failures**: Confirm kubeconfig downloaded correctly
- **Context issues**: Use `kubectl config current-context` to verify active cluster

:::info[Insight]
Managed clusters hide infrastructure complexity while providing production features. You only see worker nodes, but gain access to cloud load balancers, persistent storage, and enterprise-grade reliability.
:::

---

## 4. kubectl and kubeconfig Management

kubectl serves as the universal command-line interface for Kubernetes cluster management. Understanding kubectl and kubeconfig enables effective multi-cluster workflows.

### 4.1. kubectl Command-Line Tool

kubectl functions as a universal interface that works with any Kubernetes cluster by converting commands into HTTP API requests.

**Command Processing Flow:**

```
kubectl Operation Sequence:
User Command: kubectl get pods
       ↓
kubectl: Converts to HTTP GET request
       ↓
HTTP API: Transmits to cluster API server
       ↓
Kubernetes Cluster: Returns JSON response
       ↓
kubectl: Formats response for human consumption
       ↓
Terminal Output: Displays readable results
```

**Version Compatibility Requirements:**

kubectl must be within one minor version of the target cluster:

| Cluster Version | Compatible kubectl Versions | Status |
|----------------|------------------------------|--------|
| v1.32.x | v1.31.x to v1.33.x | ✓ Supported |
| v1.32.x | v1.29.x or v1.34.x | ✗ Unsupported |

**Installation Methods:**
- **Docker Desktop**: Automatically installed and configured
- **Package Managers**: Available through brew, apt, yum
- **Direct Download**: Kubernetes release pages
- **Cloud CLIs**: Integrated with cloud provider tooling

**Common kubectl Operations:**
- **Resource Management**: Create, read, update, delete resources
- **Cluster Inspection**: View nodes, pods, services, deployments
- **Configuration**: Manage contexts, namespaces, authentication
- **Troubleshooting**: Logs, describe, exec into containers

### 4.2. kubeconfig File Structure

The kubeconfig file stores connection details and authentication credentials for all Kubernetes clusters, enabling seamless multi-cluster management.

**kubeconfig File Components:**

```yaml
apiVersion: v1
kind: Config

clusters:                           # Cluster connection details
- name: local-cluster               # Friendly cluster name
  cluster:
     server: https://127.0.0.1:6443  # API server endpoint
     certificate-authority-data: ... # Cluster CA certificate

users:                              # Authentication credentials
- name: cluster-admin               # User identifier
  user:
     client-certificate-data: ...    # Client certificate
     client-key-data: ...            # Client private key

contexts:                           # Cluster + user combinations
- name: local-admin-context         # Context identifier
  context:
     cluster: local-cluster          # Target cluster
     user: cluster-admin             # Authentication user
     namespace: default              # Default namespace

current-context: local-admin-context # Active context
```

**File Location:**
- **macOS/Linux**: `~/.kube/config`
- **Windows**: `C:\Users\<username>\.kube\config`
- **Custom Location**: Set via `KUBECONFIG` environment variable

**Multi-Cluster Management:**

```bash
# List all configured contexts
kubectl config get-contexts

# Switch active context
kubectl config use-context production-cluster

# View current context
kubectl config current-context

# View complete configuration
kubectl config view
```

**Context Management Examples:**

```bash
# Example: Multiple contexts output
$ kubectl config get-contexts
CURRENT   NAME             CLUSTER          AUTHINFO          NAMESPACE
*         docker-desktop   docker-desktop   docker-desktop    default
           lke349416-ctx    lke349416        lke349416-admin   default

# Switch to cloud cluster
$ kubectl config use-context lke349416-ctx
Switched to context "lke349416-ctx".
```

**Docker Desktop Integration:**
Docker Desktop provides graphical context switching through the whale icon menu → "Kubernetes Context" option, simplifying multi-cluster workflows.

**Security Considerations:**
- **File Permissions**: Restrict kubeconfig access (600 permissions)
- **Credential Storage**: Contains sensitive authentication material
- **Backup Strategy**: Maintain secure backups of working configurations
- **Environment Separation**: Use separate contexts for different environments

:::info[Insight]
kubeconfig enables seamless multi-cluster workflows. Develop locally, test in staging, and deploy to production using identical kubectl commands - context switching changes the target cluster without changing your workflow.
:::

---

## 5. Chapter Summary

**What we've accomplished:**

You now have a complete Kubernetes development environment that can grow with your learning journey:

**Foundation Setup:**
- **Local development**: Docker Desktop with multi-node cluster
- **Cloud capabilities**: Linode cluster for advanced features
- **Universal control**: kubectl configured for both environments
- **Easy switching**: kubeconfig managing multiple cluster connections

**Learning Path Strategy:**
```
Progression Path              Capabilities Gained
───────────────              ──────────────────
Local Docker Desktop    →    • Kubernetes fundamentals
                             • Pod and Deployment management
                             • Basic networking and services
                             • Development workflows

Cloud LKE Cluster      →    • Load balancer integration
                             • Persistent storage
                             • Production-like networking
                             • Auto-scaling features
```

**Tool Mastery:**
- **Docker**: Containerization platform and complete development suite
- **kubectl**: Universal Kubernetes command-line interface
- **kubeconfig**: Connection management for multiple clusters

**Cost-Effective Approach:**
- Use free local setup for 90% of learning
- Use cloud clusters only when specific features are needed
- $100 free credit covers all advanced examples

**What's next:**

With your workshop properly set up, you're ready to start building! The next chapters will guide you through creating your first applications, starting with the fundamental building block: Pods.

> **💡 Final Insight**
>
> The best development environment removes barriers to experimentation. With both local and cloud options configured, you can focus on learning Kubernetes concepts rather than fighting with setup issues. Start local, scale to cloud, and let your skills grow naturally.

---

**Previous:** [Chapter 2: Kubernetes Principles](02-kubernetes-principles.md) | **Next:** [Chapter 4: Working with Pods](04-working-with-pods.md)