Skip to Content
5: Virtual clusters with Namespaces
Namespaces are a way of dividing a Kubernetes cluster into multiple virtual clusters.

This chapter sets the foundation for Namespaces, gets you up to speed with creating and managing them, and introduces some use cases. You’ll see them in action in future chapters.

I’ve divided the chapter as follows:

Intro to Namespaces
Namespace use cases
Default Namespaces
Creating and managing Namespaces
Deploying to Namespaces
Intro to Namespaces
The first thing to know is that Kubernetes Namespaces are not the same as Linux kernel namespaces.

Kernel namespaces partition operating systems into virtual operating systems called containers
Kubernetes Namespaces partition Kubernetes clusters into virtual clusters called Namespaces
Note: We’ll capitalize Namespace when referring to Kubernetes Namespaces. This follows the pattern of capitalizing Kubernetes API resources and clarifies that we’re referring to Kubernetes Namespaces, not kernel namespaces.

It’s also important to know that Namespaces are a form of soft isolation and enable soft multi-tenancy. For example, you can create Namespaces for your dev, test, and qa environments and apply different quotas and policies to each. However, a compromised workload in one Namespace can easily impact workloads in other Namespaces.

The following command shows whether objects are namespaced or not. As you can see, most objects are namespaced, meaning you can deploy them to specific namespaces with custom policies and quotas. Objects that aren’t namespaced, such as Nodes and PersistentVolumes, are cluster-scoped and you cannot deploy them to specific Namespaces.

$ kubectl api-resources
NAME                     SHORTNAMES   ...    NAMESPACED   KIND
nodes                    no                  false        Node
persistentvolumeclaims   pvc                 true         PersistentVolumeClaim
persistentvolumes        pv                  false        PersistentVolume
pods                     po                  true         Pod
podtemplates                                 true         PodTemplate
replicationcontrollers   rc                  true         ReplicationController
resourcequotas           quota               true         ResourceQuota
secrets                                      true         Secret
serviceaccounts          sa                  true         ServiceAccount
services                 svc                 true         Service
<Snip>
Unless you specify otherwise, Kubernetes deploys objects to the default Namespace.

Namespace use cases
Namespaces are a way for multiple tenants to share the same cluster.

Tenant is a loose term that can refer to individual applications, different teams or departments, and even external customers. How you implement Namespaces and what you consider as tenants is up to you, but it’s most common to use Namespaces to divide clusters for use by tenants within the same organization. For example, you might divide a production cluster into the following three Namespace to match your organizational structure:

finance
hr
corporate-ops
You’d deploy Finance apps to the finance Namespace, HR apps to the hr Namespace, and Corporate apps to the corporate-ops Namespace. Each Namespace can have its own users, permissions, resource quotas, and policies.

Using Namespaces to divide a cluster among external tenants isn’t as common. This is because they only provide soft isolation and cannot prevent compromised workloads from escaping the Namespace and impacting workloads in other Namespaces. At the time of writing, the most common way of strongly isolating tenants is to run them on their own clusters and their own hardware.

Figure 5.1 shows a cluster on the left using Namespaces for soft multi-tenancy. All apps on this cluster share the same nodes and control plane, and compromised workloads can impact both Namespaces. The two clusters on the right provide strong isolation by implementing two separate clusters, each on dedicated hardware.

Figure 5.1 - Soft and hard isolation
Figure 5.1 - Soft and hard isolation
In summary, Namespaces are lightweight and easy to manage but only provide soft isolation. Running multiple clusters costs more and introduces more management overhead, but it offers strong isolation.

Default Namespaces
Every Kubernetes cluster has a set of pre-created Namespaces.

Run the following command to list yours.

$ kubectl get namespaces
NAME             STATUS    AGE
default           Active   2d
kube-system       Active   2d
kube-public       Active   2d
kube-node-lease   Active   2d
The default Namespace is where new objects go if you don’t specify a Namespace when creating them. kube-system is where control plane components such as the internal DNS service and the metrics server run. kube-public is for objects that need to be readable by anyone. And last but not least, kube-node-lease is used for node heartbeats and managing node leases.

Run a kubectl describe to inspect one of the Namespaces on your cluster. You can substitute namespace with ns when working with kubectl.

$ kubectl describe ns default
Name:         default
Labels:       kubernetes.io/metadata.name=default
Annotations:  <none>
Status:       Active
No resource quota.
No LimitRange resource.
You can also add -n or --namespace to kubectl commands to filter results against a specific Namespace.

Run the following command to list all Service objects in the kube-system Namespace. Your output might be different.

$ kubectl get svc --namespace kube-system
NAME                 TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)                 
kube-dns             ClusterIP      10.43.0.10     <none>        53/UDP,53/TCP,9153...   
metrics-server       ClusterIP      10.43.4.203    <none>        443/TCP                 
traefik-prometheus   ClusterIP      10.43.49.213   <none>        9100/TCP                
traefik              LoadBalancer   10.43.222.75   <pending>     80:31716/TCP,443:31...  
You can also use the --all-namespaces flag to return objects from all Namespaces.

Creating and managing Namespaces
In this section, you’ll see how to create, inspect, and delete Namespaces.

You’ll need a clone of the book’s GitHub repo if you want to follow along. And you’ll need to be on the 2025 branch.

$ git clone https://github.com/nigelpoulton/TKB.git
<Snip>

$ cd TKB

$ git fetch origin

$ git checkout -b 2025 origin/2025
You’ll also need to run all commands from the namespaces directory.

Namespaces are first-class resources in the core v1 API group. This means they’re stable, well-understood, and have been around for a long time. It also means you can work with them imperatively (via the CLI) and declaratively (via config files). We’ll do both.

Run the following imperative command to create a new Namespace called hydra.

$ kubectl create ns hydra
namespace/hydra created
Now, create one declaratively from the shield-ns.yml YAML file. It’s a simple file defining a single Namespace called shield.

kind: Namespace
apiVersion: v1
metadata:
  name: shield
  labels:
    env: marvel
Create it with the following command.

$ kubectl apply -f shield-ns.yml
namespace/shield created
List all Namespaces to see the two new ones you created.

$ kubectl get ns
NAME         STATUS   AGE
<Snip>
hydra        Active   49s
shield       Active   3s
If you know anything about the Marvel Cinematic Universe, you’ll know Shield and Hydra are bitter enemies and should never share the same cluster with only Namespaces separating them.

Delete the hydra Namespace.

$ kubectl delete ns hydra
namespace "hydra" deleted
Configure kubectl for a specific Namespace
When working with Namespaces, you’ll quickly realize it’s painful having to add the -n or --namespace flag on all your kubectl commands. A better way is to set your kubeconfig to automatically run commands against a specific Namespace.

Run the following command to configure your kubeconfig to run all future kubectl commands against the shield Namespace.

$ kubectl config set-context --current --namespace shield
Context "tkb" modified.
Run a few simple kubectl get commands to test it works. The shield Namespace is empty, so your commands won’t return any objects.

Deploying objects to Namespaces
As previously mentioned, most objects are Namespaced, and Kubernetes deploys new objects to the default Namespace unless you specify otherwise.

There are two ways to deploy objects to specific Namespaces:

Imperatively
Declaratively
To do it imperatively, add the -n or --namespace flag to commands. To do it declaratively, you specify the Namespace in the object’s YAML manifest.

Let’s use the declarative method to deploy an app to the shield Namespace.

The application is defined in the app.yml file in the namespaces folder of the book’s GitHub repo. It defines three objects: a ServiceAccount, a Service, and a Pod. The following YAML extract shows all three objects targeted at the shield Namespace.

Don’t worry if you don’t understand everything in the YAML. You only need to know it defines three objects and targets each one at the shield Namespace.

apiVersion: v1
kind: ServiceAccount
metadata:
  namespace: shield     <<---- Namespace
  name: default
---
apiVersion: v1
kind: Service
metadata:
  namespace: shield     <<---- Namespace
  name: the-bus
spec:
  type: LoadBalancer
  ports:
  - port: 8080
    targetPort: 8080
  selector:
    env: marvel
---
apiVersion: v1
kind: Pod
metadata:
  namespace: shield     <<---- Namespace
  name: triskelion
<Snip>
Deploy it with the following command. Don’t worry if you get a warning about a missing annotation for the ServiceAccount.

$ kubectl apply -f app.yml
serviceaccount/default configured
service/the-bus configured
pod/triskelion created
Run a few commands to verify all three objects are in the shield Namespace. You don’t need to add the -n shield flag if you configured kubectl to automatically target the shield Namespace.

$ kubectl get pods -n shield
NAME         READY   STATUS    RESTARTS   AGE
triskelion   1/1     Running   0          48s

$ kubectl get svc -n shield
NAME      TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)          AGE
the-bus   LoadBalancer   10.43.30.174   localhost     8080:31112/TCP   52s
Now that you’ve deployed the app, point your browser or a curl command to the value in the EXTERNAL-IP column on port 8080. Some Docker Desktop clusters incorrectly display a 172 IP address in the EXTERNAL-IP. You’ll need to substitute this with localhost and connect to localhost:8080.

$ curl localhost:8080

<!DOCTYPE html>
<html>
<head>
    <title>AOS</title>
    <Snip>
Congratulations. You’ve created a Namespace and deployed an app to it. Connecting to the app is exactly the same as connecting to an app in the default Namespace.

Clean up
The following commands will clean up your cluster and revert your kubeconfig to use the default Namespace.

Delete the shield Namespace. This will automatically delete the Pod, Service, and ServiceAccount you deployed to it. It may take a few seconds for the command to complete.

$ kubectl delete ns shield
namespace "shield" deleted
Reset your kubeconfig so it uses the default Namespace. If you don’t do this, future commands will run against the deleted shield Namespace and return no results.

$ kubectl config set-context --current --namespace default
Context "tkb" modified.
Chapter Summary
In this chapter, you learned that Kubernetes uses Namespaces to divide clusters for resource and accounting purposes. Each Namespace can have its own users, RBAC rules, and resource quotas, and you can selectively apply policies to Namespaces. However, they’re not a strong workload isolation boundary, so you cannot use them for hard multi-tenancy.

If you don’t specify one at deploy time, Kubernetes deploys objects to the default Namespace.


table of contents
search
Settings
Previous chapter
4: Working with Pods
Next chapter
6: Kubernetes Deployments
Table of contents collapsed
