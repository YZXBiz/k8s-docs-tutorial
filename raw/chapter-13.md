Skip to Content
13: StatefulSets
In this chapter, you’ll learn how to use StatefulSets to deploy and manage stateful applications on Kubernetes.

For the purposes of this chapter, we’re defining a stateful application as one that creates and saves valuable data. Examples include databases, key-value stores, and applications that save data about client sessions for use in future sessions.

I’ve arranged the chapter as follows:

StatefulSet theory
Hands-on with StatefulSets
The theory section introduces how StatefulSets work and why they’re useful for stateful applications. But don’t worry if you don’t understand everything at first, you’ll cover it all again in the hands-on section.

StatefulSet theory
It’s helpful to compare StatefulSets with Deployments. Both are Kubernetes API resources and follow the standard Kubernetes controller architecture — control loops that reconcile observed state with desired state. Both manage Pods and add self-healing, scaling, rollouts, and more.

However, StatefulSets offer the following three features that Deployments do not:

Predictable and persistent Pod names and DNS names
Predictable and persistent volume bindings
Predictable startup and shutdown order
Points one and two form a Pod’s state, and we sometimes refer to them as a Pod’s sticky ID. StatefulSets even ensure Pod names and volume bindings persist across failures, scaling operations, and other scheduling events.

As a quick example, StatefulSet Pods that fail get replaced with new Pods with the same Pod name, the same DNS hostname, and connect to the same volumes. This is true even if Kubernetes starts the replacement Pod on a different cluster node. They’ll even get the same name and volumes if they’re terminated by a scale-down operation and then recreated by a scale-up operation. All of this makes them ideal for applications requiring unique reliable Pods.

The following YAML defines a simple StatefulSet called tkb-sts with three replicas running the mongo:latest image. You post this to the API server, it gets persisted to the cluster store, the scheduler assigns the replicas to worker nodes, and the StatefulSet controller ensures observed state matches desired state.

apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: tkb-sts
spec:
  selector:
    matchLabels:
      app: mongo
  serviceName: "tkb-sts"
  replicas: 3
  template:
    metadata:
      labels:
        app: mongo
    spec:
      containers:
      - name: ctr-mongo
        image: mongo:latest
        ...
That’s the big picture. Let’s take a closer look before walking through an example.

StatefulSet Pod naming
Every Pod created by a StatefulSet gets a predictable name. In fact, Pod names are at the core of how StatefulSets start, self-heal, scale, delete Pods, and even how they connect Pods to volumes.

The format of StatefulSet Pod names is <StatefulSetName>-<Integer>. The integer is a zero-based index ordinal, which is a fancy way of saying number starting from zero. If we go with the previous YAML snippet, Kubernetes will name the first replica tkb-sts-0, the second tkb-sts-1, and the third tkb-sts-2.

Kubernetes also uses the StatefulSet name to create each replica’s DNS name, so avoid using exotic characters that will create invalid DNS names.

Ordered creation and deletion
A critical difference between StatefulSets and Deployments is the way they create Pods.

StatefulSets create one Pod at a time and wait for it to be running and ready before starting the next
Deployments use a ReplicaSet controller to start all Pods at the same time, which can result in race conditions
Sticking with the previous YAML, the StatefulSet controller will start tkb-sts-0 first and wait for it to be running and ready before starting tkb-sts-1. The same applies to subsequent Pods — the controller waits for tkb-sts-1 to be running and ready before starting tkb-sts-2 etc. See Figure 13.1

Figure 13.1
Figure 13.1
Note: Running and ready is a term we use to indicate all containers in a Pod are running and the Pod is ready to service requests.

The same startup rules govern StatefulSet scaling operations. For example, scaling from 3 to 5 replicas will start a new Pod called tkb-sts-3 and wait for it to be running and ready before creating tkb-sts-4. Scaling down follows the same rules in reverse — the controller terminates the Pod with the highest index ordinal and waits for it to fully terminate before terminating the Pod with the next highest number.

Guaranteeing the order in which Pods will be scaled down, and knowing that Kubernetes will never terminate them in parallel can be vital for stateful apps. For example, clustered apps can potentially lose data if multiple replicas terminate simultaneously.

Finally, it’s worth noting that the StatefulSet controller does its own self-healing and scaling. This is architecturally different from Deployments, which use the ReplicaSet controller for these operations.

Deleting StatefulSets
You need to know two important things about deleting StatefulSets.

Firstly, deleting a StatefulSet object does not terminate its Pods in an orderly manner. This means you should scale a StatefulSet to zero replicas before deleting it!

Secondly, you can use terminationGracePeriodSeconds to further control Pod termination. For example, it’s common to set this to at least 10 seconds to give applications time to flush any buffers and safely commit writes that are still in flight.

StatefulSets and Volumes
Volumes are an important part of a StatefulSet Pod’s sticky ID (state).

When the StatefulSet controller creates Pods, it also creates any volumes they require. To help with this, Kubernetes gives the volumes special names linking them to the correct Pods. Figure 13.2 shows a StatefulSet called tkb-sts requesting three Pods, each with a single volume. You can see how Kubernetes uses names to connect volumes with Pods.

Figure 13.2
Figure 13.2
Despite being linked with specific Pod replicas, volumes are still decoupled from those Pods via the regular Persistent Volume Claim system. This means volumes have separate lifecycles, allowing them to survive Pod failures and Pod termination operations. For example, when a StatefulSet Pod fails or is terminated, its associated volumes are unaffected. This allows replacement Pods to connect to the surviving volumes and data, even if Kubernetes schedules the replacement Pods to different cluster nodes.

The same thing happens during scaling operations. If a scale-down operation deletes a StatefulSet Pod, subsequent scale-up operations attach new Pods to the surviving volumes.

This behavior can be a lifesaver if you accidentally delete a StatefulSet Pod, especially if it’s the last replica!

Handling failures
The StatefulSet controller observes the state of the cluster and reconciles observed state with desired state.

The simplest example is a Pod failure. If you have a StatefulSet called tkb-sts with five replicas and the tkb-sts-3 replica fails, the controller starts a new Pod with the same name and attaches it to the surviving volumes.

Node failures can be more complex, and some older versions of Kubernetes require manual intervention to replace Pods that were running on failed nodes. This is because it can sometimes be hard for Kubernetes to know if a node has genuinely failed or is just rebooting from a transient event. For example, if a “failed” node recovers after Kubernetes has replaced its Pods, you’ll end up with identical Pods trying to write to the same volume. This can result in data corruption.

Fortunately, newer Kubernetes versions are better at handling scenarios like this.

Network ID and headless Services
We’ve already said that StatefulSets are for applications that need Pods to be predictable and long-lived. One reason might be an external application that needs to connect and reconnect to the same Pod. Instead of using regular Kubernetes Services that load-balance requests across a set of Pods, StatefulSets use a special kind of Service called a headless Service. These create predictable DNS names for each StatefulSet Pod so that apps can query DNS (the service registry) for the full list of Pods and then connect directly to specific Pods.

The following YAML snippet shows a headless Service called mongo-prod and a StatefulSet called sts-mongo. This is a headless Service because it doesn’t have a ClusterIP. It’s also listed in the StatefulSet as the governing Service.

apiVersion: v1
kind: Service                   <<---- Service
metadata:
  name: mongo-prod
spec:
  clusterIP: None               <<---- Make it a headless Service
  selector:
    app: mongo
    env: prod
---
apiVersion: apps/v1
kind: StatefulSet               <<---- StatefulSet
metadata:
  name: sts-mongo
spec:
  serviceName: mongo-prod       <<---- Governing Service
Let’s explain the terms headless Service and governing Service.

A headless Service is a regular Kubernetes Service object without a ClusterIP address (spec.clusterIP: None). You make it the StatefulSet’s governing Service by listing it in the StatefulSet under spec.serviceName.

When you combine a headless Service with a StatefulSet like this, the Service creates DNS SRV and DNS A records for every Pod matching the Service’s label selector. Other Pods and apps can then query DNS to get the names and IPs of all the StatefulSet’s Pods. You’ll see this later, but developers must code their applications to query DNS like this.

That covers most of the theory. Let’s walk through an example to see how everything comes together.

Hands-on with StatefulSets
In this section, you’ll deploy a working StatefulSet.

I’ve designed and tested the demos on Linode Kubernetes Engine (LKE) and a local Docker Desktop multi-node cluster. If your cluster is on a different cloud or local environment, you’ll have to use a different StorageClass. I’ll tell you when to do this.

If you haven’t already done so, run the following command to clone the book’s GitHub repo and switch to the 2025 branch.

$ git clone https://github.com/nigelpoulton/TKB.git

$ cd TKB

$ git fetch origin

$ git checkout -b 2025 origin/2025
Run all remaining commands from within the statefulsets folder.

You’re about to deploy the following three objects:

A StorageClass
A headless Service
A StatefulSet
To make things easier to follow, you’ll deploy and inspect each object individually. However, it’s possible to group them into a single YAML file and deploy them with a single command (see the app.yml file in the statefulsets folder).

Deploy the StorageClass
StatefulSets need a way to dynamically create volumes. To do this, they need:

A StorageClass (SC)
A PersistentVolumeClaim (PVC)
The following YAML is from the lke-sc.yml file and defines a StorageClass called block that dynamically provisions block storage from the Linode Cloud using the LKE block storage CSI driver. If you’re using a Docker Desktop multi-node cluster, you’ll need to use the dd-kind-sc.yml file instead. If your cluster is on a different cloud, you can do either of the following:

Create a new StorageClass called block for your own cloud — you’ll need to create this yourself and configure the provisioner and parameters sections appropriately
Use one of your cluster’s existing StorageClasses and change the StorageClass name in the PVC in a later step
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: block                                <<---- The PVC will reference this name
provisioner: linodebs.csi.linode.com         <<---- LKE block storage CSI plugin
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
Deploy the StorageClass. Remember to use the dd-kind-sc.yml file if you’re using a local Docker Desktop multi-node cluster.

$ kubectl apply -f lke-sc.yml
storageclass.storage.k8s.io/block created
List your cluster’s StorageClasses to make sure yours is in the list.

$ kubectl get sc
                                                                           ALLOWVOLUME
NAME     PROVISIONER               RECLAIMPOLICY    VOLUMEBINDINGMODE      EXPANSION
block    linodebs.csi.linode.com   Delete           WaitForFirstConsumer   true
Your storage class is present, and your StatefulSet will use it to create new volumes dynamically.

Create a governing headless Service
It’s helpful to visualize Service objects with a head and a tail. The head is the stable ClusterIP address, and the tail is the list of Pods it forwards traffic to. A headless Service is a regular Kubernetes Service object without the head/ClusterIP address.

The primary purpose of headless Services is to create DNS SRV records for StatefulSet Pods. Clients query DNS for individual Pods and then send queries directly to those Pods instead of via the Service’s ClusterIP. This is why headless Services don’t have a ClusterIP.

The following YAML is from the headless-svc.yml file and describes a headless Service called dullahan with no ClusterIP address (spec.clusterIP: None).

apiVersion: v1
kind: Service        <<---- Normal Kubernetes Service
metadata:
  name: dullahan     <<---- Only use valid DNS characters in name
  labels:
    app: web
spec:
  ports:
  - port: 80
    name: web
  clusterIP: None    <<---- Make this a headless Service
  selector:
    app: web
The only difference from a regular Service is that a headless Service has its clusterIP set to None.

Run the following command to deploy the headless Service to your cluster.

$ kubectl apply -f headless-svc.yml
service/dullahan created
Make sure it exists.

$ kubectl get svc
NAME         TYPE         CLUSTER-IP    EXTERNAL-IP    PORT(S)    AGE
dullahan     ClusterIP    None          <none>         80/TCP     31s
Deploy the StatefulSet
Now that you’ve created your storage class and a headless Service, you can deploy the StatefulSet.

The following YAML is from the sts.yml file and defines the StatefulSet.

apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: tkb-sts                          <<---- Call the StatefulSet "tkb-sts"
spec:
  replicas: 3                            <<---- Deploy three replicas
  selector:
    matchLabels:
      app: web
  serviceName: "dullahan"                <<---- Make this the governing Service
  template:
    metadata:
      labels:
        app: web
    spec:
      terminationGracePeriodSeconds: 10
      containers:
      - name: ctr-web
        image: nginx:latest
        ports:
        - containerPort: 80
          name: web
        volumeMounts:                         ----┐
        - name: webroot                           | Mount this volume
          mountPath: /usr/share/nginx/html    ----┘
  volumeClaimTemplates:                       ----┐
  - metadata:                                     |
      name: webroot                               |
    spec:                                         | 
      accessModes: [ "ReadWriteOnce" ]            | Dynamically create a 10GB volume
      storageClassName: "block"                   | via the "block" storage class
      resources:                                  |
        requests:                                 |
          storage: 10Gi                       ----┘ 
There’s a lot to take in, so let’s step through the important parts.

Your StatefulSet is called tkb-sts, and Kubernetes uses this as the base for every replica and volume name.

Kubernetes will read the spec.replicas field and create 3 replicas called tkb-sts-0, tkb-sts-1, and tkb-sts-2. It will also create them in order and wait for each one to be running and ready before starting the next.

The spec.serviceName field designates the governing Service. This is the name of the headless Service you created in the previous step, and it creates the DNS SRV records for the StatefulSet replicas. We call it the governing Service because it’s in charge of the StatefulSet’s DNS subdomain. More on this later.

The remainder of the spec.template section defines the Pod template. This is where you define things like which container image to use and which ports to expose.

Last, but certainly not least, is the spec.volumeClaimTemplates section. Kubernetes uses this to dynamically create unique PVCs for each StatefulSet Pod. As it’s requesting three replicas, Kubernetes will create three unique Pods based on the spec.template section and three unique PVCs based on the spec.volumeClaimTemplates section. It also ensures the Pods and PVCs get the appropriate names to be linked.

The following YAML snippet shows the volume claim template from the example. It defines a claim template called webroot requesting 10GB volumes from the block StorageClass.

volumeClaimTemplates:
- metadata:
    name: webroot
  spec:
    accessModes: [ "ReadWriteOnce" ]
    storageClassName: "block"
    resources:
      requests:
        storage: 10Gi
If you’re not using an LKE cluster and you’re using one of your cloud’s built-in StorageClasses, you’ll need to edit the sts.yml file and change the storageClassName field to a StorageClass on your cluster. You’ll be OK if you created your own StorageClass and called it block.

Run the following command to deploy the StatefulSet.

$ kubectl apply -f sts.yml
statefulset.apps/tkb-sts created
Watch the StatefulSet as it ramps up to three replicas. It’ll take a minute or two for the controller to create all three Pods and associated PVCs.

$ kubectl get sts --watch
NAME      READY   AGE
tkb-sts   0/3     14s
tkb-sts   1/3     30s
tkb-sts   2/3     60s
tkb-sts   3/3     90s
Notice how it took ~30 seconds to start the first replica. Once that was running and ready, it took another 30 seconds to start the second and another 30 for the third. This is the StatefulSet controller starting each replica in turn and waiting for them to be running and ready before starting the next.

Now, check the PVCs.

$ kubectl get pvc
NAME                 STATUS    VOLUME             CAPACITY    MODES    STORAGECLASS    AGE
webroot-tkb-sts-0    Bound     pvc-1146...f274    10Gi        RWO      block           100s
webroot-tkb-sts-1    Bound     pvc-3026...6bcb    10Gi        RWO      block           70s
webroot-tkb-sts-2    Bound     pvc-2ce7...e56d    10Gi        RWO      block           40s
You’ve got three new PVCs, and each one was created at the same time as one of the Pod replicas. If you look closely, you’ll see that each PVC name includes the name of the volume claim template, the StatefulSet, and the associated Pod replica.

volumeClaimTemplate name	Pod Name	PVC Name
webroot	tkb-sts-0	webroot-tkb-sts-0
webroot	tkb-sts-1	webroot-tkb-sts-1
webroot	tkb-sts-2	webroot-tkb-sts-2
Congratulations, your StatefulSet is running and managing three Pods and three volumes.

Testing peer discovery
Let’s explain how DNS hostnames and DNS subdomains work with StatefulSets.

All Kubernetes objects get a name within the cluster address space. You can specify a custom address space when you build a cluster, but most use the cluster.local DNS domain. Within this domain, Kubernetes constructs DNS subdomains as follows:

<object-name>.<service-name>.<namespace>.svc.cluster.local
You’ve deployed three Pods called tkb-sts-0, tkb-sts-1, and tkb-sts-2 in the default Namespace governed by the dullahan headless Service. This means your Pods will have the following fully qualified DNS names that are predictable and reliable:

tkb-sts-0.dullahan.default.svc.cluster.local
tkb-sts-1.dullahan.default.svc.cluster.local
tkb-sts-2.dullahan.default.svc.cluster.local
It’s the job of the headless Service to register these Pods and their IPs against the dullahan.default.svc.cluster.local name.

You’ll test this by deploying a jump Pod with the dig utility pre-installed. You’ll then exec onto the Pod and use dig to query DNS for the Service’s SRV records.

Run the following command to deploy the jump Pod from the jump-pod.yml file.

$ kubectl apply -f jump-pod.yml
pod/jump-pod created
Exec onto the Pod.

$ kubectl exec -it jump-pod -- bash
root@jump-pod:/#
Your terminal prompt will change to indicate it’s connected to the jump Pod. Run the following dig command from within the jump-pod.

# dig SRV dullahan.default.svc.cluster.local
<Snip>
;; QUESTION SECTION:
;dullahan.default.svc.cluster.local. IN SRV
;; ANSWER SECTION:
dullahan.default.svc.cluster.local. 30 IN SRV... tkb-sts-1.dullahan.default.svc.cluster.local.
dullahan.default.svc.cluster.local. 30 IN SRV... tkb-sts-0.dullahan.default.svc.cluster.local.
dullahan.default.svc.cluster.local. 30 IN SRV... tkb-sts-2.dullahan.default.svc.cluster.local.
;; ADDITIONAL SECTION:
tkb-sts-0.dullahan.default.svc.cluster.local. 30 IN A 10.60.0.5
tkb-sts-2.dullahan.default.svc.cluster.local. 30 IN A 10.60.1.7
tkb-sts-1.dullahan.default.svc.cluster.local. 30 IN A 10.60.2.12
<Snip>
The output shows that clients asking about dullahan.default.svc.cluster.local (QUESTION SECTION) will get the DNS names (ANSWER SECTION) and IPs (ADDITIONAL SECTION) of the three StatefulSet Pods. To be clear… the ANSWER SECTION maps requests for dullahan.default.svc.cluster.local to the three Pods, and the ADDITIONAL SECTION maps the Pod names to IPs.

Type exit to return to your terminal.

Scaling StatefulSets
Each time Kubernetes scales up a StatefulSet, it creates new Pods and PVCs. However, when scaling down, Kubernetes only terminates Pods. This means future scale-up operations only need to create new Pods and connect them back to the original PVCs. Kubernetes and the StatefulSet controller handle all of this without your help.

You currently have three StatefulSet Pods and three PVCs. Edit the sts.yml file, change the replica count from 3 to 2, and save your changes. When you’ve done that, run the following command to re-post the updated configuration to the cluster. You’ll have to type exit if you’re still connected to the jump Pod.

$ kubectl apply -f sts.yml
statefulset.apps/tkb-sts configured
Check the StatefulSet and verify the Pod count has reduced to 2.

$ kubectl get sts tkb-sts
NAME      READY   AGE
tkb-sts   2/2     12h

$ kubectl get pods
NAME        READY   STATUS    RESTARTS   AGE
tkb-sts-0   1/1     Running   0          12h
tkb-sts-1   1/1     Running   0          12h
You’ve successfully scaled the number of Pods down to 2. If you look closely, you’ll see that Kubernetes deleted the one with the highest index ordinal and that you still have 3 PVCs. Remember, scaling a StatefulSet down does not delete PVCs.

Verify this.

$ kubectl get pvc
NAME                 STATUS    VOLUME             CAPACITY    MODES    STORAGECLASS    AGE
webroot-tkb-sts-0    Bound     pvc-5955...d71c    10Gi        RWO      block           12h
webroot-tkb-sts-1    Bound     pvc-d62c...v701    10Gi        RWO      block           12h
webroot-tkb-sts-2    Bound     pvc-2e2f...5f95    10Gi        RWO      block           12h
The status for all three is still showing as Bound even though the tkb-sts-2 Pod no longer exists. If you run a kubectl describe against the webroot-tkb-sts-2 PVC, you’ll see the Used by field shows as <none>.

The fact all three PVCs still exist means that scaling back up to 3 replicas will only require a new Pod. The StatefulSet controller will create the new Pod and connect it to the existing PVC.

Edit the sts.yml file again, increment the number of replicas back to 3, and save your changes. After you’ve done this, run the following command to re-deploy the app.

$ kubectl apply -f sts.yml
statefulset.apps/tkb-sts configured
Give it a few seconds to deploy the new Pod and then verify with the following command.

$ kubectl get sts tkb-sts
NAME      READY   AGE
tkb-sts   3/3     12h 
You’re back to 3 Pods. Describe the new tkb-sts-2 Pod and verify it mounted the webroot-tkb-sts-2 volume. Replace the grep ClaimName argument with Select-String -Pattern 'ClaimName' if you’re using Windows.

$ kubectl describe pod tkb-sts-2 | grep ClaimName
ClaimName:  webroot-tkb-sts-2
Congratulations, the new Pod automatically connected to the correct volume.

It’s worth noting that Kubernetes puts scale-down operations on hold if any of the Pods are in a failed state. This protects the resiliency of the app and the integrity of any data.

You can also change how the StatefulSet controller starts and stops Pods by tweaking its spec.podManagementPolicy property. The default setting is OrderedReady and enforces the behavior of starting one Pod at a time and waiting for the previous Pod to be running and ready before starting the next. Changing the value to Parallel will cause the StatefulSet to act more like a Deployment where Pods are created and deleted in parallel. For example, scaling from 2 > 5 Pods will instantly create all three new Pods, whereas scaling down from 5 > 2 will delete three Pods in parallel. StatefulSet naming rules are still enforced, as the setting only applies to scaling operations and does not impact rollouts and rollbacks.

Rollouts
StatefulSets support rolling updates (a.k.a. rollouts). You update the image version in the YAML file and re-post it to the API server, and the controller replaces the old Pods with new ones. However, it always starts with the highest numbered Pod and works down through the list, one at a time, until all Pods are on the new version. The controller also waits for each new Pod to be ready before replacing the one with the next lowest index ordinal.

For more information, run a kubectl explain sts.spec.updateStrategy command.

Test a Pod failure
The simplest way to test a failure is to manually delete a Pod. The StatefulSet controller will notice the failure and attempt to reconcile by starting a new Pod and connecting it to the same PVC and volume.

Let’s test it.

Confirm you have three healthy Pods in your StatefulSet.

$ kubectl get pods
NAME        READY   STATUS   AGE
tkb-sts-0   1/1     Running  12h
tkb-sts-1   1/1     Running  12h
tkb-sts-2   1/1     Running  9m49s
Let’s delete the tkb-sts-0 Pod and see if the StatefulSet controller automatically recreates it.

$ kubectl delete pod tkb-sts-0
pod "tkb-sts-0" deleted

$ kubectl get pods --watch
NAME        READY   STATUS              RESTARTS   AGE
tkb-sts-0   1/1     Running             0          12h
tkb-sts-1   1/1     Running             0          12h
tkb-sts-2   1/1     Running             0          10m
tkb-sts-0   0/1     Terminating         0          12h
tkb-sts-0   0/1     Pending             0          0s
tkb-sts-0   0/1     ContainerCreating   0          0s
tkb-sts-0   1/1     Running             0          8s
Placing a --watch on the command lets you see the StatefulSet controller observe the terminated Pod and create the replacement. This was a clean failure, and the StatefulSet controller immediately created the replacement Pod.

The new Pod has the same name as the failed one. But does it have the same PVC?

Run the following command to confirm that Kubernetes connected the new Pod to the original webroot-tkb-sts-0 PVC. Don’t forget to replace the grep ClaimName argument with Select-String -Pattern 'ClaimName' if you’re on Windows.

$ kubectl describe pod tkb-sts-0 | grep ClaimName
    ClaimName:  webroot-tkb-sts-0
It worked.

Test a node failure
Recovering from potential node failures is a lot more complex and may depend on your Kubernetes version. Modern Kubernetes clusters are far better at automatically replacing Pods from failed nodes, whereas older versions may require manual intervention. This was to prevent Kubernetes from misdiagnosing transient events as catastrophic node failures.

Let’s test a simple node failure. I’ll give instructions for simulating node failures on LKE clusters and Docker Desktop multi-node Kubernetes clusters, but the principles will be the same for other platforms.

Run the following command to list your StatefulSet Pods and the nodes they’re running on.

$ kubectl get pods -o wide
NAME        READY   STATUS    RESTARTS   AGE   IP           NODE                         
tkb-sts-0   1/1     Running   0          11m   10.2.0.132   lke343745-544835-5547cbe00000
tkb-sts-1   1/1     Running   0          12h   10.2.0.3     lke343745-544835-1fbc7b870000
tkb-sts-2   1/1     Running   0          21m   10.2.1.7     lke343745-544835-2b6286320000
Look closely at the NODE column, and you’ll see that Kubernetes has scheduled each replica on different nodes.

In the example, tkb-sts-0 is running on the lke343…cbe00000 node. Simulate a node failure by completing the following procedure. I’ll show you how to do it on LKE and Docker Desktop multi-node clusters.

Delete a node on LKE

Go to your LKE Dashboard (cloud.linode.com), click the Kubernetes tab on the left, and click your cluster’s name to open its summary page. Scroll down to your cluster’s Node Pool and Recycle one of the nodes running a StatefulSet replica. This will delete and replace the node.

Figure 13.3 - Delete an LKE cluster node
Figure 13.3 - Delete an LKE cluster node
Delete a node on a Docker Desktop multi-node cluster (kind)

This only works for Docker Desktop multi-node (kind) clusters, and you’ll need to delete and recreate your cluster to restore it back to three nodes. You cannot follow along if you have a Docker Desktop single node (kubeadm) cluster.

Docker Desktop runs cluster nodes as containers, and a three-node cluster will have three containers called desktop-control-plane, desktop-worker, and desktop-worker2.

Open Docker Desktop and navigate to the Containers tab in the left navigation pane. Locate the container with the same name as the worker node you want to delete and click the trash icon to the right of the container to delete it. Be sure to delete a node running a StatefulSet replica. Figure 13.4 shows how to delete the desktop-worker2 node.

Figure 13.4 - Delete a Docker Desktop cluster node
Figure 13.4 - Delete a Docker Desktop cluster node
Observe the StatefulSet recovery process

Once you’ve deleted your node, you can run the following command to witness the StatefulSet controller recover from the failure. It may take a minute or two for the process to complete while the StatefulSet controller observes the missing Pod and decides how to act.

$ kubectl get pods -o wide --watch
NAME        READY   STATUS                RESTARTS   AGE   IP           NODE                         
tkb-sts-0   1/1     Running               0          14m   10.2.0.132   lke343745...cbe00000
tkb-sts-1   1/1     Running               0          12h   10.2.0.3     lke343745...7b870000
tkb-sts-2   1/1     Running               0          30m   10.2.1.7     lke343745...86320000
tkb-sts-0   1/1     Terminating           0          14m   10.2.0.132   lke343745...cbe00000
<Snip> 
tkb-sts-0   0/1     Completed             0          14m   10.2.0.132   lke343745...cbe00000
<Snip> 
tkb-sts-0   0/1     Pending               0          0s    <none>       <none>                       
tkb-sts-0   0/1     Pending               0          0s    <none>       lke343745...7b870000
tkb-sts-0   0/1     ContainerCreating     0          0s    <none>       lke343745...7b870000
tkb-sts-0   0/1     ContainerCreating     0          110s  <none>       lke343745...7b870000
tkb-sts-0   1/1     Running               0          111s  10.2.0.4     lke343745...7b870000
Let’s examine the output.

The STATUS column shows the tkb-sts-0 Pod terminate, complete, enter the pending state, progress to the container creating state, and finally reach the running state. The Pod terminates when Kubernetes notices the missing node and the StatefulSet drops from three replicas to two. This results in the observed state of the cluster no longer matching your desired state, and the StatefulSet controller kicks into action and creates a new copy of the missing tkb-sts-0 replica. The new replica enters the pending state while the scheduler allocates it to a surviving node. Once assigned to a node, it enters the ContainerCreating state while the node downloads the appropriate image and starts the container. It may appear to hang in this state while Kubernetes releases the previous PVC attachment. It finally binds the new replica to the PVC, enters the running state, and the StatefulSet returns to three replicas.

If you examine the NODE column, you’ll see the original tkb-sts-0 replica was running on the lke343745…cbe00000 node, but Kubernetes has scheduled the replacement replica to the lke343745…7b870000 node. This is because the previous node no longer exists.

If you’re using an LKE cluster, you’ll have a new node replacing the one you recycled. However, Kubernetes does not re-balance existing replicas to the new node.

Deleting StatefulSets
Earlier in the chapter, we said that Kubernetes doesn’t terminate Pods in order when you delete a StatefulSet. Therefore, if your applications and data are sensitive to ordered shutdown, you should scale the StatefulSet to zero before deleting it.

Scale your StatefulSet to 0 replicas and confirm the operation. It may take a few seconds to scale all the way down to 0.

$ kubectl scale sts tkb-sts --replicas=0
statefulset.apps/tkb-sts scaled

$ kubectl get sts tkb-sts
NAME      READY   AGE
tkb-sts   0/0     13h
You can delete the StatefulSet as soon as it gets to zero replicas.

$ kubectl delete sts tkb-sts
statefulset.apps "tkb-sts" deleted
Feel free to exec onto the jump-pod and run another dig to prove that Kubernetes deleted the SRV records from the cluster DNS. You may have already terminated your jump pod when you deleted a cluster node.

Clean up
You’ve already deleted the StatefulSet and its Pods. However, the jump Pod, headless Service, volumes, and StorageClass still exist. You can delete them with the following commands if you’ve been following along. Failure to delete the volumes will incur unexpected cloud costs.

Delete the jump Pod. Don’t worry if it’s already gone.

$ kubectl delete pod jump-pod
Delete the headless Service.

$ kubectl delete svc dullahan
Delete the PVCs. This will delete the associated PVs and backend storage on the Linode Cloud. If you used your own StorageClass, you should check your storage backend to confirm that the external volumes also get deleted. Failure to delete the backend volumes may result in unwanted costs.

$ kubectl delete pvc webroot-tkb-sts-0 webroot-tkb-sts-1 webroot-tkb-sts-2
Delete the StorageClass.

$ kubectl delete sc flash
If you deleted a node from a Docker Desktop multi-node (kind) cluster, you’ll need to delete and rebuild your cluster back to the desired number of nodes.

Chapter Summary
In this chapter, you learned how to use StatefulSets to deploy and manage applications that work with persistent data and state.

StatefulSets can self-heal, scale up and down, and perform rollouts. Rollbacks require manual attention.

Each StatefulSet Pod gets a predictable and persistent name, DNS hostname, and its own unique volumes. These stay with the Pod for its entire lifecycle, including failures, restarts, scaling, and other scheduling operations. In fact, StatefulSet Pod names are integral to scaling operations and connecting to the right storage volumes.

Finally, StatefulSets are only a framework. We need to design applications to take advantage of the way they work.


table of contents
search
Settings
Previous chapter
12: ConfigMaps and Secrets
Next chapter
14: API security and RBAC
Table of contents collapsed
