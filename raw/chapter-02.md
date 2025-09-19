Skip to Content
2: Kubernetes principles of operation
This chapter introduces you to the major Kubernetes components and prepares you for upcoming chapters. This chapter won’t make you an expert, but it will lay important foundations you’ll build on throughout the book.

We’ll cover all of the following:

Kubernetes from 40K feet
Control plane nodes and worker nodes
Packaging apps for Kubernetes
The declarative model and desired state
Pods
Deployments
Services
Kubernetes from 40K feet
Kubernetes is both of the following:

A cluster
An orchestrator
Kubernetes: Cluster
A Kubernetes cluster is one or more nodes providing CPU, memory, and other resources for application use.

Kubernetes supports two node types:

Control plane nodes
Worker nodes
Both types can be physical servers, virtual machines, or cloud instances, and both can run on ARM and AMD64/x86-64. Control plane nodes must be Linux, but worker nodes can be Linux or Windows.

Control plane nodes implement the Kubernetes intelligence, and every cluster needs at least one. However, you should have three or five for high availability (HA).

Every control plane node runs every control plane service. These include the API server, the scheduler, and the controllers that implement cloud-native features such as self-healing, autoscaling, and rollouts.

Worker nodes are where you run your business applications.

Figure 2.1 shows a cluster with three control plane nodes and three workers.

Figure 2.1
Figure 2.1
It’s common to run user applications on control plane nodes in development and test environments. However, many production environments restrict user applications to worker nodes so that control plane nodes can focus their resources on cluster operations. Doing this allows control plane nodes to focus on managing the cluster.

Kubernetes: Orchestrator
Orchestrator is jargon for a system that deploys and manages applications.

Kubernetes is the industry-standard orchestrator and can intelligently deploy applications across nodes and failure zones for optimal performance and availability. It can also fix things when they break, scale things when demand changes, and manage rollouts and rollbacks.

That’s the big picture. Let’s dig a bit deeper.

Control plane and worker nodes
We already said a Kubernetes cluster is one or more control plane nodes and worker nodes.

Control plane nodes must be Linux, but workers can be Linux or Windows.

Almost all cloud-native apps are Linux apps and require Linux worker nodes. However, you’ll need one or more Windows worker nodes if you have cloud-native Windows apps. Fortunately, a single Kubernetes cluster can have a mix of Linux and Windows worker nodes, and Kubernetes is intelligent enough to schedule apps to the correct nodes.

The control plane
The control plane is a collection of system services that implement the brains of Kubernetes. It exposes the API, schedules apps, implements self-healing, manages scaling operations, and more.

The simplest clusters run a single control plane node and are best suited for labs and testing. For production clusters, you should run three or five control plane nodes and spread them across availability zones for high availability, as shown in Figure 2.2

Figure 2.2 Control plane high availability
Figure 2.2 Control plane high availability
As previously mentioned, it’s usually a production best practice to run all user apps on worker nodes, allowing control plane nodes to allocate their resources to cluster-related operations.

Most clusters run every control plane service on every control plane node for HA.

Let’s take a closer look at the major control plane services.

The API server
The API server is the front end of Kubernetes, and all commands and requests go through it. Even internal control plane services communicate with each other via the API server.

It exposes a RESTful API over HTTPS, and all requests are subject to authentication and authorization. For example, deploying or updating an app follows this process:

Describe the application in a YAML configuration file
Post the configuration file to the API server
The request will be authenticated and authorized
The application definition will be persisted in the cluster store
The application’s containers will be scheduled to nodes in the cluster
The cluster store
The cluster store holds the desired state of all applications and cluster components, and it’s the only stateful part of the control plane.

It’s based on the etcd distributed database, and most Kubernetes clusters run an etcd replica on every control plane node for HA. However, large clusters that experience a high rate of change may run a separate etcd cluster for better performance.

Be aware that a highly available cluster store is not a substitute for backup and recovery. You still need adequate ways to recover the cluster store when things go wrong.

Regarding availability, etcd prefers an odd number of replicas to help avoid split brain conditions. This is where replicas experience communication issues and cannot be sure if they have a quorum (majority).

Figure 2.3 shows two etcd configurations experiencing a network partition error. Cluster A on the left has four nodes and is experiencing a split brain with two nodes on either side and neither having a majority. Cluster B on the right only has three nodes but is not experiencing a split-brain as Node A knows it does not have a majority, whereas Node B and Node C know they do.

Figure 2.3. HA and split-brain conditions
Figure 2.3. HA and split-brain conditions
If a split-brain occurs, etcd goes into read-only mode preventing updates to the cluster. User applications will continue working, but Kubernetes won’t be able to scale or update them.

As with all distributed databases, consistency of writes is vital. For example, multiple writes from different sources to the same can cause corruption. etcd uses the RAFT consensus algorithm to prevent this from happening.

Controllers and the controller manager
Kubernetes uses controllers to implement a lot of the cluster intelligence. Each controller runs as a process on the control plane, and some of the more common ones include:

The Deployment controller
The StatefulSet controller
The ReplicaSet controller
Lots of others exist, and we’ll cover some of them later in the book. However, they all run as background watch loops, reconciling observed state with desired state.

That’s a lot of jargon, and we’ll cover it in detail later in the chapter. But for now, it means controllers ensure the cluster runs what you asked it to run. For example, if you ask for three replicas of an app, a controller will ensure you have three healthy replicas and take appropriate actions if you don’t.

Kubernetes also runs a controller manager that is responsible for spawning and managing the individual controllers.

Figure 2.4 gives a high-level overview of the controller manager and controllers.

Figure 2.4. Controller manager and controllers
Figure 2.4. Controller manager and controllers
The scheduler
The scheduler watches the API server for new work tasks and assigns them to healthy worker nodes.

It implements the following process:

Watch the API server for new tasks
Identify capable nodes
Assign tasks to nodes
Identifying capable nodes involves predicate checks, filtering, and a ranking algorithm. It checks for taints, affinity and anti-affinity rules, network port availability, and available CPU and memory. It ignores nodes incapable of running the tasks and ranks the remaining ones according to factors such as whether it already has the required image, the amount of available CPU and memory, and number of tasks it’s currently running. Each is worth points, and the nodes with the most points are selected to run the tasks.

The scheduler marks tasks as pending if it can’t find a suitable node.

If the cluster is configured for node autoscaling, the pending task kicks off a cluster autoscaling event that adds a new node to the cluster and the scheduler assigns the task to the new node.

The cloud controller manager
If your cluster is on a public cloud, such as AWS, Azure, GCP, or Civo Cloud, it will run a cloud controller manager that integrates the cluster with cloud services, such as instances, load balancers, and storage. For example, if you’re on a cloud and an application requests a load balancer, the cloud controller manager provisions one of the cloud’s load balancers and connects it to your app.

Control Plane summary
The control plane implements the brains of Kubernetes, including the API Server, the scheduler, and the cluster store. It also implements controllers that ensure the cluster runs what you asked it to run.

Figure 2.5 shows a high-level view of a Kubernetes control plane node.

Figure 2.5 - Control plane node
Figure 2.5 - Control plane node
You should run three or five control plane nodes for high availability, and large busy clusters might run a separate etcd cluster for better cluster store performance.

The API server is the Kubernetes frontend, and all communication passes through it.

Worker nodes
Worker nodes run your business applications and look like Figure 2.6.

Figure 2.6 - Worker node
Figure 2.6 - Worker node
Let’s look at the major worker node components.

Kubelet
The kubelet is the main Kubernetes agent and handles all communication with the cluster.

It performs the following key tasks:

Watches the API server for new tasks
Instructs the appropriate runtime to execute tasks
Reports task status to the API server
If a task won’t run, the kubelet reports the problem to the API server and lets the control plane decide what actions to take.

Runtime
Every worker node has one or more runtimes for executing tasks.

Most new Kubernetes clusters pre-install the containerd runtime and use it to execute tasks. These tasks include:

Pulling container images
Managing lifecycle operations such as starting and stopping containers
Older clusters shipped with the Docker runtime, but this is no longer supported. RedHat OpenShift clusters use the CRI-O runtime. Lots of others exist, and each has its pros and cons.

We’ll use some different runtimes in the Wasm chapter.

Kube-proxy
Every worker node runs a kube-proxy service that implements cluster networking and load balances traffic to tasks running on the node.

Now that you understand the fundamentals of the control plane and worker nodes, let’s switch gears and see how to package applications so they’ll run on Kubernetes.

Packaging apps for Kubernetes
Kubernetes runs containers, VMs, Wasm apps, and more. However, all of them need wrapping in Pods before they’ll run on Kubernetes.

We’ll cover Pods shortly, but for now, think of them as a thin wrapper that abstracts different types of tasks so they can run on Kubernetes. The following courier analogy might help.

Couriers allow you to ship books, clothes, food, electrical items, and more, so long as you use their approved packaging and labels. Once you’ve packaged and labeled your goods, you hand them to the courier for delivery. The courier then handles the complex logistics of which planes and trucks to use, secure hand-offs to local delivery hubs, and eventual delivery to customers. They also provide services for tracking packages, changing delivery details, and attesting successful delivery. All you have to do is package and label the goods.

Running applications on Kubernetes is similar. Kubernetes can run containers, VMs, Wasm apps, and more, as long as you wrap them in Pods. Once wrapped in a Pod, you give the Pod to Kubernetes, and Kubernetes runs it. This includes the complex logistics of choosing appropriate nodes, joining networks, attaching volumes, and more. Kubernetes even lets you query apps and make changes.

Consider a quick example.

You write an app in your favorite language, containerize it, push it to a registry, and wrap it in a Pod. At this point, you can give the Pod to Kubernetes, and Kubernetes will run it. However, you’ll almost always deploy and manage Pods via higher-level controllers. For example, you can wrap Pods inside of Deployments for scaling, self-healing, and rollouts.

Don’t worry about the details yet, we’ll cover everything in more depth and with lots of examples later in the book. Right now, you only need to know two things:

Apps need to be wrapped in Pods to run on Kubernetes
Pods get wrapped in higher-level controllers for advanced features
Let’s quickly go back to the courier analogy to help explain the role of controllers.

Most couriers offer additional services such as insurance for the goods you’re shipping, refrigerated delivery, signature and photographic proof of delivery, express delivery services, and more.

Again, Kubernetes is similar. It implements controllers that add value, such as ensuring the health of apps, automatically scaling when demand increases, and more.

Figure 2.7 shows a container wrapped in a Pod, which, in turn, is wrapped in a Deployment. Don’t worry about the YAML configuration yet, it’s just there to seed the idea.

Figure 2.7 - Object nesting
Figure 2.7 - Object nesting
The important thing to understand is that each layer of wrapping adds something:

The container wraps the app and provides dependencies
The Pod wraps the container so it can run on Kubernetes
The Deployment wraps the Pod and adds self-healing, scaling, and more
You post the Deployment (YAML file) to the API server as the desired state of the application, and Kubernetes implements it.

Speaking of desired state…

The declarative model and desired state
The declarative model and desired state are at the core of how Kubernetes operates. They work on three basic principles:

Desired state
Observed state
Reconciliation
Desired state is what you want, observed state is what you have, and reconciliation is the process of keeping observed state in sync with desired state.

Terminology: We use the terms actual state, current state, and observed state to mean the same thing — the most up-to-date view of the cluster.

In Kubernetes, the declarative model works like this:

You describe the desired state of an application in a YAML manifest file
You post the YAML file to the API server
Kubernetes records this in the cluster store as a record of intent
A controller notices the observed state of the cluster doesn’t match the new desired state
The controller makes the necessary changes to reconcile the differences
The controller keeps running in the background, ensuring observed state always matches desired state
Let’s have a closer look.

You write manifest files in YAML that tell Kubernetes what you want an application to look like. We call this desired state, which includes which images to use, how many replicas, which network ports, and more.

Once you’ve created the manifest, you post it to the API server where it’s authenticated and authorized. The most common way of posting YAML files to Kubernetes is with the kubectl command-line utility.

Once authenticated and authorized, Kubernetes persists the configuration to the cluster store as a record of intent.

At this point, the observed state of the cluster doesn’t match your new desired state. A controller will notice this and begin the process of reconciliation. This will involve making all the changes described in the YAML file and is likely to include scheduling new Pods, pulling images, starting containers, attaching them to networks, and starting application processes.

Once the reconciliation completes, observed state will match desired state, and everything will be OK. However, the controllers keep running in the background, ready to reconcile any future differences.

It’s important to understand that what we’ve described is very different from the traditional imperative model:

The imperative model requires complex scripts of platform-specific commands to achieve an end-state
The declarative model is a simple platform-agnostic way of describing an end state
Kubernetes supports both but prefers the declarative model. This is because the declarative model integrates with version control systems and enables self-healing, autoscaling, and rolling updates.

Consider a couple of simple declarative examples.

Assume you’ve deployed an app from a YAML file requesting ten replicas. If a node running two of the replicas fails, the observed state will drop to 8 replicas and no longer match the desired state of 10. That’s OK, a controller will see the difference and schedule 2 new replicas to bring the total back up to 10.

The same will happen for an app update. For example, if you update the YAML, telling the app to use a newer version of the image and post the change to Kubernetes, the relevant controller will notice the difference and replace the replicas running the old version with new replicas running the new version.

If you try to perform an update like this imperatively, you’ll need to write complex scripts to manage, monitor, and heath-check the entire update process. To do it declaratively, you only need to change a single line of YAML, and Kubernetes does everything else.

Despite its simplicity, this is extremely powerful, and it’s fundamental to the way Kubernetes works.

Pods
The atomic unit of scheduling in VMware is the virtual machine (VM). In Kubernetes, it’s the Pod.

Yes, Kubernetes runs containers, VMs, Wasm apps, and more. But they all need wrapping in Pods.

Pods and containers
The simplest configurations run a single container per Pod, which is why we sometimes use the terms Pod and container interchangeably. However, there are powerful use cases for multi-container Pods, including:

Service meshes
Helper services that initialize environments
Apps with tightly coupled helper functions such as log scrapers
Figure 2.8 shows a multi-container Pod with a main application container and a service mesh sidecar. Sidecar is jargon for a helper container that runs in the same Pod as the main app container and provides additional services. In Figure 2.8, the service mesh sidecar encrypts network traffic and provides telemetry.

Figure 2.8 - Multi-container service mesh Pod
Figure 2.8 - Multi-container service mesh Pod
Multi-container Pods also help us implement the single responsibility principle where every container performs a single task. In Figure 2.8, the main app container might be serving a message queue or some other core application feature. Instead of adding the encryption and telemetry logic into the main app, we keep the app simple and implement the additional services in the service mesh container in the same Pod.

Pod anatomy
Each Pod is a shared execution environment for one or more containers. The execution environment includes a network stack, volumes, shared memory, and more.

Containers in a single-container Pod have the execution environment to themselves, whereas containers in a multi-container Pod share it.

As an example, Figure 2.9 shows a multi-container Pod with both containers sharing the Pods IP address. The main application container is accessible outside the Pod on 10.0.10.15:8080, and the sidecar on 10.0.10.15:5005. If they need to communicate with each other, container-to-container within the Pod, they can use the Pod’s localhost interface.

Figure 2.9 - Multi-container Pod sharing Pod IP
Figure 2.9 - Multi-container Pod sharing Pod IP
You should choose a multi-container Pod when your application has tightly coupled components needing to share resources such as memory or storage. In most other cases, you should use single-container Pods and loosely couple them over the network.

Pod scheduling
Kubernetes always schedules containers in the same Pod to a single node. This is because Kubernetes schedules Pods, not individual containers. But it’s also because Pods are a shared execution environment, and you can’t easily share memory, networking, and volumes across different nodes.

Starting a Pod is also an atomic operation. This means Kubernetes only marks a Pod as ready when all its containers are running. For example, if a Pod has two containers and only one is started, the Pod is not ready.

Pods as the unit of scaling
Pods are the minimum unit of scheduling in Kubernetes. As such, scaling an application up adds more Pods and scaling it down deletes Pods. You do not scale by adding more containers to existing Pods. Figure 2.10 shows how to scale the web-fe microservice using Pods as the unit of scaling.

Figure 2.10 - Scaling with Pods
Figure 2.10 - Scaling with Pods
Pod lifecycle
Pods are mortal — they’re created, they live, and they die. Anytime one dies, Kubernetes replaces it with a new one. Even though the new one looks, smells, and feels the same as the old one, it’s always a shiny new one with a new ID and new IP.

This forces you to design applications to be loosely coupled so they’re immune to individual Pod failures.

Pod immutability
Pods are immutable. This means you never change them once they’re running.

For example, if you need to change or update a Pod, you always replace it with a new one running the updates. You should never log on to a Pod and change it. This means any time we talk about “updating Pods”, we always mean deleting the old one and replacing it with a new one. This can be a huge mindset change for some of us, but it fits nicely with modern tools and GitOps-style workflows.

Deployments
Even though Kubernetes works with Pods, you’ll almost always deploy them via higher-level controllers such as Deployments, StatefulSets, and DaemonSets. These are all control plane services that operate as background watch loops, reconciling observed state with desired state.

Deployments add self-healing, scaling, rolling updates, and versioned rollbacks to stateless apps.

Refer back to Figure 2.7 to see how Deployments wrap Pods.

Service objects and stable networking
Earlier in the chapter, we said that Pods are mortal and can die. However, if a failed Pod is managed by a controller, it gets replaced by a new Pod with a new ID and a new IP address. The same thing happens with rollouts and scaling operations:

Rollouts replace old Pods with new ones with new IPs
Scaling up adds new Pods with new IPs
Scaling down deletes existing Pods.
Events like these generate IP churn and make Pods unreliable. For example, clients cannot make reliable connections to individual Pods as Kubernetes doesn’t guarantee they’ll exist.

This is where Services come into play by providing reliable networking for groups of Pods.

Figure 2.11 shows internal and external clients connecting to a group of Pods via a Kubernetes Service. The Service (capital “S” because it’s a Kubernetes API resource) provides a reliable name and IP, and load balances requests to the Pods behind it.

Figure 2.11
Figure 2.11
You should think of Services as having a front end and a back end. The front end has a stable DNS name, IP address, and network port. The back end uses labels to load balance traffic across a dynamic set of Pods.

Services keep a list of healthy Pods as scaling events, rollouts, and failures cause Pods to come and go. This means they’ll always direct traffic to active healthy Pods. The Service also guarantees the name, IP, and port on the front end will never change.

Chapter summary
This chapter introduced you to some of the major Kubernetes features.

Control plane nodes host the control plane services that implement the intelligence of Kubernetes. They can be physical servers, VMs, cloud instances, and more. Production clusters usually run three or five control plane nodes for high availability.

Control plane services include the API server, the scheduler, the cluster store, and various controllers.

Worker nodes are where you run your business applications and can also be physical servers, VMs, cloud instances, and more.

Every worker node runs the kubelet service that watches the API server for new work tasks and reports back on task status.

Worker nodes also run one or more runtimes and the kube-proxy service. Runtimes perform low-level operations such as starting and stopping containers and Wasm apps. The kube-proxy handles all networking tasks on the node.

You learned that Kubernetes supports declarative and imperative methods of deploying and managing applications but prefers the declarative method. This is where you describe the desired state of something in a YAML configuration file that you give to Kubernetes and leave Kubernetes to deploy and manage it. Controllers run on the control plane and make sure observed state matches desired state. This is called reconciliation.

You also learned about Pods, Deployments, and Services. Pods allow containers and other workloads to run on Kubernetes. Deployments add self-healing, scaling, and rollouts. Services add reliable networking and basic load-balancing.


table of contents
search
Settings
Previous chapter
1: Kubernetes primer
Next chapter
3: Getting Kubernetes
Table of contents collapsed
