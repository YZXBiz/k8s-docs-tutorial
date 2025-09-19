Skip to Content
16: Threat modeling Kubernetes
Security is more important than ever, and Kubernetes is no exception. Fortunately, there’s a lot you can do to secure Kubernetes, and you’ll see some ways in the next chapter. However, before doing that, it’s a good idea to model some of the common threats.

Threat modeling
Threat modeling is the process of identifying vulnerabilities so you can put measures in place to prevent and mitigate them. This chapter introduces the popular STRIDE model and shows how you can apply it to Kubernetes.

STRIDE defines six potential threat categories:

Spoofing
Tampering
Repudiation
Information disclosure
Denial of service
Elevation of privilege
While the model is good and provides a structured way to assess things, no model guarantees to cover all threats.

For the rest of this chapter, we’ll look at each of the six threat categories. For each one, we’ll give a quick description and then look at some of the ways it applies to Kubernetes.

The chapter doesn’t try to cover everything. The goal is to give you ideas and get you started.

Spoofing
Spoofing is pretending to be somebody else with the aim of gaining extra privileges.

Let’s look at some of the ways Kubernetes prevents different types of spoofing.

Securing communications with the API server
Kubernetes comprises lots of small components that work together. These include the API server, controller manager, scheduler, cluster store, and others. It also includes node components such as the kubelet and container runtime. Each has its own privileges that allow it to interact with and modify the cluster. Even though Kubernetes implements a least-privilege model, spoofing the identity of any of these can cause problems.

If you read the RBAC and API security chapter, you’ll know that Kubernetes requires all components to authenticate via cryptographically signed certificates (mTLS). This is good, and Kubernetes makes it easy by automatically rotating certificates. However, you must consider the following:

A typical Kubernetes installation auto-generates a self-signed certificate authority (CA) that issues certificates to all cluster components. While this is better than nothing, it’s not enough for production environments on its own.
Mutual TLS (mTLS) is only as secure as the CA issuing the certificates. Compromising the CA can render the entire mTLS layer ineffective. With this in mind, it’s vital you keep the CA secure!
A good practice is to ensure that certificates issued by the internal Kubernetes CA are only used and trusted within the Kubernetes cluster. This requires careful approval of certificate signing requests, as well as ensuring the Kubernetes CA doesn’t get added as a trusted CA for any systems outside the cluster.

As mentioned in previous chapters, all internal and external requests to the API server are subject to authentication and authorization checks. As a result, the API server needs a way to authenticate (trust) internal and external sources. A good way to do this is to have two trusted key pairs:

One for authenticating internal systems
A second for authenticating external systems
In this model, you’d use the cluster’s self-signed CA to issue keys to internal systems. You’d then configure Kubernetes to trust one or more trusted 3rd-party CAs for external systems.

Securing Pod communications
As well as spoofing access to the cluster, there’s also the threat of spoofing app-to-app communications. In Kubernetes, this can be when one Pod spoofs another. Fortunately, Pods can have certificates to authenticate their identity.

Every Pod has an associated ServiceAccount that is used to provide an identity for the Pod. This is achieved by automatically mounting a service account token into every Pod as a Secret. Two points to note:

The service account token allows access to the API server
Most Pods probably don’t need to access the API server
With these two points in mind, you should set automountServiceAccountToken to false for Pods that don’t need to communicate with the API server. The following Pod manifest shows how to do this.

apiVersion: v1
kind: Pod
metadata:
  name: service-account-example-pod
spec:
  serviceAccountName: some-service-account
  automountServiceAccountToken: false       <<---- This line
  <Snip>
If the Pod does need to talk to the API server, the following non-default configurations are worth exploring:

expirationSeconds
audience
These let you force a time when the token will expire and restrict the entities it works with. The following example, inspired from the official Kubernetes docs, sets an expiry period of one hour and restricts it to the vault audience in a projected volume.

apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  containers:
  - image: nginx
    name: nginx
    volumeMounts:
    - mountPath: /var/run/secrets/tokens
      name: vault-token
  serviceAccountName: my-pod
  volumes:
  - name: vault-token
    projected:
      sources:
      - serviceAccountToken:
          path: vault-token
          expirationSeconds: 3600     <<---- This line
          audience: vault             <<---- And this one
Tampering
Tampering is the act of changing something in a malicious way to cause one of the following:

Denial of service: Tampering with the resource to make it unusable
Elevation of privilege: Tampering with a resource to gain additional privileges
Tampering can be hard to avoid, so a common countermeasure is to make it obvious when something has been tampered with. A common non-Kubernetes example is packaging medication — most over-the-counter drugs are packaged with tamper-proof seals that make it obvious if the product has been tampered with.

Tampering with Kubernetes components
Tampering with any of the following Kubernetes components can cause problems:

etcd
Configuration files for the API server, controller-manager, scheduler, etcd, and kubelet
Container runtime binaries
Container images
Kubernetes binaries
Generally speaking, tampering happens either in transit or at rest. In transit refers to data while it is being transmitted over the network, whereas at rest refers to data stored in memory or on disk.

TLS is a great tool for protecting against in-transit tampering as it provides built-in integrity guarantees that warn you when data has been tampered with.

The following recommendations can also help prevent tampering with data when it is at rest in Kubernetes:

Restrict access to the servers that are running Kubernetes components, especially control plane components
Restrict access to repositories that store Kubernetes configuration files
Only perform remote bootstrapping over SSH (remember to keep your SSH keys safe)
Always run SHA-2 checksums against downloads
Restrict access to your image registry and associated repositories
This isn’t an exhaustive list. However, implementing it will significantly reduce the chances of your data being tampered with while at rest.

As well as the items listed, it’s good production hygiene to configure auditing and alerting for important binaries and configuration files. If configured and monitored correctly, these can help detect potential tampering attacks.

The following example uses a common Linux audit daemon to audit access to the docker binary. It also audits attempts to change the binary’s file attributes.

$ auditctl -w /usr/bin/docker -p wxa -k audit-docker
We’ll refer to this example later in the chapter.

Tampering with applications running on Kubernetes
Malicious actors will also target application components, as well as infrastructure components.

A good way to prevent a live Pod from being tampered with is setting its filesystems to read-only. This guarantees filesystem immutability and you can configure it via the securityContext section of a Pod manifest file.

You can make a container’s root filesystem read-only by setting the readOnlyRootFilesystem property to true. You can do the same for other container filesystems via the allowedHostPaths property.

The following YAML shows how to configure both settings in a Pod manifest. In the example, the allowedHostPaths section makes sure anything mounted beneath /test will be read-only.

apiVersion: v1
kind: Pod
metadata:
  name: readonly-test
spec:
  securityContext:
    readOnlyRootFilesystem: true     <<---- R/O root filesystem
    allowedHostPaths:                <<---- Make anything below 
      - pathPrefix: "/test"          <<---- this mount point
        readOnly: true               <<---- read-only (R/O)
<Snip>
Repudiation
At a very high level, repudiation creates doubt about something. Non-repudiation provides proof about something. In the context of information security, non-repudiation is proving certain individuals carried out certain actions.

Digging a little deeper, non-repudiation includes the ability to prove:

What happened
When it happened
Who made it happen
Where it happened
Why it happened
How it happened
Answering the last two can be the hardest and usually requires the correlation of several events over a period of time.

Auditing Kubernetes API server events can help answer these questions. The following is an example of an API server audit event (you may need to enable auditing on your API server).

{
  "kind":"Event",
  "apiVersion":"audit.k8s.io/v1",
  "metadata":{ "creationTimestamp":"2022-11-11T10:10:00Z" },
  "level":"Metadata",
  "timestamp":"2022-11-11T10:10:00Z",
  "auditID":"7e0cbccf-8d8a-4f5f-aefb-60b8af2d2ad5",
  "stage":"RequestReceived",
  "requestURI":"/api/v1/namespaces/default/persistentvolumeclaims",
  "verb":"list",
  "user": {
    "username":"fname.lname@example.com",
    "groups":[ "system:authenticated" ]
  },
  "sourceIPs":[ "123.45.67.123" ],
  "objectRef": {
    "resource":"persistentvolumeclaims",
    "namespace":"default",
    "apiVersion":"v1"
  },
  "requestReceivedTimestamp":"2022-11-11T10:10:00.123456Z",
  "stageTimestamp":"2022-11-11T10:10:00.123456Z"
}
The API server isn’t the only component you should audit for non-repudiation. At a minimum, you should collect audit logs from container runtimes, kubelets, and the applications running on your cluster. You should also audit non-Kubernetes infrastructure, such as network firewalls.

As soon as you start auditing multiple components, you’ll need a centralized location to store and correlate events. A common way to do this is deploying an agent to all nodes via a DaemonSet. The agent collects logs (runtime, kubelet, application, etc) and ships them to a secure central location.

If you do this, the centralized log store must be secure. If it isn’t, you won’t be able to trust the logs, and their contents can be repudiated.

To provide non-repudiation relative to tampering with binaries and configuration files, it might be useful to use an audit daemon that watches for write actions on certain files and directories on your Kubernetes control plane nodes and worker nodes. For example, earlier in the chapter you saw a way to enable auditing of changes to the docker binary. With this enabled, starting a new container with the docker run command will generate an event like this:

type=SYSCALL msg=audit(1234567890.123:12345): arch=abc123 syscall=59 success=yes \
exit=0 a0=12345678abca1=0 a2=abc12345678 a3=a items=1 ppid=1234 pid=12345 auid=0 \
uid=0 gid=0 euid=0 suid=0 fsuid=0 egid=0 sgid=0 fsgid=0 tty=pts0 ses=1 comm="docker" \
exe="/usr/bin/docker" subj=system_u:object_r:container_runtime_exec_t:s0 \
key="audit-docker" type=CWD msg=audit(1234567890.123:12345):  cwd="/home/firstname"\
type=PATH msg=audit(1234567890.123:12345): item=0 name="/usr/bin/docker"\
 inode=123456 dev=fd:00 mode=0100600 ouid=0 ogid=0 rdev=00:00...
When combined and correlated with Kubernetes’ audit features, audit logs like this create a comprehensive and trustworthy picture that cannot be repudiated.

Information Disclosure
Information disclosure is when sensitive data is leaked. Common examples include hacked data stores and APIs that unintentionally expose sensitive data.

Protecting cluster data
The entire configuration of a Kubernetes cluster is stored in the cluster store (usually etcd). This includes network and storage configuration, passwords, the cluster CA, and more. This makes the cluster store a prime target for information disclosure attacks.

As a minimum, you should limit and audit access to the nodes hosting the cluster store. As you’ll see in the next paragraph, gaining access to a cluster node can allow the logged-on user to bypass some security layers.

Kubernetes 1.7 introduced encryption of Secrets but doesn’t enable it by default. Even when this becomes the default, the data encryption key (DEK) is stored on the same node as the Secret! This means gaining access to a node lets you to bypass encryption. This is especially worrying on nodes that host the cluster store (etcd nodes).

Kubernetes 1.11 shipped with Key Management Service (KMS v1) as a beta feature allowing you to store key encryption keys (KEK) outside of your Kubernetes cluster. KEKs are used to encrypt and decrypt data encryption keys (DEK) and should be safely guarded. We call this approach “envelope encryption”.

Since then, we’ve entirely redesigned KMS and replaced the old KMS v1 with KMS v2 which has been generally available (GA) since Kubernetes v1.29. It’s a total redesign with many improvements, including:

Generating a new DEK for each encryption — a new DEK is generated for every write operation and encrypted at rest with KEK
The cache size for KMS v2 plugins is only limited by underlying control plane node resources. This allows previous DEKs to be cached in memory for faster encryption and decryption operation
Zero downtime re-encryption operations — Re-encryption of secrets after key rotations no longer requires API server downtime or Pod restarts
KMS plugins run on control plane nodes and communicate with the API server via Unix sockets. KMS plugins then connect to an external KMS providers to handle the encryption and decryption of Data Encryption Keys (DEKs).
All of this means that attackers now need to compromise the Kubernetes control plane as well as the external KMS. A snapshot of a control plane node is not enough to read a Secret in plain text. For this reason, you should seriously consider storing your KEKs in Hardware Security Modules (HSM) or cloud-based Key Management Stores (KMS). Also, as with all things cryptography, you should follow the trust but verify model and ensure that the KMS v2 plugin based encryption is working as expected and plan for contingencies such as a lost KEK or loss of connectivity to external KMS provider.

Protecting data in Pods
As previously mentioned, Kubernetes has an API resource called a Secret that is the preferred way to store and share sensitive data such as passwords. For example, a front-end container accessing an encrypted back-end database can have the key to decrypt the database mounted as a Secret. This is far better than storing the decryption key in a plain-text file or environment variable.

It is also common to store data and configuration information outside of Pods and containers in Persistent Volumes and ConfigMaps. If the data on these is encrypted, you should store the keys for decrypting them in Secrets.

Despite all of this, you must consider the caveats outlined in the previous section relative to Secrets and how their encryption keys are stored. You don’t want to do the hard work of locking the house but leaving the keys in the door.

Denial of Service
Denial of Service (DoS) is about making something unavailable.

There are many types of DoS attacks, but a well-known variation is overloading a system to the point it can no longer service requests. In the Kubernetes world, a potential attack might be overloading the API server so that cluster operations grind to a halt (even internal systems use the API server to communicate).

Let’s look at some potential Kubernetes systems that might be targets of DoS attacks, as well as some ways to protect and mitigate them.

Protecting cluster resources against DoS attacks
It’s a time-honored best practice to replicate essential services on multiple nodes for high availability (HA). Kubernetes is no different, and you should run multiple control plane nodes in an HA configuration for your production environments. Doing this prevents any control plane node from becoming a single point of failure. In relation to certain types of DoS attacks, an attacker may need to attack more than one control plane node to have a meaningful impact.

You should also replicate control plane nodes across availability zones. This may prevent a DoS attack on the network of a particular availability zone from taking down your entire control plane.

The same principle applies to worker nodes. Having multiple worker nodes not only allows the scheduler to spread your applications over multiple availability zones, but it may also render DoS attacks on any single node or zone ineffective (or less effective).

You should also configure appropriate limits for the following:

Memory
CPU
Storage
Limits like these can help prevent essential system resources from being starved, therefore preventing potential DoS.

Limiting Kubernetes objects can also be a good practice. This includes limiting things such as the number of ReplicaSets, Pods, Services, Secrets, and ConfigMaps in a particular Namespace.

Here’s an example manifest that limits the number of Pod objects in the skippy Namespace to 100.

apiVersion: v1
kind: ResourceQuota
metadata:
  name: pod-quota
  namespace: skippy
spec:
  hard:
    pods: "100"
One more feature — podPidsLimit — restricts the number of processes a Pod can create.

Assume a Pod is the target of a fork bomb attack where a rogue process attempts to bring the system down by creating enough processes to consume all system resources. If you’ve configured the Pod with podPidsLimit to restrict the number of processes the Pod can create, you’ll prevent it from exhausting the node’s resources and confine the attack’s impact to the Pod. Kubernetes will normally restart a Pod if it exhausts its podPidsLimit.

This also ensures a single Pod doesn’t exhaust the PID range for all the other Pods on the node, including the kubelet. However, setting the correct value requires a reasonable estimate of how many Pods will run simultaneously on each node, and you can easily over or under-allocate PIDs to each pod without a ballpark estimate.

Protecting the API Server against DoS attacks
The API server exposes a RESTful interface over a TCP socket. This makes it a target for botnet-based DoS attacks.

The following may be helpful in either preventing or mitigating such attacks:

Highly available control plane nodes — multiple replicas of the API server running on multiple nodes across multiple availability zones
Monitoring and alerting on API server requests based on sane thresholds
Using things like firewalls to limit API server exposure to the internet
As well as botnet DoS attacks, an attacker may also attempt to spoof a user or other control plane service to cause an overload. Fortunately, Kubernetes has robust authentication and authorization controls to prevent spoofing. However, even with a robust RBAC model, you must safeguard access to accounts with high privileges.

Protecting the cluster store against DoS attacks
Kubernetes stores cluster configuration in etcd. This makes it vital that etcd be available and secure. The following recommendations help accomplish this:

Configure an HA etcd cluster with either 3 or 5 nodes
Configure monitoring and alerting of requests to etcd
Isolate etcd at the network level so that only members of the control plane can interact with it
A default installation of Kubernetes installs etcd on the same servers as the rest of the control plane. This is fine for development and testing. However, large production clusters should seriously consider a dedicated etcd cluster. This will provide better performance and greater resilience.

On the performance front, etcd is the most common choking point for large Kubernetes clusters. With this in mind, you should perform testing to ensure the infrastructure it runs on is capable of sustaining performance at scale — a poorly performing etcd can be as bad as an etcd cluster under a sustained DoS attack. Operating a dedicated etcd cluster also provides additional resilience by protecting it from other parts of the control plane that might be compromised.

Monitoring and alerting of etcd should be based on sane thresholds, and a good place to start is by monitoring etcd log entries.

Protecting application components against DoS attacks
Most Pods expose their main service on the network, and without additional controls in place, anyone with access to the network can perform a DoS attack on the Pod. Fortunately, Kubernetes provides Pod resource request limits to prevent such attacks from exhausting Pod and node resources. As well as these, the following will be helpful:

Define Kubernetes Network Policies to restrict Pod-to-Pod and Pod-to-external communications
Utilize mutual TLS and API token-based authentication for application-level authentication (reject any unauthenticated requests)
For defense in depth, you should also implement application-layer authorization policies that implement the least privilege.

Figure 16.1 shows how these can be combined to make it hard for an attacker to successfully DoS an application.

Figure 16.1
Figure 16.1
Elevation of privilege
Privilege escalation is gaining higher access than what is granted. The aim is to cause damage or gain unauthorized access.

Let’s look at a few ways to prevent this in a Kubernetes environment.

Protecting the API server
Kubernetes offers several authorization modes that help safeguard access to the API server. These include:

Role-based Access Control (RBAC)
Webhook
Node
You should run multiple authorizers at the same time. For example, it’s common to use the RBAC and node authorizers.

RBAC mode lets you restrict API operations to sub-sets of users. These users can be regular user accounts or system services. The idea is that all requests to the API server must be authenticated and authorized. Authentication ensures that requests come from a validated user, whereas authorization ensures the validated user can perform the requested operation. For example, can Mia create Pods? In this example, Mia is the user, create is the operation, and Pods is the resource. Authentication makes sure that it really is Mia making the request, and authorization determines if she’s allowed to create Pods.

Webhook mode lets you offload authorization to an external REST-based policy engine. However, it requires additional effort to build and maintain the external engine. It also makes the external engine a potential single point of failure for every request to the API server. For example, if the external webhook system becomes unavailable, you may be unable to make any requests to the API server. With this in mind, you should be rigorous in vetting and implementing any webhook authorization service.

Node authorization is all about authorizing API requests made by kubelets (Nodes). The types of requests made to the API server by kubelets are obviously different from those generally made by regular users, and the node authorizer is designed to help with this.

Protecting Pods
The following few sections will look at a few technologies that help reduce the risk of elevation of privilege attacks against Pods and containers. We’ll look at the following:

Preventing processes from running as root
Dropping capabilities
Filtering syscalls
Preventing privilege escalation
As you proceed through these sections, it’s important to remember that a Pod is just an execution environment for one or more containers. Some of the terminology used will refer to Pods and containers interchangeably, but usually we will mean container.

Do not run processes as root
The root user is the most powerful user on a Linux system and is always User ID 0 (UID 0). This means running application processes as root is almost always a bad idea as it grants the application process full access to the container. This is made even worse by the fact the root user of a container sometimes has unrestricted root access to the host system as well. If that doesn’t make you afraid, nothing will!

Fortunately, Kubernetes allows you to force container processes to run as unprivileged non-root users.

The following Pod manifest configures all containers that are part of this Pod to run processes as UID 1000. If the Pod has multiple containers, all container processes will run as UID 1000.

apiVersion: v1
kind: Pod
metadata:
  name: demo
spec:
  securityContext:      <<---- Applies to all containers in this Pod
    runAsUser: 1000     <<---- Non-root user
  containers:
  - name: demo
    image: example.io/simple:1.0
The runAsUser property is one of many settings that fall under the category of PodSecurityContext (spec.securityContext).

It’s possible for two or more Pods to be configured with the same runAsUser UID. When this happens, the containers from both Pods will run with the same security context and potentially have access to the same resources. This might be fine if they are replicas of the same Pod. However, there’s a high chance this will cause problems if they’re not replicas. For example, two different containers with R/W access to the same volume can cause data corruption (both writing to the same dataset without coordinating write operations). Shared security contexts also increase the possibility of a compromised container tampering with a dataset it shouldn’t have access to.

With this in mind, it is possible to use the securityContext.runAsUser property at the container level instead of at the Pod level:

apiVersion: v1
kind: Pod
metadata:
  name: demo
spec:
  securityContext:      <<---- Applies to all containers in this Pod
    runAsUser: 1000     <<---- Non-root user
  containers:
  - name: demo
    image: example.io/simple:1.0
    securityContext:
      runAsUser: 2000   <<---- Overrides the Pod-level setting
This example sets the UID to 1000 at the Pod level but overrides it at the container level so that processes in the demo container run as UID 2000. Unless otherwise specified, all other containers in the Pod will use UID 1000.

A couple of other things that might help get around the issue of multiple Pods and containers using the same UID include:

User namespaces
Maintaining a map of UID usage
User namespaces is a Linux kernel technology that allows a process to run as root within a container but run as a different user outside the container. For example, a process can run as UID 0 (the root user) inside the container but get mapped to UID 1000 on the host. This can be a good solution for processes that need to run as root inside the container. However, you should check if it is fully-supported by your version of Kubernetes and your container runtime.

Capability dropping
While most applications don’t need the complete set of root capabilities, they usually require more capabilities than a typical non-root user.

What we need, is a way to grant the exact set of privileges a process requires in order to run. Enter capabilities.

Time for a quick bit of background.

We’ve already said the root user is the most powerful user on a Linux system. However, its power is a combination of lots of small privileges that we call capabilities. For example, the SYS_TIME capability allows a user to set the system clock, whereas the NET_ADMIN capability allows a user to perform network-related operations such as modifying the local routing table and configuring local interfaces. The root user holds every capability and is, therefore, extremely powerful.

Having a modular set of capabilities allows you to be extremely granular when granting permissions. Instead of an all-or-nothing (root –vs– non-root) approach, you can grant a process the exact set of capabilities required.

There are currently over 30 capabilities, and choosing the right ones can be daunting. With this in mind, many container runtimes implement a set of sensible defaults that allow most processes to run without leaving all the doors open. While sensible defaults like these are better than nothing, they’re often not good enough for production environments.

A common way to find the absolute minimum set of capabilities an application requires, is to run it in a test environment with all capabilities dropped. This causes the application to fail and log messages about the missing permissions. You map those permissions to capabilities, add them to the application’s Pod spec, and run the application again. You rinse and repeat this process until the application runs properly with the minimum set of capabilities.

As good as this is, there are a few things to consider.

Firstly, you must perform extensive testing of each application. The last thing you want is a production edge case that you hadn’t accounted for in your test environment. Such occurrences can crash your application in production!

Secondly, every application revision requires the same extensive testing against the capability set.

With these considerations in mind, it is vital that you have testing procedures and production release processes that can handle all of this.

By default, Kubernetes implements your chosen container runtime’s default set of capabilities (E.g., containerd). However, you can override this as part of a container’s securityContext field.

The following Pod manifest shows how to add the NET_ADMIN and CHOWN capabilities to a container.

apiVersion: v1
kind: Pod
metadata:
  name: capability-test
spec:
  containers:
  - name: demo
    image: example.io/simple:1.0
    securityContext:
      capabilities:
        add: ["NET_ADMIN", "CHOWN"]
Filter syscalls
Seccomp, short for secure computing, is similar in concept to capabilities but works by filtering syscalls rather than capabilities.

The way an application asks the Linux kernel to perform an operation is by issuing a syscall. seccomp lets you control which syscalls a particular container can make to the host kernel. As with capabilities, you should implement a least privilege model where the only syscalls a container can make are the ones it needs in order to run.

Seccomp went GA in Kubernetes 1.19, and you can use it in different ways based on the following seccomp profiles:

Non-blocking: Allows a Pod to run, but records every syscall to an audit log you can use to create a custom profile. The idea is to extensively test your application Pod in a dev/test environment. After that, you’ll have a log file listing every syscall the Pod needs in order to run. You then use this to create a custom profile that only allows those syscalls (least privilege).
Blocking: Blocks all syscalls. It’s extremely secure but prevents a Pod from doing anything useful.
Runtime Default: Forces a Pod to use the seccomp profile defined by its container runtime. This is a common place to start if you still need to create a custom profile. Profiles that ship with container runtimes are designed to be a balance of usable and secure. They’re also thoroughly tested.
Custom: A profile that only allows the syscalls your application needs in order to run. Everything else is blocked. It’s common to extensively test your application in dev/test environment with a non-blocking profile that records all syscalls to an audit log. You then use this log to identify your app’s syscalls and build the customized profile. The danger with this approach is that your app has some edge cases you miss during testing. If this happens, your application can fail in production when it hits an edge case and uses a syscall not captured during testing.
Custom profiles operate the least privilege model and are the preferred approach from a security perspective.

Mandatory Access Controls
Seccomp filters and Capabilities are great tools for helping us run processes with restricted privileges. However, we can take things even further with mandatory access control (MAC) systems such as AppArmor and SELinux. These are Linux-only technologies that you configure at the Kubernetes node level and then apply them to Pods via Pod Security Contexts.

Both technologies control how processes interact with other system resources and can be hard to configure. However, tools are available that simplify configuration by reading audit logs and generating profiles that you can test and tweak. However, once enabled, they are mandatory. This is different from seccomp and Capabilities, which are voluntary.

Some container runtimes apply a default SELinux profile to all containers. However, you can override this via the Pod’s securityContext field.

A word of caution though. AppArmor and SELinux are powerful enforcement points that can stop your apps from working if misconfigured. As such, you should perform extensive testing before implementing them.

Prevent privilege escalation by containers
The only way to create a new process in Linux is for one process to clone itself and then load new instructions onto the new process. We’re over-simplifying, but the original process is called the parent process, and the copy is called the child process.

By default, Linux allows a child process to claim more privileges than its parent. This is usually a bad idea. In fact, you’ll often want a child process to have the same or fewer privileges than its parent. This is especially true for containers, as their security configurations are defined against their initial configuration and not against potentially escalated privileges.

Fortunately, it’s possible to prevent privilege escalation through the securityContext property of individual containers, as shown.

apiVersion: v1
kind: Pod
metadata:
  name: demo
spec:
  containers:
  - name: demo
    image: example.io/simple:1.0
    securityContext:
      allowPrivilegeEscalation: false    <<---- This line
Standardizing Pod Security with PSS and PSA
Modern Kubernetes clusters implement two technologies to help enforce Pod security settings:

Pod Security Standards (PSS) are policies that specify required Pod security settings
Pod Security Admission (PSA) enforces one or more PSS policies when Pods are created
Both work together for effective centralized enforcement of Pod security — you choose which PSS policies to apply, and PSA enforces them.

Pod Security Standards (PSS)
Every Kubernetes cluster gets the following three PSS policies that are maintained and kept up-to-date by the community:

Privileged
Baseline
Restricted
Privileged is a wide-open allow-all policy.

Baseline implements sensible defaults. It’s more secure than the privileged policy but less secure than restricted.

Restricted is the gold standard that implements the current Pod security best practices. Be warned though, it’s highly restricted, and lots of Pods will fail to meet its strict requirements.

At the time of writing, you cannot tweak or modify any of these policies, and you cannot import others or create your own.

Pod Security Admission (PSA)
Pod Security Admission (PSA) enforces your desired PSS policies. It works at the Namespace level and is implemented as a validating admission controller.

PSA offers three enforcement modes:

Warn: Allows violating Pods to be created but issues a user-facing warning
Audit: Allows violating Pods to be created but logs an audit event
Enforce: Rejects Pods if they violate the policy
It’s a good practice to configure every Namespace with at least the baseline policy configured to either warn or audit. This allows you to start gathering data on which Pods are failing the policy and why. The next step is to enforce the baseline policy and start warning and auditing on the restricted policy.

Any Namespaces without a Pod Security configuration are a gap in your security configuration, and you should attach a policy as soon as possible, even if it’s only warning and auditing.

Applying the following label to a Namespace will apply the baseline policy to it. It will allow violating Pods to run but will generate a user-facing warning.

pod-security.kubernetes.io/warn: baseline
The format of the label is <prefix>/<mode>: <policy> with the following options:

Prefix is always pod-security.kubernetes.io
Mode is one of warn, audit, or enforce
Policy is always one of privileged, baseline or restricted
PSAs operate as validating admission controllers, meaning they cannot modify Pods. They also cannot have any impact on running Pods.

PSA examples
Let’s walk through some examples to show you Pod Security Admission in action. You’ll complete the following steps:

Create a Namespace called psa-test
Apply a label to enforce the baseline PSS policy
Attempt to deploy a Pod that runs a privileged container (will fail)
Modify the Pod to conform to the PSS policy and re-deploy it (will work)
Test the potential impact of switching to the restricted policy
Switch to the restricted policy
Test any impact on existing Pods
You’ll need kubectl, a Kubernetes cluster, and a local clone of the book’s GitHub repo if you want to follow along. See Chapter 3 if you need these.

You can clone the book’s GitHub repo and switch to the 2025 branch with the following commands.

$ git clone https://github.com/nigelpoulton/TKB.git
<Snip>

$ cd TKB

$ git fetch origin

$ git checkout -b 2025 origin/2025
Be sure to run the following commands from the psa directory.

Run the following command to create a new Namespace called psa-test.

$ kubectl create ns psa-test
Add the pod-security.kubernetes.io/enforce=baseline label to the new Namespace. This will prevent the creation of any new Pods violating the baseline PSS policy.

$ kubectl label --overwrite ns psa-test \
    pod-security.kubernetes.io/enforce=baseline
Verify the label was correctly applied.

$ kubectl describe ns psa-test

Name:         psa-test
Labels:       kubernetes.io/metadata.name=psa-test
              pod-security.kubernetes.io/enforce=baseline   <<---- label correctly applied
Annotations:  <none>
Status:       Active
The Namespace is created and the baseline policy enforced.

The following YAML is from the psa-pod.yml file and defines a privileged container that violates the baseline policy.

apiVersion: v1
kind: Pod
metadata:
  name: psa-pod
  namespace: psa-test     <<---- Deploy it to the new psa-test Namespace
spec:
  containers:
  - name: psa-ctr
    image: nginx
    securityContext:
      privileged: true    <<---- Violates the baseline policy
Deploy it with the following command.

$ kubectl apply -f psa-pod.yml

Error from server (Forbidden): error when creating "psa-pod.yml": pods "psa-pod" is 
forbidden: violates PodSecurity "baseline:latest": privileged (container "psa-ctr" 
must not set securityContext.privileged=true)
The output shows the Pod creation was forbidden and lists the reason why.

Edit the psa-pod.yml and change the container’s securityContext.privileged to false and save your changes.

apiVersion: v1
kind: Pod
<Snip>
spec:
  containers:
  - name: psa-ctr
    image: nginx
    securityContext:
      privileged: false        <<---- Change from true to false
Now try to deploy the Pod.

$ kubectl apply -f psa-pod.yml
pod/psa-pod created
It passed the requirements for the baseline policy and was successfully deployed.

You can use the --dry-run=server flag to test the impact of applying a PSS policy to a Namespace. Using this flag will not apply the policy.

$ kubectl label --dry-run=server --overwrite ns psa-test \
    pod-security.kubernetes.io/enforce=restricted

Warning: existing pods in namespace "psa-test" violate the new PodSecurity enforce 
level "restricted:latest"
Warning: psa-pod: allowPrivilegeEscalation != false, unrestricted capabilities, 
runAsNonRoot != true, seccompProfile
<Snip>
The output shows the psa-pod Pod fails to meet four policy requirements:

The allowPrivilegeEscalation property is not set to false
It’s running unrestricted capabilities
The runAsNonRoot field is not set to true
It fails the seccompProfile test
Go ahead and apply the policy to the Namespace and see if it impacts the psa-pod that is already running.

$ kubectl label --overwrite ns psa-test \
    pod-security.kubernetes.io/enforce=restricted

Warning: existing pods in namespace "psa-test" violate the new PodSecurity enforce level 
"restricted:latest"
Warning: psa-pod: allowPrivilegeEscalation != false, unrestricted capabilities, 
runAsNonRoot != true, seccompProfile
namespace/psa-test labeled

$ kubectl get pods --namespace psa-test

NAME      READY   STATUS    RESTARTS   AGE
psa-pod   1/1     Running   0          3m9s
You get the same warning message, but it doesn’t terminate existing Pods. This is because PSA runs as an admission controller and, therefore, only acts on the creation and modification of Pods.

Finally, it’s possible to configure multiple policies and modes against a single Namespace. In fact, it’s a common practice to do this.

The following example applies three labels to the psa-test Namespace. They enforce the baseline policy, and warn and audit against the restricted policy. This is a good way to implement the baseline policy and prepare for restricted.

$ kubectl label --overwrite ns psa-test \
    pod-security.kubernetes.io/enforce=baseline \
    pod-security.kubernetes.io/warn=restricted \
    pod-security.kubernetes.io/audit=restricted
You can run a kubectl describe ns psa-test command to ensure the labels were applied.

Alternatives to Pod Security Admission
As previously mentioned, PSS and PSA have limitations. These include being implemented as a validating admission controller and being unable to modify, import, or create your own policies. If you need more than PSS and PSA can offer, you may want to consider the following 3rd-party solutions:

OPA Gatekeeper
Kubewarden
Kyverno
Others also exist.

Towards a more secure Kubernetes
As demonstrated by the following examples, Kubernetes is on a continual journey towards better security.

Starting with Kubernetes v1.26, all binary artifacts and container images used to build Kubernetes clusters are cryptographically signed.

The Kubernetes community maintains an official feed for all publicly announced Kubernetes vulnerabilities (CVEs). Since v1.27, a JSON and RSS feed that auto-refreshes when any new CVE is announced is available.

Starting from Kubernetes 1.27, all containers inherit a default seccomp profile from the container runtime that implements sensible security defaults. This requires the --seccomp-default on every kubelet.

Many cloud providers implement confidential computing services such as confidential virtual machines and confidential containers that Kubernetes can leverage to secure data in use by enabling memory encryption for container workloads, etc. Some cloud providers even offer it as part of their hosted Kubernetes services.

An up-to-date third-party security audit of Kubernetes was published in April 2023 based on Kubernetes 1.24. It’s the second report of its kind and follows on from the original in 2019. These are great tools for identifying potential threats to your Kubernetes environments, as well as potential ways to mitigate them.

Finally, the Cloud Native Security Whitepaper is worth reading as a way to level up and gain a more holistic perspective on securing cloud-native environments such as Kubernetes.

Chapter summary
This chapter taught you how the STRIDE model can be used to threat-model Kubernetes. You stepped through the six threat categories and looked at some ways to prevent and mitigate them.

You saw that one threat can often lead to another and that multiple ways exist to mitigate a single threat. As always, defense in depth is a key tactic.

The chapter finished by discussing how Pod Security Admission is the preferred way to implement Pod security defaults.

In the next chapter, you’ll see some best practices and lessons learned from running Kubernetes in production.


table of contents
search
Settings
Previous chapter
15: The Kubernetes API
Next chapter
17: Real-world Kubernetes security
Table of contents collapsed
