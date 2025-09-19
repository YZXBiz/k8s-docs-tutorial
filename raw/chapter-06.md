Skip to Content
6: Kubernetes Deployments
This chapter shows you how to use Deployments to add cloud-native features such as self-healing, scaling, rolling updates, and versioned rollbacks to stateless apps on Kubernetes.

I’ve organized the chapter as follows:

Deployment theory
Create a Deployment
Manually scale an app
Perform a rollout
Perform a rollback
Deployment theory
Deployments are the most popular way of running stateless apps on Kubernetes. They add self-healing, scaling, rollouts, and rollbacks.

Consider a quick example.

Assume you have a requirement for a web app that needs to be resilient, scale on demand, and be frequently updated. You write the app, containerize it, and define it as a Pod. However, before sending the Pod to Kubernetes, you wrap it in a Deployment so it gets the resiliency, scaling, and update capabilities. You then post the Deployment to Kubernetes, where the Deployment controller deploys the Pod.

At this point, your cluster is running a single Deployment managing a single Pod.

If the Pod fails, the Deployment controller replaces it with a new one. If demand increases, the Deployment controller can scale the app by deploying more identical Pods. When you update the app, the Deployment controller deletes the old Pods and replaces them with new ones.

Assume you add a shopping cart service that also needs to be resilient, scalable, and regularly updated. You’d containerize this, define it in its own Pod, wrap the Pod in its own Deployment, and deploy it to the cluster.

At this point, you’d have two Deployments managing two different microservices.

Figure 6.1 shows a similar setup with the Deployment controller watching and managing two Deployments. The web Deployment manages four identical web server Pods, and the cart Deployment manages two identical shopping cart Pods.

Figure 6.1 - Deployments
Figure 6.1 - Deployments
Under the hood, Deployments follow standard Kubernetes architecture comprising:

A resource
A controller
At the highest level, resources define objects and controllers manage them.

The Deployment resource exists in the apps/v1 API and defines all supported attributes and capabilities.

The Deployment controller is a control plane service that watches Deployments and reconciles observed state with desired state.

Deployments and Pods
Every Deployment manages one or more identical Pods.

For example, an application comprising a web service and a shopping cart service will need two Deployments — one for managing the web Pods and the other for managing the shopping cart Pods. Figure 6.1 showed the web Deployment managing four identical web Pods and the cart Deployment managing two identical shopping cart Pods.

Figure 6.2 shows a Deployment YAML file requesting four replicas of a single Pod. If you increase the replica count to six, it will deploy and manage two more identical Pods.

Figure 6.2
Figure 6.2
Notice how the Pod is defined in a template embedded in the Deployment YAML. You’ll see this referred to as the Pod template.

Deployments and ReplicaSets
We’ve repeatedly said that Deployments add self-healing, scaling, rollouts, and rollbacks. However, behind the scenes, there’s a different resource called a ReplicaSet that provides self-healing and scaling.

Figure 6.3 shows the overall architecture of containers, Pods, ReplicaSets, and Deployments. It also shows how they map into a Deployment YAML. In the diagram rs is short for ReplicaSet.

Figure 6.3
Figure 6.3
Posting this Deployment YAML to the cluster will create a Deployment, a ReplicaSet, and two identical Pods running identical containers. The Pods are managed by the ReplicaSet, which, in turn, is managed by the Deployment. However, you perform all management via the Deployment and never directly manage the ReplicaSet or Pods.

A quick word on scaling
It’s possible to scale your apps manually, and we’ll see how to do that shortly. However, Kubernetes has several autoscalers that automatically scale your apps and infrastructure. Some of them include:

The Horizontal Pod Autoscaler
The Vertical Pod Autoscaler
The Cluster Autoscaler
The Horizontal Pod Autoscaler (HPA) adds and removes Pods to meet current demand. It’s automatically installed on most clusters and widely used.

The Cluster Autoscaler (CA) adds and removes cluster nodes so you always have enough to run all scheduled Pods. This is also installed by default and widely used.

The Vertical Pod Autoscaler (VPA) increases and decreases the CPU and memory allocated to running Pods to meet current demand. It isn’t installed by default, has several known limitations, and is less widely used. Current implementations work by deleting the existing Pod and replacing it with a new one every time it scales the Pods resources. This is disruptive and can even result in Kubernetes scheduling the new Pod to a different node. Work is underway to enable in-place updates to live Pods, but it’s currently an early alpha feature.

Community projects like karmada take things further by allowing you to scale apps across multiple clusters.

Let’s consider a quick example using the HPA and CA.

You deploy an application to your cluster and configure an HPA to autoscale the number of application Pods between two and ten. Demand increases, and the HPA asks the scheduler to increase the number of Pods from two to four. This works, but demand continues rising, and the HPA asks the scheduler for another two Pods. However, the scheduler can’t find a node with sufficient resources and marks the two new Pods as pending. The CA notices the pending Pods and dynamically adds a new cluster node. Once the node joins the cluster, the scheduler assigns the pending Pods to it.

The process works the same for scaling down. For example, the HPA reduces the number of Pods when demand decreases. This may trigger the CA to reduce the number of cluster nodes. When removing a cluster node, Kubernetes evicts all Pods on the node and replaces them with new Pods on surviving nodes.

You’ll sometimes hear people refer to multi-dimensional autoscaling. This is jargon for combining multiple scaling methods — scaling Pods and nodes, or scaling apps horizontally (adding more Pods) and vertically (adding more resources to existing Pods).

It’s all about the state
Before going any further, it’s vital that you understand the following concepts. If you already know them, you can skip to the Rolling updates with Deployments section.

Desired state
Observed state (sometimes called actual state or current state)
Reconciliation
Desired state is what you want, observed state is what you have, and the goal is for them to always match. When they don’t match, a controller starts a reconciliation process to bring observed state into sync with desired state.

The declarative model is how we declare a desired state to Kubernetes without telling Kubernetes how to implement it. You leave the how up to Kubernetes.

Declarative vs Imperative
The declarative model describes an end goal — you tell Kubernetes what you want. The imperative model requires long lists of commands that tell Kubernetes how to reach the end goal.

The following analogy will help:

Declarative: Give me a chocolate cake to feed ten people.
Imperative: Drive to store. Buy eggs, milk, flour, cocoa powder… Drive home. Preheat the oven. Mix the ingredients. Place in a cake tin. If a fan-assisted oven, place the cake in the oven for 30 minutes. If not a fan-assisted oven, place the cake in the oven for 40 minutes. Set a timer. Remove from the oven when the timer expires and turn the oven off. Leave to stand until cool. Add frosting.
The declarative model is simpler and leaves the how up to Kubernetes. The imperative model is much more complex as you need to provide all the steps and commands that will hopefully achieve an end goal — in this case, making a chocolate cake for ten people.

Let’s look at a more concrete example.

Assume you have an application with two microservices — a front-end and a back-end. You anticipate needing five front-end replicas and two back-end replicas.

Taking the declarative approach, you write a simple YAML file requesting five front-end Pods listening externally on port 80, and two back-end Pods listening internally on port 27017. You then give the file to Kubernetes and sit back while Kubernetes makes it happen. It’s a beautiful thing.

The opposite is the imperative model. This is usually a long list of complex instructions with no concept of desired state. And, making things worse, imperative instructions can have endless potential variations. For example, the commands to pull and start containerd containers are different from the commands to pull and start CRI-O containers. This results in more work and is prone to more errors, and because it’s not declaring a desired state, there’s no self-healing. It’s devastatingly ugly.

Kubernetes supports both models but strongly prefers the declarative model.

Note: containerd and CRI-O are container runtimes that run on Kubernetes worker nodes and perform low-level tasks such as starting and stopping containers.

Controllers and reconciliation
Reconciliation is fundamental to desired state.

For example, Kubernetes implements ReplicaSets as a background controller running in a reconciliation loop, ensuring the correct number of Pod replicas are always present. If there aren’t enough Pods, the ReplicaSet adds more. If there are too many, it terminates some.

Assume a scenario where your desired state is ten replicas, but only eight are present. It makes no difference if this is due to failures or if an autoscaler has requested an increase. Either way, the ReplicaSet controller creates two new replicas to sync observed state with desired state. And the best part is that it does it without needing help from you!

The exact same reconciliation process enables self-healing, scaling, rollouts, and rollbacks.

Let’s take a closer look at rolling updates and rollbacks.

Rolling updates with Deployments
Deployments are amazing at zero-downtime rolling updates (rollouts). But they work best if you design your apps to be:

Loosely coupled via APIs
Backward and forward compatible
Both are hallmarks of modern cloud-native microservices apps and work as follows.

Your microservices should always be loosely coupled and only communicate via well-defined APIs. Doing this means you can update and patch any microservice without having to worry about impacting others — all connections are via formalized APIs that expose documented interfaces and hide specifics.

Ensuring releases are backward and forward-compatible means you can perform independent updates without caring which versions of clients are consuming your service. A simple non-tech analogy is a car. Cars expose a standard driving “API” that includes a steering wheel and foot pedals. As long as you don’t change this “API”, you can re-map the engine, change the exhaust, and get bigger brakes, all without the driver having to learn any new skills.

With these points in mind, zero-downtime rollouts work like this.

Assume you’re running five replicas of a stateless microservice. Clients can connect to any of the five replicas as long as all clients connect via backward and forward-compatible APIs. To perform a rollout, Kubernetes creates a new replica running the new version and terminates one running the old version. At this point, you’ve got four replicas on the old version and one on the new. This process repeats until all five replicas are on the new version. As the app is stateless and multiple replicas are up and running, clients experience no downtime or interruption of service.

There’s a lot more going on behind the scenes, so let’s take a closer look.

Each microservice is built as a container and wrapped in a Pod. You then wrap the Pod for each microservice in its own Deployment for self-healing, scaling, and rolling updates. Each Deployment describes all the following:

Number of Pod replicas
Container images to use
Network ports
How to perform rolling updates
You post Deployment YAML files to the API Server, and the ReplicaSet controller ensures the correct number of Pods get scheduled. It also watches the cluster, ensuring observed state matches desired state. A Deployment sits above the ReplicaSet, governing its configuration and adding mechanisms for rollouts and rollbacks.

All good so far.

Now, assume you’re exposed to a known vulnerability and need to release an update with the fix. To do this, you update the same Deployment YAML file with the new Pod spec and re-post it to the API server. This updates the existing Deployment object with a new desired state requesting the same number of Pods, but all running the newer version containing the fix.

At this point, observed state no longer matches desired state — you’ve got five old Pods, but you want five new ones.

To reconcile, the Deployment controller creates a new ReplicaSet defining the same number of Pods but running the newer version. You now have two ReplicaSets — the original one for the Pods with the old version and the new one for the Pods with the new version. The Deployment controller systematically increments the number of Pods in the new ReplicaSet as it decrements the number in the old ReplicaSet. The net result is a smooth, incremental rollout with zero downtime.

The same process happens for future updates — you keep updating the same Deployment manifest, which you should store in a version control system.

Figure 6.4 shows a Deployment that you’ve updated once. The initial release created the ReplicaSet on the left, and the update created the one on the right. You know the update is complete because the ReplicaSet on the left isn’t managing any Pods, whereas the one on the right is managing three live Pods.

Figure 6.4
Figure 6.4
In the next section, you’ll see why it’s important that the old ReplicaSet still exists with its configuration intact.

Rollbacks
As you saw in Figure 6.4, older ReplicaSets are wound down and no longer manage any Pods. However, their configurations still exist and can be used to easily roll back to earlier versions.

The rollback process is the opposite of a rollout — wind an old ReplicaSet up while the current one winds down.

Figure 6.5 shows the same app rolled back to the previous config with the earlier ReplicaSet on the left managing all the Pods.

Figure 6.5
Figure 6.5
But that’s not the end. Kubernetes gives you fine-grained control over rollouts and rollbacks. For example, you can insert delays, control the pace and cadence of releases, and even probe the health and status of updated replicas.

But talk is cheap. Let’s see Deployments in action.

Create a Deployment
You’ll need the lab files from the book’s GitHub repo if you want to follow along. Run the following commands if you haven’t already got them.

$ git clone https://github.com/nigelpoulton/TKB.git
Cloning into 'TKB'...

$ cd TKB

$ git fetch origin

$ git checkout -b 2025 origin/2025
It’s important that you work from the 2025 branch and run all commands from the deployments folder.

$ cd deployments
We’ll use the deploy.yml file, as shown in the following snippet. It defines a single-container Pod wrapped in a Deployment. I’ve annotated it and snipped it to draw your attention to the parts we’ll focus on.

kind: Deployment
apiVersion: apps/v1
metadata:
  name: hello-deploy       <<---- Deployment name (must be valid DNS name)
spec:
  replicas: 10             <<---- Number of Pod replicas to deploy & manage
  selector:                
    matchLabels:
      app: hello-world
  revisionHistoryLimit: 5
  progressDeadlineSeconds: 300    
  minReadySeconds: 10
  strategy:                <<---- This block defines rolling update settings
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:                <<---- Below here is the Pod template
    metadata:
      labels:
        app: hello-world
    spec:
      containers:
      - name: hello-pod
        image: nigelpoulton/k8sbook:1.0
        ports:
        - containerPort: 8080
There’s a lot going on in the file, so let’s explain the most important parts.

The first two lines tell Kubernetes to create a Deployment object based on the version of the Deployment resource defined in the apps/v1 API.

The metadata section names the Deployment hello-deploy. You should always give objects valid DNS names. This means you should only use alphanumerics, the dot, and the dash in object names.

Most of the action happens in the spec section.

spec.replicas asks for ten Pod replicas. In this case, the ReplicaSet controller will create ten replicas of the Pod defined in the spec.template section.

spec.selector is a list of labels the Deployment and ReplicaSet controllers look for when deciding which Pods they manage. This label selector has to match the Pod labels in the Pod template block (spec.template.metadata.labels). In this example, both specify the app=hello-world label.

spec.revisionHistoryLimit tells Kubernetes to keep the previous five ReplicaSets so you can roll back to the last five versions. Keeping more gives you more rollback options, but keeping too many can bloat the object and cause problems on large clusters with lots of releases.

spec.progressDeadlineSeconds tells Kubernetes to give each new replica a five-minute start window before reporting the replica as stalled. All replicas get their own window, meaning each replica has its own five-minute window to come up properly (progress).

spec.strategy tells the Deployment controller how to update the Pods when performing a rollout. We’ll explain these settings later in the chapter when you perform a rollout.

Finally, everything below spec.template defines the Pod this Deployment will manage. This example defines a single-container Pod using the nigelpoulton/k8sbook:1.0 image.

Run the following command to create the Deployment on your cluster.

Note: All kubectl commands include the necessary authentication tokens from your kubeconfig file.

$ kubectl apply -f deploy.yml
deployment.apps/hello-deploy created
At this point, the Deployment configuration is persisted to the cluster store as a record of intent, and Kubernetes has scheduled ten replicas to healthy worker nodes. The Deployment and ReplicaSet controllers are also running in the background, watching the state of play and eager to perform their reconciliation magic.

Feel free to run a kubectl get pods command to see the ten Pods.

Inspecting Deployments
You can use the normal kubectl get and kubectl describe commands to see Deployment and ReplicaSet details.

$ kubectl get deploy hello-deploy
NAME           READY   UP-TO-DATE   AVAILABLE   AGE
hello-deploy   10/10   10           10          105s

$ kubectl describe deploy hello-deploy
Name:                   hello-deploy
Namespace:              default
Annotations:            deployment.kubernetes.io/revision: 1
Selector:               app=hello-world
Replicas:               10 desired | 10 updated | 10 total | 10 available | 0 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        10
RollingUpdateStrategy:  1 max unavailable, 1 max surge
Pod Template:
  Labels:  app=hello-world
  Containers:
   hello-pod:
    Image:        nigelpoulton/k8sbook:1.0
    Port:         8080/TCP
<SNIP>
OldReplicaSets:  <none>
NewReplicaSet:   hello-deploy-54f5d46964 (10/10 replicas created)
<Snip>
I’ve trimmed the outputs for readability, but take a minute to examine them, as they contain a lot of information that will reinforce what you’ve learned.

As mentioned earlier, Deployments automatically create associated ReplicaSets. Verify this with the following command.

$ kubectl get rs
NAME                      DESIRED   CURRENT   READY   AGE
hello-deploy-54f5d46964   10        10        10      3m45s
You only have one ReplicaSet as you’ve only performed an initial rollout. However, its name matches the Deployment’s name with a hash added to the end. This is a crypto-hash of the Pod template section of the Deployment manifest (everything below spec.template). You’ll see this shortly, but making changes to the Pod template section initiates a rollout and creates a new ReplicaSet with a hash of the updated Pod template.

You can get more detailed information about the ReplicaSet with a kubectl describe command. Your ReplicaSet will have a different name.

$ kubectl describe rs hello-deploy-54f5d46964
Name:           hello-deploy-54f5d46964
Namespace:      default
Selector:       app=hello-world,pod-template-hash=54f5d46964
Labels:         app=hello-world
                pod-template-hash=54f5d46964
Annotations:    deployment.kubernetes.io/desired-replicas: 10
                deployment.kubernetes.io/max-replicas: 11
                deployment.kubernetes.io/revision: 1
Controlled By:  Deployment/hello-deploy       <<---- Deployment that own this ReplicaSet
Replicas:       10 current / 10 desired
Pods Status:    10 Running / 0 Waiting / 0 Succeeded / 0 Failed
Pod Template:
  Labels:  app=hello-world
           pod-template-hash=54f5d46964
  Containers:
   hello-pod:
    Image:        nigelpoulton/k8sbook:1.0
    Port:         8080/TCP
<Snip>
Notice how the output is similar to the Deployment output. This is because the Deployment controls the ReplicaSet’s configuration, meaning ReplicaSet info gets displayed in the output of Deployment commands. The ReplicaSet’s status (observed state) also gets rolled up into the Deployment status.

Accessing the app
The Deployment is running, and you’ve got ten replicas. However, you need a Kubernetes Service object to be able to connect to the app. We’ll cover Services in the next chapter, but for now, it’s enough to know that they provide network access to Pods.

The following YAML is from the lb.yml file in the deployments folder. It defines a Service that works with the Pods you just deployed.

apiVersion: v1
kind: Service
metadata:
  name: lb-svc
  labels:
    app: hello-world
spec:
  type: LoadBalancer
  ports:
  - port: 8080
    protocol: TCP
  selector:
    app: hello-world            <<---- Send traffic to Pods with this label
Deploy it with the following command.

$ kubectl apply -f lb.yml
service/lb-svc created
Verify the Service configuration and copy the value in the EXTERNAL-IP column. Some Docker Desktop clusters incorrectly return a 172 IP address in the EXTERNAL-IP column, substitute this for localhost.

$ kubectl get svc lb-svc
NAME     TYPE           CLUSTER-IP       EXTERNAL-IP   PORT(S)       
lb-svc   LoadBalancer   10.100.247.251   localhost     8080:31086/TCP
Open a new browser tab and connect to the value in the EXTERNAL-IP field on port 8080. This will be localhost:8080 if you’re on a local Docker Desktop cluster. It’ll be a public IP or DNS name on port 8080 if your cluster is in the cloud.

Figure 6.6 shows a browser accessing the app on localhost:8080.

Figure 6.6
Figure 6.6
Manually scale the app
You can manually scale Deployments in two ways:

Imperatively
Declaratively
The imperative method uses the kubectl scale command, whereas the declarative method requires you to update the Deployment YAML file and re-post it to the cluster. We’ll show you both, but Kubernetes prefers the declarative method.

Verify that you currently have ten replicas.

$ kubectl get deploy hello-deploy
NAME           READY   UP-TO-DATE   AVAILABLE   AGE
hello-deploy   10/10   10           10          28m
Run the following commands to imperatively scale down to five replicas and verify the operation worked.

$ kubectl scale deploy hello-deploy --replicas 5
deployment.apps/hello-deploy scaled

$ kubectl get deploy hello-deploy
NAME           READY   UP-TO-DATE   AVAILABLE   AGE
hello-deploy   5/5     5            5           29m
Congratulations, you’ve successfully scaled the Deployment down to five replicas. However, there’s a potential problem…

The current state of your environment no longer matches your declarative manifest — there are five replicas on your cluster, but your Deployment YAML still defines 10. This can cause issues when using the YAML file to perform future updates. For example, updating the image version in the YAML file and re-posting it to the cluster will also change the number of replicas back to 10, which you might not want. For this reason, you should always keep your YAML manifests in sync with your live environment, and the easiest way to do this is by making all changes declaratively via your YAML manifests.

Let’s re-post the YAML file to return the replica count to 10.

$ kubectl apply -f deploy.yml
deployment.apps/hello-deploy configured

$ kubectl get deploy hello-deploy
NAME           READY   UP-TO-DATE   AVAILABLE   AGE
hello-deploy   10/10   10           10          38m
You may have noticed that scaling operations are almost instantaneous. This is not the case with rolling updates which you’re about to see next.

Kubernetes also has autoscalers that automatically scale Pods and infrastructure based on current demand.

Perform a rolling update
The terms rollout, release, zero-downtime update, and rolling update mean the same thing, and we’ll use them interchangeably.

I’ve already created the new version of the app, tested it, and uploaded it to Docker Hub with the nigelpoulton/k8sbook:2.0 tag. All that’s left is for you to perform the rollout. We’re ignoring real-world CI/CD workflows and version control tools to simplify the process and keep the focus on Kubernetes.

Before continuing, it’s vital you understand that all update operations are actually replacement operations. When you update a Pod, you’re actually deleting it and replacing it with a new one. This is because Pods are immutable objects, so you never change or update them after you’ve deployed them.

The first step is to update the image version in the deploy.yml file. Use your favorite editor to update the image version to nigelpoulton/k8sbook:2.0 and save your changes.

The following trimmed output shows which line in the file to update.

apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-deploy
spec:
  replicas: 10
  <Snip>
  template:
    <Snip>
    spec:
      containers:
      - name: hello-pod
        image: nigelpoulton/k8sbook:2.0          <<---- Update this line to 2.0
        ports:
        - containerPort: 8080
The next time you post the file to Kubernetes, the Deployment controller will delete every Pod running the 1.0 version and replace them with new Pods running the 2.0 version. However, before doing that, let’s look at the settings governing how Kubernetes executes the rollout.

The spec section of the YAML file contains all the settings that tell Kubernetes how to perform the update.

<Snip>
revisionHistoryLimit: 5          <<---- Keep the config from the five previous versions
progressDeadlineSeconds: 300     <<---- Give each new replica five minutes to start
minReadySeconds: 10              <<---- Wait 10 seconds after the previous replica has started
strategy:
  type: RollingUpdate            <<---- Incrementally replace replicas
  rollingUpdate:
    maxUnavailable: 1            <<---- Can take one replica away during update operation
    maxSurge: 1                  <<---- Can add one extra replica during update operation
<Snip>
revisionHistoryLimit tells Kubernetes to keep the configs from the previous five releases for easy rollbacks.

progressDeadlineSeconds tells Kubernetes to give each new Pod replica a five-minute window to start properly before assuming it’s failed. It’s OK if they start faster.

spec.minReadySeconds throttles the rate at which Kubernetes replaces replicas. This configuration tells Kubernetes to wait 10 seconds between each replica. Longer waits give you a better chance of catching problems and preventing scenarios where you replace all replicas with broken ones. In the real world, you’ll need to make this value large enough to trap common failures.

There is also a nested spec.strategy map telling Kubernetes to:

Update using the RollingUpdate strategy
Never have more than one Pod below desired state (maxUnavailable: 1)
Never have more than one Pod above desired state (maxSurge: 1)
The desired state of this app is ten replicas. Therefore, maxSurge: 1 means Kubernetes can go up to 11 replicas during the rollout, and maxUnavailable: 1 allows it to go down to 9. The net result is a rollout that updates two Pods at a time (the delta between 9 and 11 is 2).

This is all great, but how does Kubernetes know which Pods to delete and replace?

Labels!

If you look closely at the deploy.yml file, you’ll see the Deployment spec has a selector block. This is a list of labels the Deployment controller looks for when finding Pods to update during rollouts. In this example, the controller will look for Pods with the app=hello-world label. If you look at the Pod template towards the bottom of the file, you’ll notice it creates Pods with this same label. Net result: This deployment creates Pods with the app=hello-world label and selects Pods with the same label when performing updates, etc.

apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-deploy
spec:
  selector:                    <<---- The Deployment will manage all
    matchLabels:               <<---- replicas on the cluster with
      app: hello-world         <<---- this label
      <Snip>
  template:
    metadata:
      labels:
        app: hello-world       <<---- Matches the label selector above
<Snip>
Pods and Deployments are both immutable, meaning you cannot change the selector or labels after you create the Deployment.

Run the following command to post the updated manifest to the cluster and start the rollout.

$ kubectl apply -f deploy.yml
deployment.apps/hello-deploy configured
The rollout replaces two Pods at a time with a ten-second wait after each. This means it will take a minute or two to complete

You can monitor the progress with kubectl rollout status.

$ kubectl rollout status deployment hello-deploy
Waiting for deployment "hello-deploy" rollout... 4 out of 10 new replicas...
Waiting for deployment "hello-deploy" rollout... 4 out of 10 new replicas...
Waiting for deployment "hello-deploy" rollout... 6 out of 10 new replicas...
^C
If you quit monitoring the progress while the rollout is still happening, you can run kubectl get deploy commands and see the effect of the update-related settings. For example, the following command shows that six replicas have already been updated, and you currently have nine. Nine is one less than the desired state of ten and is the result of the maxUnavailable=1 value in the manifest.

$ kubectl get deploy hello-deploy
NAME           READY   UP-TO-DATE   AVAILABLE   AGE
hello-deploy   9/10    6            9           63m
Pausing and resuming rollouts
You can use kubectl to pause and resume rollouts.

If your rollout is still in progress, pause it with the following command.

$ kubectl rollout pause deploy hello-deploy
deployment.apps/hello-deploy paused
Running a kubectl describe command during a paused rollout provides some interesting info.

$ kubectl describe deploy hello-deploy
Name:                   hello-deploy
Namespace:              default
Annotations:            deployment.kubernetes.io/revision: 2
Selector:               app=hello-world
Replicas:               10 desired | 6 updated | 11 total | 9 available | 2 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        10
RollingUpdateStrategy:  1 max unavailable, 1 max surge
<Snip>
Conditions:
  Type           Status   Reason
  ----           ------   ------
  Available      True     MinimumReplicasAvailable
  Progressing    Unknown  DeploymentPaused
OldReplicaSets:  hello-deploy-54f5d46964 (3/3 replicas created)
NewReplicaSet:   hello-deploy-5f84c5b7b7 (6/6 replicas created)
The Annotations line shows the object is on revision 2 (revision 1 was the initial rollout and the current update is revision 2). Replicas shows the rollout is incomplete. The third line from the bottom shows the Deployment condition as progressing but paused. Finally, on the last two lines, you can see the ReplicaSet for the initial release is managing three replicas, and the one for the new release is managing 6.

If a scale-up event occurs during a rollout, Kubernetes will balance the additional replicas across both ReplicaSets. In this example, if the Deployment scales to 20 by adding 10 new replicas, Kubernetes will assign ~3 of the new replicas to the old ReplicaSet and ~6 to the new one.

Run the following command to resume the rollout.

$ kubectl rollout resume deploy hello-deploy
deployment.apps/hello-deploy resumed
Once complete, you can check the status with kubectl get deploy.

$ kubectl get deploy hello-deploy
NAME           READY   UP-TO-DATE   AVAILABLE   AGE
hello-deploy   10/10   10           10          71m
The output shows the rollout as complete — 10 Pods are up-to-date and available.

If you’ve followed along, refresh your browser and see the updated app. The new version includes more text and uses the book’s short name on the button.

said Kubernetes rocks!, this one says WebAssembly is coming! I may change what this says in the future. The important point is that it’s changed.

Figure 6.7
Figure 6.7
Perform a rollback
As previously mentioned, Kubernetes keeps old ReplicaSets as a documented revision history and an easy way to roll back. The following command shows the history of the Deployment with two revisions.

$ kubectl rollout history deployment hello-deploy
deployment.apps/hello-deploy
REVISION  CHANGE-CAUSE
1         <none>
2         <none>
Revision 1 was the initial release based on the 1.0 image. Revision 2 is the rollout that updated the Pods to run version 2.0 of the image.

The following command shows the two ReplicaSets associated with each revision.

$ kubectl get rs
NAME                      DESIRED   CURRENT   READY   AGE
hello-deploy-5f84c5b7b7   10        10        10      27m
hello-deploy-54f5d46964   0         0         0       93m
The next kubectl describe command runs against the old ReplicaSet and proves its configuration still references the old image version. Your ReplicaSets will have different names.

$ kubectl describe rs hello-deploy-54f5d46964
Name:           hello-deploy-54f5d46964
Namespace:      default
Selector:       app=hello-world,pod-template-hash=54f5d46964
Labels:         app=hello-world
                pod-template-hash=54f5d46964
Annotations:    deployment.kubernetes.io/desired-replicas: 10
                deployment.kubernetes.io/max-replicas: 11
                deployment.kubernetes.io/revision: 1
Controlled By:  Deployment/hello-deploy
Replicas:       0 current / 0 desired
Pods Status:    0 Running / 0 Waiting / 0 Succeeded / 0 Failed
Pod Template:
  Containers:
   hello-pod:
    Image:        nigelpoulton/k8sbook:1.0         <<---- Still configured with old version
    Port:         8080/TCP
    <Snip>
The line you’re interested in is the one shown second-from-last in the book and lists the old image version. This means flipping the Deployment back to this ReplicaSet will automatically replace all Pods with new ones running the 1.0 image.

Note: Don’t get confused if you hear rollbacks referred to as updates. That’s exactly what they are. They follow the same logic and rules as an update/rollout — terminate Pods with the current image and replace them with Pods running the new image. In the case of a rollback, the new image is actually an older one.

The following example uses kubectl rollout to revert the application to revision 1. This is an imperative command and not recommended. However, it’s convenient for quick rollbacks, just remember to update your source YAML files to reflect the changes.

$ kubectl rollout undo deployment hello-deploy --to-revision=1
deployment.apps "hello-deploy" rolled back
Although it might look like the operation is instantaneous, it isn’t. Like we just said, rollbacks follow the same rules as rollouts. You can verify this and track the progress with the following kubectl get deploy and kubectl rollout commands.

$ kubectl get deploy hello-deploy
NAME           READY   UP-TO-DATE   AVAILABLE   AGE
hello-deploy   9/10    6            9           96m

$ kubectl rollout status deployment hello-deploy
Waiting for deployment "hello-deploy"... 6 out of 10 new replicas have been updated...
Waiting for deployment "hello-deploy"... 7 out of 10 new replicas have been updated...
Waiting for deployment "hello-deploy"... 8 out of 10 new replicas have been updated...
Waiting for deployment "hello-deploy"... 1 old replicas are pending termination...
Waiting for deployment "hello-deploy"... 9 of 10 updated replicas are available...
^C
As with the rollout, the rollback replaces two Pods at a time and waits ten seconds after each.

Congratulations. You’ve performed a rolling update and a successful rollback.

Rollouts and labels
You’ve already seen that Deployments and ReplicaSets use labels and selectors to determine which Pods they own and manage.

In earlier versions of Kubernetes, Deployments would seize ownership of static Pods if their labels matched the Deployment’s label selector. However, recent versions of Kubernetes prevent this by adding a system-generated pod-template-hash label to Pods created by controllers.

Consider a quick example. Your cluster has five static Pods with the app=front-end label. You add a new Deployment requesting ten Pods with the same label. Older versions of Kubernetes would see the existing five static Pods with the same label, seize ownership of them, and only create five new ones. The net result would be ten Pods with the app=front-end label, all owned by the Deployment. However, the original five static Pods might be running a different app, and you might not want the Deployment managing them.

Fortunately, modern versions of Kubernetes tag all Pods created by a Deployment (ReplicaSet) with the pod-template-hash label. This stops higher-level controllers from seizing ownership of existing static Pods.

Look closely at the following snipped output to see how the pod-template-hash label connects Deployments to ReplicaSets, and ReplicaSets to Pods.

$ kubectl describe deploy hello-deploy
Name:      hello-deploy
<Snip>
NewReplicaSet:   hello-deploy-54f5d46964  

$ kubectl describe rs hello-deploy-54f5d46964     
Name:           hello-deploy-54f5d46964
<Snip>>
Selector:       app=hello-world,pod-template-hash=54f5d46964

$ kubectl get pods --show-labels
NAME                        READY   STATUS    LABELS
hello-deploy-54f5d46964..   1/1     Running   app=hello-world,pod-template-hash=54f5d46964
hello-deploy-54f5d46964..   1/1     Running   app=hello-world,pod-template-hash=54f5d46964
hello-deploy-54f5d46964..   1/1     Running   app=hello-world,pod-template-hash=54f5d46964
hello-deploy-54f5d46964..   1/1     Running   app=hello-world,pod-template-hash=54f5d46964
<Snip>
ReplicaSets include the pod-template-hash label in their label selectors, but Deployments don’t. This is fine because it’s actually ReplicaSets that manage Pods.

You shouldn’t attempt to modify the pod-template-hash label.

Clean up
Use kubectl delete -f deploy.yml and kubectl delete -f lb.yml to delete the Deployment and Service created in the examples.

Chapter summary
In this chapter, you learned that Deployments are a great way to manage stateless apps on Kubernetes. They augment Pods with self-healing, scalability, rolling updates, and rollbacks.

Like Pods, Deployments are objects in the Kubernetes API, and you should work with them declaratively. They’re defined in the apps/v1 API and implement a controller running as a reconciliation loop on the control plane.

Behind-the-scenes Deployments use ReplicaSets to create, terminate, and manage the number of Pod replicas. However, you shouldn’t directly create or edit ReplicaSets, you should always configure them via a Deployment.

You can manually scale Deployments by editing the Deployment YAML and re-posting it to the cluster. However, Kubernetes has autoscalers that automatically scale Deployments based on demand.

Rolling updates happen by deleting old Pods and replacing them with new ones in a controlled, organized manner.


Copy

table of contents
search
Settings
Previous chapter
5: Virtual clusters with Namespaces
Next chapter
7: Kubernetes Services
Table of contents collapsed
