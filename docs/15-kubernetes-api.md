# Chapter 15: The Kubernetes API

**Previous:** [Chapter 14: API Security and RBAC](14-api-security-rbac.md) | **Next:** [Chapter 16: Threat Modeling](16-threat-modeling.md)

---

## 📋 Table of Contents

1. [API Architecture Overview](#1-api-architecture-overview)
   - 1.1. [API-Centric Design](#11-api-centric-design)
   - 1.2. [Request Processing Flow](#12-request-processing-flow)
   - 1.3. [Serialization and Data Exchange](#13-serialization-and-data-exchange)
2. [API Server Fundamentals](#2-api-server-fundamentals)
   - 2.1. [Server Architecture](#21-server-architecture)
   - 2.2. [RESTful Interface](#22-restful-interface)
   - 2.3. [CRUD Operations](#23-crud-operations)
   - 2.4. [Practical API Interaction](#24-practical-api-interaction)
3. [API Structure and Organization](#3-api-structure-and-organization)
   - 3.1. [API Group Architecture](#31-api-group-architecture)
   - 3.2. [Core API Group](#32-core-api-group)
   - 3.3. [Named API Groups](#33-named-api-groups)
   - 3.4. [API Discovery and Exploration](#34-api-discovery-and-exploration)
4. [API Versioning and Lifecycle](#4-api-versioning-and-lifecycle)
   - 4.1. [Version Progression](#41-version-progression)
   - 4.2. [Resource Deprecation](#42-resource-deprecation)
   - 4.3. [Migration Strategies](#43-migration-strategies)
5. [API Extensibility](#5-api-extensibility)
   - 5.1. [Custom Resource Definitions](#51-custom-resource-definitions)
   - 5.2. [Hands-on: Creating Custom Resources](#52-hands-on-creating-custom-resources)
   - 5.3. [Extension Patterns](#53-extension-patterns)

---

**Chapter Prerequisites:**
- Understanding of REST API concepts helpful but not required
- Familiarity with JSON and YAML formats
- Access to a Kubernetes cluster for hands-on exercises

**Important Note:** Throughout this chapter, we use the terms "resource" and "object" interchangeably. Resources refer to API definitions, while objects typically refer to running instances on a cluster.

## 1. API Architecture Overview

Kubernetes operates as a fundamentally API-driven platform where every resource, configuration change, and query passes through the central API server. Understanding this architecture is crucial for effective Kubernetes operations.

### 1.1. API-Centric Design

Kubernetes implements a strictly API-centric architecture where all cluster resources are defined, accessed, and managed through the API. This design provides several key advantages:

**Core Principles:**
- **Single Source of Truth**: All resources exist as API definitions
- **Uniform Access**: Consistent interface for all operations
- **Extensibility**: Third-party resources integrate seamlessly
- **Tool Agnostic**: Any tool can interact with the cluster via the API

**API Clients:**
- kubectl command-line tool
- Kubernetes Dashboard
- Custom applications and scripts
- CI/CD pipeline tools
- Third-party management platforms

Think of this like an ordering system where everything must go through a central catalog (the API). Just as you can only order items that exist in a catalog, you can only deploy resources that are defined in the Kubernetes API.

`★ Insight ─────────────────────────────────────`
The API-centric design eliminates the traditional problem of configuration drift between different management tools. Since everything must go through the same API, all tools have identical access to cluster resources, ensuring consistent behavior and preventing conflicts.
`─────────────────────────────────────────────────`

### 1.2. Request Processing Flow

Every API request follows a standardized processing pipeline designed to ensure security, validation, and consistency:

```
Client Request → API Server → Authentication → Authorization → Admission Control → Processing → Response
```

**Request Flow Steps:**
1. **Request Initiation**: Client sends HTTPS request to API server
2. **Authentication**: Verify client identity
3. **Authorization**: Check permissions for requested operation
4. **Admission Control**: Apply policies and validation rules
5. **Processing**: Execute the request operation
6. **Persistence**: Store object state in etcd cluster store
7. **Response**: Return confirmation and object details

**Object Lifecycle:**
- **Creation**: Object persisted in serialized form to cluster store
- **Scheduling**: Controllers process object and schedule to appropriate nodes
- **Monitoring**: Continuous state reconciliation and health checks
- **Updates**: Changes tracked through API with versioning
- **Deletion**: Graceful termination with finalizer processing

### 1.3. Serialization and Data Exchange

Kubernetes uses structured serialization formats to ensure consistent data exchange between clients and the API server.

**Serialization Process:**
Serialization converts objects into transmittable formats, while deserialization reverses the process. This enables:
- Network transmission of complex objects
- Persistent storage in the cluster store
- Consistent data representation across tools

**Supported Formats:**

| Format | Usage | Advantages | Disadvantages |
|--------|-------|------------|---------------|
| JSON | External client communication | Human-readable, widely supported | Larger payload size |
| Protobuf | Internal cluster communication | Efficient, fast, compact | Binary format, harder to debug |

**Content Negotiation:**
Clients specify supported formats via HTTP headers:
```
Content-Type: application/json
Accept: application/json
```

The API server honors client preferences, typically defaulting to JSON for external communication while using Protobuf internally for performance.

---

## 2. API Server Fundamentals

The API server serves as the central nervous system for Kubernetes clusters, providing the primary interface through which all cluster interactions occur.

### 2.1. Server Architecture

The API server implements a highly available, RESTful web service that provides comprehensive cluster management capabilities.

**Service Characteristics:**
- **Protocol**: HTTPS only (TLS encrypted)
- **Default Ports**: 443 (standard) or 6443 (common alternative)
- **Authentication**: Multiple methods supported (certificates, tokens, external providers)
- **Authorization**: RBAC-based access control
- **High Availability**: Multiple instances for production deployments

**Cluster Information Discovery:**
```bash
$ kubectl cluster-info
Kubernetes control plane is running at https://kubernetes.docker.internal:6443
```

Think of the API server as Grand Central Station for Kubernetes - every communication flows through this central hub, ensuring coordinated and secure access to all cluster resources.

**Communication Patterns:**
- **kubectl commands**: All CLI operations route through API server
- **kubelet agents**: Report node status and receive work assignments
- **Control plane services**: Share state and coordination information
- **External applications**: Access cluster resources via standard REST APIs

### 2.2. RESTful Interface

The Kubernetes API implements REST (Representational State Transfer) principles, providing a modern, standards-based interface for resource management.

**REST Fundamentals:**
- **Resources**: Addressable entities (Pods, Services, Deployments)
- **Verbs**: Actions performed on resources (GET, POST, PUT, DELETE)
- **Representations**: Data formats (JSON, YAML)
- **Stateless**: Each request contains all necessary information

**HTTP Method Mapping:**

| Kubernetes Verb | HTTP Method | kubectl Example | Purpose |
|----------------|-------------|-----------------|---------|
| create | POST | `kubectl create -f pod.yaml` | Create new resource |
| get, list, watch | GET | `kubectl get pods` | Retrieve resource(s) |
| update | PUT/PATCH | `kubectl edit deployment app` | Modify existing resource |
| delete | DELETE | `kubectl delete service web` | Remove resource |

**Path Structure:**
REST paths follow the Group/Version/Resource (GVR) pattern:
```
/api/{version}/{resource-type}
/apis/{group}/{version}/{resource-type}
```

Example request translation:
```bash
$ kubectl get pods --namespace shield
# Translates to:
GET /api/v1/namespaces/shield/pods
```

`★ Insight ─────────────────────────────────────`
Kubernetes verb names don't always match HTTP methods exactly. For example, `kubectl edit` uses the "update" verb but sends an HTTP PATCH request. This abstraction allows Kubernetes to optimize the underlying protocol while maintaining consistent user experience.
`─────────────────────────────────────────────────`

### 2.3. CRUD Operations

CRUD (Create, Read, Update, Delete) operations form the foundation of API interaction, providing the basic functions needed to manage resources throughout their lifecycle.

**CRUD Operation Details:**

**Create Operations:**
- Purpose: Instantiate new resources from definitions
- HTTP Method: POST
- kubectl Example: `kubectl create -f deployment.yaml`
- Result: New object persisted to cluster store

**Read Operations:**
- Purpose: Retrieve resource information and status
- HTTP Method: GET
- kubectl Examples: `kubectl get pods`, `kubectl describe service web`
- Variants: Single resource, lists, detailed descriptions

**Update Operations:**
- Purpose: Modify existing resource configurations
- HTTP Methods: PUT (full replacement), PATCH (partial update)
- kubectl Example: `kubectl edit deployment app`
- Result: Updated object state stored and applied

**Delete Operations:**
- Purpose: Remove resources from cluster
- HTTP Method: DELETE
- kubectl Example: `kubectl delete pod test-pod`
- Result: Graceful termination with cleanup

**Terminology Note:**
The term "verb" is used interchangeably to refer to CRUD operations and HTTP methods - essentially any action performed on a resource.

### 2.4. Practical API Interaction

Direct API interaction provides deeper understanding of how Kubernetes processes requests and can be valuable for debugging, automation, and custom tooling.
**Hands-on Exercise: Direct API Interaction**

This exercise demonstrates how kubectl translates commands into REST API calls and how you can interact with the API directly using standard HTTP tools.

**Prerequisites:**
- Access to a Kubernetes cluster
- The book's GitHub repository (TKB)
- curl command-line tool

**Setup: Clone Repository**
```bash
$ git clone https://github.com/nigelpoulton/TKB.git
$ cd TKB
$ git fetch origin
$ git checkout -b 2025 origin/2025
```

**Step 1: Start kubectl Proxy**
The kubectl proxy creates a secure tunnel to the API server and handles authentication:

```bash
$ kubectl proxy --port 9000 &
[1] 27533
Starting to serve on 127.0.0.1:9000
```

**Step 2: Basic GET Request**
List all Pods in the shield namespace:

```bash
$ curl -X GET http://localhost:9000/api/v1/namespaces/shield/pods
{
  "kind": "PodList",
  "apiVersion": "v1",
  "metadata": {
     "resourceVersion": "9524"
  },
  "items": []
}
```

The empty `items` array indicates no Pods exist in the shield namespace.

**Step 3: List All Namespaces**
```bash
$ curl -X GET http://localhost:9000/api/v1/namespaces
{
  "kind": "NamespaceList",
  "apiVersion": "v1",
  "metadata": {
     "resourceVersion": "9541"
  },
  "items": [
     {
       "metadata": {
         "name": "kube-system",
         "uid": "f5d39dd2-ccfe-4523-b634-f48ba3135663",
         "resourceVersion": "10",
         "creationTimestamp": "2025-01-15T10:30:00Z",
         "labels": {
           "kubernetes.io/metadata.name": "kube-system"
         }
       }
     }
  ]
}
```

**Step 4: Examine HTTP Headers**
Use the `-v` flag to see detailed request/response headers:

```bash
$ curl -v -X GET http://localhost:9000/api/v1/namespaces/shield/pods

> GET /api/v1/namespaces/shield/pods HTTP/1.1    # HTTP GET to REST path
> Host: localhost:9000
> Accept: */*                                    # Accept any serialization format
>
< HTTP/1.1 200 OK                                # Successful response
< Content-Type: application/json                 # Response in JSON format
< X-Kubernetes-Pf-Flowschema-Uid: d50...         # Priority and fairness controls
< X-Kubernetes-Pf-Prioritylevel-Uid: 828...
<
{                                                # JSON response body
  "kind": "PodList",
  "apiVersion": "v1",
  "metadata": {
     "resourceVersion": "34217"
  },
  "items": []
}
```

**Header Analysis:**
- Lines starting with `>` are headers sent by curl
- Lines starting with `<` are headers returned by the API server
- `Accept: */*` tells the server curl accepts any serialization format
- `Content-Type: application/json` confirms the server responds with JSON
- `X-Kubernetes-*` headers contain Kubernetes-specific metadata

**Step 5: CREATE Operation - Creating a Namespace**

Navigate to the api directory and examine the namespace definition:

```bash
$ cd TKB/api
$ cat ns.json
{
  "kind": "Namespace",
  "apiVersion": "v1",
  "metadata": {
     "name": "shield",
     "labels": {
       "chapter": "api"
     }
  }
}
```

Create the namespace using HTTP POST:

```bash
$ curl -X POST -H "Content-Type: application/json" \
  --data-binary @ns.json http://localhost:9000/api/v1/namespaces

{
  "kind": "Namespace",
  "apiVersion": "v1",
  "metadata": {
     "name": "shield",
     "uid": "12345678-1234-5678-9abc-123456789012",
     "resourceVersion": "98765",
     "creationTimestamp": "2025-01-15T10:35:00Z",
     "labels": {
       "chapter": "api"
     }
  },
  "spec": {
     "finalizers": [
       "kubernetes"
     ]
  },
  "status": {
     "phase": "Active"
  }
}
```

**Command Breakdown:**
- `-X POST`: Specifies HTTP POST method for creation
- `-H "Content-Type: application/json"`: Indicates JSON payload
- `--data-binary @ns.json`: Sends file contents as request body
- URL path `/api/v1/namespaces`: Core API endpoint for namespace resources

Verify the namespace creation:

```bash
$ kubectl get ns
NAME              STATUS   AGE
kube-system       Active   47h
kube-public       Active   47h
kube-node-lease   Active   47h
default           Active   47h
shield            Active   14s
```

**Step 6: DELETE Operation - Removing the Namespace**

```bash
$ curl -X DELETE \
  -H "Content-Type: application/json" http://localhost:9000/api/v1/namespaces/shield

{
  "kind": "Namespace",
  "apiVersion": "v1",
  "metadata": {
     "name": "shield",
     "deletionTimestamp": "2025-01-15T10:40:00Z"
  },
  "spec": {
     "finalizers": [
       "kubernetes"
     ]
  },
  "status": {
     "phase": "Terminating"
  }
}
```

The response shows the namespace entering "Terminating" phase, indicating graceful deletion is in progress.

`★ Insight ─────────────────────────────────────`
This hands-on exercise demonstrates that kubectl is essentially a sophisticated HTTP client that translates user-friendly commands into REST API calls. Understanding these underlying mechanics helps with debugging, automation, and building custom tools that interact with Kubernetes.
`─────────────────────────────────────────────────`

---

## 3. API Structure and Organization

The Kubernetes API provides a comprehensive catalog of resources organized into logical groups for scalability, maintainability, and extensibility. Understanding this organization is essential for effective resource management.

### 3.1. API Group Architecture

Modern Kubernetes implements a modular API architecture that evolved from early monolithic designs to support the platform's growth and extensibility requirements.

**Historical Evolution:**
- **Early Kubernetes**: Single monolithic API namespace
- **Current Design**: Organized into logical groups for better management
- **Future Scalability**: Support for unlimited third-party extensions

**API Group Types:**

```
Kubernetes API
├── Core Group (/api/v1)
│   ├── Pods
│   ├── Services
│   ├── Namespaces
│   └── Nodes
├── Named Groups (/apis/{group}/{version})
│   ├── apps/v1 (Deployments, StatefulSets)
│   ├── networking.k8s.io/v1 (Ingress, NetworkPolicy)
│   ├── storage.k8s.io/v1 (StorageClass, VolumeAttachment)
│   └── rbac.authorization.k8s.io/v1 (Role, ClusterRole)
└── Custom Groups
     └── {domain}/v1 (Third-party resources)
```

This modular structure provides several advantages:
- **Logical Organization**: Related resources grouped together
- **Independent Versioning**: Groups can evolve at different rates
- **Namespace Isolation**: Prevents naming conflicts
- **Extensibility**: Easy addition of new resource types

Think of this like a well-organized department store where products are arranged by category (clothing, electronics, home goods). Each department can operate independently while contributing to the overall shopping experience.
### 3.2. Core API Group

The core API group contains the foundational resources that existed before Kubernetes adopted the modular group architecture. These resources form the basic building blocks of Kubernetes functionality.

**Core Group Characteristics:**
- **Path Pattern**: `/api/v1/{resource-type}`
- **Legacy Status**: Original Kubernetes resources (pre-groups era)
- **Stability**: Highly stable, production-ready resources
- **Extension Policy**: No new resources added to core group

**Core Resource Examples:**

| Resource | REST Path | Scope | Purpose |
|----------|-----------|-------|---------|
| Pods | `/api/v1/namespaces/{namespace}/pods/` | Namespaced | Container runtime units |
| Services | `/api/v1/namespaces/{namespace}/services/` | Namespaced | Network abstractions |
| Nodes | `/api/v1/nodes/` | Cluster | Physical/virtual machines |
| Namespaces | `/api/v1/namespaces/` | Cluster | Virtual cluster divisions |
| Secrets | `/api/v1/namespaces/{namespace}/secrets/` | Namespaced | Sensitive data storage |
| ConfigMaps | `/api/v1/namespaces/{namespace}/configmaps/` | Namespaced | Configuration data |

**Resource Scoping:**

**Namespaced Resources** (longer paths):
```
GET /api/v1/namespaces/shield/pods/
GET /api/v1/namespaces/production/services/
```
These resources exist within specific namespaces and require namespace specification in the URL path.

**Cluster-scoped Resources** (shorter paths):
```
GET /api/v1/nodes/
GET /api/v1/namespaces/
```
These resources exist at the cluster level and don't require namespace specification.

**HTTP Response Patterns:**
- **200 OK**: Successful resource retrieval
- **401 Unauthorized**: Authentication required or failed
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource doesn't exist

**GVR Path Structure:**
Group/Version/Resource (GVR) provides a mnemonic for understanding REST paths:
```
/apis/{group}/{version}/{resource}
/apis/storage.k8s.io/v1/storageclasses
        ^group     ^version ^resource
```

Note: The core group uses `/api/v1` instead of `/apis/core/v1` for historical reasons.

### 3.3. Named API Groups

Named API groups represent the modern approach to API organization in Kubernetes, providing logical categorization for all new resources and functionality.

**Named Group Characteristics:**
- **Path Pattern**: `/apis/{group-name}/{version}/{resource-type}`
- **Logical Organization**: Resources grouped by functional domain
- **Independent Evolution**: Each group can version independently
- **Extensibility**: Foundation for third-party resource integration

**Major Named Groups:**

| Group | Purpose | Example Resources |
|-------|---------|-------------------|
| **apps/v1** | Application workloads | Deployment, StatefulSet, DaemonSet |
| **networking.k8s.io/v1** | Network resources | Ingress, NetworkPolicy, IngressClass |
| **storage.k8s.io/v1** | Storage management | StorageClass, VolumeAttachment, CSIDriver |
| **rbac.authorization.k8s.io/v1** | Access control | Role, ClusterRole, RoleBinding |
| **batch/v1** | Job execution | Job, CronJob |
| **autoscaling/v2** | Scaling automation | HorizontalPodAutoscaler |

**Path Structure Examples:**

```
# Networking resources
/apis/networking.k8s.io/v1/namespaces/{namespace}/ingresses/
/apis/networking.k8s.io/v1/namespaces/{namespace}/networkpolicies/

# RBAC resources
/apis/rbac.authorization.k8s.io/v1/clusterroles/
/apis/rbac.authorization.k8s.io/v1/namespaces/{namespace}/roles/

# Storage resources
/apis/storage.k8s.io/v1/storageclasses/
/apis/storage.k8s.io/v1/volumeattachments/
```

**Key Differences from Core Group:**

| Aspect | Core Group | Named Groups |
|--------|------------|--------------|
| Path prefix | `/api` (singular) | `/apis` (plural) |
| Group identifier | Implicit (none) | Explicit group name |
| New resources | No additions | All new resources |
| Organization | Historical accident | Logical categorization |

**Historical Context:**
If designed today, some core resources would likely be organized differently:
- **Services** → `networking.k8s.io` group
- **Pods** → `apps` group
- **Secrets/ConfigMaps** → `config` or `data` group

This reorganization demonstrates how the named group architecture provides better logical organization than the original monolithic approach.

`★ Insight ─────────────────────────────────────`
The named group architecture enables parallel development and evolution of different Kubernetes functional areas. Teams can work independently on networking, storage, or security features without conflicts, while maintaining a cohesive API experience.
`─────────────────────────────────────────────────`

### 3.4. API Discovery and Exploration

Kubernetes provides comprehensive tools for discovering and exploring the available API resources, versions, and capabilities in your cluster.

**Core Discovery Commands:**

**1. List All API Resources:**
```bash
$ kubectl api-resources
NAME                       SHORT    APIVERSION            NAMESPACED   KIND
namespaces                 ns       v1                    false        Namespace
nodes                      no       v1                    false        Node
pods                       po       v1                    true         Pod
deployments                deploy   apps/v1               true         Deployment
replicasets                rs       apps/v1               true         ReplicaSet
statefulsets               sts      apps/v1               true         StatefulSet
cronjobs                   cj       batch/v1              true         CronJob
jobs                                batch/v1              true         Job
horizontalpodautoscalers   hpa      autoscaling/v2        true         HorizontalPodAutoscaler
ingresses                  ing      networking.k8s.io/v1  true         Ingress
networkpolicies            netpol   networking.k8s.io/v1  true         NetworkPolicy
storageclasses             sc       storage.k8s.io/v1     false        StorageClass
```

**Output Analysis:**
- **NAME**: Resource type name for kubectl commands
- **SHORT**: Abbreviated name for faster typing
- **APIVERSION**: Group and version serving the resource
- **NAMESPACED**: Whether resource exists within namespaces
- **KIND**: Type identifier used in YAML manifests

**2. List API Versions:**
```bash
$ kubectl api-versions
admissionregistration.k8s.io/v1
apiextensions.k8s.io/v1
apps/v1
autoscaling/v1
autoscaling/v2
batch/v1
networking.k8s.io/v1
rbac.authorization.k8s.io/v1
storage.k8s.io/v1
v1
```

This command shows:
- Available API groups and their versions
- Multiple versions can coexist (e.g., autoscaling/v1 and autoscaling/v2)
- Support for alpha/beta APIs (if enabled)

**3. Resource Documentation:**
```bash
$ kubectl explain deployment
GROUP:      apps
KIND:       Deployment
VERSION:    apps/v1

DESCRIPTION:
     Deployment enables declarative updates for Pods and ReplicaSets.

FIELDS:
     apiVersion   <string>
         APIVersion defines the versioned schema...
```

**Direct API Exploration:**
Using kubectl proxy for hands-on API exploration:

**List Core API Versions:**
```bash
$ curl http://localhost:9000/api
{
  "kind": "APIVersions",
  "versions": [
     "v1"
  ],
  "serverAddressByClientCIDRs": [
     {
       "clientCIDR": "0.0.0.0/0",
       "serverAddress": "172.21.0.4:6443"
     }
  ]
}
```

**List Named API Groups:**
```bash
$ curl http://localhost:9000/apis
{
  "kind": "APIGroupList",
  "apiVersion": "v1",
  "groups": [
     {
       "name": "apps",
       "versions": [
         {
           "groupVersion": "apps/v1",
           "version": "v1"
         }
       ],
       "preferredVersion": {
         "groupVersion": "apps/v1",
         "version": "v1"
       }
     }
  ]
}
```

**Enumerate Cluster Resources:**
```bash
$ curl http://localhost:9000/api/v1/namespaces
{
  "kind": "NamespaceList",
  "apiVersion": "v1",
  "metadata": {
     "resourceVersion": "35234"
  },
  "items": [
     {
       "metadata": {
         "name": "kube-system",
         "uid": "05fefa13-cbec-458b-aece-d65eb1972dfb",
         "resourceVersion": "4",
         "creationTimestamp": "2025-01-15T10:30:00Z",
         "labels": {
           "kubernetes.io/metadata.name": "kube-system"
         }
       }
     }
  ]
}
```

**Alternative Tools:**
- **Web Browser**: Use the same URLs for visual exploration
- **API Tools**: Postman, Insomnia, or curl for detailed inspection
- **OpenAPI Spec**: Available at `/openapi/v2` endpoint

---

## 4. API Versioning and Lifecycle

Kubernetes implements a sophisticated versioning system that ensures stability while enabling continuous evolution of the platform.

### 4.1. Version Progression

Kubernetes follows a rigorous maturation process for API resources, ensuring stability and reliability through progressive validation stages.

**Version Maturity Levels:**

| Version Track | Status | Characteristics | Default Availability |
|---------------|--------|-----------------|----------------------|
| **Alpha** | Experimental | Bugs expected, features may be dropped | Disabled by default |
| **Beta** | Pre-release | Near-final design, minor changes possible | Enabled by default |
| **GA (Stable)** | Production-ready | Strong compatibility guarantee | Always enabled |

**Alpha Stage Characteristics:**
- **Purpose**: Early feature experimentation and feedback collection
- **Stability**: Expect bugs, breaking changes, and feature removal
- **Naming**: Version includes "alpha" (e.g., `v1alpha1`, `v1alpha2`)
- **Production Use**: Strongly discouraged
- **Cluster Default**: Disabled to prevent accidental usage

**Example Alpha Progression:**
```
/apis/apps/v1alpha1/tkb
/apis/apps/v1alpha2/tkb
```

**Beta Stage Characteristics:**
- **Purpose**: Pre-release validation with broader user testing
- **Stability**: Feature-complete, schema mostly stable
- **Naming**: Version includes "beta" (e.g., `v1beta1`, `v1beta2`)
- **Production Use**: Possible but with caution
- **Cluster Default**: Enabled for testing and gradual adoption

**Example Beta Progression:**
```
/apis/apps/v1beta1/tkb
/apis/apps/v1beta2/tkb
```

**GA/Stable Stage Characteristics:**
- **Purpose**: Production-ready resources with long-term support
- **Stability**: Strong backward compatibility commitment
- **Naming**: Simple version number (e.g., `v1`, `v2`)
- **Production Use**: Fully recommended
- **Cluster Default**: Always available

**Example GA Progression:**
```
/apis/apps/v1/tkb
/apis/apps/v2/tkb  # Future evolution
```

**Real-World Version Examples:**

| Resource | Current Stable API Path |
|----------|-------------------------|
| Ingress | `/apis/networking.k8s.io/v1/ingresses` |
| CronJob | `/apis/batch/v1/cronjobs` |
| HorizontalPodAutoscaler | `/apis/autoscaling/v2/horizontalpodautoscalers` |

**Cross-Version Compatibility:**
Kubernetes supports accessing resources across API versions. You can create a resource using a beta API and later manage it through the stable API:

```bash
# Deploy using beta API
kubectl apply -f deployment-beta.yaml  # Uses apps/v1beta2

# Later manage using stable API
kubectl edit deployment myapp  # Uses apps/v1
```

`★ Insight ─────────────────────────────────────`
The progressive maturation process protects users from unstable APIs while enabling continuous innovation. This approach allows developers to experiment with new features in alpha while maintaining production stability through the GA APIs.
`─────────────────────────────────────────────────`

### 4.2. Resource Deprecation

Kubernetes maintains strict deprecation policies to balance innovation with stability, ensuring users have adequate time to migrate while preventing resource stagnation.

**Deprecation Policies:**

**Beta Resources:**
- **Time Limit**: 9-month window for progression
- **Requirements**: Must release newer beta version OR graduate to GA
- **Purpose**: Prevent indefinite beta status (e.g., Ingress was beta for 15+ releases)

**GA/Stable Resources:**
- **Support Window**: Minimum 12 months OR 3 releases (whichever is longer)
- **Prerequisite**: Newer stable version must be available before deprecation
- **Example**: Only deprecate v1 after v2 reaches GA status

**Deprecation Indicators:**

1. **CLI Warning Messages**:
    ```bash
    $ kubectl apply -f old-deployment.yaml
    Warning: apps/v1beta1 Deployment is deprecated in v1.16+
    ```

2. **Audit Annotations**: `k8s.io/deprecated:true` added to request records

3. **Metrics**: `apiserver_requested_deprecated_apis` gauge for monitoring

These indicators help with upgrade planning and migration assessment.

### 4.3. Migration Strategies

**Migration Best Practices:**
1. **Assessment**: Identify deprecated API usage via metrics and audit logs
2. **Testing**: Validate new API versions in development environments
3. **Gradual Rollout**: Migrate non-critical workloads first
4. **Monitoring**: Track migration progress and issues

---

## 5. API Extensibility

Kubernetes provides powerful mechanisms for extending the API with custom resources and controllers, enabling third-party integrations and domain-specific functionality.

### 5.1. Custom Resource Definitions

Custom Resource Definitions (CRDs) enable the creation of new API resources that integrate seamlessly with the existing Kubernetes ecosystem.

**Extension Use Cases:**
- **Storage Vendors**: Advanced snapshot scheduling, backup policies
- **Network Providers**: Custom routing rules, traffic management
- **Application Platforms**: Domain-specific resource types
- **Operational Tools**: Custom monitoring, deployment strategies

**Extension Benefits:**
- **Unified Interface**: Manage everything through kubectl and YAML
- **Native Integration**: Custom resources behave like built-in resources
- **Standard Tooling**: All existing Kubernetes tools work with custom resources
- **RBAC Integration**: Security policies apply to custom resources

**Extension Pattern:**
1. **Define Custom Resource**: Create CRD specifying schema and behavior
2. **Implement Controller**: Write logic to manage custom resource lifecycle
3. **Deploy Integration**: Install CRD and controller in cluster
4. **Use Standard Tools**: Interact via kubectl, YAML manifests, and APIs

Think of CRDs like creating new product categories in an ordering system. Once defined, these new categories integrate seamlessly with existing ordering processes, inventory management, and customer interfaces.

### 5.2. Hands-on: Creating Custom Resources

This comprehensive exercise demonstrates the complete lifecycle of custom resource creation, from definition to deployment and management.

**CRD Definition Example:**

The following CRD defines a new "Book" resource for managing a catalog of technical books:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: books.nigelpoulton.com
spec:
  group: nigelpoulton.com          # Custom API group
  scope: Cluster                   # Cluster-wide or Namespaced
  names:
     plural: books                  # Plural name for API paths
     singular: book                 # Singular name for CLI
     kind: Book                     # YAML kind field
     shortNames:
     - bk                          # Abbreviated form
  versions:
     - name: v1
       served: true                 # Enable this version
       storage: true                # Use as storage version
       schema:
         openAPIV3Schema:
           type: object
           properties:
             spec:
               type: object
               properties:
                 bookTitle:
                   type: string
                 subTitle:
                   type: string
                 topic:
                   type: string
                 edition:
                   type: integer
                 salesUrl:
                   type: string
```

**Step-by-Step Implementation:**

**1. Deploy the Custom Resource Definition:**
```bash
$ cd TKB/api
$ kubectl apply -f crd.yml
customresourcedefinition.apiextensions.k8s.io/books.nigelpoulton.com created
```

**2. Verify API Integration:**
```bash
$ kubectl api-resources | grep books
NAME      SHORTNAMES     APIGROUP                NAMESPACED     KIND
books     bk             nigelpoulton.com/v1     false          Book

$ kubectl explain book
GROUP:      nigelpoulton.com
KIND:       Book
VERSION:    v1
```

The new resource is now accessible at: `apis/nigelpoulton.com/v1/books/`

**3. Create a Custom Resource Instance:**
```yaml
apiVersion: nigelpoulton.com/v1
kind: Book
metadata:
  name: ai
spec:
  bookTitle: "AI Explained"
  subTitle: "Facts, Fiction, and Future"
  topic: "Artificial Intelligence"
  edition: 1
  salesUrl: https://www.amazon.com/dp/1916585388
```

**4. Deploy and Manage the Resource:**
```bash
$ kubectl apply -f book.yml
book.nigelpoulton.com/ai created

$ kubectl get bk
NAME    TITLE           SUBTITLE                      EDITION    URL
ai      AI Explained    Facts, Fiction, and Future    1          www.amazon.com/dp/1916585388
```

**5. API Exploration:**
```bash
$ curl http://localhost:9000/apis/nigelpoulton.com/v1/
{
  "kind": "APIResourceList",
  "groupVersion": "nigelpoulton.com/v1",
  "resources": [
     {
       "name": "books",
       "kind": "Book",
       "verbs": ["create", "delete", "get", "list", "patch", "update", "watch"],
       "shortNames": ["bk"]
     }
  ]
}
```

**Exercise Cleanup:**
```bash
# Clean up kubectl proxy process
$ ps | grep kubectl
$ kill -9 <PID>

# Remove custom resources and CRD
$ kubectl delete book ai
$ kubectl delete crd books.nigelpoulton.com
```

### 5.3. Extension Patterns

**Controller Development:**
While CRDs provide the API schema, controllers implement the operational logic. Custom controllers:
- Watch for resource changes via the Kubernetes API
- Implement reconciliation logic for desired state
- Manage related Kubernetes resources automatically
- Provide advanced functionality beyond simple CRUD operations

**Production Considerations:**
- **Schema Validation**: Comprehensive OpenAPI schemas prevent invalid resources
- **Version Management**: Plan for schema evolution and migration
- **RBAC Integration**: Define appropriate access controls for custom resources
- **Monitoring**: Implement metrics and alerting for custom controllers

`★ Insight ─────────────────────────────────────`
Custom Resource Definitions transform Kubernetes into a universal control plane for any domain-specific system. By following Kubernetes patterns, custom resources inherit all the benefits of the platform: declarative management, version control, RBAC, and tooling compatibility.
`─────────────────────────────────────────────────`

---

## Chapter Summary

This comprehensive exploration of the Kubernetes API provides essential knowledge for effective cluster management and platform extension.

**Core Concepts Mastered:**

**API Architecture:**
- API-centric design centralizing all cluster interactions
- Layered request processing with authentication, authorization, and admission control
- JSON/Protobuf serialization for efficient data exchange
- RESTful interface following industry standards

**API Organization:**
- Core API group (`/api/v1`) containing foundational resources
- Named API groups (`/apis/{group}/{version}`) organizing related functionality
- GVR (Group/Version/Resource) path structure for consistent addressing
- Comprehensive discovery tools for API exploration

**Version Management:**
- Progressive maturation: Alpha → Beta → GA/Stable
- Strict deprecation policies ensuring migration time
- Cross-version compatibility during transitions
- Clear indicators for deprecated API usage

**Extensibility Framework:**
- Custom Resource Definitions for domain-specific resources
- Controller pattern for operational logic implementation
- Seamless integration with existing Kubernetes tooling
- Production-ready extension patterns

**Practical Skills Gained:**
- Direct API interaction using curl and kubectl proxy
- CRUD operation mapping between kubectl and HTTP methods
- Custom resource creation and management
- API discovery and documentation techniques

The Kubernetes API serves as both the foundation for current operations and the platform for future innovation. Mastering these concepts enables effective cluster management while providing the knowledge needed to extend Kubernetes for specialized requirements.

**Next Steps:**
- Explore advanced API features like admission webhooks
- Develop custom controllers for complex automation
- Integrate with external systems via the Kubernetes API
- Contribute to the Kubernetes ecosystem through custom resources

---

**Previous:** [Chapter 14: API Security and RBAC](14-api-security-rbac.md) | **Next:** [Chapter 16: Threat Modeling](16-threat-modeling.md)
