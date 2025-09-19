Skip to Content
7: Kubernetes Services
Pods are unreliable, and you should never connect directly to them. You should always connect via a Service.

I’ve organized this chapter as follows:

Service theory
Hands-on with Services
Service Theory
Kubernetes treats Pods as ephemeral objects and deletes them when any of the following events occur:

Scale-down operations
Rolling updates
Rollbacks
Node maintenance/evictions
Failures
This means they’re unreliable, and apps can’t rely on them being there to respond to requests. Fortunately, Kubernetes has a solution — Service objects sit in front of one or more identical Pods and expose them via a reliable DNS name, IP address, and port.

Figure 7.1 shows a client connecting to an application via a Service called app1. The client connects to the name or IP of the Service, and the Service forwards requests to the application Pods behind it.

Figure 7.1 - Clients accessing Pods via a Service
Figure 7.1 - Clients accessing Pods via a Service
Note: Services are resources in the Kubernetes API, so we capitalize the “S” to avoid confusion with other uses of the word.

Every Service has a front end and a back end. The front end includes a DNS name, IP address, and network port that Kubernetes guarantees will never change. The back end is a label selector that sends traffic to healthy Pods with matching labels. Looking back to Figure 7.1, the client sends traffic to the Service on either app1:8080 or 10.99.11.23:8080, and Kubernetes guarantees it will reach a Pod with the project=tkb label.

Services are also intelligent enough to maintain a list of healthy Pods with matching labels. This means you can scale up and down, perform rollouts and rollbacks, and Pods can even fail, but the Service will always have an up-to-date list of active healthy Pods.

Labels and loose coupling
Services use labels and selectors to know which Pods to send traffic to. This is the same technology that tells Deployments which Pods they manage.

Figure 7.2 shows a Service selecting Pods with the project=tkb and zone=prod labels.

Figure 7.2 - Services and labels
Figure 7.2 - Services and labels
In this example, the Service sends traffic to Pod A, Pod B, and Pod D because they have all the labels it’s looking for. It doesn’t matter that Pod D has additional labels. However, it won’t send traffic to Pod C because it doesn’t have both labels. The following YAML defines a Deployment and a Service. The Deployment will create Pods with the project=tkb and zone=prod labels, and the Service will send traffic to them.

apiVersion: apps/v1
kind: Deployment
metadata:
  name: tkb-2024
spec:
  replicas: 10
  <Snip>
  template:
    metadata:
      labels:
        project: tkb        ----┐  Create Pods 
        zone: prod          ----┘  with these labels
    spec:
      containers:
  <Snip>
---
apiVersion: v1
kind: Service
metadata:
  name: tkb
spec:
  ports:
  - port: 8080
  selector:
    project: tkb            ----┐ Send to Pods 
    zone: prod              ----┘ with these labels
Behind the scenes with EndpointSlices
Whenever you create a Service, Kubernetes automatically creates an associated EndpointSlice to track healthy Pods with matching labels.

It works like this.

Every time you create a Service, the EndpointSlice controller automatically creates an associated EndpointSlice object. Kubernetes then watches the cluster, looking for Pods matching the Service’s label selector. Any new Pods matching the selector get added to the EndpointSlice, whereas any deleted Pods get removed. Applications send traffic to the Service name, and the application’s container uses the cluster DNS to resolve the name to the Service’s IP address. The container then sends the traffic to the Service’s IP, and the Service forwards it to one of the Pods listed in the EndpointSlice.

Older versions of Kubernetes used an Endpoints object instead of EndpointSlices. They’re functionally identical, but EndpointSlices perform better on large busy clusters.

Service types
Kubernetes has several types of Services for different use cases and requirements. The main ones are:

ClusterIP
NodePort
LoadBalancer
ClusterIP is the most basic and provides a reliable endpoint (name, IP, and port) on the internal Pod network. NodePort Services build on top of ClusterIP and allow external clients to connect via a port on every cluster node. LoadBalancers build on top of both and integrate with cloud load balancers for extremely simple access from the internet.

All three are important, so let’s look at each in turn.

ClusterIP Services - Accessing apps from inside the cluster
ClusterIP is the default Service type. These get a DNS name and IP address that are programmed into the internal network fabric and are only accessible from inside the cluster. This means:

The IP is only routable on the internal Pod network
The name is automatically registered with the cluster’s internal DNS
All containers are pre-programmed to use the cluster’s DNS to resolve names
Let’s consider an example.

You’re deploying an application called skippy, and you want other applications on the cluster to access it via that name. To satisfy these requirements, you create a new ClusterIP Service called skippy. Kubernetes creates the Service, assigns it an internal IP, and creates the DNS records in the cluster’s internal DNS. Kubernetes also configures all containers on the cluster to use the cluster DNS for name resolution. This means every app on the cluster can connect to the new app using the skippy name.

However, ClusterIP Services aren’t routable and require access to the cluster’s internal DNS service, meaning they don’t work outside the cluster.

We’ll dive into this in the service discovery chapter.

NodePort Services - Accessing apps from outside the cluster
NodePort Services build on top of ClusterIP Services by adding a dedicated port on every cluster node that external clients can use. We call this dedicated port the “NodePort”.

The following YAML shows a NodePort Service called skippy.

apiVersion: v1
kind: Service
metadata:
  name: skippy           <<---- Registered with the internal cluster DNS (ClusterIP)
spec:
  type: NodePort         <<---- Service type
  ports:
  - port: 8080           <<---- Internal ClusterIP port
    targetPort: 9000     <<---- Application port in container
    nodePort: 30050      <<---- External port on every cluster node (NodePort)
  selector:
    app: hello-world
Posting this to Kubernetes will create a ClusterIP Service with the usual internally routable IP and DNS name. It will also publish port 30050 on every cluster node and map it back to the ClusterIP. This means external clients can send traffic to any cluster node on port 30050 and reach the Service and its Pods.

Figure 7.3 shows a NodePort Service exposing three Pods on every cluster node on port 30050. Step 1 shows an external client hitting a node on the NodePort. Step 2 shows the node forwarding the request to the ClusterIP of the Service inside the cluster. The Service picks a Pod from the EndpointSlice’s always-up-to-date list in step 3 and forwards it to the chosen Pod in step 4.

Figure 7.3 - NodePort Service
Figure 7.3 - NodePort Service
The external client can send the request to any cluster node, and the Service can send the request to any of the three healthy Pods. In fact, future requests will probably go to other Pods as the Service performs simple round-robin load balancing.

However, NodePort Services have two significant limitations:

They use high-numbered ports between 30000-32767
Clients need to know the names or IPs of nodes, as well as whether nodes are healthy
This is why most people use LoadBalancer Services instead.

LoadBalancer Services - Accessing apps via load balancers
LoadBalancer Services are the easiest way to expose services to external clients. They simplify NodePort Services by putting a cloud load balancer in front of them.

Figure 7.4 shows a LoadBalancer Service. As you can see, it’s basically a NodePort Service fronted by a highly-available load balancer with a publicly resolvable DNS name and low port number.

Figure 7.4 - LoadBalancer Service
Figure 7.4 - LoadBalancer Service
The client connects to the load balancer via a reliable, friendly DNS name on a low-numbered port, and the load balancer forwards the request to a NodePort on a healthy cluster node. From there, it’s the same as a NodePort Service — send to the internal ClusterIP Service, select a Pod from the EndpointSlice, and send the request to the Pod.

The following YAML creates a LoadBalancer Service listening on port 8080 and maps it all the way through to port 9000 on Pods with the project=tkb label. It automatically creates the required NodePort and ClusterIP constructs in the background.

apiVersion: v1
kind: Service
metadata:
  name: lb               <<---- Registered with cluster DNS
spec:
  type: LoadBalancer
  ports:
  - port: 8080           <<---- Load balancer port
    targetPort: 9000     <<---- Application port inside container
  selector:
    project: tkb
You’ll create and use a LoadBalancer Service in the hands-on section later.

Summary of Service theory
Services sit in front of Pods and make them accessible via a reliable network endpoint.

The front end of a Service provides an IP address, DNS name, and a port that is guaranteed to be stable for the entire life of the Service. The back-end load balances traffic over a dynamic set of Pods that match a label selector.

ClusterIP Services are the default and provide reliable endpoints on the internal cluster network. NodePorts and LoadBalancers provide external endpoints.

LoadBalancer Services create a load balancer on the underlying cloud platform, as well as all the constructs and mappings to forward traffic from the load balancer to the Pods.

Hands-on with Services
This section shows you how to work with Services imperatively and declaratively. As always, Kubernetes prefers the declarative method of deploying and managing everything with YAML files. However, it can be helpful to know the imperative commands.

You’ll need all of the following if you’re following along:

Clone of the book’s GitHub repo
Kubernetes cluster
You’ll be creating and working with LoadBalancer Services, and you can use any of the clusters we showed you how to create in Chapter 3. If your cluster is in the cloud, Kubernetes will provision one of your cloud’s internet-facing load balancers and provide you with public IPs or public DNS names. If you’re using a local cluster, such as Docker Desktop, the experience will be the same, but you’ll use local constructs such as localhost.

If you don’t already have a copy of the book’s GitHub repo, clone it with the following command and then switch to the 2025 branch.

$ git clone https://github.com/nigelpoulton/TKB.git
Cloning into 'TKB'...

$ cd TKB

$ git fetch origin

$ git checkout -b 2025 origin/2025
Switch to the Services directory.

$ cd TKB/services
Run the following command to deploy a sample app called svc-test. It’s a Deployment that creates ten Pods running a web app listening on port 8080 and with the chapter=services label.

$ kubectl apply -f deploy.yml
deployment.apps/svc-test created
Ensure the Pods were successfully deployed and then continue to the next section.

$ kubectl get deploy svc-test
NAME        READY    UP-TO-DATE    AVAILABLE    AGE
svc-test    10/10    10            10           24s
Working with Services imperatively
The kubectl expose command creates a Service for an existing Deployment. It’s intelligent enough to inspect the running Deployment and create all the required constructs, such as IP address, label selector, DNS records, and correct port mappings.

Run the following command to create a new LoadBalancer Service for the Pods in the svc-test Deployment.

$ kubectl expose deployment svc-test --type=LoadBalancer
service/svc-test exposed
List services to see its basic config. It may take a minute for the EXTERNAL-IP column to populate if you’re running on a cloud.

$ kubectl get svc -o wide
NAME         TYPE           CLUSTER-IP    EXTERNAL-IP    PORT(S)          SELECTOR
kubernetes   ClusterIP      10.96.0.1     <none>         443/TCP          <none>
svc-test     LoadBalancer   10.10.19.33   212.2.245.220  8080:31755/TCP   chapter=services
The first line is a system Service called Kubernetes that exposes the Kubernetes API to all Pods and containers on the cluster.

Your Service is on the second line, and there’s a lot of info, so let’s step through it.

First up, it’s been allocated the same name as the Deployment it’s sitting in front of — svc-test.

The TYPE column shows this one’s a LoadBalancer Service, and the one in the example is assigned an EXTERNAL-IP of 212.2.245.220. If you’re on a local cluster such as Docker Desktop, the EXTERNAL-IP will show localhost. Some Docker Desktop clusters incorrectly return a 172 IP address in the EXTERNAL-IP column, it should be localhost.

The CLUSTER-IP column lists the Service’s internal IP that’s only routable on the internal cluster network.

The PORT(S) column shows the load balancer port (8080) and the NodePort (31755). By default, the load balancer port matches the port the app listens on, but you can override this. The NodePort value is randomly assigned from between 30000-32767.

The SELECTOR column matches the Pod labels.

A couple of things are worth noting.

First up, the command inspected the running Deployment and created the correct port mappings and label selector — the app is listening on port 8080, and all 10 Pods have the chapter=services label.

Second up, even though it’s a LoadBalancer Service, it also created all the ClusterIP and NodePort constructs. This is because LoadBalancer Services build on top of NodePort Services, which, in turn, build on top of ClusterIP Services, as shown in Figure 7.5.

Figure 7.5 - Service stacking
Figure 7.5 - Service stacking
The kubectl describe command gives you even more detail.

$ kubectl describe svc svc-test
Name:                     svc-test
Namespace:                default
Labels:                   <none>
Annotations:              <none>
Selector:                 chapter=services
Type:                     LoadBalancer
IP Family Policy:         SingleStack
IP Families:              IPv4
IP:                       10.10.19.33
IPs:                      10.10.19.33
LoadBalancer Ingress:     212.2.245.220
Port:                     <unset>  8080/TCP      <<---- Load balancer port
TargetPort:               8080/TCP               <<---- Application port in container
NodePort:                 <unset>  31755/TCP     <<---- NodePort on each cluster node
Endpoints:                10.1.0.200:8080,10.1.0.201:8080,10.1.0.202:8080 + 7 more...
Session Affinity:         None
External Traffic Policy:  Cluster
Events:                   <none>
The output repeats much of what you’ve already seen, and I’ve added comments to a few lines to clarify the different port-related values.

There are also a few additional lines of interest.

Endpoints is the list of healthy matching Pods from the Service’s EndpointSlice object.

Session Affinity allows you to control session stickiness — whether or not client connections always go to the same Pod. The default is None and forwards multiple connections from the same client to different Pods. You should try the ClientIP option if your app stores state in Pods and requires session stickiness. However, this is an anti-pattern as microservices apps should be designed for process disposability where clients can connect to any Pod.

External Traffic Policy dictates whether traffic hitting the Service will be load balanced across Pods on all cluster nodes or just Pods on the node the traffic arrives on. The default is Cluster, and it sends traffic to Pods on all cluster nodes but obscures source IP addresses. The other option is Local, which only sends traffic to Pods on the node the traffic arrives on but preserves source IPs.

If your cluster runs dual-stack networking, your output may also list IPv6 addresses.

Test if the Service works by pointing your browser to the value in the EXTERNAL-IP column on port 8080.

Figure 7.6
Figure 7.6
It works. Your app is running inside a container and listening on port 8080. You created a LoadBalancer Service that listens on port 8080 and forwards traffic to a NodePort Service on each cluster node, which, in turn, forwards it to a ClusterIP Service on port 8080. From there, it’s sent to a Pod hosting an app replica on port 8080.

Coming up next, you’ll do it all again but declaratively. But you’ll need to clean up first.

$ kubectl delete svc svc-test
service "svc-test" deleted
The declarative way
It’s time to do things the proper way — the Kubernetes way.

A Service manifest file
The following YAML is from the lb.yml file, and you’ll use it to deploy a LoadBalancer Service declaratively.

kind: Service
apiVersion: v1
metadata:
  name: svc-lb
spec:
  type: LoadBalancer
  ports:
  - port: 9000           <<---- Load balancer port
    targetPort: 8080     <<---- Application port inside container
  selector:
    chapter: services
Let’s step through it.

The first two lines tell Kubernetes to deploy a Service object based on the v1 schema.

The metadata block tells Kubernetes to name this Service svc-lb and register the name with the internal cluster DNS. You can also define custom labels and annotations here.

The spec section defines all the front-end and back-end details. This example tells Kubernetes to deploy a LoadBalancer Service that listens on port 9000 on the front end and sends traffic to Pods with the chapter=services label on port 8080.

Deploy it with the following command.

$ kubectl apply -f lb.yml
service/svc-lb created
Inspecting Services
Services are regular API resources, meaning you can inspect them with the usual kubectl get and kubectl describe commands.

$ kubectl get svc svc-lb
NAME       TYPE           CLUSTER-IP      EXTERNAL-IP     PORT(S)        
svc-lb     LoadBalancer   10.43.191.202   212.2.247.202   9000:30202/TCP 
If you cluster is in the cloud, your output will show <pending> in the EXTERNAL-IP column while your cloud platform provisions a load balancer and allocates it an IP address. Keep refreshing the command until an address appears.

The Service in the example is exposed to the internet via a cloud load balancer on 212.2.247.202. If you’re running a local Docker Desktop cluster, you’ll access it via your laptop’s localhost interface. If your Docker Desktop cluster shows a 172 IP address in the EXTERNAL-IP column, ignore it and use localhost on port 9000.

Once Kubernetes has created your Service, point your browser to the value in the EXTERNAL-IP column on port 9000 to make sure you can see the app. Remember to use localhost for a Docker Desktop cluster.

Let’s look at your Service’s EndpointSlices before cleaning up.

EndpointSlice objects
Earlier in the chapter, you learned that every Service gets one or more of its own EndpointSlice objects. These are where Kubernetes keeps its up-to-date list of healthy Pods matching the label selector, and you can inspect them with the usual kubectl commands.

The examples are from a cluster running dual-stack networking. Notice how two EndpointSlices exist — one for the IPv4 mappings and the other for IPv6. Your cluster may only have IPv4 mappings.

$ kubectl get endpointslices
NAME            ADDRESSTYPE   PORTS   ENDPOINTS                                       AGE
svc-lb-n7jg4    IPv4          8080    10.42.1.16,10.42.1.17,10.42.0.19  + 7 more...   2m1s
svc-lb-9s6sq    IPv6          8080    fd00:10:244:1::c,fd00:10:244:1::9 + 7 more...   2m1s

$ kubectl describe endpointslice svc-lb-n7jg4
Name:         svc-lb-n7jg4
Namespace:    default
Labels:       chapter=services
              endpointslice.kubernetes.io/managed-by=endpointslice-controller.k8s.io
              kubernetes.io/service-name=svc-lb
Annotations:  endpoints.kubernetes.io/last-change-trigger-time: 2024-01-01T18:13:40Z
AddressType:  IPv4
Ports:
  Name     Port  Protocol
  ----     ----  --------
  <unset>  8080  TCP
Endpoints:
  - Addresses:  10.42.1.16
    Conditions:
      Ready:    true
    Hostname:   <unset>
    TargetRef:  Pod/svc-lb-9d7b4cf9d-hnvbf
    NodeName:   k3d-tkb-agent-2
    Zone:       <unset>
  - Addresses:  10.42.1.17
<Snip>
Events:         <none>
The full command output has a block for each healthy Pod containing useful info. If a Service maps to more than 100 Pods, it will have more than one EndpointSlice.

Clean up
Run the following command to delete the Deployment and Service created in the examples. Kubernetes will automatically delete Endpoints and EndpointSlices when you delete their associated Service.

$ kubectl delete -f deploy.yml -f lb.yml
deployment.apps "svc-lb" deleted
service "svc-lb" deleted
Chapter Summary
In this chapter, you learned that Services provide reliable networking for Pods. They have a front end with a DNS name, IP address, and port that Kubernetes guarantees will never change. They also have a back-end that sends traffic to healthy Pods matching a label selector.

ClusterIP Services provide reliable networking on the internal Kubernetes network, NodePort Services expose a port on every cluster node, and LoadBalancer Services integrate with cloud platforms to create highly available internet-facing load balancers.

Finally, Services are first-class objects in the Kubernetes API and should be managed declaratively through version-controlled YAML files.


table of contents
search
Settings
Previous chapter
6: Kubernetes Deployments
Next chapter
8: Ingress
Table of contents collapsed
