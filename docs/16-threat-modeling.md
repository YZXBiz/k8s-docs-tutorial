# Chapter 16: Threat Modeling

**Previous:** [Chapter 15: The Kubernetes API](15-kubernetes-api.md) | **Next:** [Chapter 17: Real-world Security](17-real-world-security.md)

---

## 📋 Table of Contents

- [Threat Assessment Fundamentals](#1-threat-assessment-fundamentals)
  - [Security Assessment Methodology](#11-security-assessment-methodology)
  - [STRIDE Threat Framework](#12-stride-threat-framework)
  - [Kubernetes Threat Landscape](#13-kubernetes-threat-landscape)

- [Identity and Authentication Threats](#2-identity-and-authentication-threats)
  - [Spoofing Attack Vectors](#21-spoofing-attack-vectors)
  - [API Server Communication Security](#22-api-server-communication-security)
  - [Pod Identity Management](#23-pod-identity-management)

- [Data Integrity and Tampering](#3-data-integrity-and-tampering)
  - [Tampering Threat Analysis](#31-tampering-threat-analysis)
  - [Infrastructure Component Protection](#32-infrastructure-component-protection)
  - [Application Layer Integrity](#33-application-layer-integrity)

- [Audit and Non-Repudiation](#4-audit-and-non-repudiation)
  - [Accountability Requirements](#41-accountability-requirements)
  - [Comprehensive Audit Strategy](#42-comprehensive-audit-strategy)
  - [Evidence Collection and Correlation](#43-evidence-collection-and-correlation)

- [Information Disclosure Prevention](#5-information-disclosure-prevention)
  - [Data Protection Analysis](#51-data-protection-analysis)
  - [Cluster Data Security](#52-cluster-data-security)
  - [Application Data Protection](#53-application-data-protection)

- [Denial of Service Mitigation](#6-denial-of-service-mitigation)
  - [Availability Threat Assessment](#61-availability-threat-assessment)
  - [Cluster Resource Protection](#62-cluster-resource-protection)
  - [Application Resilience](#63-application-resilience)

- [Privilege Escalation Prevention](#7-privilege-escalation-prevention)
  - [Access Control Assessment](#71-access-control-assessment)
  - [API Server Authorization](#72-api-server-authorization)
  - [Container Security Controls](#73-container-security-controls)
  - [Pod Security Standardization](#74-pod-security-standardization)

---

## 1. Threat Assessment Fundamentals

Effective security begins with systematic threat assessment, identifying vulnerabilities and implementing appropriate countermeasures. This chapter applies proven security assessment methodologies to Kubernetes environments.

### 1.1. Security Assessment Methodology

Threat modeling provides a structured approach to security analysis, similar to how safety auditors systematically evaluate industrial facilities for potential hazards. By following established frameworks, teams can comprehensively assess risks and prioritize security investments.

**Threat Modeling Benefits:**
- **Systematic Evaluation**: Structured approach prevents overlooked vulnerabilities
- **Risk Prioritization**: Focus resources on highest-impact threats
- **Preventive Security**: Identify issues before they become exploits
- **Compliance Alignment**: Support regulatory and organizational requirements

**Assessment Process:**
1. **Asset Identification**: Catalog critical systems and data
2. **Threat Enumeration**: Identify potential attack vectors
3. **Vulnerability Assessment**: Analyze system weaknesses
4. **Impact Analysis**: Evaluate potential damage scenarios
5. **Mitigation Planning**: Design and implement countermeasures

### 1.2. STRIDE Threat Framework

STRIDE provides a comprehensive threat categorization framework, originally developed by Microsoft for systematic security assessment. Think of STRIDE like a security audit checklist that ensures comprehensive coverage of threat categories.

**STRIDE Threat Categories:**

| Category | Focus | Kubernetes Relevance |
|----------|-------|---------------------|
| **Spoofing** | Identity falsification | API authentication, Pod identity |
| **Tampering** | Unauthorized modification | Configuration integrity, image security |
| **Repudiation** | Action accountability | Audit logging, evidence collection |
| **Information Disclosure** | Data exposure | Secret management, network security |
| **Denial of Service** | Availability attacks | Resource exhaustion, API flooding |
| **Elevation of Privilege** | Unauthorized access | RBAC, container escapes |

**Framework Limitations:**
While STRIDE provides excellent coverage, no single framework captures all possible threats. Effective security assessment combines multiple methodologies and incorporates organization-specific considerations.

`★ Insight ─────────────────────────────────────`
STRIDE's systematic approach mirrors how professional auditors assess risk across different domains. Each category represents a distinct threat class requiring specific detection and mitigation strategies, ensuring comprehensive security coverage without gaps.
`─────────────────────────────────────────────────`

### 1.3. Kubernetes Threat Landscape

Kubernetes environments present unique security challenges due to their distributed architecture, multiple integration points, and dynamic resource management.

**Attack Surface Analysis:**
- **Control Plane**: API server, etcd, scheduler, controller manager
- **Worker Nodes**: kubelet, container runtime, network plugins
- **Networking**: Pod-to-Pod, external communication, service mesh
- **Storage**: Persistent volumes, configuration data, secrets
- **Applications**: Container images, runtime processes, inter-service communication

**Threat Actor Motivations:**
- **External Attackers**: Seeking unauthorized access or data theft
- **Malicious Insiders**: Exploiting legitimate access for unauthorized purposes
- **Compromised Applications**: Lateral movement from application vulnerabilities
- **Supply Chain Attacks**: Compromised images or dependencies

This comprehensive threat landscape requires layered security controls addressing each component and interaction point.

---

## 2. Identity and Authentication Threats

Identity spoofing represents one of the most fundamental security threats, where attackers attempt to assume false identities to gain unauthorized access or privileges.

### 2.1. Spoofing Attack Vectors

Spoofing involves identity falsification to gain unauthorized privileges or access. Like impersonation attacks in corporate environments, spoofing exploits trust relationships within system architectures.

**Common Spoofing Scenarios:**
- **Component Impersonation**: Malicious processes mimicking legitimate cluster components
- **User Identity Theft**: Unauthorized assumption of user or service account identities
- **Network Spoofing**: Falsified source addresses or service endpoints
- **Certificate Forgery**: Compromised or falsified authentication credentials

**Impact Assessment:**
Successful spoofing attacks can lead to:
- Unauthorized cluster access and control
- Data theft and manipulation
- Lateral movement within the environment
- Privilege escalation and persistence

### 2.2. API Server Communication Security

The API server serves as the central communication hub for all cluster operations, making it a prime target for spoofing attacks. Securing these communications requires comprehensive authentication and authorization controls.

**Certificate-Based Authentication:**
Kubernetes implements mutual TLS (mTLS) authentication for all component communication, similar to how high-security facilities use multiple forms of identification verification.

**Production Security Considerations:**

**Certificate Authority Management:**
- **Internal CA**: Auto-generated self-signed CA for cluster components
- **External CA**: Trusted third-party CA for external system authentication
- **CA Compromise**: Single point of failure requiring robust protection

**Best Practice Architecture:**
```
Internal Systems ← Cluster CA → API Server ← External CA → External Systems
```

**Certificate Scope Isolation:**
```yaml
# Restrict internal CA certificate usage
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: internal-component-csr
spec:
  request: <base64-encoded-csr>
  signerName: kubernetes.io/kubelet-serving
  usage: ["digital signature", "key encipherment", "server auth"]
```

**Critical Security Controls:**
1. **CA Protection**: Secure storage and access controls for certificate authorities
2. **Certificate Rotation**: Automated renewal prevents long-lived credential exposure
3. **Scope Limitation**: Internal certificates only trusted within cluster boundaries
4. **CSR Approval**: Manual review of certificate signing requests

`★ Insight ─────────────────────────────────────`
The dual-CA approach mirrors enterprise security models where internal and external authentication use separate trust chains. This isolation prevents compromise of one domain from affecting the other, implementing effective security compartmentalization.
`─────────────────────────────────────────────────`

### 2.3. Pod Identity Management

Every Pod requires an identity for API server communication and inter-service authentication. Proper identity management prevents unauthorized access while enabling legitimate functionality.

**Service Account Token Security:**

Default Pod identity configuration includes automatic service account token mounting, which may exceed security requirements for many applications.

**Disable Unnecessary API Access:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
spec:
  serviceAccountName: app-service-account
  automountServiceAccountToken: false  # Disable automatic token mounting
  containers:
  - name: app-container
     image: nginx
```

**Enhanced Token Configuration:**
For Pods requiring API access, implement time-limited, scoped tokens:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api-client-pod
spec:
  containers:
  - name: api-client
     image: api-client:latest
     volumeMounts:
     - mountPath: /var/run/secrets/tokens
       name: api-token
  serviceAccountName: api-service-account
  volumes:
  - name: api-token
     projected:
       sources:
       - serviceAccountToken:
           path: api-token
           expirationSeconds: 3600    # 1-hour expiration
           audience: vault             # Specific service audience
```

**Security Benefits:**
- **Reduced Attack Surface**: Eliminate unnecessary API access
- **Time-Limited Exposure**: Token expiration limits compromise impact
- **Audience Restriction**: Scope tokens to specific services
- **Principle of Least Privilege**: Grant minimal required access

---

## 3. Data Integrity and Tampering

Tampering attacks target data and system integrity, attempting to modify critical components to achieve denial of service or privilege escalation.

### 3.1. Tampering Threat Analysis

Tampering involves unauthorized modification of data or systems to cause damage or gain advantage. Like integrity seals on sensitive equipment, anti-tampering measures provide detection and prevention capabilities.

**Tampering Attack Objectives:**
- **Denial of Service**: Disable systems through malicious modification
- **Privilege Escalation**: Alter configurations to gain higher access
- **Backdoor Installation**: Insert persistent access mechanisms
- **Data Corruption**: Compromise information integrity

**Attack Vectors:**
- **In-Transit Modification**: Network-based attacks on data streams
- **At-Rest Modification**: Direct access to stored data or configurations
- **Supply Chain Attacks**: Compromised components or images
- **Configuration Drift**: Unauthorized changes to system settings

### 3.2. Infrastructure Component Protection

**Critical Component Vulnerability Assessment:**

| Component | Tampering Risk | Protection Strategy |
|-----------|---------------|-------------------|
| etcd | Configuration manipulation | Access control, encryption at rest |
| API Server | Configuration files | File integrity monitoring, secure storage |
| Container Runtime | Binary replacement | Checksums, restricted access |
| Container Images | Malicious modification | Image signing, registry security |
| Kubernetes Binaries | Backdoor injection | Digital signatures, secure distribution |

**Transit Protection:**
TLS encryption provides built-in integrity verification, detecting tampering attempts during network communication.

**At-Rest Protection Strategy:**
```bash
# Example: Linux audit daemon for binary monitoring
$ auditctl -w /usr/bin/docker -p wxa -k audit-docker
```

**Security Controls Implementation:**
1. **Access Restriction**: Limit server and repository access
2. **Remote Bootstrapping**: Use SSH for secure initialization
3. **Checksum Verification**: Validate downloads with SHA-2 checksums
4. **Registry Security**: Implement image registry access controls
5. **Monitoring**: Configure auditing and alerting for critical files

### 3.3. Application Layer Integrity

**Container Filesystem Protection:**
Implement read-only filesystems to guarantee immutability and prevent runtime tampering:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: immutable-app
spec:
  securityContext:
     readOnlyRootFilesystem: true     # Immutable root filesystem
     allowedHostPaths:
       - pathPrefix: "/data"          # Specific mount restrictions
         readOnly: true               # Read-only access
  containers:
  - name: app-container
     image: secure-app:latest
```

**Benefits of Immutable Infrastructure:**
- **Tampering Prevention**: Files cannot be modified at runtime
- **Consistency Guarantee**: Identical behavior across deployments
- **Attack Surface Reduction**: Limits potential modification vectors
- **Compliance Support**: Meets regulatory immutability requirements

---

## 4. Audit and Non-Repudiation

Non-repudiation ensures accountability by providing indisputable evidence of actions and events. Like comprehensive audit trails in financial systems, this evidence prevents denial of activity.

### 4.1. Accountability Requirements

**Evidence Collection Objectives:**
- **What**: Specific actions or events that occurred
- **When**: Precise timestamps for temporal correlation
- **Who**: Authenticated identity responsible for actions
- **Where**: Location or component where events occurred
- **Why**: Context and justification for actions
- **How**: Methods and mechanisms used

### 4.2. Comprehensive Audit Strategy

**API Server Audit Configuration:**
```json
{
  "kind": "Event",
  "apiVersion": "audit.k8s.io/v1",
  "metadata": { "creationTimestamp": "2025-01-15T10:30:00Z" },
  "level": "Metadata",
  "timestamp": "2025-01-15T10:30:00Z",
  "auditID": "a1b2c3d4-e5f6-7890-abcd-123456789012",
  "stage": "RequestReceived",
  "requestURI": "/api/v1/namespaces/production/persistentvolumeclaims",
  "verb": "list",
  "user": {
     "username": "admin@company.com",
     "groups": ["system:authenticated"]
  },
  "sourceIPs": ["192.168.1.100"],
  "objectRef": {
     "resource": "persistentvolumeclaims",
     "namespace": "production",
     "apiVersion": "v1"
  }
}
```

### 4.3. Evidence Collection and Correlation

**Multi-Component Auditing:**
- **Container Runtimes**: Process and system call logging
- **kubelet**: Node-level activity monitoring
- **Applications**: Application-specific audit trails
- **Infrastructure**: Network firewall and system logs

**Centralized Log Management:**
Deploy log collection agents via DaemonSet for comprehensive coverage:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: audit-collector
spec:
  selector:
     matchLabels:
       app: audit-collector
  template:
     spec:
       containers:
       - name: log-agent
         image: audit-agent:latest
         volumeMounts:
         - name: log-volume
           mountPath: /var/log
       volumes:
       - name: log-volume
         hostPath:
           path: /var/log
```

**Security Requirements:**
- **Secure Storage**: Tamper-evident centralized repository
- **Access Control**: Restricted access to audit data
- **Retention Policies**: Long-term storage for forensic analysis
- **Integrity Protection**: Cryptographic proof of log authenticity

---

## 5. Information Disclosure Prevention

Information disclosure threats target sensitive data exposure through various attack vectors. Like secure document handling in classified environments, data protection requires comprehensive controls.

### 5.1. Data Protection Analysis

**Sensitive Data Categories:**
- **Cluster Configuration**: Network topology, security policies
- **Authentication Credentials**: Certificates, tokens, passwords
- **Application Data**: Business information, user data
- **Operational Intelligence**: Performance metrics, deployment patterns

### 5.2. Cluster Data Security

**etcd Protection Strategy:**
The cluster store contains complete cluster configuration, making it a high-value target:

```yaml
# Encryption configuration for etcd
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
- resources:
  - secrets
  - configmaps
  providers:
  - kms:
       name: vault-provider
       endpoint: unix:///tmp/vault.socket
       cachesize: 1000
       timeout: 3s
  - identity: {}
```

**Key Management Service (KMS) Integration:**
- **External KEK Storage**: Keep encryption keys outside cluster
- **Hardware Security Modules**: Ultimate key protection
- **Zero-Downtime Rotation**: Seamless key rotation capabilities

### 5.3. Application Data Protection

**Secret Management Best Practices:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
type: Opaque
data:
  username: <base64-encoded-username>
  password: <base64-encoded-password>
```

**Configuration Data Security:**
Store non-sensitive configuration in ConfigMaps, encryption keys in Secrets with proper KMS integration.

---

## 6. Denial of Service Mitigation

DoS attacks target system availability through resource exhaustion or service disruption. Like disaster recovery planning, DoS protection requires redundancy and resource management.

### 6.1. Availability Threat Assessment

**Attack Vectors:**
- **Resource Exhaustion**: CPU, memory, storage consumption
- **Network Flooding**: API server request overload
- **Component Targeting**: Specific service disruption
- **Cascading Failures**: Single points of failure exploitation

### 6.2. Cluster Resource Protection

**High Availability Architecture:**
```yaml
# Resource quota example
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: production
spec:
  hard:
     requests.cpu: "100"
     requests.memory: 200Gi
     pods: "50"
     persistentvolumeclaims: "10"
```

**Control Plane Protection:**
- **Multi-Node Deployment**: Eliminate single points of failure
- **Availability Zone Distribution**: Geographic redundancy
- **Load Balancing**: Request distribution across replicas
- **Resource Limits**: Prevent resource exhaustion attacks

### 6.3. Application Resilience

**Pod Security Limits:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: resilient-app
spec:
  containers:
  - name: app
     image: app:latest
     resources:
       limits:
         cpu: "500m"
         memory: "512Mi"
         ephemeral-storage: "1Gi"
     securityContext:
       readOnlyRootFilesystem: true
```

**Process Limit Controls:**
```yaml
# Pod PID limit configuration
apiVersion: v1
kind: Pod
spec:
  securityContext:
     podPidsLimit: 100
```

---

## 7. Privilege Escalation Prevention

Privilege escalation attacks seek unauthorized access elevation through system vulnerabilities or misconfigurations.

### 7.1. Access Control Assessment

**Authorization Framework:**
- **RBAC**: Role-based access control for users and services
- **Webhook**: External policy engine integration
- **Node**: kubelet-specific authorization
- **Multi-Modal**: Combined authorization approaches

### 7.2. API Server Authorization

**RBAC Configuration Example:**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: pod-manager
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "create", "delete"]
```

### 7.3. Container Security Controls

**Non-Root Execution:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  securityContext:
     runAsUser: 1000                    # Non-root user
     runAsNonRoot: true                 # Enforce non-root
     fsGroup: 2000                      # File system group
  containers:
  - name: app
     securityContext:
       allowPrivilegeEscalation: false  # Prevent escalation
       readOnlyRootFilesystem: true     # Immutable filesystem
       capabilities:
         drop: ["ALL"]                  # Drop all capabilities
         add: ["NET_BIND_SERVICE"]      # Add specific required capabilities
```

**Advanced Security Features:**
- **seccomp Profiles**: System call filtering
- **AppArmor/SELinux**: Mandatory access controls
- **User Namespaces**: Process isolation

### 7.4. Pod Security Standardization

**Pod Security Standards (PSS):**
- **Privileged**: Unrestricted policy (development only)
- **Baseline**: Essential security controls
- **Restricted**: Comprehensive security best practices

**Pod Security Admission (PSA) Implementation:**
```bash
# Apply baseline enforcement to namespace
$ kubectl label --overwrite ns production \
     pod-security.kubernetes.io/enforce=baseline \
     pod-security.kubernetes.io/warn=restricted \
     pod-security.kubernetes.io/audit=restricted
```

**Hands-on Exercise: PSA Configuration**

Create and test Pod Security Admission policies:

```bash
# Create test namespace
$ kubectl create ns psa-demo

# Apply baseline policy
$ kubectl label ns psa-demo pod-security.kubernetes.io/enforce=baseline

# Test privileged container (should fail)
$ kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: privileged-test
  namespace: psa-demo
spec:
  containers:
  - name: test
     image: nginx
     securityContext:
       privileged: true
EOF

# Expected output: Error - violates baseline policy

# Deploy compliant Pod
$ kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: compliant-test
  namespace: psa-demo
spec:
  containers:
  - name: test
     image: nginx
     securityContext:
       privileged: false
       runAsNonRoot: true
       runAsUser: 1000
EOF
```

`★ Insight ─────────────────────────────────────`
Pod Security Admission provides automated policy enforcement similar to automated compliance checking in regulated industries. By standardizing security baselines, organizations can prevent configuration drift while maintaining development velocity.
`─────────────────────────────────────────────────`

---

## Chapter Summary

This comprehensive threat modeling analysis applies the STRIDE framework to systematically assess Kubernetes security risks and implement appropriate countermeasures.

**STRIDE Assessment Results:**

**Spoofing Mitigation:**
- Mutual TLS authentication for all component communication
- Service account token scoping and time-based expiration
- Dual certificate authority architecture for internal/external separation

**Tampering Prevention:**
- Read-only container filesystems for immutable infrastructure
- File integrity monitoring and audit trails
- Secure image distribution with cryptographic verification

**Repudiation Controls:**
- Comprehensive audit logging across all cluster components
- Centralized log collection and correlation
- Tamper-evident storage with cryptographic integrity

**Information Disclosure Protection:**
- External key management integration (KMS v2)
- Secret encryption with hardware security module support
- Network segmentation and access controls

**Denial of Service Mitigation:**
- High availability architecture with geographic distribution
- Resource quotas and limits to prevent exhaustion attacks
- Process limits and quality of service controls

**Privilege Escalation Prevention:**
- Non-root container execution with capability dropping
- Pod Security Standards enforcement through admission controllers
- Comprehensive RBAC with least privilege principles

**Security Assessment Methodology:**
The systematic STRIDE approach ensures comprehensive threat coverage while providing structured mitigation strategies. Regular reassessment and updates maintain security posture against evolving threats.

**Implementation Priority:**
1. **Immediate**: Pod Security Admission with baseline policies
2. **Short-term**: External key management integration
3. **Medium-term**: Comprehensive audit and monitoring
4. **Ongoing**: Regular security assessments and policy updates

This threat modeling foundation enables informed security decision-making and systematic risk mitigation in Kubernetes environments.

---

**Previous:** [Chapter 15: The Kubernetes API](15-kubernetes-api.md) | **Next:** [Chapter 17: Real-world Security](17-real-world-security.md)
