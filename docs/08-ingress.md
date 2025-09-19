# 8. Ingress

## 📋 Table of Contents

1. [Ingress Fundamentals](#1-ingress-fundamentals)
   - 1.1. [What is Ingress](#11-what-is-ingress)
   - 1.2. [Ingress Architecture](#12-ingress-architecture)
   - 1.3. [Controllers vs Resources](#13-controllers-vs-resources)
2. [Ingress Configuration](#2-ingress-configuration)
   - 2.1. [Installing Ingress Controllers](#21-installing-ingress-controllers)
   - 2.2. [Ingress Classes](#22-ingress-classes)
   - 2.3. [Basic Routing Rules](#23-basic-routing-rules)
3. [Ingress Routing](#3-ingress-routing)
   - 3.1. [Host-based Routing](#31-host-based-routing)
   - 3.2. [Path-based Routing](#32-path-based-routing)
   - 3.3. [Advanced Routing Features](#33-advanced-routing-features)
4. [Ingress Operations](#4-ingress-operations)
   - 4.1. [Creating and Managing Resources](#41-creating-and-managing-resources)
   - 4.2. [SSL/TLS Configuration](#42-ssltls-configuration)
   - 4.3. [Testing and Troubleshooting](#43-testing-and-troubleshooting)
5. [Ingress Best Practices](#5-ingress-best-practices)
   - 5.1. [Performance Optimization](#51-performance-optimization)
   - 5.2. [Security Guidelines](#52-security-guidelines)
   - 5.3. [Production Deployment](#53-production-deployment)

---

## 1. Ingress Fundamentals

### 1.1. What is Ingress

Kubernetes Ingress provides HTTP and HTTPS routing to services within a cluster. It acts as a single entry point that can route traffic to multiple backend services based on request properties like hostname or path.

Think of Ingress like a hotel lobby system. Instead of having each service (restaurant, spa, conference rooms) require its own separate entrance with dedicated security and reception, Ingress provides one magnificent lobby where a knowledgeable concierge directs guests to the right building based on their needs.

`★ Insight ─────────────────────────────────────`
**NodePort Services are like back-door entrances** - they work, but guests need to know specific door numbers (high ports) and remember which building entrance to use. **LoadBalancer Services are like having a dedicated valet** for each building - professional but expensive when you have 25 buildings requiring 25 valets!
`─────────────────────────────────────────────────`

**Core Ingress Benefits:**
- **Cost efficiency**: One load balancer serves multiple services instead of one per service
- **Centralized routing**: Single point for traffic management and SSL termination
- **HTTP-level routing**: Route based on hostnames, paths, headers, and other HTTP properties
- **Simplified external access**: Clean URLs instead of high port numbers

**The Cost Problem:**
```yaml
# Without Ingress: 25 apps = 25 expensive cloud load balancers
apiVersion: v1
kind: Service
metadata:
  name: restaurant-service
spec:
  type: LoadBalancer  # $$$$ - One expensive load balancer
  ports:
  - port: 80
     targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: spa-service
spec:
  type: LoadBalancer  # $$$$ - Another expensive load balancer
  ports:
  - port: 80
     targetPort: 8080
# ... repeat for all 25 services = 25x the cost!
```

### 1.2. Ingress Architecture

Ingress operates through a combination of Ingress Controllers and Ingress Resources that work together to route external traffic to internal services.

**Ingress Components:**
```
Internet Traffic
         │
         ▼
    [Cloud Load Balancer] ◄─── Created automatically
         │
         ▼
    [Ingress Controller] ◄─── You install this
         │
         ▼
    [Ingress Rules] ◄─── You create these
         │
         ▼
    [ClusterIP Services] ◄─── Your backend services
         │
         ▼
    [Application Pods] ◄─── Your actual applications
```

This is like a hotel where the cloud load balancer is the main entrance, the Ingress Controller is the concierge staff, Ingress Rules are the directory board, and Services are the actual hotel buildings.

```yaml
# With Ingress: 25 apps = 1 shared cloud load balancer
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hotel-lobby
spec:
  rules:
  - host: restaurant.hotel.com    # Guest asks for restaurant
     http:
       paths:
       - path: /
         pathType: Prefix
         backend:
           service:
             name: restaurant-service  # Concierge directs to restaurant building
             port:
               number: 80
  - host: spa.hotel.com          # Guest asks for spa
     http:
       paths:
       - path: /
         pathType: Prefix
         backend:
           service:
             name: spa-service    # Concierge directs to spa building
             port:
               number: 80
```

### 1.3. Controllers vs Resources

Ingress has two key components that work together:

**Ingress Controller (The Implementation):**
- Watches for Ingress Resources and implements the routing rules
- Runs as a Pod within your cluster
- Popular options: NGINX, Traefik, HAProxy, cloud-specific controllers
- Actually handles the traffic routing and load balancing

**Ingress Resource (The Configuration):**
- Kubernetes object that defines routing rules
- Specifies which traffic goes to which services
- Written in YAML like other Kubernetes resources
- Contains hostnames, paths, and backend service mappings

## 2. Ingress Configuration

### 2.1. Installing Ingress Controllers

Unlike other Kubernetes resources, Ingress requires you to install an Ingress Controller separately. The controller implements the actual routing logic.

This is like hiring a concierge service for your hotel - Kubernetes provides the lobby space, but you need to hire the staff who will actually direct guests to their destinations.

**Installing NGINX Ingress Controller:**
```bash
# Install the NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.0/deploy/static/provider/cloud/deploy.yaml
```

This command deploys:
- The ingress-nginx namespace and all required components
- ServiceAccounts and RBAC permissions
- ConfigMaps for controller configuration
- The controller Deployment and associated Services
- A LoadBalancer Service to expose the controller externally

**Verify the installation:**
```bash
# Check if the controller is running
kubectl get pods -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

NAME                                      READY   STATUS    RESTARTS   AGE
ingress-nginx-controller-7445ddc6c4-csf98   1/1     Running   0          2m
```

`★ Insight ─────────────────────────────────────`
**The "Completed" pods you see are like overnight setup crews** - they configured the environment and finished. The "Running" pod is your actual controller handling traffic. In production, you'd want multiple controller pods for high availability.
`─────────────────────────────────────────────────`

### 2.2. Ingress Classes

Ingress Classes allow you to run multiple Ingress Controllers in the same cluster, each handling different types of traffic. This enables specialized routing for different application tiers.

Like having multiple specialized concierge teams in a large hotel complex - one for luxury guests, another for business travelers, and another for conference attendees.

**Check available Ingress Classes:**
```bash
kubectl get ingressclass

NAME    CONTROLLER             PARAMETERS   AGE
nginx   k8s.io/ingress-nginx   <none>       5m
```

**Creating custom Ingress Classes:**
```yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: nginx-internal    # Internal applications
spec:
  controller: k8s.io/ingress-nginx
---
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: nginx-external    # Public-facing applications
spec:
  controller: k8s.io/ingress-nginx
```

### 2.3. Basic Routing Rules

Ingress resources define routing rules that map HTTP requests to backend services. The controller reads these rules and configures the underlying proxy accordingly.

**Basic Ingress Resource:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: basic-routing
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
     http:
       paths:
       - path: /
         pathType: Prefix
         backend:
           service:
             name: app-service
             port:
               number: 80
```

**Key Routing Fields:**
- **host**: Domain name for routing (e.g., api.example.com)
- **path**: URL path for routing (e.g., /api, /admin)
- **pathType**: How to match paths (Prefix, Exact, ImplementationSpecific)
- **backend**: Target service and port for matching requests

## 3. Ingress Routing

### 3.1. Host-based Routing

Host-based routing directs traffic based on the hostname in the HTTP request. This allows multiple applications to share the same IP address and port.

This is like having different hotel brands sharing one lobby - guests asking for "luxury.hotels.com" get directed to the luxury building, while "budget.hotels.com" guests go to the budget accommodations.

**Multi-host Ingress:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-host
spec:
  ingressClassName: nginx
  rules:
  - host: api.example.com      # API requests
     http:
       paths:
       - path: /
         pathType: Prefix
         backend:
           service:
             name: api-service
             port:
               number: 8080
  - host: admin.example.com    # Admin interface
     http:
       paths:
       - path: /
         pathType: Prefix
         backend:
           service:
             name: admin-service
             port:
               number: 3000
```

### 3.2. Path-based Routing

Path-based routing directs traffic based on the URL path within the same hostname. This allows you to serve multiple applications or API versions from a single domain.

This is like directing hotel guests to different departments within the same building - guests asking for "/restaurant" get directed to the dining area, while "/spa" requests go to the wellness center.

**Path-based Ingress:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: path-based
  annotations:
     nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  - host: example.com
     http:
       paths:
       - path: /api
         pathType: Prefix
         backend:
           service:
             name: api-service
             port:
               number: 8080
       - path: /web
         pathType: Prefix
         backend:
           service:
             name: web-service
             port:
               number: 80
       - path: /admin
         pathType: Prefix
         backend:
           service:
             name: admin-service
             port:
               number: 3000
```

**Path Types:**
- **Prefix**: Matches URL paths with this prefix (most common)
- **Exact**: Matches the exact path only
- **ImplementationSpecific**: Depends on the Ingress Controller implementation

### 3.3. Advanced Routing Features

Ingress Controllers support advanced routing features through annotations and custom configurations.

**Common Routing Annotations:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: advanced-routing
  annotations:
     nginx.ingress.kubernetes.io/rewrite-target: /$2
     nginx.ingress.kubernetes.io/use-regex: "true"
     nginx.ingress.kubernetes.io/rate-limit: "100"
     nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  rules:
  - host: example.com
     http:
       paths:
       - path: /api/v1(/|$)(.*)
         pathType: ImplementationSpecific
         backend:
           service:
             name: api-v1-service
             port:
               number: 8080
```

**Advanced Features:**
- **URL rewriting**: Modify paths before forwarding to backend
- **Rate limiting**: Control request frequency per client
- **SSL termination**: Handle HTTPS at the Ingress level
- **Authentication**: Add basic auth or integrate with external auth providers
- **Load balancing**: Configure different algorithms for traffic distribution

## 4. Ingress Operations

### 4.1. Creating and Managing Resources

Let's walk through creating a complete Ingress setup with multiple services and routing patterns.

**First, create the backend services:**
```yaml
# backend-services.yml - Application services and pods
apiVersion: v1
kind: Service
metadata:
  name: api-service
spec:
  selector:
     app: api
  ports:
  - port: 8080
     targetPort: 8080
  type: ClusterIP
---
apiVersion: v1
kind: Pod
metadata:
  name: api-pod
  labels:
     app: api
spec:
  containers:
  - name: api
     image: nginx:latest
     ports:
     - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  selector:
     app: web
  ports:
  - port: 80
     targetPort: 80
  type: ClusterIP
---
apiVersion: v1
kind: Pod
metadata:
  name: web-pod
  labels:
     app: web
spec:
  containers:
  - name: web
     image: nginx:latest
     ports:
     - containerPort: 80
```

**Deploy the backend services:**
```bash
kubectl apply -f backend-services.yml

service/api-service created
service/web-service created
pod/api-pod created
pod/web-pod created
```

**Create comprehensive Ingress routing:**
```yaml
# ingress-routing.yml - Complete routing configuration
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: complete-routing
  annotations:
     nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  # HOST-BASED ROUTING: Different applications
  - host: api.example.com
     http:
       paths:
       - path: /
         pathType: Prefix
         backend:
           service:
             name: api-service
             port:
               number: 8080

  - host: web.example.com
     http:
       paths:
       - path: /
         pathType: Prefix
         backend:
           service:
             name: web-service
             port:
               number: 80

  # PATH-BASED ROUTING: Different services under one domain
  - host: example.com
     http:
       paths:
       - path: /api
         pathType: Prefix
         backend:
           service:
             name: api-service
             port:
               number: 8080

       - path: /web
         pathType: Prefix
         backend:
           service:
             name: web-service
             port:
               number: 80
```

**Deploy the Ingress routing:**
```bash
kubectl apply -f ingress-routing.yml

ingress.networking.k8s.io/complete-routing created
```

### 4.2. SSL/TLS Configuration

Ingress Controllers can handle SSL/TLS termination, providing HTTPS endpoints for your applications without requiring SSL configuration in each service.

This is like having the hotel lobby handle all security checks and credentials, so individual departments don't need their own security staff.

**SSL/TLS with cert-manager:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tls-ingress
  annotations:
     cert-manager.io/cluster-issuer: "letsencrypt-prod"
     nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
     - secure.example.com
     secretName: example-tls
  rules:
  - host: secure.example.com
     http:
       paths:
       - path: /
         pathType: Prefix
         backend:
           service:
             name: secure-service
             port:
               number: 80
```

**Manual TLS Certificate:**
```bash
# Create TLS secret manually
kubectl create secret tls example-tls \
  --cert=path/to/cert.crt \
  --key=path/to/cert.key
```

### 4.3. Testing and Troubleshooting

**Check Ingress status:**
```bash
kubectl get ingress

NAME               CLASS   HOSTS                                   ADDRESS         PORTS     AGE
complete-routing   nginx   api.example.com,web.example.com,+1     203.0.113.42    80, 443   5m
```

This shows:
- **CLASS**: Which Ingress Controller is managing this resource
- **HOSTS**: All hostnames being handled
- **ADDRESS**: External IP address of the load balancer
- **PORTS**: Available ports (HTTP:80, HTTPS:443)

**Examine detailed routing:**
```bash
kubectl describe ingress complete-routing

Rules:
  Host              Path    Backends
  ----              ----    --------
  api.example.com   /       api-service:8080 (10.244.1.5:8080)
  web.example.com   /       web-service:80 (10.244.1.6:80)
  example.com       /api    api-service:8080 (10.244.1.5:8080)
                     /web    web-service:80 (10.244.1.6:80)
```

`★ Insight ─────────────────────────────────────`
**The backend IPs show actual Pod locations** - when Pods restart or scale, Ingress automatically updates these mappings. The controller continuously monitors service endpoints to ensure traffic routes to healthy pods only.
`─────────────────────────────────────────────────`

**Common troubleshooting commands:**
```bash
# Check controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# Verify backend endpoints
kubectl get endpoints

# Test DNS resolution
nslookup api.example.com

# Check Ingress events
kubectl get events --field-selector involvedObject.name=complete-routing
```

**Set up local testing (optional):**
```bash
# Add entries to /etc/hosts for local testing
echo "203.0.113.42 api.example.com" | sudo tee -a /etc/hosts
echo "203.0.113.42 web.example.com" | sudo tee -a /etc/hosts
echo "203.0.113.42 example.com" | sudo tee -a /etc/hosts
```

## 5. Ingress Best Practices

### 5.1. Performance Optimization

**Resource Limits and Requests:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  template:
     spec:
       containers:
       - name: controller
         resources:
           requests:
             cpu: 100m
             memory: 90Mi
           limits:
             cpu: 1000m
             memory: 256Mi
```

**Controller Configuration:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-configuration
  namespace: ingress-nginx
data:
  worker-processes: "auto"
  worker-connections: "1024"
  keepalive-timeout: "65"
  gzip-level: "6"
  use-gzip: "true"
```

**Multiple Controller Deployment:**
Large environments benefit from running multiple Ingress Controllers for different application tiers, like having specialized concierge teams for different guest categories.

```bash
# Deploy separate controllers for internal vs external traffic
kubectl apply -f ingress-nginx-internal.yaml
kubectl apply -f ingress-nginx-external.yaml
```

### 5.2. Security Guidelines

**Security Annotations:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: secure-ingress
  annotations:
     nginx.ingress.kubernetes.io/ssl-redirect: "true"
     nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
     nginx.ingress.kubernetes.io/auth-basic: "Authentication Required"
     nginx.ingress.kubernetes.io/auth-basic-realm: "Protected Area"
     nginx.ingress.kubernetes.io/whitelist-source-range: "10.0.0.0/8,172.16.0.0/12"
     nginx.ingress.kubernetes.io/rate-limit: "100"
     nginx.ingress.kubernetes.io/rate-limit-rps: "10"
spec:
  # ... secure routing rules
```

**Network Policies:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ingress-controller-policy
spec:
  podSelector:
     matchLabels:
       app.kubernetes.io/name: ingress-nginx
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
     - namespaceSelector: {}
     ports:
     - protocol: TCP
       port: 80
     - protocol: TCP
       port: 443
```

### 5.3. Production Deployment

**High Availability Setup:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ingress-nginx-controller
spec:
  replicas: 3  # Multiple controller instances
  strategy:
     type: RollingUpdate
     rollingUpdate:
       maxUnavailable: 1
  template:
     spec:
       affinity:
         podAntiAffinity:
           preferredDuringSchedulingIgnoredDuringExecution:
           - weight: 100
             podAffinityTerm:
               labelSelector:
                 matchLabels:
                   app.kubernetes.io/name: ingress-nginx
               topologyKey: kubernetes.io/hostname
```

**Monitoring and Observability:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: monitoring-ingress
  annotations:
     nginx.ingress.kubernetes.io/enable-access-log: "true"
     nginx.ingress.kubernetes.io/configuration-snippet: |
       more_set_headers "X-Request-ID: $req_id";
spec:
  # ... monitoring endpoints
```

**Resource Management:**
- Set appropriate resource requests and limits
- Configure horizontal pod autoscaling
- Monitor controller metrics and logs
- Implement backup and disaster recovery procedures

**Cleanup Commands:**
```bash
# Remove Ingress resources
kubectl delete ingress complete-routing

# Remove backend services
kubectl delete -f backend-services.yml

# Remove Ingress Controller (if needed)
kubectl delete -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.0/deploy/static/provider/cloud/deploy.yaml
```

---

## Chapter Summary

Kubernetes Ingress provides HTTP and HTTPS routing to services within a cluster, acting as a single entry point that efficiently routes traffic to multiple backend services. It solves the cost and complexity problems of multiple LoadBalancer Services.

**Key Ingress Concepts:**
- **Single Entry Point**: One load balancer handles multiple services efficiently
- **HTTP-level Routing**: Route based on hostnames, paths, and HTTP properties
- **Cost Optimization**: Multiple services share one load balancer instead of needing individual ones
- **SSL/TLS Termination**: Centralized certificate management and HTTPS handling
- **Advanced Features**: Rate limiting, authentication, URL rewriting, and more

**Ingress Components:**
- **Ingress Controller**: The implementation that handles actual traffic routing
- **Ingress Resource**: Kubernetes objects defining routing rules
- **Ingress Classes**: Allow multiple controllers with specialized purposes
- **Backend Services**: Internal ClusterIP services that receive routed traffic

**When to Use Ingress:**
- Multiple web applications needing external access
- Cost optimization for cloud load balancers
- Centralized SSL/TLS certificate management
- Advanced HTTP routing requirements (host/path-based)
- Professional external traffic management with features like rate limiting

The hotel lobby analogy illustrates how Ingress works: just as a professional hotel lobby provides one entrance with expert concierge services directing guests to different buildings, Ingress provides one load balancer with intelligent routing directing traffic to different services based on HTTP request properties.

---

**Navigation:**
- **Previous:** [7. Kubernetes Services](07-kubernetes-services.md)
- **Next:** [9. Wasm on Kubernetes](09-wasm-on-kubernetes.md)
- **Up:** [Table of Contents](index.md)
