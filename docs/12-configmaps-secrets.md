# 12. ConfigMaps and Secrets

## Table of Contents

1. [Configuration Management Fundamentals](#1-configuration-management-fundamentals)
    1.1. [Application vs Configuration Separation](#11-application-vs-configuration-separation)
    1.2. [Configuration Management Benefits](#12-configuration-management-benefits)
    1.3. [Kubernetes Configuration Objects](#13-kubernetes-configuration-objects)

2. [ConfigMaps](#2-configmaps)
    2.1. [ConfigMap Fundamentals](#21-configmap-fundamentals)
    2.2. [Creating ConfigMaps](#22-creating-configmaps)
    2.3. [Using ConfigMaps in Pods](#23-using-configmaps-in-pods)

3. [Secrets](#3-secrets)
    3.1. [Secret Fundamentals](#31-secret-fundamentals)
    3.2. [Secret Types and Creation](#32-secret-types-and-creation)
    3.3. [Using Secrets in Applications](#33-using-secrets-in-applications)

4. [Configuration Patterns](#4-configuration-patterns)
    4.1. [Environment-Specific Configuration](#41-environment-specific-configuration)
    4.2. [Configuration File Management](#42-configuration-file-management)
    4.3. [Dynamic Configuration Updates](#43-dynamic-configuration-updates)

5. [Security and Best Practices](#5-security-and-best-practices)
    5.1. [Configuration Security](#51-configuration-security)
    5.2. [Secret Management Best Practices](#52-secret-management-best-practices)
    5.3. [Troubleshooting Configuration Issues](#53-troubleshooting-configuration-issues)

---

## 1. Configuration Management Fundamentals

### 1.1. Application vs Configuration Separation

Modern application architecture separates application code from configuration data, enabling the same application binary to run in different environments with different settings. This separation is crucial for cloud-native applications that need to adapt to various deployment contexts.

Think of application configuration like cooking recipes. Just as a master chef creates a base recipe (the application) that can be adapted with different ingredients and seasonings (configuration) for different occasions or dietary requirements, applications should be designed to accept configuration externally rather than having it baked in.

**Traditional Coupled Approach:**

```yaml
# Problem: Configuration baked into container image
FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf  # ⚠️ Environment-specific config in image
COPY ssl-certs/ /etc/nginx/certs/      # ⚠️ Production secrets in image
```

**Modern Decoupled Approach:**

```yaml
# Solution: Generic application image + external configuration
FROM nginx:alpine
# No environment-specific files copied into image
# Configuration provided at runtime via ConfigMaps and Secrets
```

### 1.2. Configuration Management Benefits

Separating configuration from application code provides significant operational and development advantages.

**Key Benefits:**

- **Reusability**: Same application image across all environments
- **Security**: Sensitive data managed separately from application code
- **Flexibility**: Configuration changes without rebuilding applications
- **Maintainability**: Clear separation of concerns between dev and ops teams
- **Testing**: Easier to test different configurations with the same code

**Environment Deployment Pattern:**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Development   │    │      Test       │    │   Production    │
│                 │    │                 │    │                 │
│ Same App Image  │    │ Same App Image  │    │ Same App Image  │
│       +         │    │       +         │    │       +         │
│  Dev ConfigMap  │    │ Test ConfigMap  │    │ Prod ConfigMap  │
│  Dev Secrets    │    │ Test Secrets    │    │ Prod Secrets    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 1.3. Kubernetes Configuration Objects

Kubernetes provides two primary objects for managing application configuration: ConfigMaps for non-sensitive data and Secrets for sensitive information.

Like a well-organized kitchen where recipes (ConfigMaps) are kept in a public cookbook for everyone to see, while special ingredients and expensive spices (Secrets) are stored in a locked cabinet with controlled access.

**Configuration Object Types:**

- **ConfigMaps**: Store non-sensitive configuration data (settings, feature flags, URLs)
- **Secrets**: Store sensitive information (passwords, API keys, certificates)
- **Environment Variables**: Simple key-value pairs injected into containers
- **Volume Mounts**: Configuration files mounted into container file systems

`★ Insight ─────────────────────────────────────`
**Configuration separation enables the "build once, deploy anywhere" principle** - the same container image can be deployed across development, staging, and production environments with different configurations, reducing inconsistencies and deployment complexity.
`─────────────────────────────────────────────────`

## 2. ConfigMaps

### 2.1. ConfigMap Fundamentals

ConfigMaps store non-sensitive configuration data in key-value pairs that can be consumed by applications as environment variables, command-line arguments, or configuration files.

ConfigMaps are like recipe cards that contain all the non-secret ingredients and instructions needed to prepare a dish. They're openly shared and can be referenced by multiple chefs (containers) who need the same recipe.

**ConfigMap Structure:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  # Simple key-value pairs
  database_host: "postgres.example.com"
  database_port: "5432"
  log_level: "info"

  # Configuration file content
  nginx.conf: |
     server {
         listen 80;
         server_name example.com;
         location / {
             proxy_pass http://backend;
         }
     }
```

**ConfigMap Data Types:**

- **Simple values**: Basic key-value pairs for environment variables
- **Configuration files**: Multi-line content for application config files
- **JSON/YAML data**: Structured configuration data
- **Binary data**: Encoded binary content (though Secrets are preferred)

### 2.2. Creating ConfigMaps

ConfigMaps can be created from literal values, files, or directories using kubectl commands or YAML manifests.

**Imperative Creation Methods:**

```bash
# From literal values
kubectl create configmap app-config \
  --from-literal=database_host=postgres.example.com \
  --from-literal=database_port=5432 \
  --from-literal=log_level=info

# From configuration file
kubectl create configmap nginx-config \
  --from-file=nginx.conf

# From directory
kubectl create configmap app-configs \
  --from-file=configs/

# From environment file
kubectl create configmap env-config \
  --from-env-file=app.env
```

**Declarative YAML Creation:**

```yaml
# web-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: web-config
  namespace: production
data:
  # Application settings
  APP_NAME: "MyWebApp"
  DEBUG: "false"
  MAX_CONNECTIONS: "100"

  # Feature flags
  ENABLE_FEATURE_X: "true"
  ENABLE_ANALYTICS: "true"

  # External service URLs
  API_ENDPOINT: "https://api.production.example.com"
  CDN_URL: "https://cdn.example.com"

  # Configuration file
  app.properties: |
     server.port=8080
     spring.datasource.url=jdbc:postgresql://postgres:5432/mydb
     logging.level.com.example=INFO
     management.endpoints.web.exposure.include=health,metrics
```

### 2.3. Using ConfigMaps in Pods

ConfigMaps can be consumed by Pods in multiple ways: environment variables, command-line arguments, or mounted volumes.

**Environment Variable Injection:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-app
spec:
  containers:
  - name: app
     image: myapp:latest
     env:
     # Single value from ConfigMap
     - name: DATABASE_HOST
       valueFrom:
         configMapKeyRef:
           name: app-config
           key: database_host

     # All key-value pairs from ConfigMap
     envFrom:
     - configMapRef:
         name: web-config
```

**Volume Mount Configuration:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
spec:
  containers:
  - name: nginx
     image: nginx:alpine
     volumeMounts:
     - name: nginx-config
       mountPath: /etc/nginx/nginx.conf
       subPath: nginx.conf
     - name: app-properties
       mountPath: /app/config
  volumes:
  - name: nginx-config
     configMap:
       name: nginx-config
  - name: app-properties
     configMap:
       name: web-config
       items:
       - key: app.properties
         path: application.properties
```

## 3. Secrets

### 3.1. Secret Fundamentals

Secrets store and manage sensitive information such as passwords, OAuth tokens, SSH keys, and TLS certificates. They provide secure storage and controlled access to confidential data.

Secrets are like a locked spice cabinet in a professional kitchen where expensive or dangerous ingredients are stored. Only authorized chefs have the key, and they know exactly which dishes require these special ingredients.

**Secret vs ConfigMap:**

| Aspect | ConfigMap | Secret |
|--------|-----------|---------|
| **Data Type** | Non-sensitive configuration | Sensitive information |
| **Storage** | Plain text | Base64 encoded |
| **Access Control** | Standard RBAC | Enhanced RBAC + encryption |
| **Use Cases** | App settings, URLs, flags | Passwords, keys, certificates |
| **Visibility** | Visible in cluster | Restricted visibility |

**Common Secret Types:**

```yaml
# Generic secret (default type)
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  username: dXNlcm5hbWU=    # base64 encoded
  password: cGFzc3dvcmQ=    # base64 encoded

# TLS certificate secret
apiVersion: v1
kind: Secret
metadata:
  name: tls-secret
type: kubernetes.io/tls
data:
  tls.crt: LS0tLS1CRUdJTi...  # base64 encoded certificate
  tls.key: LS0tLS1CRUdJTi...  # base64 encoded private key

# Docker registry secret
apiVersion: v1
kind: Secret
metadata:
  name: registry-secret
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: eyJhdXRocyI6...  # base64 encoded registry auth
```

### 3.2. Secret Types and Creation

Kubernetes supports multiple Secret types for different use cases, each with specific data fields and usage patterns.

**Creating Secrets Imperatively:**

```bash
# Generic secret from literals
kubectl create secret generic app-secrets \
  --from-literal=username=admin \
  --from-literal=password=secretpassword

# TLS secret from certificate files
kubectl create secret tls tls-secret \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key

# Docker registry secret
kubectl create secret docker-registry registry-secret \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password=mypassword \
  --docker-email=user@example.com

# SSH key secret
kubectl create secret generic ssh-secret \
  --from-file=ssh-privatekey=/path/to/ssh/key \
  --from-file=ssh-publickey=/path/to/ssh/key.pub
```

**Database Connection Secret Example:**

```yaml
# database-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: production
type: Opaque
data:
  # Base64 encoded values
  host: cG9zdGdyZXMucHJvZHVjdGlvbi5leGFtcGxlLmNvbQ==
  port: NTQzMg==
  database: bXlhcHBkYg==
  username: YXBwdXNlcg==
  password: c3VwZXJzZWNyZXRwYXNzd29yZA==
stringData:
  # Plain text values (automatically base64 encoded)
  connection_string: "postgresql://appuser:supersecretpassword@postgres.production.example.com:5432/myappdb"
```

### 3.3. Using Secrets in Applications

Secrets can be consumed by applications through environment variables or mounted volumes, with different access patterns for different security requirements.

**Environment Variable Usage:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database-client
spec:
  replicas: 1
  selector:
     matchLabels:
       app: database-client
  template:
     metadata:
       labels:
         app: database-client
     spec:
       containers:
       - name: app
         image: myapp:latest
         env:
         # Individual secret values
         - name: DB_USERNAME
           valueFrom:
             secretKeyRef:
               name: database-credentials
               key: username
         - name: DB_PASSWORD
           valueFrom:
             secretKeyRef:
               name: database-credentials
               key: password
         # All secret values as environment variables
         envFrom:
         - secretRef:
             name: database-credentials
```

**Volume Mount Usage:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-server
spec:
  replicas: 2
  selector:
     matchLabels:
       app: web-server
  template:
     metadata:
       labels:
         app: web-server
     spec:
       containers:
       - name: nginx
         image: nginx:alpine
         volumeMounts:
         - name: tls-certs
           mountPath: /etc/nginx/certs
           readOnly: true
         - name: auth-config
           mountPath: /etc/nginx/auth
           readOnly: true
         ports:
         - containerPort: 443
       volumes:
       - name: tls-certs
         secret:
           secretName: tls-secret
       - name: auth-config
         secret:
           secretName: auth-credentials
           items:
           - key: htpasswd
             path: .htpasswd
             mode: 0400
```

## 4. Configuration Patterns

### 4.1. Environment-Specific Configuration

Managing configuration across multiple environments requires careful organization and naming strategies to prevent configuration drift and deployment errors.

**Environment-Based ConfigMap Organization:**

```yaml
# development-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: development
data:
  API_ENDPOINT: "https://api.dev.example.com"
  LOG_LEVEL: "debug"
  CACHE_TTL: "60"
  FEATURE_NEW_UI: "true"

---
# production-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config  # Same name, different namespace
  namespace: production
data:
  API_ENDPOINT: "https://api.example.com"
  LOG_LEVEL: "warn"
  CACHE_TTL: "3600"
  FEATURE_NEW_UI: "false"
```

**Application Deployment Template:**

```yaml
# app-deployment-template.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: ${ENVIRONMENT}
spec:
  replicas: ${REPLICA_COUNT}
  selector:
     matchLabels:
       app: web-app
  template:
     metadata:
       labels:
         app: web-app
     spec:
       containers:
       - name: app
         image: myapp:${VERSION}
         envFrom:
         - configMapRef:
             name: app-config    # Environment-specific ConfigMap
         - secretRef:
             name: app-secrets   # Environment-specific Secrets
```

### 4.2. Configuration File Management

Complex applications often require structured configuration files that need to be managed as complete units rather than individual key-value pairs.

**Multi-File Configuration Example:**

```yaml
# application-configs.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-configs
data:
  # Application configuration
  application.yml: |
     server:
       port: 8080
       servlet:
         context-path: /api

     spring:
       datasource:
         url: jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}
         username: ${DB_USERNAME}
         password: ${DB_PASSWORD}

       redis:
         host: ${REDIS_HOST}
         port: ${REDIS_PORT}

     logging:
       level:
         com.example: ${LOG_LEVEL}
         org.springframework: WARN

  # Logging configuration
  logback.xml: |
     <configuration>
       <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
         <encoder>
           <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
         </encoder>
       </appender>

       <logger name="com.example" level="${LOG_LEVEL:-INFO}"/>

       <root level="INFO">
         <appender-ref ref="STDOUT" />
       </root>
     </configuration>

  # NGINX upstream configuration
  upstream.conf: |
     upstream backend {
         server backend-1:8080 weight=3;
         server backend-2:8080 weight=2;
         server backend-3:8080 weight=1;
     }
```

### 4.3. Dynamic Configuration Updates

Some applications can reload configuration without restart, enabling dynamic updates to running applications.

**ConfigMap Update and Reload Pattern:**

```yaml
# Updated ConfigMap triggers automatic reload
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
  annotations:
     reloader.stakater.com/match: "true"  # Automatic reload trigger
data:
  nginx.conf: |
     events {
         worker_connections 1024;
     }

     http {
         include       /etc/nginx/mime.types;
         default_type  application/octet-stream;

         # Updated configuration
         proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m;

         server {
             listen 80;
             location / {
                 proxy_pass http://backend;
                 proxy_cache my_cache;
                 proxy_cache_valid 200 302 10m;
             }
         }
     }
```

**Application with Configuration Reload:**

```bash
# Update ConfigMap
kubectl patch configmap nginx-config --patch '{"data":{"nginx.conf":"updated content"}}'

# Signal application to reload (if supported)
kubectl exec deployment/nginx-deployment -- nginx -s reload

# Or restart pods to pick up changes
kubectl rollout restart deployment/nginx-deployment
```

## 5. Security and Best Practices

### 5.1. Configuration Security

Proper configuration security involves protecting sensitive data, implementing access controls, and following security best practices for both ConfigMaps and Secrets.

**Security Considerations:**

```yaml
# Secure Secret configuration
apiVersion: v1
kind: Secret
metadata:
  name: secure-credentials
  namespace: production
  annotations:
     # Prevent accidental deletion
     "kubernetes.io/managed-by": "external-system"
type: Opaque
data:
  api_key: <base64-encoded-value>
  database_password: <base64-encoded-value>
immutable: true  # Prevent modifications after creation
```

**RBAC for Configuration Access:**

```yaml
# Restrict Secret access to specific service accounts
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
  namespace: production
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["app-secrets", "database-credentials"]
  verbs: ["get", "list"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: secret-access
  namespace: production
subjects:
- kind: ServiceAccount
  name: app-service-account
  namespace: production
roleRef:
  kind: Role
  name: secret-reader
  apiGroup: rbac.authorization.k8s.io
```

### 5.2. Secret Management Best Practices

**Secret Lifecycle Management:**

1. **Creation**: Use external secret management systems when possible
2. **Rotation**: Implement automated secret rotation
3. **Access**: Limit secret access to necessary service accounts
4. **Auditing**: Monitor secret access and usage
5. **Cleanup**: Remove unused secrets promptly

**External Secret Integration:**

```yaml
# Using External Secrets Operator
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
spec:
  provider:
     vault:
       server: "https://vault.example.com"
       path: "secret"
       auth:
         kubernetes:
           mountPath: "kubernetes"
           role: "my-role"

---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: vault-secret
spec:
  refreshInterval: 15s
  secretStoreRef:
     name: vault-backend
     kind: SecretStore
  target:
     name: app-secrets
     creationPolicy: Owner
  data:
  - secretKey: password
     remoteRef:
       key: myapp
       property: password
```

### 5.3. Troubleshooting Configuration Issues

**Common Configuration Problems:**

1. **ConfigMap/Secret Not Found:**
```bash
# Check resource existence
kubectl get configmap,secret -n <namespace>

# Verify resource names in Pod spec
kubectl describe pod <pod-name>
```

2. **Permission Issues:**
```bash
# Check service account permissions
kubectl auth can-i get secrets --as=system:serviceaccount:<namespace>:<sa-name>

# Verify RBAC rules
kubectl describe rolebinding -n <namespace>
```

3. **Base64 Encoding Issues:**
```bash
# Decode secret values for debugging
kubectl get secret <secret-name> -o jsonpath='{.data.password}' | base64 -d

# Create properly encoded secrets
echo -n "mysecret" | base64
```

4. **Configuration Not Loading:**
```bash
# Check environment variables in Pod
kubectl exec <pod-name> -- env | grep CONFIG

# Verify mounted files
kubectl exec <pod-name> -- ls -la /path/to/config

# Check Pod events for mount errors
kubectl describe pod <pod-name>
```

`★ Insight ─────────────────────────────────────`
**Configuration management is about more than just storing data** - it's about implementing secure, maintainable, and scalable patterns that enable teams to deploy the same application across different environments while maintaining security boundaries and operational simplicity.
`─────────────────────────────────────────────────`

---

## Chapter Summary

ConfigMaps and Secrets provide essential configuration management capabilities for cloud-native applications, enabling the separation of application code from configuration data. This separation supports the "build once, deploy anywhere" principle while maintaining security and operational flexibility.

Like a professional kitchen where recipes (ConfigMaps) are shared openly while special ingredients and seasonings (Secrets) are kept secure, Kubernetes configuration management balances accessibility with security through proper separation of concerns.

**Key Configuration Concepts:**

- **Separation of Concerns**: Application code and configuration managed independently
- **Environment Portability**: Same application image with different configurations
- **Security Boundaries**: Sensitive data protected through Secrets
- **Dynamic Updates**: Configuration changes without application rebuilds
- **Access Control**: RBAC-based configuration access management

**Configuration Components:**

- **ConfigMaps**: Non-sensitive configuration data (URLs, settings, feature flags)
- **Secrets**: Sensitive information (passwords, API keys, certificates)
- **Environment Variables**: Simple key-value configuration injection
- **Volume Mounts**: File-based configuration delivery

**When to Use Configuration Objects:**

- **ConfigMaps for**: Application settings, feature flags, API endpoints, non-sensitive URLs
- **Secrets for**: Database passwords, API keys, TLS certificates, authentication tokens
- **Environment Variables for**: Simple configuration values and feature toggles
- **Volume Mounts for**: Complex configuration files and structured configuration data

**Configuration Best Practices:**

- Use external secret management systems for production environments
- Implement proper RBAC for configuration access control
- Version configuration changes alongside application deployments
- Monitor configuration usage and access patterns
- Automate secret rotation and lifecycle management
- Test configuration changes in non-production environments first

**Security Considerations:**

- Never commit secrets to version control systems
- Use immutable secrets for production environments
- Implement least-privilege access for configuration resources
- Audit configuration access and modifications
- Encrypt secrets at rest and in transit

ConfigMaps and Secrets enable true cloud-native configuration management, providing the flexibility and security needed for modern application deployment patterns while supporting operational best practices for enterprise environments.

---

**Navigation:**
- **Previous:** [11. Kubernetes Storage](11-kubernetes-storage.md)
- **Next:** [13. StatefulSets](13-statefulsets.md)
- **Up:** [Table of Contents](index.md)