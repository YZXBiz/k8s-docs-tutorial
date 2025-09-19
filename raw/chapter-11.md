Skip to Content
11: Kubernetes storage
Storing and retrieving data is critical to most real-world business applications. Fortunately, Kubernetes has a persistent volume subsystem that makes it easy to connect external storage systems that provide advanced data management services such as backup and recovery, replication, snapshots, encryption, and more.

I’ve divided the chapter into the following sections:

The big picture
Storage providers
The Container Storage Interface (CSI)
The Kubernetes persistent volume subsystem
Dynamic provisioning with Storage Classes
Hands-on
Kubernetes supports a variety of external storage systems. These include enterprise-class storage systems from providers such as EMC, NetApp, and all the major cloud providers.

I’ve based this chapter’s hands-on examples on a hosted Kubernetes service called Linode Kubernetes Engine (LKE). It’s simple to build and relatively cheap, but the examples won’t work on other clouds. This is because every cloud has its own storage plugins with their own options and features. I’ve included files that work on Google Kubernetes Engine (GKE), but I can’t include examples for every cloud. Fortunately, they all work on similar principles, and the things you’ll learn in this chapter will serve as a solid foundation for working with other clouds.

The big picture
Kubernetes supports many types of storage from many different providers. These include block, file, and object storage from various external systems that can be in the cloud or your on-premises data centers.

Figure 11.1 shows the high-level architecture.

Figure 11.1
Figure 11.1
The storage providers are on the left. As mentioned, these are the external systems providing advanced storage services and can be on-premises systems such as EMC and NetApp, or storage services provided by your cloud.

In the middle of the diagram is the plugin layer. This is the interface between the external storage systems on the left and Kubernetes on the right. Modern plugins use the Container Storage Interface (CSI), which is an industry-standard storage interface for container orchestrators such as Kubernetes. If you’re a developer writing storage plugins, the CSI abstracts the internal Kubernetes machinery and allows you to develop out-of-tree.

Note: Before the CSI, we developed all storage plugins as part of the main Kubernetes code tree (in-tree). This forced them to be open source and tied plugin updates and bug fixes to the Kubernetes release cycle. This was problematic for plugin developers as well as the Kubernetes maintainers. Fortunately, CSI plugins don’t need to be open source, and we can release them whenever required.

On the right of Figure 11.1 is the Kubernetes persistent volume subsystem. This is a standardized set of API objects that make it easy for applications to consume storage. There are a growing number of storage-related API objects, but the core ones are:

PersistentVolumes (PV)
PersistentVolumeClaims (PVC)
StorageClasses (SC)
Throughout the chapter, we’ll refer to these in a few different ways. Sometimes, we’ll use their PascalCase truncated names — PersistentVolume, PersistentVolumeClaim, and StorageClass. Sometimes we’ll use their acronyms — PV, PVC, and SC. And sometimes we’ll just call them persistent volumes, and storage classes, etc.

PVs map to external volumes, PVCs grant access to PVs, and SCs make it all automatic and dynamic.

Consider the quick AWS example and workflow shown in Figure 11.2.

Figure 11.2 - Volume provisioning workflow
Figure 11.2 - Volume provisioning workflow
The Pod on the far right needs a 50GB volume and requests it via a PersistentVolumeClaim (PVC)
The PVC asks the StorageClass to create a new PV and associated volume on the AWS backend
The SC makes the call to the AWS backend via the AWS CSI plugin
The CSI plugin creates the 50GB EBS volume on AWS
The CSI plugin reports the creation of the external volume back to the SC
The SC creates the PV and maps it to the EBS volume on the AWS back end
The Pod mounts the PV and uses it
Before digging deeper, it’s worth noting that Kubernetes has mechanisms to prevent multiple Pods from writing to the same PV. It also forces a 1:1 mapping between external volumes and PVs — you cannot map a single 50GB external volume to 2 x 25GB PVs.

Let’s dig a bit deeper.

Storage Providers
As previously mentioned, Kubernetes lets you use storage from a wide range of external systems. We usually call these providers or provisioners.

Each provider supplies its own CSI plugin that exposes the backend’s features and configuration options.

The provider usually distributes the plugin via a Helm chart or YAML installer. Once installed, the plugin runs as a set of Pods in the kube-system Namespace.

Some obvious restrictions apply. For example, you can’t provision and mount AWS EBS volumes if your cluster is on Microsoft Azure. Locality restrictions may also apply. For example, Pods may have to be in the same region or zone as the storage they’re accessing.

Other options, such as volume size, protection level, snapshot schedule, replication settings, encryption configuration, and more, are all configured via the backend’s CSI plugin. Not all backends support the same features, and it’s your responsibility to read the plugin’s documentation and configure it properly.

The Container Storage Interface (CSI)
The CSI is an open-source project that defines an industry-standard interface so container orchestrators can leverage external storage resources in a uniform way. For example, it gives storage providers a documented interface to work with. It also means that CSI plugins should work on any orchestration platform that supports the CSI.

You can find a relatively up-to-date list of CSI plugins in the following repository. The repository refers to plugins as drivers.

https://kubernetes-csi.github.io/docs/drivers.html
Most cloud platforms pre-install CSI plugins for the cloud’s native storage services. You’ll have to install plugins for third-party storage systems manually, but as previously stated, they’re usually available as Helm charts or YAML files from the provider. Once installed, CSI plugins typically run as a set of Pods in the kube-system Namespace.

The Kubernetes persistent volume subsystem
The Persistent Volume Subsystem is a set of API objects that allow applications to request and access storage. It has the following resources that we’ll look at and work with:

PersistentVolumes (PV)
PersistentVolumeClaims (PVC)
StorageClasses (SC)
As previously mentioned, PVs make external volumes available on Kubernetes. For example, if you want to make a 50GB AWS volume available on your cluster, you’ll need to map it to a PV. If a Pod wants to use it, it needs a PVC granting it access to the PV. SCs allow applications to create PVs and backend volumes dynamically.

Let’s walk through another example.

Assume you have an external storage system with the following tiers of storage:

Fast block (flash)
Fast encrypted block (flash)
Slow block (mechanical)
File (NFS)
You create a StorageClass for each, so that all four tiers are available to Kubernetes.

External tier	Kubernetes StorageClass name	CSI plugin
Flash	sc-fast-block	csi.xyz.block
Flash encrypted	sc-fast-encrpted	csi.xyz.block
Mechanical disk	sc-slow	csi.xyz.block
NFS Filestore	sc-file	csi.xyz.file
Imagine you’re asked to deploy a new application requiring 100GB of fast encrypted block storage. To accomplish this, you create a YAML file defining a Pod that references a PVC requesting a 100GB volume from the sc-fast-encrypted storage class.

You deploy the app by sending the YAML file to the API server. The SC controller observes the new PVC and instructs the CSI plugin to provision 100GB of encrypted flash storage on the external storage system. The external system creates the volume and reports back to the CSI plugin, which then informs the SC controller that maps it to a new PV. The Pod uses the PVC to mount and use the PV.

It’s OK if some of this is still confusing. The hands-on examples will clarify everything.

Dynamic provisioning with Storage Classes
Storage classes are resources in the storage.k8s.io/v1 API group. The resource type is StorageClass, and you define them in regular YAML files. You can use the sc shortname when using kubectl.

Note: You can run a kubectl api-resources command to see a full list of API resources and their shortnames. It also shows each resource’s API group and what its equivalent kind is.

As the name suggests, StorageClasses let you define different classes of storage that apps can request. How you define your classes is up to you and will depend on the types of storage you have available. For example, your cloud may offer the following four types of storage:

Fast block (SSD)
Fast encrypted block (SSD)
Slow block (mechanical)
File (NFS)
Let’s look at an example.

A StorageClass YAML
The following YAML object defines a StorageClass called fast-local that provisions encrypted SSD volumes capable of 10 IOPs per gigabyte from the Ireland AWS region.

kind: StorageClass
apiVersion: storage.k8s.io/v1
metadata:
  name: fast-local
provisioner: ebs.csi.aws.com         <<---- AWS Elastic Block Store CSI plugin
parameters:
  encrypted: true                    <<---- Create encrypted volumes
  type: io1                          <<---- AWS SSD drives
  iopsPerGB: "10"                    <<---- Performance requirement
allowedTopologies:                   <<---- Where to provision volumes and replicas
- matchLabelExpressions:             
  - key: topology.ebs.csi.aws.com/zone
    values:
    - eu-west-1a                     <<---- Ireland AWS region
As with all Kubernetes YAML files, kind and apiVersion tell Kubernetes the type and version of the object you’re defining. metadata.name is an arbitrary string that gives the object a friendly name, and the provisioner field tells Kubernetes which CSI plugin to use — you’ll need the plugin installed. The parameters block defines the type of storage to provision, and the allowedTopologies property lets you specify where replicas should go.

A few important things to note:

Storage classes are immutable — once you deploy them, you can’t modify them
metadata.name should be meaningful, as it’s how you and other objects refer to the class
We sometimes use the terms provisioner, plugin, and driver interchangeably
The parameters block is for plugin-specific values and is different for every plugin
Most storage systems have their own features, and it’s your responsibility to read the documentation for your plugin and configure it.

Working with StorageClasses
The basic workflow for deploying and using a StorageClass is as follows:

Install and configure the CSI plugin
Create one or more StorageClasses
Deploy Pods with PVCs that request volumes via the StorageClasses
The list assumes you have an external storage system connected to your Kubernetes cluster. Most hosted Kubernetes services pre-install CSI drivers for the cloud’s native storage backends, making it easier to consume them.

The following YAML snippet defines a Pod, a PVC, and an SC. You can define all three objects in the same YAML file by separating them with three dashes (---).

apiVersion: v1
kind: Pod                             <<---- 1. Pod
metadata:
  name: mypod
spec:
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: mypvc              <<---- 2. Request volume via the "mypvc" PVC
  containers: ...
  <SNIP>
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mypvc                         <<---- 3. This is the "mypvc" PVC
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi                   <<---- 4. Provision a 50Gi volume...
  storageClassName: fast              <<---- 5. ...based on the "fast" StorageClass
---
kind: StorageClass
apiVersion: storage.k8s.io/v1
metadata:
  name: fast                          <<---- 6. This is the "fast" StorageClass
provisioner: pd.csi.storage.gke.io    <<---- 7. Use this CSI plugin
parameters:
  type: pd-ssd                        <<---- 8. Provision this type of storage
The YAML is truncated and doesn’t include a full PodSpec. However, we can see the main workflow if we step through the numbered annotations:

A normal Pod object
The Pod requests a volume via the mypvc PVC
The file defines a PVC called mypvc
The PVC provisions a 50Gi volume
The volume will be provisioned via the fast StorageClass
The file defines the fast StorageClass
The StorageClass provisions volumes via the pd.csi.storage.gke.io CSI plugin
The CSI plugin will provision fast (pd-ssd) storage from the Google Cloud’s storage backend
Let’s look at a couple of additional settings before moving on to the demos.

Additional volume settings
StorageClasses give you lots of ways to control how volumes are provisioned and managed. We’ll cover the following:

Access mode
Reclaim policy
Access mode
Kubernetes supports three volume access modes:

ReadWriteOnce (RWO)
ReadWriteMany (RWM)
ReadOnlyMany (ROM)
ReadWriteOnce lets a single PVC bind to a volume in read-write (R/W) mode. Attempts to bind it from multiple PVCs will fail.

ReadWriteMany lets multiple PVCs bind to a volume in read-write (R/W) mode. File and object storage usually support this mode, whereas block storage usually doesn’t.

ReadOnlyMany allows multiple PVCs to bind to a volume in read-only (R/O) mode.

It’s also important to know that a PV can only be opened in one mode. For example, you cannot bind a single PV to one PVC in ROM mode and another PVC in RWM mode.

Reclaim policy
ReclaimPolicies tell Kubernetes what to do with a PV and associated external storage when its PVC is released. Two policies currently exist:

Delete
Retain
Delete is the most dangerous and is the default for PVs created dynamically via StorageClasses. It deletes the PV and associated external storage when the PVC is released. This means deleting the PVC will delete the PV and the external storage. Use with caution.

Retain will keep the PV and external storage after you delete the PVC. It’s the safer option, but you have to reclaim resources manually.

Before doing the demos, let’s summarize what you’ve learned about StorageClasses.

StorageClasses (SC) represent tiers of storage that applications call on to create volumes dynamically. You define them in regular YAML files that reference a plugin and tie them to a particular type of storage on a particular external storage system. For example, one SC might provision high-performance AWS SSD storage in the AWS Mumbai Region, while another might provision slow AWS storage from a different AWS region. Once deployed, the SC controller watches the API server for new PVCs referencing the SC. Each time you create a PVC that matches the SC, the SC dynamically creates the required volume on the external storage system and maps it to a PV that apps can mount and use.

There’s always more detail, but you’ve learned enough to get you started.

Hands-on
This section walks you through dynamically provisioning volumes via StorageClasses. I’ve split the demos as follows:

Use an existing StorageClass
Create and use a new StorageClass
The demos are all based on Linode Kubernetes Engine (LKE) and won’t work on other clouds. This is because every cloud and every storage provider has its own CSI plugins with their own configuration options and I don’t have space in the book for them all. However, it’s easy to build an LKE cluster to follow along, and even if you only read along, you’ll still learn a lot.

The rest of this section assumes you have a clone of the book’s GitHub repo and are working on the 2025 branch. It also assumes you’re connected to your LKE cluster. See Chapter 3 if you need to build one.

$ git clone https://github.com/nigelpoulton/TKB.git
<Snip>

$ cd TKB

$ git fetch origin

$ git checkout -b 2025 origin/2025

$ cd storage
Use an existing StorageClass
Run the following command to see the pre-installed storage classes on your cluster. Most Kubernetes environments pre-create at least one storage class, and I’ve trimmed the output to fit the page.

$ kubectl get sc
                                                        RECLAIM   VOLUME       ALLOWVOLUME
NAME                          PROVISIONER               POLICY    BINDINGMODE   EXPANSION 
linode-blck-stg               linodebs.csi.linode.com   Delete    Immediate       true    
linode-blck-stg-retain (def)  linodebs.csi.linode.com   Retain    Immediate       true    
Let’s examine the output.

My LKE cluster has two pre-created storage classes that both provision volumes via the linodebs.csi.linode.com CSI plugin (PROVISIONER) and both use the Immediate volume binding mode.

One uses the Delete reclaim policy and the other uses the Retain.

The linode-block-storage-retain (default) class on the second line is the default class, meaning your PVCs will use this class unless you specify a different one. You should probably specify a storage class for your important production apps, as the default class can differ between clusters, meaning you don’t always get the same thing.

Some clusters pre-create lots of storage classes, and the following output is from an Autopilot regional cluster on Google Kubernetes Engine. It shows eight classes, five of which use the filestore.csi.storage.gke.io plugin to access Google Cloud’s NFS-based Filestore storage, two use the pd.csi.storage.gke.io plugin to access the Google Cloud’s block storage, and one uses the legacy in-tree kubernetes.io/gce-pd plugin (non-CSI).

                                                    RECLAIM
NAME                 PROVISIONER                    POLICY    VOLUMEBINDINGMODE 
enterprise-multi..   filestore.csi.storage.gke.io   Delete    WaitForFirstConsumer
enterprise-rwx       filestore.csi.storage.gke.io   Delete    WaitForFirstConsumer
premium-rwo          pd.csi.storage.gke.io          Delete    WaitForFirstConsumer
premium-rwx          filestore.csi.storage.gke.io   Delete    WaitForFirstConsumer
standard             kubernetes.io/gce-pd           Delete    Immediate           
standard-rwo (def)   pd.csi.storage.gke.io          Delete    WaitForFirstConsumer
standard-rwx         filestore.csi.storage.gke.io   Delete    WaitForFirstConsumer
zonal-rwx            filestore.csi.storage.gke.io   Delete    WaitForFirstConsumer
Run the following command to see detailed information about the linode-block-storage class.

$ kubectl describe sc linode-block-storage
Name:                  linode-block-storage
IsDefaultClass:        No
Annotations:           lke.linode.com/caplke-version=v1.31.5-2025-02b
Provisioner:           linodebs.csi.linode.com
Parameters:            <none>
AllowVolumeExpansion:  True
MountOptions:          <none>
ReclaimPolicy:         Delete
VolumeBindingMode:     Immediate
Events:                <none>
The important thing for this workflow is that it uses the Delete reclaim policy. This means Kubernetes will automatically delete the PV and associated back-end volume when you stop using the PVC. You’ll see this in action shortly.

List any existing PVs and PVCs so that you can easily identify the ones you’re about to create.

$ kubectl get pv
No resources found
$ kubectl get pvc
No resources found in default namespace.
The following YAML is from the lke-pvc-test.yml file in the storage folder. It describes a PVC called pvc-test that provisions a 10GB volume via the linode-block-storage storage class.

apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pvc-test
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: linode-block-storage
  resources:
    requests:
      storage: 10Gi
Run the following command to create the PVC. Be sure to run it from the storage folder, and it will only work if you have an LKE cluster with a linode-block-storage storage class.

$ kubectl apply -f lke-pvc-test.yml
persistentvolumeclaim/pvc-test created
Run the following command to see the PVC.

$ kubectl get pvc
NAME       STATUS   VOLUME                 CAPACITY   ACCESS MODES   STORAGECLASS           
pvc-test   Bound    pvc-cc3dd8716c7d46c9   10Gi       RWO            linode-block-storage
Kubernetes has created the PVC and already bound it to a volume. This is because the linode-block-storage SC uses the Immediate volume binding mode, to automatically create the PV and backend storage without waiting for a Pod to claim it.

Run the following command to see the PV.

$ kubectl get pv
                                  ACCESS   RECLAIM
NAME                   CAPACITY   MODES    POLICY    STATUS   CLAIM      STORAGECLASS         
pvc-cc3dd8716c7d46c9   10Gi       RWO      Delete    Bound    pvc-test   linode-block-storage
The PV also exists and is bound to the pvc-test claim. This means the volume should also exist on the Linode cloud.

Open your LKE dashboard (cloud.linode.com) and navigate to the Volumes tab to confirm you have a 10GB volume with the same name as your PVC in the same region as your LKE cluster.

Congratulations. You’ve successfully provisioned an external volume via one of your cluster’s built-in SCs. Figure 11.3 shows how everything maps. The only thing missing is a Pod on the right that uses the PVC to gain access to the PV. You’ll see this in the upcoming section.

Figure 11.3 - How everything fits together
Figure 11.3 - How everything fits together
If you had configured the storage class with the VolumeBindingMode set to WaitForFirstConsumer, the storage class wouldn’t create the PV or back-end volume until you deployed a Pod that used them.

Run the following command to delete the PVC.

$ kubectl delete pvc pvc-test
persistentvolumeclaim "pvc-test" deleted
Deleting the PVC will also delete the PV and associated volume on your LKE back end. This is because the storage class created them with the ReclaimPolicy set to Delete. Complete the following steps to verify this.

$ kubectl get pv
No resources found
Go to the Volumes tab of your LKE console and verify the back-end volume is gone.

Create and use a new StorageClass
In this section, you’ll create a new StorageClass that implements topology-aware provisioning. This is where the storage class delays volume creation until a Pod requests it. This ensures the storage class will create the volume in the same region and zone as the Pod.

You’ll create the storage class defined in the lke-sc-wait-keep.yml file in the storage folder of the book’s GitHub repo. It defines a storage class called block-wait-keep with the following properties:

Block storage
Topology aware provisioning (volumeBindingMode: WaitForFirstConsumer)
Keep volume and data when the PVC is deleted (reclaimPolicy: Retain)
You’ll sometimes see topology-aware provisioning referred to as provision on demand.

apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: block-wait-keep
provisioner: linodebs.csi.linode.com       <<---- CSI Plugin
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer    <<---- Provision on demand
reclaimPolicy: Retain                      <<---- Keep volume when PVC released
Deploy the SC and verify it exists.

$ kubectl apply -f lke-sc-wait-keep.yml
storageclass.storage.k8s.io/block-wait-keep created

$ kubectl get sc
                                                                                       ALLOW
                                                        RECLAIM  VOLUME                VOLUME
NAME                          PROVISIONER               POLICY   BINDINGMODE           EXPANSION
block-wait-keep               linodebs.csi.linode.com   Retain   WaitForFirstConsumer  true
linode-blck-stg               linodebs.csi.linode.com   Delete   Immediate             true
linode-blck-stg-retain (def)  linodebs.csi.linode.com   Retain   Immediate             true
Once you’ve created the storage class, you can deploy the PVC defined in the lke-pvc-wait-keep.yml file. As you can see, it defines a PVC called pvc-wait-keep requesting a 20GB volume from the block-wait-keep SC.

apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pvc-wait-keep
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: block-wait-keep
Deploy it with the following command.

$ kubectl apply -f lke-pvc-wait-keep.yml
persistentvolumeclaim/pvc-wait-keep created
Confirm that Kubernetes created it, and check if it created the PV yet.

$ kubectl get pvc
NAME            STATUS    VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS      
pvc-wait-keep   Pending                                      block-wait-keep   

$ kubectl get pv
No resources found
The PVC is in the Pending state and the storage class hasn’t created a PV yet. This is because the PVC uses a storage class with the WaitForFirstConsumer volume binding mode, which implements topology-aware provisioning by waiting for a Pod to reference the PVC before creating the PV and back-end volume on LKE.

The following YAML defines a Pod called volpod that uses the pvc-wait-keep PVC you just created. It’s from the lke-app.yml file. I’ve annotated the sections referencing the PVC and mounting the volume.

apiVersion: v1
kind: Pod
metadata:
  name: volpod
spec:
  volumes:                       ----┐ Create a volume
  - name: data                       | called "data"
    persistentVolumeClaim:           | from the PVC
      claimName: pvc-wait-keep   ----┘ called "pvc-wait-keep
  containers:                    
  - name: ubuntu-ctr
    image: ubuntu:latest
    command:
    - /bin/bash
    - "-c"
    - "sleep 60m"
    volumeMounts:                ----┐ Mount the
    - name: data                     | "data" volume
      mountPath: /tkb            ----┘ to /tkb
Deploy the Pod and then confirm the storage class created the PV.

$ kubectl apply -f lke-app.yml
pod/volpod created

$ kubectl get pvc
NAME            STATUS   VOLUME                 CAPACITY   ACCESS MODES   STORAGECLASS   
pvc-wait-keep   Bound    pvc-279f09e083254fa9   20Gi       RWO            block-wait-keep

$ kubectl get pv
                                  ACCESS  RECLAIM
NAME                   CAPACITY   MODES   POLICY   STATUS   CLAIM           STORAGECLASS     
pvc-279f09e083254fa9   20Gi       RWO     Retain   Bound    pvc-wait-keep   block-wait-keep
The PVC is bound to a volume, a PV exists with the same name, and all the settings are as expected — capacity, reclaim policy, and storage class.

Run the following command to confirm the Pod is claiming and mounting the volume.

$ kubectl describe pod volpod
Name:             volpod
Namespace:        default
Node:             lke340882-541526-0198b5d80000/192.168.145.142
Status:           Running
IP:               10.2.1.3
<Snip>
Containers:
  ubuntu-ctr:
<Snip>
    Mounts:                                                    ----┐ Mount the 
      /tkb from data (rw)                                      ----┘ "data" volume
<Snip>
Volumes:                                                       ----┐
  data:                                                            | Create the "data" volume
    Type:       PersistentVolumeClaim (a reference to a PVC...)    | from the PVC
    ClaimName:  pvc-wait-keep                                      | called "pvc-wait-keep"
    ReadOnly:   false                                          ----┘
  <Snip>
Let’s summarize what just happened:

You created a new StorageClass called block-wait-keep that provisions block storage from the Linode cloud
The StorageClass controller started watching the API server for new PVCs referencing your new block-wait-keep class
You created a PVC referencing the class, but it didn’t create a volume because the volume binding mode is set to WaitForFirstConsumer
You deployed a Pod that used the PVC to request a new 20GB volume
The SC controller observed this and dynamically created PV and the external volume on the Linode cloud
Congratulations. You’ve created your own StorageClass that implements topology-aware provisioning by delaying PV creation until a Pod references the PVC. This ensures Kubernetes creates volumes in the same region and zone as the Pods.

Clean up
You need to do five things to clean up your environment:

Delete the Pod using the PVC
Delete the PVC
Delete the PV
Manually delete the volume on the Linode cloud back end
Delete the SC
Delete the Pod. It may take a few seconds for the operation to complete.

$ kubectl delete pod volpod
pod "volpod" deleted
Delete the PVC.

$ kubectl delete pvc pvc-wait-keep
persistentvolumeclaim "pvc-wait-keep" deleted
Even though you’ve deleted the Pod and the PVC, Kubernetes hasn’t deleted the PV or external volume because the storage class created them with the Retain reclaim policy. This means you’ll have to delete them manually.

Run the following command to delete the PV. Yours will have a different name.

$ kubectl delete pv pvc-279f09e083254fa9
persistentvolume "pvc-279f09e083254fa9" deleted
Open your Linode cloud console and delete the volume from the Volumes tab. Be sure to delete the volume with the same name as the PV you just deleted! It will show as unattached in the Attached to column. Not deleting the volume will incur unwanted Linode costs.

Finally, delete the storage class.

$ kubectl delete sc block-wait-keep
storageclass.storage.k8s.io "block-wait-keep" deleted
Chapter Summary
In this chapter, you learned that Kubernetes has a powerful storage subsystem that enables applications to dynamically provision and use storage from various external providers.

Each external provider has its own CSI plugin that creates the volumes and surfaces them inside Kubernetes. Most hosted Kubernetes clusters pre-install CSI plugins that run as Pods in the kube-system Namespace.

Once you’ve installed the CSI plugin, you create StorageClasses that map to a type of storage on the external system. The StorageClass controller operates as a background reconciliation loop on the control plane, watching the API server for new PVCs. Whenever it sees one, it creates the requested volume on the external system and maps it to a new PV on Kubernetes. Pods can then use the PVC to claim and mount the volume.


table of contents
search
Settings
Previous chapter
10: Service discovery deep dive
Next chapter
12: ConfigMaps and Secrets
Table of contents collapsed
