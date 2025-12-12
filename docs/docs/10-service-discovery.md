# Chapter 10: Service Discovery Deep Dive

**Previous:** [Chapter 9: Wasm on Kubernetes](09-wasm-on-kubernetes.md) | **Next:** [Chapter 11: Kubernetes Storage](11-kubernetes-storage.md)

---

## 📋 Table of Contents

1. [Service Discovery Fundamentals](#1-service-discovery-fundamentals)
   - 1.1. [What is Service Discovery](#11-what-is-service-discovery)
   - 1.2. [Service Discovery Challenges](#12-service-discovery-challenges)
2. [DNS and Service Discovery Architecture](#2-dns-and-service-discovery-architecture)
   - 2.1. [Cluster DNS Overview](#21-cluster-dns-overview)
   - 2.2. [DNS Architecture Components](#22-dns-architecture-components)
   - 2.3. [kube-proxy Integration](#23-kube-proxy-integration)
3. [Service Registration Process](#3-service-registration-process)
   - 3.1. [Automatic Service Registration](#31-automatic-service-registration)
   - 3.2. [Endpoint Management](#32-endpoint-management)
   - 3.3. [DNS Record Creation](#33-dns-record-creation)
4. [Service Discovery Methods](#4-service-discovery-methods)
   - 4.1. [DNS-based Discovery](#41-dns-based-discovery)
   - 4.2. [Environment Variables](#42-environment-variables)
   - 4.3. [API-based Discovery](#43-api-based-discovery)
5. [Namespace-based Discovery](#5-namespace-based-discovery)
   - 5.1. [DNS Namespace Hierarchy](#51-dns-namespace-hierarchy)
   - 5.2. [Cross-namespace Communication](#52-cross-namespace-communication)
   - 5.3. [Service Discovery Patterns](#53-service-discovery-patterns)
6. [Troubleshooting Service Discovery](#6-troubleshooting-service-discovery)
   - 6.1. [Common Issues](#61-common-issues)
   - 6.2. [Diagnostic Tools](#62-diagnostic-tools)
   - 6.3. [Resolution Strategies](#63-resolution-strategies)

---

## 1. Service Discovery Fundamentals

### 1.1. What is Service Discovery

Service discovery is the process by which applications automatically locate and connect to other services within a distributed system. In Kubernetes, this enables microservices to find and communicate with each other without hardcoding network addresses.

Think of service discovery like a sophisticated phone book system - applications need to know how to find each other by name, just like you need a phone book to find someone's number. However, unlike static printed directories, Kubernetes maintains a dynamic, real-time digital directory that automatically updates as services come and go.

`★ Insight ─────────────────────────────────────`
**Service discovery in Kubernetes is like a sophisticated phone book system** - applications need to know how to find each other by name, just like you need a phone book to find someone's number. However, unlike static printed directories, Kubernetes maintains a dynamic, real-time digital directory that automatically updates as services come and go.
`─────────────────────────────────────────────────`

**The Communication Challenge:**

In our digital city (Kubernetes cluster), applications face two fundamental challenges when trying to communicate:

1. **Knowing the name**: Like needing to know someone's name to look them up
2. **Converting names to addresses**: Like converting a name to a phone number

```
Application World               Phone Book World
┌────────────────────┐         ┌────────────────────┐
│ "I need to call    │   =     │ "I need to call    │
│  the payment       │         │  John Smith"       │
│  service"          │         │                    │
└────────────────────┘         └────────────────────┘
          │                              │
          ▼                              ▼
┌────────────────────┐         ┌────────────────────┐
│ Look up: payment   │   =     │ Look up: John      │
│ Returns:           │         │ Returns:           │
│ 192.168.1.100:8080│         │ (555) 123-4567     │
└────────────────────┘         └────────────────────┘
```

### 1.2. Service Discovery Challenges

Applications in dynamic environments face several challenges when trying to communicate with other services, especially in containerized environments where IP addresses change frequently.

Just like you can't just say "connect me to John" without knowing his phone number, applications can't just say "connect me to the payment service" without knowing its IP address and port.

**Core Service Discovery Challenges:**

1. **Dynamic IP Addresses**: Pods receive new IP addresses when they restart
2. **Service Scaling**: Multiple instances of the same service at different addresses
3. **Load Distribution**: Distributing requests across healthy service instances
4. **Health Monitoring**: Ensuring requests only go to healthy service instances

**Service Discovery Workflow:**
```
┌──────────────────────────────────────────────────────────┐
│ Step 1: Developer Configuration                          │
│ ─────────────────────────────────────────────────────── │
│ Developer tells payment-app: "Call the inventory app"   │
│ (Manual step - like telling someone to call John)       │
└──────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────┐
│ Step 2: Directory Lookup Request                        │
│ ─────────────────────────────────────────────────────── │
│ payment-app asks directory: "What's inventory's number?"│
│ (Automatic - like calling directory assistance)          │
└──────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────┐
│ Step 3: Directory Response                               │
│ ─────────────────────────────────────────────────────── │
│ Directory responds: "inventory is at 192.168.1.200"     │
│ (Automatic - like getting the phone number)              │
└──────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────┐
│ Step 4: Connection Establishment                         │
│ ─────────────────────────────────────────────────────── │
│ payment-app connects to 192.168.1.200:8080             │
│ (Automatic - like the phone system routing your call)   │
└──────────────────────────────────────────────────────────┘
```

**Developer vs Kubernetes Responsibilities:**
- **Developer responsibility**: Telling applications which services they need to call (like giving someone a name to look up)
- **Kubernetes responsibility**: Converting service names to IP addresses and routing the connections (like directory assistance and the phone switching system)

## 2. DNS and Service Discovery Architecture

### 2.1. Cluster DNS Overview

Every Kubernetes cluster includes a sophisticated DNS system that provides service discovery capabilities. This dynamic directory service automatically maintains current network information for every service in your cluster.

Think of this like a digital phone book that automatically updates whenever someone moves - applications can always find services by name without worrying about changing IP addresses.

**DNS Service Discovery Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│               Kubernetes Cluster                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │            Control Plane                         │   │
│  │  ┌─────────────────────────────────────────┐    │   │
│  │  │        Cluster DNS                       │    │   │
│  │  │    (The Digital Phone Book)             │    │   │
│  │  │                                         │    │   │
│  │  │  📞 Directory Assistance Operators      │    │   │
│  │  │  📋 Current Service Listings           │    │   │
│  │  │  🔄 Real-time Updates                  │    │   │
│  │  └─────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────┐   │
│                                                     │   │
│   ┌───────────────┐    ┌───────────────┐           │   │
│   │ Worker Node 1 │    │ Worker Node 2 │    ...    │   │
│   │               │    │               │           │   │
│   │ 📱 Apps call │    │ 📱 Apps call │           │   │
│   │   directory   │    │   directory   │           │   │
│   └───────────────┘    └───────────────┘           │   │
└─────────────────────────────────────────────────────────┘
```

### 2.2. DNS Architecture Components

The cluster DNS operates through multiple components working together to provide reliable service discovery.

Like a professional directory assistance service, the cluster DNS has multiple operators (CoreDNS pods) handling lookups and ensuring high availability.

**DNS Service Components:**
```bash
# The directory assistance operators (CoreDNS Pods)
kubectl get pods -n kube-system -l k8s-app=kube-dns
NAME                       READY   STATUS    RESTARTS   AGE
coredns-76f75df574-d6nn5   1/1     Running   0          13d
coredns-76f75df574-n7qzk   1/1     Running   0          13d

# The directory management system (CoreDNS Deployment)
kubectl get deploy -n kube-system -l k8s-app=kube-dns
NAME        READY     UP-TO-DATE     AVAILABLE     AGE
coredns     2/2       2              2             13d

# The directory assistance phone line (kube-dns Service)
kubectl get svc -n kube-system -l k8s-app=kube-dns
NAME       TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)                  AGE
kube-dns   ClusterIP   10.96.0.10     <none>        53/UDP,53/TCP,9153/TCP   13d
```

`★ Insight ─────────────────────────────────────`
**The cluster DNS runs as a regular Kubernetes application** - it's not some magical external system. The DNS service itself runs as Pods managed by a Deployment and fronted by a Service. This means the DNS system is self-hosting within your cluster!
`─────────────────────────────────────────────────`

### 2.3. kube-proxy Integration

The DNS system works closely with kube-proxy to provide complete service discovery and load balancing functionality.

**DNS System Characteristics:**

**1. High Availability:**
- Multiple CoreDNS Pods ensure DNS service is always available
- If one DNS pod fails, others continue handling lookups
- Deployment controller ensures the right number of DNS pods are always running

**2. Stable Service Endpoint:**
- The `kube-dns` Service provides a stable ClusterIP address
- All applications use this address for DNS queries
- The Service routes DNS requests to healthy CoreDNS pods

**3. Standard DNS Protocol:**
- Uses DNS protocol (port 53) - the internet's standard name resolution system
- Both UDP and TCP support for different types of DNS requests
- Monitoring port (9153) for health checks and metrics

**4. kube-proxy Integration:**
- DNS provides service name to ClusterIP resolution
- kube-proxy handles ClusterIP to Pod IP translation and load balancing
- Together they provide end-to-end service discovery and connection routing

## 3. Service Registration Process

### 3.1. Automatic Service Registration

Service registration in Kubernetes happens automatically when you create Service resources. The system detects new services and adds them to the DNS directory without any manual intervention.

This is like having a smart phone system that automatically detects when new residents move in and adds them to the directory without requiring manual registration.

**Automatic Service Registration Process:**

```yaml
# When you deploy this Service...
apiVersion: v1
kind: Service
metadata:
  name: payment-service  # The listing name
spec:
  selector:
     app: payment
  ports:
  - port: 8080
  type: ClusterIP
```

**This happens automatically:**
1. **Name Assignment**: Service gets the name `payment-service`
2. **Phone Number Assignment**: Kubernetes assigns a ClusterIP (like 192.168.1.100)
3. **Directory Registration**: Cluster DNS automatically adds the listing

```
Directory Entry Created:
┌─────────────────────────────────────────┐
│ Service Name: payment-service           │
│ Phone Number: 192.168.1.100:8080      │
│ Full Address: payment-service.default. │
│               svc.cluster.local        │
│ Status: Active                         │
│ Last Updated: <current timestamp>      │
└─────────────────────────────────────────┘
```

### 3.2. Endpoint Management

Kubernetes automatically manages service endpoints through a sophisticated monitoring and registration system that tracks healthy pod instances.

**Service Registration Workflow:**
```
┌─────────────────────────────────────────────────────────┐
│ Step 1: Service Deployment                              │
│ ─────────────────────────────────────────────────────── │
│ kubectl apply -f payment-service.yaml                  │
│ ↓                                                       │
│ API Server receives and validates the Service          │
└─────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────┐
│ Step 2: IP Assignment and Storage                       │
│ ─────────────────────────────────────────────────────── │
│ • Kubernetes assigns ClusterIP: 192.168.1.100         │
│ • Service configuration stored in etcd                  │
│ • EndpointSlice created with Pod IPs                   │
└─────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────┐
│ Step 3: Cluster DNS Detection                           │
│ ─────────────────────────────────────────────────────── │
│ • CoreDNS watches API server for new Services          │
│ • Detects new payment-service                          │
│ • Triggers automatic registration process               │
└─────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────┐
│ Step 4: Directory Update                                │
│ ─────────────────────────────────────────────────────── │
│ • DNS A record created: payment-service → 192.168.1.100│
│ • DNS SRV record created for port information          │
│ • Directory immediately available for lookups          │
└─────────────────────────────────────────────────────────┘
```

### 3.3. DNS Record Creation

The DNS system creates appropriate DNS records for each service automatically, enabling different types of service discovery lookups.

The beauty of this system is that it updates in real-time - when services come and go, the DNS records are automatically updated to reflect the changes.

**DNS Record Management:**
- **New services**: Automatically registered within seconds
- **Deleted services**: Immediately removed from directory
- **Service updates**: IP changes reflected automatically
- **Pod health**: Only healthy endpoints receive calls

**Example of Dynamic Updates:**
```bash
# Deploy a service
kubectl apply -f web-service.yaml
# → Automatically added to directory within seconds

# Scale the service
kubectl scale deployment web-app --replicas=5
# → EndpointSlice automatically updated with new Pod IPs

# Delete the service
kubectl delete service web-service
# → Immediately removed from directory
```

## 4. Service Discovery Methods

### 4.1. DNS-based Discovery

DNS-based service discovery is the primary method applications use to find other services. Applications query the cluster DNS using service names, which resolve to ClusterIP addresses.

This process is similar to looking up a phone number - applications provide a service name, and the DNS system returns the appropriate IP address.

**DNS-based Discovery Flow:**

```
Enterprise App wants to call Cerritos Service:

┌─────────────────────────────────────────────────────────┐
│ Step 1: Name-Based Request                              │
│ ─────────────────────────────────────────────────────── │
│ Enterprise App: "I need to call 'cerritos'"           │
│ (Just like saying "I need to call John Smith")         │
└─────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────┐
│ Step 2: Directory Assistance Call                       │
│ ─────────────────────────────────────────────────────── │
│ Container's network stack: "Cluster DNS, what's the    │
│ number for 'cerritos'?"                                │
│ (Automatic - like speed-dialing directory assistance)  │
└─────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────┐
│ Step 3: Directory Lookup Response                       │
│ ─────────────────────────────────────────────────────── │
│ Cluster DNS: "cerritos is at 192.168.200.217"         │
│ (Like directory assistance giving you the number)       │
└─────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────┐
│ Step 4: Call Routing                                    │
│ ─────────────────────────────────────────────────────── │
│ Network routing system connects to actual Pod          │
│ (Like the phone system routing to the right phone)     │
└─────────────────────────────────────────────────────────┘
```

### 4.2. Environment Variables

Kubernetes also provides service discovery through environment variables that are automatically injected into containers when they start.

Just like every phone in a city is automatically configured to know the directory assistance number, every container is automatically configured with environment variables containing service information.

**Automatic Environment Variable Configuration:**
```bash
# Inside any container, check the "phone book" configuration
# DNS configuration
cat /etc/resolv.conf
search default.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10           # ← Cluster DNS server
options ndots:5

# Environment variables for service discovery
env | grep SERVICE
PAYMENT_SERVICE_SERVICE_HOST=10.96.45.123
PAYMENT_SERVICE_SERVICE_PORT=8080
PAYMENT_SERVICE_PORT=tcp://10.96.45.123:8080
```

This configuration provides multiple discovery methods:
- **DNS resolver**: Points to cluster DNS server (10.96.0.10)
- **Search domains**: Automatic domain completion for service names
- **Environment variables**: Direct service host and port information

`★ Insight ─────────────────────────────────────`
**The search domains work like area code assumptions** - when you dial "123-4567" from your local area, the phone system automatically tries your local area code first. Similarly, when an app queries "payment-service", Kubernetes automatically tries "payment-service.default.svc.cluster.local" first based on the search domains.
`─────────────────────────────────────────────────`

### 4.3. API-based Discovery

Applications can also discover services by directly querying the Kubernetes API for service and endpoint information.

**API-based Service Discovery:**

After DNS resolution provides the ClusterIP, the actual connection process involves sophisticated routing through kube-proxy.

ClusterIPs are like virtual phone numbers that don't exist on any physical device. When traffic is sent to them, kube-proxy uses sophisticated routing rules to forward the traffic to actual pods.

**ClusterIP Traffic Routing:**

```
Call Routing Process:
┌─────────────────────────────────────────────────────────┐
│ Enterprise App dials cerritos (192.168.200.217)        │
│ ↓                                                       │
│ Container sends to default gateway (doesn't know route) │
│ ↓                                                       │
│ Node receives traffic for "unknown" network            │
│ ↓                                                       │
│ Node kernel: "Wait, I have special rules for this!"    │
│ ↓                                                       │
│ kube-proxy IPVS rules: "Route to Pod 10.244.1.42"     │
│ ↓                                                       │
│ Traffic reaches actual Cerritos Pod                     │
└─────────────────────────────────────────────────────────┘
```

**Example Call Routing:**
```bash
# The directory entry
Service: cerritos
ClusterIP: 192.168.200.217    # ← Virtual "phone number"

# The actual "phones" that answer
EndpointSlice:
- 10.244.1.42:8080            # ← Pod 1 IP
- 10.244.2.17:8080            # ← Pod 2 IP
- 10.244.1.89:8080            # ← Pod 3 IP

# kube-proxy routing rules automatically distribute calls
```

## 5. Namespace-based Discovery

### 5.1. DNS Namespace Hierarchy

Kubernetes organizes services into namespaces, creating a hierarchical DNS structure that prevents naming conflicts and enables logical service grouping.

Just like real phone books are organized into sections (residential, business, government), Kubernetes namespaces allow the same service name to exist in different logical environments.

**DNS Namespace Organization:**
```
Kubernetes Cluster Phone Book (cluster.local)
├── Default Section (default.svc.cluster.local)
│   ├── payment-service
│   ├── inventory-service
│   └── web-frontend
├── Development Section (dev.svc.cluster.local)
│   ├── payment-service        # ← Same name, different section!
│   ├── inventory-service
│   └── test-database
└── Production Section (prod.svc.cluster.local)
     ├── payment-service        # ← Same name again!
     ├── inventory-service
     └── prod-database
```

**Fully Qualified Domain Names (FQDNs):**
```bash
# Complete directory addresses (FQDNs)
payment-service.default.svc.cluster.local    # Default section
payment-service.dev.svc.cluster.local        # Dev section
payment-service.prod.svc.cluster.local       # Prod section
```

### 5.2. Cross-namespace Communication

Applications can discover services using different levels of DNS name specificity:

**1. Same-namespace Discovery:**
- Use short names: `payment-service`
- Automatically resolved within the same namespace
- Like calling a local extension number

**2. Cross-namespace Discovery:**
- Must use full FQDN: `payment-service.prod.svc.cluster.local`
- Requires specifying the target namespace explicitly
- Like dialing a full phone number with area code

### 5.3. Service Discovery Patterns

Let's explore how the DNS system handles cross-namespace service discovery with practical examples:

**Setting Up Multi-namespace Services:**
```yaml
# Development section service
apiVersion: v1
kind: Service
metadata:
  name: enterprise-service
  namespace: dev
spec:
  selector:
     app: enterprise
  ports:
  - port: 8080
---
# Production section service
apiVersion: v1
kind: Service
metadata:
  name: enterprise-service   # ← Same name, different section
  namespace: prod
spec:
  selector:
     app: enterprise
  ports:
  - port: 8080
```

**Cross-namespace Service Discovery:**
```bash
# Deploy the multi-section example
kubectl apply -f sd-example.yml

# Get a test Pod in the dev section
kubectl exec -it jump --namespace dev -- bash

# Local call (same section) - short name works
curl enterprise-service:8080
# ← Returns: "Hello from the DEV Namespace!"

# Long-distance call (different section) - need full address
curl enterprise-service.prod.svc.cluster.local:8080
# ← Returns: "Hello from the PROD Namespace!"
```

**DNS Search Configuration:**
```bash
# Check the "phone" configuration
cat /etc/resolv.conf

search dev.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10
```

The search domains show priority:
1. **dev.svc.cluster.local**: Try local section first
2. **svc.cluster.local**: Try cluster-wide
3. **cluster.local**: Try cluster root

## 6. Troubleshooting Service Discovery

### 6.1. Common Issues

When applications can't find each other, it's usually a problem with the service discovery system. Here are common issues and their symptoms:

**DNS Resolution Failures:**
- Application gets "name not found" errors
- Services appear to not exist despite being deployed
- Like calling directory assistance and being told "no listing found"

**DNS Server Unavailable:**
- DNS timeouts or connection failures
- All service discovery fails simultaneously
- Like getting a busy signal when calling directory assistance

**Incorrect Service Resolution:**
- Service resolves to wrong IP address
- Traffic reaches unintended destinations
- Like being connected to the wrong service

### 6.2. Diagnostic Tools

**Step 1: Check DNS Infrastructure**
```bash
# Verify directory operators are on duty
kubectl get deploy -n kube-system -l k8s-app=kube-dns
NAME      READY   UP-TO-DATE   AVAILABLE   AGE
coredns   2/2     2            2           14d

kubectl get pods -n kube-system -l k8s-app=kube-dns
NAME                       READY   STATUS    RESTARTS   AGE
coredns-76f75df574-6q7k7   1/1     Running   0          14d
coredns-76f75df574-krnr7   1/1     Running   0          14d
```

**Step 2: Check DNS Service Availability**
```bash
# Verify the directory assistance "phone number" is working
kubectl get svc kube-dns -n kube-system
NAME       TYPE        CLUSTER-IP    EXTERNAL-IP   PORT(S)                  AGE
kube-dns   ClusterIP   10.96.0.10    <none>        53/UDP,53/TCP,9153/TCP   14d
```

**Step 3: Verify DNS Server Functionality**
```bash
# Check operator logs for issues
kubectl logs coredns-76f75df574-n7qzk -n kube-system
.:53
[INFO] plugin/reload: Running configuration SHA512 = 591cf328cccc12b...
CoreDNS-1.11.1
linux/arm64, go1.20.7, ae2bbc2
```

### 6.3. Resolution Strategies

**Test Directory Assistance System:**
```bash
# Start a diagnostic Pod with phone testing tools
kubectl run -it dnsutils \
  --image registry.k8s.io/e2e-test-images/jessie-dnsutils:1.7

# Test basic directory lookup
nslookup kubernetes
Server:    10.96.0.10              # ← Should show cluster DNS IP
Address:   10.96.0.10#53

Name:      kubernetes.default.svc.cluster.local
Address:   10.96.0.1               # ← Should show API server IP
```

**Common Fixes:**

1. **Restart Directory Operators:**
```bash
# Delete DNS Pods to trigger restart
kubectl delete pod -n kube-system -l k8s-app=kube-dns
pod "coredns-76f75df574-d6nn5" deleted
pod "coredns-76f75df574-n7qzk" deleted

# Verify they restart properly
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

2. **Check Service Directory Entries:**
```bash
# Verify your service is properly registered
kubectl get svc                    # Should show your services
kubectl get endpoints              # Should show Pod IPs behind services
kubectl get endpointslice          # Should show current healthy endpoints
```

3. **Test from Different Locations:**
```bash
# Test from different namespaces
kubectl exec -it test-pod -n dev -- nslookup my-service
kubectl exec -it test-pod -n prod -- nslookup my-service.dev.svc.cluster.local
```

**Directory Troubleshooting Checklist:**
- ✅ Directory operators (CoreDNS Pods) are running
- ✅ Directory assistance line (kube-dns Service) has correct IP
- ✅ Container phone configuration (/etc/resolv.conf) points to correct directory
- ✅ Service listings exist in directory (kubectl get svc)
- ✅ Service endpoints are healthy (kubectl get endpoints)
- ✅ Basic directory test works (nslookup kubernetes)

---

## Chapter Summary

Service discovery in Kubernetes provides automatic DNS-based service location and connection capabilities. Every cluster includes a dynamic DNS system that maintains current network information for all services, enabling applications to find each other by name without hardcoding IP addresses.

Like a sophisticated phone book and directory assistance system, the cluster DNS automatically maintains current listings for all services, allowing applications to connect by name rather than specific IP addresses.

**Key Service Discovery Concepts:**
- **Cluster DNS**: CoreDNS-based name resolution system
- **Automatic Registration**: Services automatically registered in DNS when deployed
- **Name Resolution**: Converting service names to ClusterIP addresses
- **Namespace Hierarchy**: DNS-based logical service organization
- **Traffic Routing**: kube-proxy provides ClusterIP to Pod IP translation
- **Search Domains**: Automatic domain completion for service names

**Service Discovery Process:**
1. **Service Registration**: Services automatically register DNS records when deployed
2. **DNS Configuration**: Containers automatically configured with cluster DNS
3. **Name Lookup**: Applications query DNS for service IP addresses
4. **DNS Resolution**: Cluster DNS returns appropriate ClusterIP addresses
5. **Traffic Routing**: kube-proxy routes ClusterIP traffic to healthy Pod IPs

**Common Service Discovery Issues:**
- Applications can't resolve service names (DNS resolution failures)
- Services connecting to wrong endpoints or stale IPs
- Cross-namespace communication problems
- New services not accessible immediately after deployment

**Troubleshooting Approach:**
- Verify DNS infrastructure (CoreDNS pods) health
- Check DNS service availability (kube-dns Service)
- Test basic DNS functionality (nslookup kubernetes)
- Validate service registrations and endpoint health
- Restart DNS components if necessary

The phone book analogy illustrates why service discovery works seamlessly in Kubernetes - it's built on proven communication patterns that humans have used for decades, just automated and optimized for dynamic containerized environments.

---

**Navigation:**
- **Previous:** [9. Wasm on Kubernetes](09-wasm-on-kubernetes.md)
- **Next:** [11. Kubernetes Storage](11-kubernetes-storage.md)
- **Up:** [Table of Contents](intro.md)