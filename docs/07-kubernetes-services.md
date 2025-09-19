# 7. Kubernetes Services

## 📋 Table of Contents

1. [Service Fundamentals](#1-service-fundamentals)
   - 1.1. [What are Services](#11-what-are-services)
   - 1.2. [Service Architecture](#12-service-architecture)
   - 1.3. [Labels and Selectors](#13-labels-and-selectors)
2. [Service Types](#2-service-types)
   - 2.1. [ClusterIP Services](#21-clusterip-services)
   - 2.2. [NodePort Services](#22-nodeport-services)
   - 2.3. [LoadBalancer Services](#23-loadbalancer-services)
   - 2.4. [ExternalName Services](#24-externalname-services)
3. [Service Configuration](#3-service-configuration)
   - 3.1. [Service Definition](#31-service-definition)
   - 3.2. [Endpoint Management](#32-endpoint-management)
   - 3.3. [Service Discovery](#33-service-discovery)
4. [Service Operations](#4-service-operations)
   - 4.1. [Creating Services](#41-creating-services)
   - 4.2. [Managing Services](#42-managing-services)
   - 4.3. [Testing Connectivity](#43-testing-connectivity)
   - 4.4. [Troubleshooting Services](#44-troubleshooting-services)
5. [Service Best Practices](#5-service-best-practices)
   - 5.1. [Design Patterns](#51-design-patterns)
   - 5.2. [Performance Considerations](#52-performance-considerations)
   - 5.3. [Security Guidelines](#53-security-guidelines)

---

## 1. Service Fundamentals

### 1.1. What are Services

Kubernetes Services provide stable network endpoints for accessing groups of Pods. They abstract away the dynamic nature of individual Pod IP addresses and enable reliable communication in a constantly changing container environment.

Think of Services like a telephone system for your office building. Even though employees (Pods) constantly change desks, move between floors, or call in sick, customers can always reach the sales department by calling the main sales number. The telephone operator (Service) knows which salespeople are available and routes calls appropriately.

**Core Service Functions:**
- **Stable endpoints**: Provide consistent IP addresses and DNS names
- **Load balancing**: Distribute traffic across multiple Pod replicas
- **Service discovery**: Enable applications to find each other by name
- **Health checking**: Route traffic only to healthy Pods

**Service vs Pod Communication:**
```bash
# Unreliable - Pod IPs change constantly
curl 10.244.1.15:8080  # This Pod might be gone tomorrow

# Reliable - Service provides stable endpoint
curl my-service:8080   # Always works, routes to healthy Pods
```

### 1.2. Service Architecture

Services work through a combination of stable virtual IPs, DNS names, and dynamic endpoint tracking:

**Service Components:**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Service      │    │   EndpointSlice │    │     Pods        │
│                 │    │                 │    │                 │
│ Virtual IP      │───▶│ Pod IPs         │───▶│ Actual Apps     │
│ DNS Name        │    │ Health Status   │    │ Running Code    │
│ Load Balancing  │    │ Real-time List  │    │ Dynamic IPs     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

This is like a business phone system where:
- **Service** = Main company number that customers call
- **EndpointSlice** = Current directory of available employees
- **Pods** = Individual employees at their current desk extensions

`★ Insight ─────────────────────────────────────`
**Services use virtual IPs (ClusterIPs) that don't belong to any physical interface** - they exist only in iptables/IPVS rules managed by kube-proxy on each node. When traffic hits a Service IP, it's redirected to actual Pod IPs automatically.
`─────────────────────────────────────────────────`

### 1.3. Labels and Selectors

Services find their target Pods using label selectors - a powerful mechanism for defining which Pods should receive traffic.

**Label-based Pod Selection:**
```yaml
# Pods with these labels
apiVersion: v1
kind: Pod
metadata:
  labels:
     app: web-server
     tier: frontend
     version: v2
spec:
  # ... pod specification

---
# Service that selects these Pods
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  selector:
     app: web-server      # Matches all Pods with app=web-server
     tier: frontend       # AND tier=frontend
  ports:
  - port: 80
     targetPort: 8080
```

This works like a smart phone directory where you can find employees by department ("app: web-server") and role ("tier: frontend"). The directory automatically updates when people join or leave these departments.

## 2. Service Types

### 2.1. ClusterIP Services

ClusterIP is the default Service type that provides internal cluster communication. It creates a virtual IP address that's only accessible from within the cluster.

This is like an internal office phone system - employees can call each other using extension numbers, but external customers can't dial these extensions directly.

**ClusterIP Service Example:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  type: ClusterIP        # Default type - internal only
  selector:
     app: backend
  ports:
  - port: 8080          # Port that Service listens on
     targetPort: 3000    # Port that Pods listen on
     protocol: TCP
```

**Key Characteristics:**
- Only accessible from within the cluster
- Gets an internal IP address (e.g., 10.96.45.123)
- Automatic DNS name (backend-service.default.svc.cluster.local)
- Default load balancing across healthy Pods

### 2.2. NodePort Services

NodePort Services expose applications on a high port (30000-32767) on every cluster node, making them accessible from outside the cluster.

This is like giving customers a direct dial number to reach a specific department - they can call any office location, and the call gets transferred to the right department.

**NodePort Service Example:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-frontend
spec:
  type: NodePort
  selector:
     app: frontend
  ports:
  - port: 80           # ClusterIP port (internal)
     targetPort: 8080   # Pod port
     nodePort: 30080    # External port on each node
```

**Access Patterns:**
```bash
# Internal cluster access (ClusterIP)
curl web-frontend:80

# External access via any node
curl <any-node-ip>:30080
curl 192.168.1.10:30080
curl 192.168.1.11:30080  # Works from any node
```

### 2.3. LoadBalancer Services

LoadBalancer Services integrate with cloud provider load balancers to provide a single, external IP address for accessing your application.

This is like having a professional call center with a single, well-known phone number that automatically handles high call volumes and routes them to available agents.

**LoadBalancer Service Example:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: public-web
spec:
  type: LoadBalancer
  selector:
     app: web-app
  ports:
  - port: 80
     targetPort: 8080
```

**Service Progression:**
```bash
# Check LoadBalancer provisioning
kubectl get services
NAME         TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)
public-web   LoadBalancer   10.96.45.123   <pending>     80:31234/TCP

# After cloud provider creates load balancer
kubectl get services
NAME         TYPE           CLUSTER-IP     EXTERNAL-IP      PORT(S)
public-web   LoadBalancer   10.96.45.123   203.0.113.42     80:31234/TCP
```

### 2.4. ExternalName Services

ExternalName Services create DNS aliases to external services, allowing cluster applications to use Kubernetes service discovery to connect to external resources.

**ExternalName Service Example:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-database
spec:
  type: ExternalName
  externalName: db.example.com  # External FQDN
```

This allows applications to connect to `external-database` instead of hardcoding `db.example.com`.

## 3. Service Configuration

### 3.1. Service Definition

A complete Service definition includes metadata, type specification, Pod selection criteria, and port mappings:

**Comprehensive Service YAML:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: production
  labels:
     app: web-app
     component: frontend
  annotations:
     service.beta.kubernetes.io/aws-load-balancer-type: nlb
spec:
  type: LoadBalancer
  selector:
     app: web-app
     tier: frontend
  ports:
  - name: http
     port: 80
     targetPort: 8080
     protocol: TCP
  - name: https
     port: 443
     targetPort: 8443
     protocol: TCP
  sessionAffinity: ClientIP
```

### 3.2. Endpoint Management

Services automatically manage endpoints through EndpointSlice objects that track healthy Pod IPs:

**View Service Endpoints:**
```bash
# Check service endpoints
kubectl get endpoints my-service
kubectl get endpointslices

# Detailed endpoint information
kubectl describe endpoints my-service
```

**Endpoint Updates:**
- Pods added to EndpointSlice when they become ready
- Pods removed when they fail health checks
- Real-time updates ensure traffic only goes to healthy Pods

### 3.3. Service Discovery

Applications discover services through DNS names automatically configured by Kubernetes:

**DNS Resolution Patterns:**
```bash
# Same namespace
curl web-service

# Different namespace
curl web-service.production

# Fully qualified domain name
curl web-service.production.svc.cluster.local
```

## 4. Service Operations

### 4.1. Creating Services

**Imperative Service Creation:**
```bash
# Expose a deployment as a service
kubectl expose deployment web-app --type=ClusterIP --port=80 --target-port=8080

# Create NodePort service
kubectl expose deployment web-app --type=NodePort --port=80 --target-port=8080

# Create LoadBalancer service
kubectl expose deployment web-app --type=LoadBalancer --port=80 --target-port=8080
```

**Declarative Service Creation:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  selector:
     app: web-app
  ports:
  - port: 80
     targetPort: 8080
  type: ClusterIP
```

### 4.2. Managing Services

**Service Management Commands:**
```bash
# List services
kubectl get services
kubectl get svc  # Shorthand

# Describe service details
kubectl describe service web-service

# Edit service configuration
kubectl edit service web-service

# Delete service
kubectl delete service web-service
```

### 4.3. Testing Connectivity

**Internal Connectivity Testing:**
```bash
# Create test pod
kubectl run test-pod --image=busybox --rm -it -- sh

# Test service connectivity
nslookup web-service
wget -qO- http://web-service:80
```

**External Connectivity Testing:**
```bash
# Test NodePort access
curl <node-ip>:<node-port>

# Test LoadBalancer access
curl <external-ip>
```

### 4.4. Troubleshooting Services

**Common Issues and Solutions:**

1. **Service Not Accessible:**
```bash
# Check service exists
kubectl get services

# Check endpoints
kubectl get endpoints service-name

# Check Pod labels match selector
kubectl get pods --show-labels
```

2. **No Endpoints:**
```bash
# Check Pod readiness
kubectl get pods
kubectl describe pod <pod-name>

# Check service selector
kubectl describe service <service-name>
```

3. **DNS Resolution Problems:**
```bash
# Test DNS from within cluster
kubectl run dns-test --image=busybox --rm -it -- nslookup kubernetes.default
```

## 5. Service Best Practices

### 5.1. Design Patterns

**Service Naming:**
- Use descriptive names that reflect the service purpose
- Follow consistent naming conventions across environments
- Include environment or version information when needed

**Port Configuration:**
- Use standard ports when possible (80 for HTTP, 443 for HTTPS)
- Name ports in multi-port services
- Document port purposes clearly

### 5.2. Performance Considerations

**Load Balancing:**
- Default round-robin distribution works for most cases
- Use session affinity only when required
- Consider external load balancers for high-traffic services

**Network Optimization:**
- Use ClusterIP for internal communication
- Minimize service hops in communication chains
- Consider service mesh for complex microservice architectures

### 5.3. Security Guidelines

**Network Security:**
- Use ClusterIP for internal services
- Implement NetworkPolicies to control traffic flow
- Regularly audit service exposure levels

**Access Control:**
- Limit LoadBalancer services to necessary public services
- Use ingress controllers instead of many LoadBalancer services
- Implement proper authentication and authorization

---

## Chapter Summary

Kubernetes Services provide the stable networking foundation that enables reliable communication in dynamic container environments. They abstract away the ephemeral nature of Pods and provide consistent endpoints that applications can depend on.

**Key Service Concepts:**
- **Stable Endpoints**: Services provide consistent IP addresses and DNS names
- **Load Balancing**: Automatic traffic distribution across healthy Pods
- **Service Discovery**: DNS-based application discovery within clusters
- **Multiple Types**: ClusterIP, NodePort, LoadBalancer, and ExternalName options
- **Dynamic Updates**: Automatic endpoint management as Pods change

**Service Types Summary:**
- **ClusterIP**: Internal cluster communication (default)
- **NodePort**: External access via node ports (30000-32767)
- **LoadBalancer**: Cloud provider load balancer integration
- **ExternalName**: DNS aliases for external services

The telephone system analogy illustrates how Services work: just as a business phone system provides stable numbers that reach the right departments regardless of employee changes, Kubernetes Services provide stable endpoints that reach the right Pods regardless of their dynamic nature.

**When to Use Services:**
- Any time applications need to communicate reliably
- When you need load balancing across Pod replicas
- For exposing applications outside the cluster
- When implementing service discovery patterns

Services are fundamental to cloud-native architecture - they enable the loose coupling and dynamic scaling that make modern applications resilient and maintainable.

---

**Navigation:**
- **Previous:** [6. Kubernetes Deployments](06-kubernetes-deployments.md)
- **Next:** [8. Ingress](08-ingress.md)
- **Up:** [Table of Contents](index.md)