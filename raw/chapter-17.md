Skip to Content
17: Real-world Kubernetes security
The previous chapter showed you how to threat-model Kubernetes using the STRIDE model. In this chapter, you’ll learn about security-related challenges you’re likely to encounter when implementing Kubernetes in the real world.

The goal of the chapter is to show you things from the kind of high-level view a security architect has. It does not give cookbook style solutions.

The chapter is divided into the following four sections:

Security in the software delivery pipeline
Workload isolation
Identity and access management
Security monitoring and auditing
Security in the software delivery pipeline
Containers revolutionized the way we build, ship, and run applications. Unfortunately, this has also made it easier than ever to run dangerous code.

Let’s look at some ways you can secure the supply chain that gets application code from a developer’s laptop onto production servers.

Image Repositories
We store images in public and private registries that we divide into repositories.

Public registries are on the internet and are the easiest way to push and pull images. However, you should be very careful when using them:

You need to adequately protect the images you store on public registries
You should not trust the images you pull from public registries
Some public registries have the concept of official images and community images. As a general rule, official images are safer than community images, but you should always do your due diligence.

Official images are usually provided by product vendors and undergo vigorous vetting processes to ensure quality. You should expect them to implement good practices, be regularly scanned for vulnerabilities, and contain up-to-date patches and fixes. Some of them may even be supported by the product vendor or the company hosting the registry.

Community images do not undergo rigorous vetting, and you should practice extreme caution when using them.

With these points in mind, you should implement a standardized way for developers to obtain and consume images. You should also make the process as frictionless as possible so that developers don’t feel the need to bypass the process.

Let’s discuss a few things that might help.

Use approved base images
Most images start with a base layer and then add other layers to form a useful image.

Figure 17.1 shows an oversimplified example of an image with three layers. The base layer has the core OS and filesystem components, the middle layer has the libraries and dependencies, and the top layer has your app. The combination of the three is the image and contains everything needed to run the application.

Figure 17.1 - Image layering
Figure 17.1 - Image layering
It’s usually a good practice to maintain a small number of approved base images. These are usually derived from official images and hardened according to your corporate policies and requirements. For example, you might create a limited number of approved base images based on the official Alpine Linux image you’ve tweaked to meet your requirements (patches, drivers, audit settings, and more).

Figure 17.2 shows three applications built on top of two approved base images. The app on the left builds on top of your approved Alpine Linux base image, whereas the other two apps are web apps that build on top of your approved Alpin+NGINX base image.

Figure 17.2 - Using approved base images
Figure 17.2 - Using approved base images
While you need to invest up-front effort to create your approved base images, they bring all the following benefits:

Standard set of drivers
Known patches
Standardized audit settings
Reduced software sprawl (less unofficial base images)
Simplified testing (testing against a small set of known bases)
Simplified updates (Fewer base images to patch)
Simplified troubleshooting (a well-understood and limited set of base images)
Having an approved set of base images also allows developers to focus on applications without caring about OS-related stuff. It may also allow you to reduce the number of support contracts and suppliers you have to deal with.

Manage the need for non-standard base images
As good as having a small number of approved base images is, you may still have legitimate requirements for bespoke configurations. In these situations you’ll need good processes to:

Identify why an existing approved base image cannot be used
Determine whether an existing approved base image can be updated to meet requirements (including if it’s worth the effort)
Determine the support implications of bringing an entirely new image into the environment
In most cases, you’ll want to update an existing base image — such as adding a device driver for GPU computing — rather than introducing an entirely new image.

Control access to images
There are several ways to protect your organization’s images.

A secure and practical option is to host your own private registries inside your own firewalls. This allows you to control how registries are deployed, how they’re replicated, and how they’re patched. You can also create repositories and policies to fit your organizational needs, and integrate them with existing identity management providers such as Active Directory.

If you can’t manage your own private registries, you can host your images in private repositories on public registries. However, not all public registries are equal, and you’ll need to take great care in choosing the right one and configuring it correctly.

Whichever solution you choose, you should only host images that are approved for use within your organization. These will typically be from a trusted source and vetted by your information security team. You should place access controls on repositories so that only approved users can push and pull them.

Away from the registry itself, you should also:

Restrict which cluster nodes have internet access, keeping in mind that your image registry may be on the internet
Configure access controls that only allow authorized users and nodes to push to repositories
If you’re using a public registry, you’ll probably need to grant your cluster nodes access to the internet so they can pull images. In scenarios like this, it’s a good practice to limit internet access to the addresses and ports your registries use. You should also implement strict RBAC rules on the registry to control who can push and pull images from which repositories. For example, you might restrict developers so they can only push and pull against dev and test repositories, whereas you may allow your operations teams to push and pull against production repos.

Finally, you may only want a subset of nodes (build nodes) to be able to push images. You may even want to lock things down so that only your automated build systems can push to specific repositories.

Moving images from non-production to production
Many organizations have separate environments for development, testing, and production.

As a general rule, development environments have fewer rules and are places where developers can experiment. This can involve non-standard images your developers eventually want to use in production.

The following sections outline some measures you can take to ensure that only safe images get approved for production.

Vulnerability scanning
Top of the list for vetting images before allowing them into production should be vulnerability scanning. These services scan your images at a binary level and check their contents against databases of known security vulnerabilities (CVEs).

You should integrate vulnerability scanning into your CI/CD pipelines and implement policies that automatically fail builds and quarantine images if they contain particular categories of vulnerabilities. For example, you might implement a build phase that scans images and automatically fails anything using an image with known critical vulnerabilities.

However, some scanning solutions are better than others and will allow you to create highly customizable policies.

For example, a Python method that performs TLS verification might be vulnerable to Denial of Service attacks when the Common Name contains a lot of wildcards. However, if you never use Python in this way, you might not consider the vulnerability relevant and want to mark it as a false positive. Not all scanning solutions allow you to do this.

Configuration as code
Scanning app code for vulnerabilities is widely accepted as good production hygiene. However, scanning your Dockerfiles, Kubernetes YAML files, Helm charts, and other configuration files is less widely adopted.

A well-publicized example of not reviewing configuration files was when an IBM data science experiment embedded private TLS keys in its container images. This meant attackers could pull the image and gain root access to the nodes hosting the containers. The whole thing would’ve been easily avoided if they’d performed a security review against their Dockerfiles.

There continue to be advancements in automating checks like these with tools that implement policy as code rules.

Sign container images
Trust is a big deal in today’s world, and cryptographically signing content at every stage in the software delivery pipeline is becoming the norm. Fortunately, Kubernetes and most container runtimes support cryptographically signing and verifying images.

In this model, developers cryptographically sign their images, and consumers cryptographically verify them when they pull them and run them. This gives the consumer confidence they’re working with the correct image and that it hasn’t been tampered with.

Figure 17.3 shows the high-level process for signing and verifying images.

Figure 17.3
Figure 17.3
Image signing and verification is usually implemented by the container runtime.

You should look at tools that allow you to define and enforce enterprise-wide signing policies so it’s not left up to individual users.

Image promotion workflow
With everything we’ve covered so far, your build pipelines should include as many of the following as possible:

Policies forcing the use of signed images
Network rules restricting which nodes can push and pull images
RBAC rules protecting image repositories
Use of approved base images
Image scanning for known vulnerabilities
Promotion and quarantining of images based on scan results
Review and scan infrastructure-as-code configuration files
There are more things you can do, and the list isn’t supposed to represent an exact workflow.

Workload isolation
This section will show you some ways you can isolate workloads.

We’ll start at the cluster level, switch to the runtime level, and then look outside the cluster at infrastructure such as network firewalls.

Cluster-level workload isolation
Cutting straight to the chase, Kubernetes does not support secure multi-tenant clusters. The only way to isolate two workloads is to run them on their own clusters with their own hardware.

Let’s look a bit closer.

The only way to divide a Kubernetes cluster is by creating Namespaces. However, these are little more than a way of grouping resources and applying things such as:

Limits
Quotas
RBAC rules
Namespaces do not prevent compromised workloads in one Namespace from impacting workloads in other Namespaces. This means you should never run hostile workloads on the same Kubernetes cluster.

Despite this, Kubernetes Namespaces are useful, and you should use them. Just don’t use them as security boundaries.

Namespaces and soft multi-tenancy
For our purposes, soft multi-tenancy is hosting multiple trusted workloads on shared infrastructure. By trusted, we mean workloads that don’t require absolute guarantees that one workload cannot impact another.

An example of trusted workloads might be an e-commerce application with a web front-end service and a back-end recommendation service. As they’re part of the same application, they’re not hostile. However, you might want each one to have its own resource limits managed by different teams.

In situations like this, a single cluster with a Namespace for the front-end service and another for the back-end service might be a good solution.

Namespaces and hard multi-tenancy
We’ll define hard multi-tenancy as hosting untrusted and potentially hostile workloads on shared infrastructure. However, as we said before, this isn’t currently possible with Kubernetes.

This means workloads requiring a strong security boundary need to run on separate Kubernetes clusters! Examples include:

Isolating production and non-production workloads
Isolating different customers
Isolating sensitive projects and business functions
Other examples exist, but the take-home point is that workloads requiring strong separation need their own clusters.

Note: The Kubernetes project has a dedicated Multitenancy Working Group that’s actively working on multitenancy models. This means that future Kubernetes releases might have better solutions for hard multitenancy.

Node isolation
There will be times when you have applications that require non-standard privileges, such as running as root or executing non-standard syscalls. Isolating these on their own clusters might be overkill, but you might justify running them on a ring-fenced subset of worker nodes. Doing this will restrict compromised workloads from only impacting other workloads on the same node.

You should also apply defense in depth principles by enabling stricter audit logging and tighter runtime defense options on nodes running workloads with non-standard privileges.

Kubernetes offers several technologies, such as labels, affinity and anti-affinity rules, and taints, to help you target workloads to specific nodes.

Runtime isolation
Containers versus virtual machines used to be a polarizing topic. However, when it came to workload isolation there is only ever one winner… virtual machines.

Most container platforms implement namespaced containers. This is a model where every container shares the host’s kernel, and isolation is provided by kernel constructs, such as namespaces and cgroups, that were never designed as strong security boundaries. Docker, containerd, and CRI-O are popular examples of container runtimes and platforms that implement namespaced containers.

This is very different from the hypervisor model, where every virtual machine gets its own dedicated kernel and is strongly isolated from other virtual machines using hardware enforcement.

However, it’s easier than ever to augment containers with security-related technologies that make them more secure and enable stronger workload isolation. These technologies include AppArmor, SELinux, seccomp, capabilities, and user namespaces, and most container runtimes and hosted Kubernetes services do a good job of implementing sensible defaults for them all. However, they can still be complex, especially when troubleshooting.

You should also consider different classes of container runtimes. Two examples are gVisor and Kata Containers, both of which provide stronger levels of workload isolation and are easy to integrate with Kubernetes thanks to the Container Runtime Interface (CRI) and Runtime Classes.

There are also projects that enable Kubernetes to orchestrate other workload types, such as virtual machines, serverless functions, and WebAssembly.

While you might feel overwhelmed by some of this, you need to consider all of this when determining the isolation levels your workloads require.

To summarize, the following workload isolation options exist:

Virtual Machines: Every workload gets its own dedicated kernel. It provides excellent isolation but is comparatively slow and resource-intensive.
Namespaced containers: All containers share the host’s kernel. These are fast and lightweight but require extra effort to improve workload isolation.
Run every container in its own virtual machine: Solutions like these attempt to combine the versatility of containers with the security of VMs by running every container in its own dedicated VM. Despite using specialized lightweight VMs, these solutions lose much of the appeal of containers, and they’re not very popular.
Use different runtime classes: This allows you to run all workloads as containers, but you target the workloads requiring stronger isolation to an appropriate container runtime.
Wasm containers: Wasm containers package Wasm (WebAssembly) apps in OCI containers that can execute on Kubernetes. These apps only use containers for packaging and scheduling, at run time they execute inside a secure deny-by-default Wasm host. See Chapter 9 for more detail.
Network isolation
Firewalls are an integral part of any layered information security system. The goal is only to allow authorized communications.

In Kubernetes, Pods communicate over an internal network called the pod network. However, Kubernetes doesn’t implement the pod network. Instead, it implements a plugin model called the Container Network Interface (CNI) that allows 3rd-party vendors to implement the pod network. Lots of CNI plugins exist, but they fall into two broad categories:

Overlay
BGP
Each has a different impact on firewall implementation and network security.

Kubernetes and overlay networking
Most Kubernetes environments implement the pod network as a simple flat overlay network that hides any network complexity between cluster nodes. For example, you might deploy your cluster nodes across ten different networks connected by routers, but Pods connect to the flat pod network and communicate without needing to know any of the complexity of the host networking. Figure 17.4 shows four nodes on two separate networks and the Pods connected to a single overlay pod network.

Figure 17.4
Figure 17.4
Overlay networks use VXLAN technologies to encapsulate traffic for transmission over a simple flat Layer-2 network operating on top of existing Layer-3 infrastructure. If that’s too much network jargon, all you need to know is that overlay networks encapsulate packets sent by containers. This encapsulation hides the original source and target IP addresses, making it harder for firewalls to know what’s going on. See Figure 17.5

Figure 17.5 - Encapsulation on overlay network
Figure 17.5 - Encapsulation on overlay network
Kubernetes and BGP
BGP is the protocol that powers the internet. However, at its core, it’s a simple and scalable protocol that creates peer relationships that are used to share routes and perform routing.

The following analogy might help. Imagine you want to send a birthday card to a friend who you lost contact with and no longer have their address. However, your child has a friend at school whose parents are still in touch with your old friend. In this situation, you give the card to your child and ask them to give it to their friend at school. This friend gives it to their parents, who deliver it to your friend.

BGP routing is similar and happens through a network of peers that help each other find routes.

From a security perspective, the important thing is that BGP doesn’t encapsulate packets. This makes things much simpler for firewalls. Figure 17.6 shows the same setup using BGP. Notice how there’s no encapsulation.

Figure 17.6 - No encapsulation on BGP network
Figure 17.6 - No encapsulation on BGP network
How this impacts firewalls
We’ve already said that firewalls allow or disallow traffic flow based on source and destination addresses. For example:

Allow traffic from the 10.0.0.0/24 network
Disallow traffic from the 192.168.0.0/24 network
Suppose your pod network is an overlay network. In that case, all traffic will be encapsulated, and only firewalls that can open packets and inspect their contents will be able to make useful decisions on whether to allow or deny traffic. You may want to consider a BGP pod network if your firewalls can’t do this.

You should also consider whether to deploy physical firewalls, host-based firewalls, or a combination of both.

Physical firewalls are dedicated network hardware devices that are usually managed by a central team. Host-based firewalls are operating system (OS) features and are usually managed by the team that deploys and manages your OSes. Both solutions have pros and cons, and combining the two is often the most secure. However, you should consider whether your organization has a long and complex procedure for implementing changes to physical firewalls. If it does, it might not suit the nature of your Kubernetes environment.

Packet capture
On the topic of networking and IP addresses, not only are Pod IP addresses sometimes obscured by encapsulation, but they are also dynamic and can be recycled and re-used by different Pods. We call this IP churn, and it reduces how useful IP addresses are at identifying systems and workloads. With this in mind, the ability to associate IP addresses with Kubernetes-specific identifiers such as Pod IDs, Service aliases, and container IDs when performing things like packet capturing can be extremely useful.

Let’s switch tack and look at some ways of controlling user access to Kubernetes.

Identity and access management (IAM)
Controlling user access to Kubernetes is important in any production environment. Fortunately, Kubernetes has a robust RBAC subsystem that integrates with existing IAM providers such as Active Directory, other LDAP systems, and cloud-based IAM solutions.

Most organizations already have a centralized IAM provider that’s integrated with company HR systems to simplify employee lifecycle management.

Fortunately, Kubernetes leverages existing IAM providers instead of implementing its own. This means new employees get an identity in the corporate IAM database, and assuming you make them members of the appropriate groups, they will automatically get permissions in Kubernetes. Likewise, when the employee leaves the organization, an HR process will automatically remove their identity from the IAM database, and their Kubernetes access will cease.

RBAC has been a stable Kubernetes feature since v1.8 and you should leverage its full capabilities.

Managing Remote SSH access to cluster nodes
You’ll do almost all Kubernetes administration via REST calls to the API server. This means users should rarely need remote SSH access to Kubernetes cluster nodes. In fact, remote SSH access to cluster nodes should only be for the following types of activity:

Node management activities that you cannot perform via the Kubernetes API
Break the Glass activities, such as when the API server is down
Deep troubleshooting
Multi-factor authentication (MFA)
With great power comes great responsibility.

Accounts with root access to the API server and root access to cluster nodes are extremely powerful and are prime targets for attackers and disgruntled employees. As such, you should protect their use via multi-factor authentication (MFA). This is where a user has to input a username and password, followed by a second stage of authentication. For example:

Stage 1: Tests knowledge of a username and password
Stage 2: Tests possession of something like a one-time password
You should also secure access to workstations and user profiles that have kubectl installed.

Security monitoring and auditing
No system is 100% secure, and you should always plan for the eventuality that your systems will be breached. When breaches happen, it’s vital you can do at least two things:

Recognize that a breach has occurred
Build a detailed timeline of events that cannot be repudiated
Auditing is critical to both of these, and the ability to build a reliable timeline helps answer the following post-event questions:

What happened
How did it happen
When did it happen
Who did it
In extreme circumstances, this information can be called upon in court.

Good auditing and monitoring solutions also help identify vulnerabilities in your security systems.

With these points in mind, you should ensure robust auditing and monitoring are high on your list of priorities, and you shouldn’t go live in production without them.

Baseline best practices
There are various tools and checks that can help you ensure you provision your Kubernetes environment according to best practices and company policies.

The Center for Information Security (CIS) publishes an industry-standard benchmark for Kubernetes security, and Aqua Security (aquasec.com) has written an easy-to-use tool called kube-bench to run the CIS tests against your cluster and generate reports. Unfortunately, kube-bench can’t inspect the control plane nodes of hosted Kubernetes services.

You should consider running kube-bench as part of the node provisioning process and pass or fail node provisioning based on the results.

You can also use kube-bench reports as a baseline for use in the aftermath of incidents. This allows you to compare the kube-bench reports from before and after the incident and determine if and where any configuration changes occurred.

Container and Pod lifecycle events
Pods and containers are ephemeral objects that come and go all the time. This means you’ll see a lot of events announcing new ones and a lot of events announcing terminated ones.

With this in mind, consider configuring log retention to keep the logs from terminated Pods so they’re available for inspection even after termination.

Your container runtime may also keep logs relating to container lifecycle events.

Forensic checkpointing
Forensics is the science of collecting and examining available evidence to construct a trail of events, especially when you suspect malicious behavior.

The ephemeral nature of containers has made this challenging in the past. However, recent technologies such as Checkpoint/Restore in Userspace (CRIU) are making it easier to silently capture the state of running containers and restore them in a sandbox environment for deeper analysis. At the time of writing, CRIU is an alpha feature in Kubernetes, and the only runtime currently supporting it is CRI-O.

Application logs
Application logs are also important when identifying potential security-related issues.

However, not all applications send their logs to the same place. Some send them to their container’s standard out (stdout) or standard error (stderr) streams where your logging tools can pick them up alongside container logs. However, some send logs to proprietary log files in bespoke locations. Be sure to research this for each application and configure things so you don’t miss logs.

Actions performed by users
Most of your Kubernetes configuration and administration will be done via the API server, where all requests should be logged. However, it’s also possible for malicious actors to gain remote SSH access to control plane nodes and directly manipulate Kubernetes objects. This may include access to the cluster store and etcd nodes.

We’ve already said you should limit SSH access to cluster nodes and bolster security with multi-factor authentication (MFA). However, you should also log all SSH activity and ship it to a secure log aggregator. You should also consider mandating that two competent people be present for all SSH access to control plane nodes.

Managing log data
A key advantage of containers is application density — you can run a lot more applications on your servers and in your datacenters. This results in massive amounts of log data and audit data that is overwhelming without specialized tools to sort and make sense of it. Fortunately, advanced tools exist that not only store the data, but can use it for proactive analysis as well as post-event reactive analysis.

Alerting for security-relevant events
As well as being useful for post-event analysis and repudiation, some events are significant enough to warrant immediate investigation. Examples include:

Privileged Pod creation by a human user: Privileged Pods can often gain root-level access on the node, and you will typically have policies in place to prevent their creation. On the rare occasions they are needed, they will usually be created by automated processes with service accounts.
Exec sessions by human users: Exec sessions grant shell-like access to containers and are typically only used to troubleshoot issues. You should investigate exec sessions that aren’t for troubleshooting and consider deleting them to prevent tampering.
Attempts to access the cluster from the internet: It’s a common practice to prevent access to the control plane from the internet. As such, you should monitor for successful and unsuccessful attempts to connect to the control plane from the internet, and successful attempts will typically indicate a security misconfiguration you should fix.
Migrating existing apps to Kubernetes
It can be useful to use a crawl, walk, then run strategy when migrating applications to Kubernetes:

Crawl: Threat modeling your existing apps will help you understand their current security posture. For example, which of your existing apps do and don’t communicate over TLS.
Walk: When moving to Kubernetes, ensure the security posture of these apps remains unchanged. For example, if an app doesn’t communicate over TLS, do not change this as part of the migration.
Run: Start improving the security of applications after the migration. Start with simple non-critical apps, and carefully work your way up to mission-critical apps. You may also want to methodically deploy deeper levels of security, such as initially configuring apps to communicate over one-way TLS and then eventually over two-way TLS.
The key point is not to change the security posture of an app as part of migrating it to Kubernetes. This is because performing a migration and making changes can make it easier to misdiagnose issues — was it the security change or the migration?

Real-world example
An example of a container-related vulnerability that could’ve easily been prevented by implementing some of the best practices we’ve discussed occurred in February 2019. CVE-2019-5736 allowed a container process running as root to gain root access on the worker node and all containers running on the host.

As dangerous as the vulnerability was, the following things covered in this chapter would’ve prevented the issue:

Image vulnerability scanning
Not running processes as root
Enabling SELinux
As the vulnerability has a CVE number, scanning tools would’ve found it and alerted on it. Even if scanning platforms missed it, policies that prevent root containers and standard SELinux policies would have prevented exploitation of the vulnerability.

Chapter summary
The purpose of this chapter was to introduce some of the real-world security considerations affecting many Kubernetes.

We started by looking at ways to secure the software delivery pipeline and discussed some image-related best practices. These included securing your image registries, scanning images for vulnerabilities, and cryptographically signing and verifying images. Then, we looked at some of the workload isolation options that exist at different layers of the infrastructure stack. In particular, we looked at cluster-level isolation, node-level isolation, and some of the different runtime isolation options. We discussed identity and access management, including places where additional security measures might be useful. We then talked about auditing and finished up with a real-world issue that could have been avoided by implementing some of the best practices already covered.

Hopefully, you have enough to go away and start securing your own Kubernetes clusters.


table of contents
search
Settings
Previous chapter
16: Threat modeling Kubernetes
Next chapter
Terminology
Table of contents collapsed
