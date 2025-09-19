# Chapter 14: API Security and RBAC

**Previous:** [Chapter 13: StatefulSets](13-statefulsets.md) | **Next:** [Chapter 15: The Kubernetes API](15-kubernetes-api.md)

---

## Table of Contents

1. [API Security Fundamentals](#1-api-security-fundamentals)
    1.1. [Request Security Flow](#11-request-security-flow)
    1.2. [Security Layer Architecture](#12-security-layer-architecture)
    1.3. [API Request Lifecycle](#13-api-request-lifecycle)

2. [Authentication Layer](#2-authentication-layer)
    2.1. [Authentication Fundamentals](#21-authentication-fundamentals)
    2.2. [Authentication Methods](#22-authentication-methods)
    2.3. [Kubeconfig Structure](#23-kubeconfig-structure)
    2.4. [External Identity Integration](#24-external-identity-integration)

3. [Authorization with RBAC](#3-authorization-with-rbac)
    3.1. [RBAC Fundamentals](#31-rbac-fundamentals)
    3.2. [RBAC Components](#32-rbac-components)
    3.3. [Role Configuration](#33-role-configuration)
    3.4. [Cluster-Level Authorization](#34-cluster-level-authorization)
    3.5. [Real-World RBAC Examples](#35-real-world-rbac-examples)

4. [Admission Control](#4-admission-control)
    4.1. [Admission Control Fundamentals](#41-admission-control-fundamentals)
    4.2. [Controller Types](#42-controller-types)
    4.3. [Policy Enforcement](#43-policy-enforcement)

---

## 1. API Security Fundamentals

Kubernetes operates as an API-centric platform where all operations flow through the API server. Understanding the security architecture that protects these API interactions is crucial for maintaining a secure cluster environment.

### 1.1. Request Security Flow

Every API request in Kubernetes follows a standardized security pipeline designed to ensure comprehensive protection. Think of this like a high-security facility where every visitor must pass through multiple checkpoints - each serving a specific security function.

**Key API Clients:**
- Operators and developers using `kubectl`
- Pod processes making API calls
- Kubelet agents on worker nodes
- Control plane services
- Kubernetes-native applications

All these clients make CRUD-style requests (create, read, update, delete) that must traverse the complete security pipeline.

`★ Insight ─────────────────────────────────────`
The API-centric design means that securing the API server effectively secures the entire cluster. Unlike traditional applications where security might be scattered across multiple entry points, Kubernetes centralizes all access control through this single, well-defined pipeline.
`─────────────────────────────────────────────────`

### 1.2. Security Layer Architecture

The Kubernetes API security architecture implements a three-layer defense system:

```
Client Request → [TLS Encryption] → API Server
                                         ↓
                                   Authentication
                                         ↓
                                   Authorization
                                         ↓
                                  Admission Control
                                         ↓
                                    API Processing
```

This layered approach ensures that even if one security mechanism has vulnerabilities, additional layers provide protection. It's similar to how modern bank vaults use multiple independent locking mechanisms - each layer must be successfully navigated.

### 1.3. API Request Lifecycle

Consider a practical example where user `grant-ward` attempts to create a Deployment called `hive` in the `terran` namespace:

1. **Request Initiation**: `kubectl apply` generates an HTTPS request with embedded credentials
2. **TLS Handshake**: Secure connection established between kubectl and API server
3. **Authentication**: API server verifies the request originates from genuine `grant-ward`
4. **Authorization**: System checks if `grant-ward` has permission to create Deployments in `terran` namespace
5. **Admission Control**: Controllers verify the Deployment meets all policy requirements
6. **Execution**: Request is processed only after passing all security checks

**Failed requests** are immediately rejected at the first failed security layer, preventing unnecessary processing and potential security exposures.

---

## 2. Authentication Layer

Authentication serves as the identity verification gateway for all API requests. This layer answers the fundamental question: "Who is making this request?"

### 2.1. Authentication Fundamentals

Authentication operates on credential verification principles. Every API request must include credentials, and the authentication layer validates these credentials against trusted sources.

**Authentication Process:**
- **Success**: Request proceeds to authorization with verified identity
- **Failure**: HTTP 401 response, request immediately denied

The authentication layer in Kubernetes is intentionally pluggable, allowing integration with various identity systems rather than creating another identity silo. This design choice reflects enterprise security best practices where centralized identity management is preferred.

`★ Insight ─────────────────────────────────────`
Kubernetes deliberately avoids maintaining its own user database. This prevents the common security anti-pattern of having multiple, disconnected identity stores that become difficult to manage and audit in enterprise environments.
`─────────────────────────────────────────────────`

### 2.2. Authentication Methods

**Primary Authentication Methods:**

1. **Client Certificates**: X.509 certificates signed by trusted Certificate Authorities
2. **Webhook Authentication**: External authentication service integration
3. **External IAM Integration**: Cloud provider or corporate identity systems
4. **Service Account Tokens**: JWT tokens for Pod-to-API authentication

Most production environments integrate with enterprise identity management systems, leveraging existing security infrastructure rather than managing separate authentication mechanisms.

### 2.3. Kubeconfig Structure

The kubeconfig file serves as the authentication configuration hub for kubectl and other Kubernetes tools. Think of it as a security keychain that contains all the credentials and connection information needed to access your clusters.

**File Location:**
- **Windows**: `C:\Users\<user>\.kube\config`
- **Linux/Mac**: `/home/<user>/.kube/config`

**Kubeconfig Structure:**

```yaml
apiVersion: v1
kind: Config
clusters:                        # Cluster definitions with endpoints and certificates
- cluster:
     name: prod-shield             # Friendly cluster name
     server: https://<api-server-url>:443     # API server endpoint
     certificate-authority-data: LS0tLS1C...  # Cluster CA certificate
users:                          # User credentials and authentication data
- name: njfury                   # User identifier
  user:
     as-user-extra: {}
     token: eyJhbGciOiJSUzI1NiIsImtpZCI6...  # Authentication token
contexts:                       # Cluster + User combinations
- context:
     name: shield-admin           # Context name
     cluster: prod-shield         # Target cluster
     user: njfury                 # Authentication user
     namespace: default           # Default namespace
current-context: shield-admin    # Active context for kubectl
```

**Configuration Components:**

1. **Clusters**: Define Kubernetes cluster endpoints and CA certificates
2. **Users**: Store authentication credentials (certificates, tokens, etc.)
3. **Contexts**: Pair clusters with users for specific operational contexts
4. **Current-context**: Specifies the active cluster/user combination

### 2.4. External Identity Integration

Production Kubernetes deployments typically integrate with existing enterprise identity systems:

**Integration Benefits:**
- Centralized user management
- Consistent security policies
- Single sign-on capabilities
- Audit trail consolidation

**Common Integration Patterns:**
- **Cloud IAM**: AWS IAM, Google Cloud Identity, Azure AD
- **Corporate Systems**: Active Directory, LDAP
- **OIDC Providers**: Okta, Auth0, KeyCloak

When external integration is configured, Kubernetes delegates authentication decisions to these trusted systems, maintaining consistency with broader organizational security policies.

---

## 3. Authorization with RBAC

Role-Based Access Control (RBAC) provides fine-grained permission management for authenticated users. After identity verification, RBAC determines what actions users can perform on which resources.

### 3.1. RBAC Fundamentals

RBAC operates on three core concepts that work together to define access permissions:

**Core RBAC Elements:**
- **Users (Subjects)**: Who is requesting access
- **Actions (Verbs)**: What operation is being requested
- **Resources**: Which Kubernetes objects are involved

Think of RBAC like a sophisticated access control system in a corporate building. Users have key cards (identity), different areas require different access levels (resources), and each key card permits specific actions (verbs) like read access to some floors but write access to others.

**RBAC Authorization Examples:**

| User | Action | Resource | Result |
|------|--------|----------|--------|
| bao | create | Pods | Bao can create Pod objects |
| kalila | list | Deployments | Kalila can view Deployment lists |
| josh | delete | ServiceAccounts | Josh can remove ServiceAccount objects |

RBAC implements a **least-privilege, deny-by-default** security model where all access is blocked unless explicitly granted through allow rules.

`★ Insight ─────────────────────────────────────`
Kubernetes RBAC only supports allow rules, not deny rules. This design choice significantly simplifies permission management and troubleshooting compared to systems that support both allow and deny rules, where rule interactions can create complex and unpredictable access patterns.
`─────────────────────────────────────────────────`

### 3.2. RBAC Components

RBAC authorization uses four distinct object types that work together:

**Namespace-Scoped Objects:**
- **Roles**: Define permission sets within specific namespaces
- **RoleBindings**: Associate Roles with users within namespaces

**Cluster-Scoped Objects:**
- **ClusterRoles**: Define permission sets across the entire cluster
- **ClusterRoleBindings**: Associate ClusterRoles with users cluster-wide

**Role and RoleBinding Relationship:**

```yaml
# Role Definition
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: shield
  name: read-deployments
rules:
- verbs: ["get", "watch", "list"]   # Allowed actions
  apiGroups: ["apps"]               # Target API group
  resources: ["deployments"]        # Target resource type
```

```yaml
# RoleBinding Definition
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-deployments
  namespace: shield
subjects:
- kind: User
  name: sky                         # Authenticated user
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: read-deployments            # Role to bind
  apiGroup: rbac.authorization.k8s.io
```

This configuration allows user `sky` to run commands like `kubectl get deployments -n shield`.

### 3.3. Role Configuration

Role objects contain a `rules` section that precisely defines permitted operations:

**Rule Components:**
- **verbs**: Permitted actions (create, get, list, watch, update, patch, delete)
- **apiGroups**: Target API groups ("", "apps", "storage.k8s.io", etc.)
- **resources**: Specific resource types (pods, deployments, secrets, etc.)

**API Group and Resource Examples:**

| apiGroup | resource | API Path |
|----------|----------|----------|
| "" | pods | `/api/v1/namespaces/{namespace}/pods` |
| "" | secrets | `/api/v1/namespaces/{namespace}/secrets` |
| "storage.k8s.io" | storageclass | `/apis/storage.k8s.io/v1/storageclasses` |
| "apps" | deployments | `/apis/apps/v1/namespaces/{namespace}/deployments` |

**Kubernetes Verbs and HTTP Mapping:**

| Kubernetes Verb(s) | HTTP Method | Common Responses |
|-------------------|-------------|------------------|
| create | POST | 201 Created, 403 Access Denied |
| get, list, watch | GET | 200 OK, 403 Access Denied |
| update | PUT | 200 OK, 403 Access Denied |
| patch | PATCH | 200 OK, 403 Access Denied |
| delete | DELETE | 200 OK, 403 Access Denied |

**Discovering Available Resources:**

```bash
$ kubectl api-resources --sort-by name -o wide
NAME          APIGROUP           KIND        VERBS
deployments   apps               Deployment  [create delete get list patch update watch]
ingresses     networking.k8s.io  Ingress     [create delete get list patch update watch]
pods                             Pod         [create delete get list patch update watch]
secrets                          Secret      [create delete get list patch update watch]
services                         Service     [create delete get list patch update watch]
```

### 3.4. Cluster-Level Authorization

ClusterRoles and ClusterRoleBindings provide cluster-wide permission management, extending beyond namespace boundaries.

**ClusterRole Pattern Advantages:**
- Define common roles once at cluster level
- Reuse roles across multiple namespaces
- Manage cluster-scoped resources (nodes, persistent volumes, etc.)

**ClusterRole Example:**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole                   # Cluster-scoped role
metadata:
  name: read-deployments
rules:
- verbs: ["get", "watch", "list"]
  apiGroups: ["apps"]
  resources: ["deployments"]
```

**Mixed ClusterRole and RoleBinding Pattern:**

```
ClusterRole (read-deployments)
     ├── RoleBinding (namespace: frontend)
     ├── RoleBinding (namespace: backend)
     └── RoleBinding (namespace: database)
```

This pattern allows a single ClusterRole definition to be selectively applied to specific namespaces through individual RoleBindings.

### 3.5. Real-World RBAC Examples

**Docker Desktop RBAC Configuration:**

Docker Desktop demonstrates practical RBAC implementation by automatically configuring cluster admin access:

1. **Client Certificate**: kubeconfig contains client certificate for `kubernetes-admin` user
2. **Group Membership**: Certificate specifies membership in `kubeadm:cluster-admins` group
3. **ClusterRole**: `cluster-admin` role provides full cluster access
4. **ClusterRoleBinding**: `kubeadm:cluster-admins` binding connects group to role

**Examining Docker Desktop Configuration:**

```bash
# View kubeconfig user information
$ kubectl config view
users:
- name: docker-desktop
  user:
     client-certificate-data: DATA+OMITTED
     client-key-data: DATA+OMITTED
```

**Decoding Certificate Information:**

```bash
# Extract username and group from certificate (Linux/Mac with jq)
$ kubectl config view --raw -o json \
     | jq ".users[] | select(.name==\"docker-desktop\")" \
     | jq -r '.user["client-certificate-data"]' \
     | base64 -d | openssl x509 -text | grep "Subject:"

Subject: O=kubeadm:cluster-admins, CN=kubernetes-admin
```

**Understanding the Authorization Chain:**
- **CN**: Contains username (`kubernetes-admin`)
- **O**: Contains group membership (`kubeadm:cluster-admins`)
- **ClusterRoleBinding**: Links group to `cluster-admin` role
- **Result**: Full cluster administrative access

**Cluster Admin Role Permissions:**

```bash
$ kubectl describe clusterrole cluster-admin
PolicyRule:
  Resources  Non-Resource URLs  Resource Names  Verbs
  ---------  -----------------  --------------  -----
  *.*        []                 []              [*]
              [*]                []              [*]
```

This grants unlimited access to all resources and operations - equivalent to root access in traditional systems.

---

## 4. Admission Control

Admission control provides the final security checkpoint before API requests execute against the cluster. This layer enforces organizational policies and ensures compliance with operational requirements.

### 4.1. Admission Control Fundamentals

Admission controllers operate after successful authentication and authorization, focusing on policy enforcement rather than identity or permission verification. Think of admission control like quality assurance inspectors in a manufacturing process - they ensure every product meets established standards before leaving the facility.

**Admission Control Characteristics:**
- Operates only on requests that modify cluster state
- Read-only requests bypass admission control
- All controllers must approve a request for it to proceed
- Single controller rejection denies the entire request

**Request Flow Through Admission Control:**

```
Authenticated & Authorized Request
             ↓
     Mutating Controllers
             ↓
     Validating Controllers
             ↓
         API Processing
```

### 4.2. Controller Types

Kubernetes supports two distinct types of admission controllers, each serving different policy enforcement functions:

**Mutating Controllers:**
- Check policy compliance
- Can modify requests to ensure compliance
- Execute before validating controllers
- Example: Automatically add required labels or annotations

**Validating Controllers:**
- Check policy compliance
- Cannot modify requests
- Execute after mutating controllers
- Example: Reject requests missing required labels

**Practical Example:**
Consider a production cluster policy requiring all objects to have an `env=prod` label:

- **Mutating Controller**: Automatically adds `env=prod` label if missing
- **Validating Controller**: Rejects requests without `env=prod` label

### 4.3. Policy Enforcement

**Common Admission Controllers:**

**NodeRestriction**: Limits kubelet permissions to only modify their own node and pods
```bash
$ kubectl describe pod kube-apiserver-desktop-control-plane \
  --namespace kube-system | grep admission

--enable-admission-plugins=NodeRestriction
```

**AlwaysPullImages**: Forces all pods to pull images from registry (prevents local image usage)
- Sets `spec.containers.imagePullPolicy` to `Always`
- Enhances security by preventing stale local images
- Requires valid registry credentials on all nodes

**ResourceQuota**: Enforces resource consumption limits within namespaces
**LimitRanger**: Applies default resource limits and validates resource requests
**SecurityContextDeny**: Prevents privileged containers and host access

`★ Insight ─────────────────────────────────────`
Admission controllers provide the final opportunity to enforce organizational policies before resources are created. This makes them crucial for implementing security, compliance, and operational requirements that can't be expressed through simple RBAC permissions.
`─────────────────────────────────────────────────`

**Production Cluster Considerations:**

Real-world clusters typically run multiple admission controllers to enforce comprehensive policies:
- Security policies (prevent privileged containers, enforce security contexts)
- Resource management (quotas, limits, quality of service)
- Compliance requirements (required labels, annotations, naming conventions)
- Operational standards (image pull policies, network policies)

---

## Chapter Summary

Kubernetes API security implements a comprehensive three-layer defense system that ensures robust protection for cluster resources and operations.

**Security Layer Functions:**
1. **Authentication**: Verifies request identity using pluggable modules (certificates, tokens, external IAM)
2. **Authorization**: Determines permitted actions through RBAC's least-privilege model
3. **Admission Control**: Enforces organizational policies through mutating and validating controllers

**Key Security Principles:**
- All communication secured with TLS encryption
- Deny-by-default access model requires explicit permission grants
- Pluggable architecture supports integration with enterprise security systems
- Layered defense provides multiple protection mechanisms

**RBAC Implementation:**
- Roles and RoleBindings for namespace-scoped permissions
- ClusterRoles and ClusterRoleBindings for cluster-wide permissions
- Precise permission definition through verbs, apiGroups, and resources
- Support for complex authorization patterns and role reuse

**Policy Enforcement:**
- Mutating controllers can modify requests to ensure compliance
- Validating controllers reject non-compliant requests
- All admission controllers must approve requests for execution
- Comprehensive policy coverage for security, compliance, and operations

This security architecture provides the foundation for enterprise-grade Kubernetes deployments, ensuring that API access is properly authenticated, authorized, and compliant with organizational policies.

---

**Previous:** [Chapter 13: StatefulSets](13-statefulsets.md) | **Next:** [Chapter 15: The Kubernetes API](15-kubernetes-api.md)
