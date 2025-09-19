Skip to Content
4: Working with Pods
Every app on Kubernetes runs inside a Pod.

When you deploy an app, you deploy it in a Pod
When you terminate an app, you terminate its Pod
When you scale an app up, you add more Pods
When you scale an app down, you remove Pods
When you update an app, you deploy new Pods
This makes Pods important and is why this chapter goes into detail.

I’ve given the chapter two main parts:

Pod Theory
Hands-on with Pods
If some of the content we’re about to cover feels familiar, it’s because we’re building on some of the concepts introduced in Chapter 2.

We’re also about to discover that Kubernetes uses Pods to run many different workload types. However, most of the time, Pods run containers, so most of the examples will reference containers.

Pod theory
Kubernetes uses Pods for a lot of reasons. They’re an abstraction layer, they enable resource sharing, they add features, they enhance scheduling, and more.

Let’s take a closer look at some of those.

Pods are an abstraction layer
Pods abstract the workload details. This means you can run containers, VMs, serverless functions, and Wasm apps inside Pods and Kubernetes doesn’t know the difference.

Using Pods as an abstraction layer benefits Kubernetes and workloads:

Kubernetes can focus on deploying and managing Pods without having to care what’s inside them
Heterogenous workloads can run side-by-side on the same cluster, leverage the full power of the declarative Kubernetes API, and get all the other benefits of Pods
Containers and Wasm apps work with standard Pods, standard workload controllers, and standard runtimes. However, serverless functions and VMs need a bit of extra help.

Serverless functions run in standard Pods but require apps like Knative to extend the Kubernetes API with custom resources and controllers. VMs are similar and need apps like KubeVirt to extend the API.

Figure 4.1 shows four different workloads running on the same cluster. Each workload is wrapped in a Pod, managed by a controller, and uses a standard runtime. VM workloads run in a VirtualMachineInstance (VMI) instead of a Pod, but these are very similar to Pods and utilize a lot of Pod features.

Figure 4.1 - Different workloads wrapped in Pods
Figure 4.1 - Different workloads wrapped in Pods
Pods augment workloads
Pods augment workloads in many ways, including all of the following:

Resource sharing
Advanced scheduling
Application health probes
Restart policies
Security policies
Termination control
Volumes
The following command shows a complete list of Pod attributes and returns over 1,000 lines. Press the spacebar to page through the output and press q to return to your prompt.

$ kubectl explain pods --recursive | more
KIND:     Pod
VERSION:  v1
DESCRIPTION:
     Pod is a collection of containers that can run on a host. This resource is
     created by clients and scheduled onto hosts.
FIELDS:
   apiVersion	      <string>
   kind	            <string>
   metadata	        <Object>
      annotations	  <map[string]string>
      labels	      <map[string]string>
      name	        <string>
      namespace	    <string>
<Snip>
You can even drill into specific Pod attributes and see their supported values. The following example drills into the Pod restartPolicy attribute.

$ kubectl explain pod.spec.restartPolicy
KIND:     Pod
VERSION:  v1
FIELD:    restartPolicy <string>
DESCRIPTION:
     Restart policy for all containers within the pod. One of Always, OnFailure, Never. 
     Default to Always. 
     More info: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/...
     Possible enum values:
     - `"Always"`
     - `"Never"`
     - `"OnFailure"`
Despite adding so much, Pods are lightweight and add very little overhead.

Pods enable resource sharing
Pods run one or more containers, and all containers in the same Pod share the Pod’s execution environment. This includes:

Shared filesystem and volumes (mnt namespace)
Shared network stack (net namespace)
Shared memory (IPC namespace)
Shared process tree (pid namespace)
Shared hostname (uts namespace)
Figure 4.2 shows a multi-container Pod with both containers sharing the Pod’s volume and network resources.

Figure 4.2 - Multi-container Pod sharing IP and volume
Figure 4.2 - Multi-container Pod sharing IP and volume
Other apps and clients can access the containers via the Pod’s 10.0.10.15 IP address — the main app container is available on port 8080 and the sidecar on port 5005. The two containers can use the Pod’s localhost adapter if they need to communicate with each other inside the Pod. Both containers also mount the Pod’s volume and can use it to share data. For example, the sidecar container might sync static content from a remote Git repo and store it in the volume where the main app container reads it and serves it as a web page.

Pods and scheduling
Before going any further, remember that nodes are host servers that can be physical servers, virtual machines, or cloud instances. Pods wrap containers and execute on nodes.

Kubernetes guarantees that all containers in a Pod will be scheduled to the same cluster node. Despite this, you should only put containers in the same Pod if they need to share resources such as memory, volumes, and networking. If your only requirement is to schedule two workloads to the same node, you should put them in separate Pods and use one of the following options to ensure they’re scheduled to the same node.

nodeSelectors
Affinity and anti-affinity
Topology spread constraints
Resource requests and resource limits
nodeSelectors are the simplest way of running Pods on specific nodes. You give it a list of labels, and the scheduler will only assign the Pod to a node with all the labels.

Affinity and anti-affinity rules are like a more powerful nodeSelector.

As the names suggest, they support scheduling alongside resources (affinity) and away from resources (anti-affinity). But they also support hard and soft rules, and they can select on Pods as well as nodes:

Affinity rules attract
Anti-affinity rules repel
Hard rules must be obeyed
Soft rules are only suggestions and best effort
Selecting on nodes is common and works like a nodeSelector where you supply a list of labels, and the scheduler assigns the Pod to nodes with those labels.

It works the same for selecting on Pods. You provide a list of labels, and Kubernetes ensures the Pod will run on the same nodes as other Pods with those labels.

Consider a couple of examples.

A hard node affinity rule specifying the project=tkb label tells the scheduler it can only run the Pod on nodes with that label. It won’t schedule the Pod if it can’t find a node with that label. If it was a soft rule, the scheduler would try to find a node with the label, but if it can’t find one, it’ll still schedule the Pod. If it was an anti-affinity rule, the scheduler would look for nodes that don’t have the label. The logic works the same for Pod-based rules.

Topology spread constraints are a flexible way of intelligently spreading Pods across your infrastructure for availability, performance, locality, or any other requirements. A typical example is spreading Pods across your cloud or data center’s underlying availability zones for high availability (HA). However, you can create custom domains for almost anything, such as scheduling Pods closer to data sources, closer to clients for improved network latency, and many more reasons.

Resource requests and resource limits are very important, and every Pod should use them. They tell the scheduler how much CPU and memory a Pod needs, and the scheduler uses them to ensure they run on nodes with enough resources. If you don’t specify them, the scheduler cannot know what resources a Pod requires and may schedule it to a node with insufficient resources.

Deploying Pods
Deploying a Pod includes the following steps:

Define the Pod in a YAML manifest file
Post the manifest to the API server
The request is authenticated and authorized
The Pod spec is validated
The scheduler filters nodes based on nodeSelectors, affinity and anti-affinity rules, topology spread constraints, resource requirements and limits, and more
The Pod is assigned to a healthy node meeting all requirements
The kubelet on the node watches the API server and notices the Pod assignment
The kubelet downloads the Pod spec and asks the local runtime to start it
The kubelet monitors the Pod status and reports status changes to the API server
If the scheduler can’t find a suitable node, it marks it as pending.

Deploying a Pod is an atomic operation. This means a Pod only starts servicing requests when all its containers are running.

Pod lifecycle
Pods are designed to be mortal and immutable.

Mortal means you cannot restart a failed or deleted Pod. Yes, Kubernetes will replace failed Pods if a higher-level controller manages them. But this isn’t the same as restarting and fixing a failed Pod.

Immutable means you cannot modify them after you’ve deployed them. This can be a huge mindset change if you’re from a traditional background where you regularly patched live servers and logged on to them to make fixes and configuration changes. If you need to change a Pod, you create a new one with the changes, delete the old one, and replace it with the new one. If you need to write data to a Pod, you should attach a volume to it and store the data in the volume. This way, you can still access the data and the volume after the Pod is gone.

Let’s look at a typical Pod lifecycle.

You define a Pod in a declarative YAML object that you post to the API server. It goes into the pending phase while the scheduler finds a node to run it on. Assuming it finds a node, the Pod gets scheduled, and the local kubelet instructs the runtime to start its containers. Once all of its containers are running, the Pod enters the running phase. It remains in the running phase indefinitely if it’s a long-lived Pod, such as a web server. If it’s a short-lived Pod, such as a batch job, it enters the succeeded state as soon as all containers complete their tasks. You can see this in Figure 4.3.

Figure 4.3 - Pod lifecycle
Figure 4.3 - Pod lifecycle
A quick side note about running VMs on Kubernetes. VMs are the opposite of containers, in that they are designed to be mutable and immortal. For example, you can restart them, change their configurations, and even migrate them. This is very different from the design goals of Pods and is why KubeVirt wraps VMs in a modified Pod called a VirtualMachineInstance (VMI) and manages them using custom workload controllers.

Restart Policies
Earlier in the chapter, we said Pods augment apps with restart policies. However, these apply to individual containers and not the Pod.

Let’s consider some scenarios.

You use a Deployment controller to schedule a Pod to a node, and the node fails. When this happens, the Deployment controller notices the failed node, deletes the Pod, and replaces it with a new one on a surviving node. Even though the new Pod is based on the same Pod spec, it has a new UID, a new IP address, and no state. It’s the same when nodes evict Pods during node maintenance or due to resource juggling — the evicted Pod is deleted and replaced with a new one on another node.

The same thing even happens during scaling operations, updates, and rollbacks. For example, scaling down deletes Pods, and scaling up always adds new Pods.

The take-home point is that anytime we say we’re updating or restarting Pods, we really mean replacing them with new ones.

Although Kubernetes can’t restart Pods, it can restart containers. This is always done by the local kubelet and governed by the value of the Pod’s spec.restartPolicy, which can be any of the following:

Always
Never
OnFailure
The values are self-explanatory: Always will always attempt to restart a container, Never will never attempt a restart, and OnFailure will only attempt a restart if the container fails with an error code. The policy is Pod-wide, meaning it applies to all containers in the Pod except for init containers. More on init containers later.

The restart policy you choose depends on the nature of the app — whether it’s a long-living container or a short-living container.

Long-living containers host apps such as web servers, data stores, and message queues that run indefinitely. If they fail, you normally want to restart them, so you’ll typically give them the Always restart policy.

Short-living containers are different and typically run batch-style workloads that run a task through to completion. Most of the time, you’re happy when they complete, and you only want to restart them if they fail. As such, you’ll probably give them the OnFailure restart policy. If you don’t care if they fail, give them the Never policy.

In summary, Kubernetes never restarts Pods — when they fail, get scaled up and down, and get updated, Kubernetes always deletes old Pods and creates new ones. However, it can restart individual containers on the same node.

Static Pods vs controllers
There are two ways to deploy Pods:

Directly via a Pod manifest (rare)
Indirectly via a workload resource and controller (most common)
Deploying directly from a Pod manifest creates a static Pod that cannot self-heal, scale, or perform rolling updates. This is because they’re only managed by the kubelet on the node they’re running on, and kubelets are limited to restarting containers on the same node. Also, if the node fails, the kubelet fails with it and cannot do anything to help the Pod.

On the flip side, Pods deployed via workload resources get all the benefits of being managed by a highly available controller that can restart them on other nodes, scale them when demand changes, and perform advanced operations such as rolling updates and versioned rollbacks. The local kubelet can still attempt to restart failed containers, but if the node fails or gets evicted, the controller can restart it on a different node. More on workload resources and controllers in Chapter 6.

Remember, when we say restart the Pod, we mean replace it with a new one.

The pod network
Every Kubernetes cluster runs a pod network and automatically connects all Pods to it. It’s usually a flat Layer-2 overlay network that spans every cluster node and allows every Pod to talk directly to every other Pod, even if the remote Pod is on a different cluster node.

Your pod network is implemented by a third-party plugin that interfaces with Kubernetes via the Container Network Interface (CNI).

You choose a network plugin at cluster build time, and it configures the Pod network for the entire cluster. Lots of plugins exist, and each one has its pros and cons. However, at the time of writing, Cilium is the most popular and implements a lot of advanced features such as security and observability.

Figure 4.4 shows three nodes running five Pods. The pod network spans all three nodes, and all five Pods connect to it. This means all of the Pods can communicate despite being on different nodes. Notice how the nodes connect to external networks and do not connect directly to the pod network.

Figure 4.4 The pod network
Figure 4.4 The pod network
It’s common for newly created clusters to implement a very open pod network with little or no security. This makes Kubernetes easy to use and avoids frustrations commonly associated with network security. However, you should use Kubernetes Network Policies and other measures to secure it.

Multi-container Pods
Multi-container Pods are a powerful pattern and are very popular in the real world.

According to microservices design patterns, every container should have a single clearly defined responsibility. For example, an application syncing content from a repository and serving it as a web page has two distinct responsibilities:

Sync the content
Serve the web page
You should design this app with two microservices and give each one its own container — one container responsible for syncing the content and the other responsible for serving the content. We call this separation of concerns, or the single responsibility principle, and it keeps containers small and simple, encourages reuse, and makes troubleshooting easier.

Most of the time, you’ll put application containers in their own Pods and they’ll communicate over the pod network. However, sometimes it’s better to put them in the same Pod. For example, sticking with the sync and serve app, putting both containers in the same Pod allows the sync container to pull content from the remote system and store it in a shared volume where the web container can read it and serve it. See Figure 4.5.

Figure 4.5 - Multi-container Pod
Figure 4.5 - Multi-container Pod
Kubernetes has two main patterns for multi-container Pods: init containers and sidecar containers. Let’s look at both.

Multi-container Pods: Init containers
Init containers are a special type of container defined in the Kubernetes API. You run them in the same Pod as application containers, but Kubernetes guarantees they’ll start and complete before the main app container starts. It also guarantees they’ll only run once.

The purpose of init containers is to prepare and initialize the environment so it’s ready for application containers.

Consider a couple of quick examples.

You have an application that should only start when a remote API is ready to accept connections. Instead of complicating the main application with the logic to check the remote API, you run that logic in an init container in the same Pod. When you deploy the Pod, Kubernetes starts the init container first, which sends periodic requests to the API server until it receives a response. While it’s doing this, Kubernetes prevents the application container from starting. However, as soon as the init container receives a response from the API server, it completes, and Kubernetes starts the application.

Assume you have another application that needs a one-time clone of a remote repository before starting. Again, instead of bloating and complicating the main application with the code to clone and prepare the content (knowledge of the remote server address, certificates, auth, file sync protocol, checksum verifications, etc.), you implement that in an init container that is guaranteed to complete the task before the main application container starts.

You can list multiple init containers per Pod and Kubernetes runs them in the order they appear in the Pod manifest. They all have to complete before Kubernetes moves on to start regular application containers, and if any init container fails, Kubernetes attempts to restart it. However, if you’ve set the Pod’s restartPolicy to Never, Kubernetes will fail the Pod.

A drawback of init containers is that they’re limited to running tasks before the main app container starts. For something that runs alongside the main app container, you need a sidecar container.

Multi-container Pods: Sidecars
The job of a sidecar container is to add functionality to an application without having to add it directly to the application container. Examples include sidecars that scrape logs, monitor & sync remote content, broker connections, munge data, and encrypt network traffic.

Figure 4.6 shows a multi-container Pod with an application container and a service mesh sidecar intercepting and encrypting all network traffic. In this example, it’s vital that the sidecar starts before the main application container and keeps running for the entire life of the Pod — if the sidecar isn’t running, the application container cannot use the network.

Figure 4.6 - Service mesh sidecar
Figure 4.6 - Service mesh sidecar
Older versions of Kubernetes had no concept of sidecar containers, and we had to implement them as regular containers. However, this was problematic as there was no reliable way to start sidecars before app containers, keep them running alongside app containers, or stop them after app containers. Fortunately, Kubernetes v1.28 introduced native sidecars as an alpha feature and progressed them to beta status in v1.29. As of v1.32, sidecar containers are still a beta feature, and you should use them with caution. However, they’re enabled by default and used by many notable projects, including Argo CD and Istio. We should expect them to reach the GA (stable) milestone very soon.

You’ll see this in more detail in the hands-on section, but you define sidecars as init containers (spec.initContainers) with the restartPolicy set to Always. If you do this, Kubernetes guarantees they will:

Start before the main application container
Keep running alongside the main application container
Terminate after the main application container
Aside from the above, they follow the other rules of init containers, such as startup order, and you can attach probes to manage and monitor their lifecycles.

Pod theory summary
Pods are the atomic unit of scheduling on Kubernetes and abstract the details of the workloads inside them. They also enable advanced scheduling and many other features.

Many Pods run a single container, but multi-container Pods are more powerful. You can use multi-container Pods to tightly-couple workloads that need to share resources such as memory and volumes. You can also use multi-container Pods to augment apps (sidecar pattern) and initialize environments (init pattern).

You define Pods in declarative YAML objects, but you’ll usually deploy them via higher-level workload controllers that augment them with superpowers such as self-healing, autoscaling, and more.

Time to see some examples.

Hands-on with Pods
If you’re following along, clone the book’s GitHub repo and switch to the 2025 branch.

$ git clone https://github.com/nigelpoulton/TKB.git
Cloning into 'TKB'...

$ cd TKB

$ git fetch origin

$ git checkout -b 2025 origin/2025
Be sure to run all commands from the pods folder.

Pod manifest files
Let’s see our first Pod manifest. This is the pod.yml file from the pods folder.

kind: Pod
apiVersion: v1
metadata:
  name: hello-pod
  labels:
    zone: prod
    version: v1
spec:
  containers:
  - name: hello-ctr
    image: nigelpoulton/k8sbook:1.0
    ports:
    - containerPort: 8080
    resources:
      limits:
        memory: 128Mi
        cpu: 0.5
It’s a simple example, but straight away you can see four top-level fields:

kind
apiVersion
metadata
spec
The kind field tells Kubernetes what type of object you’re defining. This one’s defining a Pod, but if you were defining a Deployment, the kind field would say Deployment.

apiVersion tells Kubernetes what version of the API to use when creating the object.

So far, this manifest describes a Pod and tells Kubernetes to build it using the v1 Pod schema.

The metadata section names the Pod hello-pod and gives it two labels. You’ll use the labels in a future chapter to connect it to a Service for networking.

Most of the action happens in the spec section. This example defines a single-container Pod with an application container called hello-ctr. The container is based on the nigelpoulton/k8sbook:1.0 image, listens on port 8080, and tells the scheduler it needs a maximum of 128MB of memory and half a CPU.

Manifest files: Empathy as Code
Quick side-step.

Kubernetes YAML files are excellent sources of documentation, and you can use them to get new team members up to speed quickly and help bridge the gap between developers and operations.

For example, new team members can read your YAML files and quickly learn your application’s basic functions and requirements. Operations teams can also use them to understand application requirements such as network ports, CPU and memory requirements, and much more.

You can also store them in source control repositories for easy versioning and running diffs against other versions.

Nirmal Mehta described these side benefits as a form of empathy as code in his 2017 DockerCon talk entitled A Strong Belief, Loosely Held: Bringing Empathy to IT.

Deploying Pods from a manifest file
Run the following kubectl apply command to deploy the Pod. The command sends the pod.yml file to the API server defined in the current context of your kubeconfig file. It also authenticates the request using credentials from your kubeconfig file.

$ kubectl apply -f pod.yml
pod/hello-pod created
Although the output says the Pod is created, it might still be pulling the image and starting the container.

Run a kubectl get pods to check the status.

$ kubectl get pods
NAME        READY    STATUS             RESTARTS   AGE
hello-pod   0/1      ContainerCreating  0          9s
The Pod in the example isn’t fully created yet — the READY column shows zero containers ready, and the STATUS column shows why.

This is a good time to mention that Kubernetes automatically pulls (downloads) images from Docker Hub. To use another registry, just add the registry’s URL before the image name in the YAML file.

Once the READY column shows 1/1 and the STATUS column shows Running, your Pod is running on a healthy cluster node and actively monitored by the node’s kubelet.

You’ll see how to connect to the app and test it in future chapters.

Introspecting Pods
Let’s look at some of the main ways you’ll use kubectl to monitor and inspect Pods.

kubectl get
You’ve already run a kubectl get pods command and seen that it returns a single line of basic info. However, the following flags get you a lot more info:

-o wide gives a few more columns but is still a single line of output
-o yaml gets you everything Kubernetes knows about the object
The following example shows the output of a kubectl get pods with the -o yaml flag. I’ve snipped the output, but you can see it’s divided into two main parts:

spec
status
The spec section shows the desired state of the object, and the status section shows the observed state.

$ kubectl get pods hello-pod -o yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      <Snip>
  name: hello-pod
  namespace: default
spec:                           <<---- Desired state is in this block
  containers:
  - image: nigelpoulton/k8sbook:1.0
    imagePullPolicy: IfNotPresent
    name: hello-ctr
    ports:
    <Snip>
status:                         <<---- Observed state is in this block
  conditions:
  - lastProbeTime: null
    lastTransitionTime: "2024-01-03T18:21:51Z"
    status: "True"
    type: Initialized
  <Snip>
The full output contains much more than the 17-line YAML file you used to create the Pod. So, where does Kubernetes get all this extra detail?

Two main sources:

Pods have a lot of properties, and anything you don’t explicitly define in a YAML file gets populated with defaults
The status section shows you the current state of the Pod and isn’t part of your YAML file
kubectl describe
Another great command is kubectl describe. This gives you a nicely formatted overview of an object, including lifecycle events.

$ kubectl describe pod hello-pod
Name:         hello-pod
Namespace:    default
Labels:       version=v1
              zone=prod
Status:       Running
IP:           10.1.0.103
Containers:
  hello-ctr:
    Container ID:   containerd://ec0c3e...
    Image:          nigelpoulton/k8sbook:1.0
    Port:           8080/TCP
    <Snip>
Conditions:
  Type              Status
  Initialized       True
  Ready             True
  ContainersReady   True
  <Snip>
Events:
  Type    Reason     Age        Message
  ----    ------     ----     -------
  Normal  Scheduled  5m30s    Successfully assigned ...
  Normal  Pulling    5m30s    Pulling image "nigelpoulton/k8sbook:1.0"
  Normal  Pulled     5m8s     Successfully pulled image ...
  Normal  Created    5m8s     Created container hello-ctr
  Normal  Started    5m8s     Started container hello-ctr
I’ve snipped the output for the book, but you’ll learn a lot if you study the full output on your own system.

kubectl logs
You can use the kubectl logs command to pull the logs from any container in a Pod. The basic format of the command is kubectl logs <pod>.

If you run the command against a multi-container Pod, you automatically get the logs from the first container in the Pod. However, you can override this by using the --container flag and specifying the name of a different container. If you’re unsure of container names or the order in which they appear in a multi-container Pod, just run a kubectl describe pod <pod> command. You can get the same info from the Pod’s YAML file.

The following YAML shows a multi-container Pod with two containers. The first container is called app, and the second is called syncer. Running a kubectl logs against this Pod without specifying the --container flag will get you the logs from the app container.

kind: Pod
apiVersion: v1
metadata:
  name: logtest
spec:
  containers:
  - name: app                   <<---- First container (default)
    image: nginx
      ports:
        - containerPort: 8080
  - name: syncer                <<---- Second container
    image: k8s.gcr.io/git-sync:v3.1.6
    volumeMounts:
    - name: html
<Snip>
You’d run the following command if you wanted the logs from the syncer container. Don’t run this command, as you haven’t deployed this Pod.

$ kubectl logs logtest --container syncer
kubectl exec
The kubectl exec command is a great way to execute commands inside running containers.

You can use kubectl exec in two ways:

Remote command execution
Exec session
Remote command execution lets you send commands to a container from your local shell. The container executes the command and returns the output to your shell.

An exec session connects your local shell to the container’s shell and is the same as being logged on to the container.

Let’s look at both, starting with remote command execution.

Run the following command from your local shell. It’s asking the first container in the hello-pod Pod to run a ps command.

$ kubectl exec hello-pod -- ps
PID   USER     TIME  COMMAND
  1   root      0:00 node ./app.js
 17   root      0:00 ps aux
The container executed the ps command and displayed the result in your local terminal.

The format of the command is kubectl exec <pod> -- <command>, and you can execute any command installed in the container. Remember to use the --container flag if you want to run the command in a specific container.

Try running the following command.

$ kubectl exec hello-pod -- curl localhost:8080
OCI runtime exec failed:...... "curl": executable file not found in $PATH
This one failed because this container doesn’t have the curl command.

Let’s use kubectl exec to get an interactive exec session to the same container. This works by connecting your terminal to the container’s terminal, and it feels like an SSH session.

Run the following command to create an exec session to the first container in the hello-pod Pod. Your shell prompt will change to indicate you’re connected to the container’s shell.

$ kubectl exec -it hello-pod -- sh
#
The -it flag tells kubectl exec to make the session interactive by connecting your shell’s STDIN and STDOUT streams to the STDIN and STDOUT of the first container in the Pod. The sh command starts a new shell process in the session, and your prompt will change to indicate you’re now inside the container.

Run the following commands from within the exec session to install the curl binary and then execute a curl command.

# apk add curl
<Snip>

# curl localhost:8080
<html><head><title>K8s rocks!</title><link rel="stylesheet" href="http://netdna....
Making changes like this to live Pods is an anti-pattern as Pods are designed as immutable objects. However, it’s OK for demonstration purposes like this.

Pod hostnames
Pods get their names from their YAML file’s metadata.name field and Kubernetes uses this as the hostname for every container in the Pod.

If you’re following along, you’ll have a single Pod called hello-pod. You deployed it from the following YAML file that sets the Pod name as hello-pod.

kind: Pod
apiVersion: v1
metadata:
  name: hello-pod      <<---- Pod hostname. Inherited by all containers.
  labels:
  <Snip>
Run the following command from inside your existing exec session to check the container’s hostname. The command is case-sensitive.

$ env | grep HOSTNAME
HOSTNAME=hello-pod
As you can see, the container’s hostname matches the name of the Pod. If this was a multi-container Pod, all of its containers would have the same hostname.

Because of this, you should ensure that Pod names are valid DNS names (a-z, 0-9, the minus and period signs).

Type exit to quit your exec session and return to your local terminal.

Check Pod immutability
Pods are designed as immutable objects, meaning you shouldn’t change them after you’ve deployed them.

Immutability applies at two levels:

Object immutability (the Pod)
App immutability (containers)
Kubernetes handles object immutability by preventing changes to a running Pod’s configuration. However, Kubernetes can’t always prevent you from changing the app and filesystem inside of containers. You’re responsible for ensuring containers and their apps are stateless and immutable.

The following example uses kubectl edit to edit a live Pod object. Try and change any of these attributes:

Container name
Container port
Resource requests and limits
You need to run this command from your local terminal, and it will open the Pod’s configuration in your default editor. For Mac and Linux users, it will typically open the session in vi, whereas for Windows, it’s usually notepad.exe.

$ kubectl edit pod hello-pod

# Please edit the object below. Lines beginning with a '#' will be ignored...
apiVersion: v1
kind: Pod
metadata:
  <Snip>
  labels:
    version: v1
    zone: prod
  name: hello-pod                    
  namespace: default
  resourceVersion: "432621"
  uid: a131fb37-ceb4-4484-9e23-26c0b9e7b4f4
spec:
  containers:
  - image: nigelpoulton/k8sbook:1.0
    imagePullPolicy: IfNotPresent
    name: hello-ctr                  <<---- Try to change this
    ports:
    - containerPort: 8080            <<---- Try to change this
      protocol: TCP
    resources:
      limits:
        cpu: 500m                    <<---- Try to change this
        memory: 256Mi                <<---- Try to change this
      requests:
        cpu: 500m                    <<---- Try to change this
        memory: 256Mi                <<---- Try to change this
Edit the file, save your changes, and close your editor. You’ll get a message telling you the changes are forbidden because the attributes are immutable.

If you get stuck inside the vi session, you can probably exit by typing the following key combination — :q! and then pressing RETURN.

Resource requests and resource limits
Kubernetes lets you specify resource requests and resource limits for every container in a Pod.

Requests are minimum values
Limits are maximum values
Consider the following snippet from a Pod YAML:

resources:
  requests:              <<---- Minimums for scheduling
    cpu: 0.5
    memory: 256Mi
  limits:                <<---- Maximums for kubelet to cap
    cpu: 1.0
    memory: 512Mi
This container needs a minimum of 256Mi of memory and half a CPU. The scheduler reads this and assigns it to a node with enough resources. If it can’t find a suitable node, it marks the Pod as pending, and the Cluster Autoscaler will attempt to provision a new cluster node.

Assuming the scheduler finds a suitable node, it assigns the Pod to the node, and the kubelet downloads the Pod spec and asks the local runtime to start it. As part of the process, the kubelet reserves the requested CPU and memory, guaranteeing the resources will be there when needed. It also tells the runtime to set a resource cap based on each container’s resource limits. In this example, it asks the runtime to set a cap of one CPU and 512Mi of memory. Most runtimes will enforce these limits, but how each runtime implements this can vary.

While a container executes, it is guaranteed access to its minimum requirements (requests). It can also use more if the node has additional resources available, but it’s never allowed to use more than what you specify in its limits.

For multi-container Pods, the scheduler combines the requests for all containers and finds a node with enough resources to satisfy the full Pod.

If you’ve been following the examples closely, you’ll have noticed that the pod.yml you used to deploy the hello-pod only specified resource limits — it didn’t specify resource requests. However, some command outputs have displayed limits and requests. This is because Kubernetes automatically sets requests to match limits if you don’t specify requests.

Multi-container Pod example – init container
The following YAML defines a multi-container Pod with an init container and an app container. It’s from the initpod.yml file in the pods folder of the book’s GitHub repo.

apiVersion: v1
kind: Pod
metadata:
  name: initpod
  labels:
    app: initializer
spec:
  initContainers:
  - name: init-ctr
    image: busybox:1.28.4
    command: ['sh', '-c', 'until nslookup k8sbook; do echo waiting for k8sbook service;\
              sleep 1; done; echo Service found!']
  containers:
    - name: web-ctr
      image: nigelpoulton/web-app:1.0
      ports:
        - containerPort: 8080
Defining containers under the spec.initContainers block makes them init containers that Kubernetes guarantees will run and complete before it starts regular containers.

Regular containers are defined under the spec.containers block and will not start until all init containers successfully complete.

This example has a single init container called init-ctr and a single app container called web-ctr. The init container runs a loop looking for a Kubernetes Service called k8sBook. It will remain running in this loop until you create the Service. Once you create the Service, the init container will see it and exit, allowing the app container to start. You’ll learn about Services in a future chapter.

Deploy the multi-container Pod with the following command and then run a kubectl get pods with the --watch flag to see if it comes up.

$ kubectl apply -f initpod.yml
pod/initpod created

$ kubectl get pods --watch
NAME      READY   STATUS     RESTARTS   AGE
initpod   0/1     Init:0/1   0          6s
The Init:0/1 status tells you that the init container is still running, meaning the main container hasn’t started yet. If you run a kubectl describe command, you’ll see the overall Pod status is Pending.

$ kubectl describe pod initpod
Name:             initpod
Namespace:        default
Priority:         0
Service Account:  default
Node:             docker-desktop/192.168.65.3
Labels:           app=initializer
Annotations:      <none>
Status:           Pending              <<---- Pod status
<Snip>
The Pod will remain in this phase until you create a Service called k8sbook.

Run the following commands to create the Service and re-check the Pod status.

$ kubectl apply -f initsvc.yml
service/k8sbook created

$ kubectl get pods --watch
NAME      READY   STATUS            RESTARTS   AGE
initpod   0/1     Init:0/1          0          15s
initpod   0/1     PodInitializing   0          3m39s
initpod   1/1     Running           0          3m57s
The init container completes when it sees the Service, and the main application container starts. Give it a few seconds to fully start.

If you run another kubectl describe against the initpod Pod, you’ll see the init container is in the terminated state because it completed successfully (exit code 0).

Multi-container Pod example – sidecar container
The job of a sidecar container is to augment an application container by providing a secondary service such as log scraping or synchronizing with a remote repository.

Kubernetes runs Sidecar containers in the same Pod as application containers so they can share resources such as volumes. Kubernetes also guarantees that sidecars will start before app containers, run as long as app containers run, and terminate after app containers.

You define sidecar containers in YAML manifest files below spec.initContainers and set the container’s restartPolicy to Always. This restart policy is what sets sidecars apart from regular init containers and ensures they’ll run alongside the app container. You define application containers in the same Pod manifest below spec.containers.

The following YAML file defines the multi-container Pod you’re about to deploy. It has a single sidecar container called ctr-sync and a single app container called ctr-web. The ctr-sync sidecar has the restartPolicy: Always setting, which only applies to the container and overrides any restart policy you might set at the Pod level.

apiVersion: v1
kind: Pod
metadata:
  name: git-sync
  labels:
    app: sidecar
spec:
  initContainers:                     
  - name: ctr-sync                    ---┐  
    restartPolicy: Always                |      <<---- Setting to "Always" makes this a sidecar
    image: k8s.gcr.io/git-sync:v3.1.6    | 
    volumeMounts:                        | 
    - name: html                         | S
      mountPath: /tmp/git                | i
    env:                                 | d
    - name: GIT_SYNC_REPO                | e
      value: https://github.com...       | c
    - name: GIT_SYNC_BRANCH              | a
      value: master                      | r
    - name: GIT_SYNC_DEPTH               | 
      value: "1"                         | 
    - name: GIT_SYNC_DEST                | 
      value: "html"                   ---┘ 
  containers:
  - name: ctr-web                     ---┐ 
    image: nginx                         | A
    volumeMounts:                        | p 
    - name: html                         | p
      mountPath: /usr/share/nginx/    ---┘
  volumes:
  - name: html
    emptyDir: {}
The ctr-sync sidecar container watches a GitHub repo and synchronizes any changes into a shared volume called html. The ctr-web app container watches this shared volume and serves a web page from its contents. In the example you’re about to follow, you’ll start the app, update the remote GitHub repo, and prove that the sidecar container synchronizes the updates.

Note: You’ll need Kubernetes v1.29 or later and a GitHub account to follow this example. GitHub accounts are free.

You’ll complete the following steps:

Fork the GitHub repo
Update the YAML file with the URL of your forked repo
Deploy the app
Connect to the app and see it display This is version 1.0
Make a change to your fork of the GitHub repo
Verify your changes appear on the app’s web page
1. Fork the GitHub repo

You’ll need a GitHub account to complete this step. They’re free.

Point your browser to this URL: https://github.com/nigelpoulton/ps-sidecar.

Click the Fork dropdown button, choose the + Create a new fork option, fill in the required details, and click the green Create fork button.

This will take you to your newly forked repo where you can copy its URL. Be sure to copy the URL of your forked repo.

2. Update the YAML file

Return to your local machine, edit the initsidecar.yml file in the pods directory, paste the copied URL into the GIT_SYNC_REPO field, and save your changes.

3. Deploy the sidecar app

Run the following command to deploy the application from the initsidecar.yml file. It will deploy the Pod with the app and sidecar containers, as well as a Service that you’ll use to connect to the app.

$ kubectl apply -f initsidecar.yml
pod/git-sync created
service/svc-sidecar created
Check the Pod status.

$ kubectl get pods                     
NAME         READY     STATUS      RESTARTS     AGE
git-sync     2/2       Running     0            12s
The Pod is running, and both containers are ready.

The following command is more complicated, but shows that Kubernetes deployed the ctr-sync container as an init container and the ctr-web container as a regular container.

$ kubectl get pod -o "custom-columns="\
  "NAME:.metadata.name,"\
  "INIT:.spec.initContainers[*].name,"\
  "CONTAINERS:.spec.containers[*].name"

NAME         INIT         CONTAINERS
git-sync     ctr-sync     ctr-web
Describe the Pod and view the Events section to confirm Kubernetes started the ctr-sync sidecar Pod before the ctr-web app Pod. I’ve trimmed the output to show the relevant parts.

$ kubectl describe pod git-sync

Name:             git-sync
Status:           Running
<Snip>
Events:
  Type      Reason       Age     From       Message
  ----      ------       ----    ----       -------
  Normal    Created      19s     kubelet    Created container ctr-sync
  Normal    Started      19s     kubelet    Started container ctr-sync
  Normal    Pulling      18s     kubelet    Pulling image "nginx"
  Normal    Created      17s     kubelet    Created container ctr-web
  Normal    Started      17s     kubelet    Started container ctr-web
The timestamps show that Kubernetes started the ctr-sync sidecar container before it started the ctr-web app container.

4. Connect to the app

Once the Pod is running, you can run a kubectl get svc svc-sidecar command and copy the value from the EXTERNAL-IP column. This will be a public IP or DNS name if you’re running in the cloud. You’ll need to use localhost if you’re running a local Docker Desktop cluster.

Paste the IP or DNS name into a new browser tab to see the web page. It will display This is version 1.0.

5. Make a change to your fork of the GitHub repo

You must complete this step against your forked repo.

Go to your forked repo and edit the index.html file. Change the <h1> line to something different, then save and commit your changes.

6. Verify your changes appear on the web page

Refresh the app’s web page to see your updates.

Congratulations. The sidecar started before the app container and is still running. You proved this using kubectl commands, but you also proved it by changing the contents of your forked GitHub repo and witnessing your changes appear in the application.

Clean up
If you’ve been following along, you’ll have the following deployed to your cluster.

Pods	Services
hello-pod	 
initpod	k8sbook
git-sync	svc-sidecar
Delete them with the following commands.

$ kubectl delete pod hello-pod initpod git-sync
pod "hello-pod" deleted
pod "initpod" deleted
pod "git-sync" deleted

$ kubectl delete svc k8sbook svc-sidecar
service "k8sbook" deleted
service "svc-sidecar" deleted
You can also delete objects via their YAML files.

$ kubectl delete -f initsidecar.yml -f initpod.yml -f pod.yml -f initsvc.yml
pod "git-sync" deleted
service "svc-sidecar" deleted
pod "initpod" deleted
pod "hello-pod" deleted
service "k8sbook" deleted
You may also want to delete your GitHub fork.

Chapter Summary
In this chapter, you learned that Kubernetes deploys all applications inside Pods. The apps can be containers, serverless functions, Wasm apps, and VMs. However, they’re usually containers, so we usually refer to Pods in terms of executing containers.

As well as abstracting different types of applications, Pods provide a shared execution environment, advanced scheduling, application health probes, and lots more.

Pods can be single-container or multi-container, and all containers in a multi-container Pod share the Pod’s networking, volumes, and memory.

You’ll usually deploy Pods via higher-level workload controllers such as Deployments, Jobs, and DaemonSets. Third-party tools, such as Knative and KubeVirt, extend the Kubernetes API with custom resources and custom workload controllers that allow Kubernetes to run serverless and VM workloads.

You define Pods in declarative YAML files that you post to the API server, and the control plane schedules them to the cluster. You’ll usually use kubectl apply to post the YAML manifests to the API server, and the scheduler will deploy them.


table of contents
search
Settings
Previous chapter
3: Getting Kubernetes
Next chapter
5: Virtual clusters with Namespaces
Table of contents collapsed
