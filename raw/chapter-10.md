Skip to Content
10: Service discovery deep dive
In this chapter, you’ll learn about service discovery, why it’s important, and how it’s implemented in Kubernetes. You’ll also learn some troubleshooting tips.

You’ll get the most from this chapter if you understand Kubernetes Services. If you don’t already know this, you should read Chapter 7 first.

I’ve split the chapter into the following sections:

Setting the scene
The Service registry
Service registration
Service discovery
Service discovery and Namespaces
Troubleshooting service discovery
Note: The word service has a lot of different meanings, so I’ve capitalized the first letter when referring to the Service resource in the Kubernetes API.

Setting the scene
Finding things on busy platforms like Kubernetes is hard, service discovery makes it easy.

Most Kubernetes clusters run hundreds or thousands of microservices apps. Most of them behind their own Service and get their own reliable names and IPs. When one app talks to another, it actually talks to the other app’s Service. For the remainder of this chapter, any time we say an app needs to find or talk to another app, we mean it needs to find or talk to the Service in front of the other app.

Figure 10.1 shows app-a talking to app-b via its Service.

Figure 10.1 - Apps connect via Services
Figure 10.1 - Apps connect via Services
Apps need two things to be able to send requests to other apps:

A way to know the name of the other app (the name of its Service)
A way to convert the name into an IP address
Developers are responsible for step 1 — ensuring apps know the names of the other apps and microservices they consume. Kubernetes is responsible for step 2 — converting names to IP addresses.

Figure 10.2 is a high-level view of the overall process with four main steps:

Step 1: The developer configures app-a to talk to app-b
Step 2: app-a asks Kubernetes for the IP address of app-b
Step 3: Kubernetes returns the IP address
Step 4: app-a sends requests to app-b’s IP address
Figure 10.2
Figure 10.2
Step 1 is the only manual step. Kubernetes handles steps 2, 3, and 4 automatically.

Let’s take a closer look.

The service registry
The job of a service registry is to maintain a list of Service names and their associated IP addresses.

Every Kubernetes cluster has a built-in cluster DNS that it uses as its service registry. It’s a Kubernetes-native application running on the control plane of every Kubernetes cluster as two or more Pods managed by a Deployment and fronted by its own Service. The Deployment is usually called coredns or kube-dns, and the Service is always called kube-dns.

Figure 10.3 shows the Kubernetes service registry architecture. It also shows a Service registering its name and IP and two containers using it for service discovery. As you’ll find out later, Kubernetes makes service registration and service discovery automatic.

Figure 10.3 - Cluster DNS architecture
Figure 10.3 - Cluster DNS architecture
The following commands show the Pods, Deployment, and Service that comprise the cluster DNS (service registry). They match what is in Figure 10.3, and you can run the commands on your own cluster.

This command lists the Pods running the cluster DNS. They normally use the registry.k8s.io/coredns/coredns image, but some other clusters use a different image and may call the Pods and Deployment kube-dns instead of coredns.

$ kubectl get pods -n kube-system -l k8s-app=kube-dns
NAME                       READY   STATUS    RESTARTS   AGE
coredns-76f75df574-d6nn5   1/1     Running   0          13d
coredns-76f75df574-n7qzk   1/1     Running   0          13d
The next command shows the Deployment that manages the Pods. It ensures there is always the correct number of cluster DNS Pods.

$ kubectl get deploy -n kube-system -l k8s-app=kube-dns
NAME        READY     UP-TO-DATE     AVAILABLE     AGE
coredns     2/2       2              2             13d
This final command shows the Service in front of the cluster DNS Pods. It’s always called kube-dns, but it gets a different IP on each cluster. As you’ll find out later, Kubernetes automatically configures every container to use this IP for service discovery.

$ kubectl get svc -n kube-system -l k8s-app=kube-dns
NAME       TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)                  AGE
kube-dns   ClusterIP   10.96.0.10     <none>        53/UDP,53/TCP,9153/TCP   13d
In summary, every Kubernetes cluster runs an internal cluster DNS service that it uses as its service registry. It maps every Service’s name and IP, and runs on the control plane as a set of Pods managed by a Deployment and fronted by a Service.

Let’s switch our focus to service registration.

Service registration
The most important thing to know about service registration on Kubernetes is that it’s automatic!

At a high level, you develop applications and put them behind Services for reliable names and IPs. Kubernetes automatically registers these Service names and IPs with the service registry.

From now on, we’ll call the service registry the cluster DNS.

There are three steps in service registration:

Give the Service a name
Assign the Service an IP
Register the name and IP with the cluster DNS
Developers are responsible for point one. Kubernetes handles points two and three.

Consider a quick example.

You’re developing a new web app that other apps will connect to using the valkyrie-web name. To accomplish this, you deploy the app behind a Kubernetes Service called valkyrie-web. Kubernetes ensures the Service name is unique and automatically assigns it an IP address (ClusterIP). It also registers the name and IP in the cluster DNS.

The registration process is automatic because the cluster DNS is a Kubernetes-native application that watches the API server for new Services. Whenever it sees a new one, it automatically registers its name and IP. This means your applications don’t need any service registration logic — you put them behind a Service, and the cluster DNS does everything else.

Figure 10.4 summarises the service registration process and adds some of the details from Chapter 7.

Figure 10.4 - Service registration flow
Figure 10.4 - Service registration flow
Let’s step through the diagram.

You deploy a new app defined in a YAML file describing a Deployment and a Service. You post it to Kubernetes, where it’s authenticated and authorized. Kubernetes allocates a ClusterIP to the Service and persists its configuration to the cluster store. The cluster DNS observes the new Service and registers the appropriate DNS A and SRV records. Associated EndpointSlice objects are created to hold the list of healthy Pod IPs that match the Service’s label selector. The kube-proxy process on every cluster node observes the new objects and creates local routing rules (IPVS) so that requests to the Service’s ClusterIP get routed to Pods.

In summary, every app sits behind a Service for a reliable name and IP. The cluster DNS watches the API server for new Service objects and automatically registers their names and IPs.

Let’s look at service discovery.

Service discovery
Applications talk to other applications via names. However, they need to convert these names into IP addresses, which is where service discovery comes into play.

Assume you have a cluster with two apps called enterprise and cerritos. The enterprise app sits behind a ClusterIP Service called ent, and the cerritos app sits behind one called cer. Kubernetes automatically assigned both Services a ClusterIP, and the cluster DNS automatically registered them. Right now, things are as follows.

App	Service name	ClusterIP
Enterprise	ent	192.168.201.240
Cerritos	cer	192.168.200.217
Figure 10.5
Figure 10.5
If either of the apps wants to connect to the other, it needs to know its name and how to convert it to an IP.

Developers are responsible for coding applications with the names of the applications they consume, but Kubernetes provides the mechanisms to convert the names to IPs.

Consider a quick example where the enterprise app from Figure 10.5 needs to send requests to the cerritos app. For this to work, the enterprise app developers need to configure it with the name of the Service in front of the cerritos app. Assuming they did this, the enterprise app will send requests to cer. However, it needs a way to convert cer into an IP address. Fortunately, Kubernetes configures every container to ask the cluster DNS to convert names to IPs. This means the enterprise app containers will send the cer name to the cluster DNS, and the cluster DNS will return the ClusterIP. The app then sends requests to the IP.

As previously mentioned, Kubernetes configures every container to use the cluster DNS for service discovery. It does this by automatically configuring every container’s /etc/resolv.conf file with the IP address of the cluster DNS Service. It also adds search domains to append to unqualified names.

An unqualified name is a short name such as ent. Appending a search domain converts it to a fully qualified domain name (FQDN) such as ent.default.svc.cluster.local.

The following extract is from a container’s /etc/resolv.conf file configured to send service discovery requests (DNS queries) to the cluster DNS at 10.96.0.10. It also lists three search domains to append to unqualified names.

$ cat /etc/resolv.conf 
search default.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10           <<---- ClusterIP of internal cluster DNS
options ndots:5
The following command proves the nameserver IP in the previous /etc/resolv.conf file matches the IP address of the cluster DNS (the kube-dns Service).

$ kubectl get svc -n kube-system -l k8s-app=kube-dns
NAME       TYPE        CLUSTER-IP      PORT(S)                  AGE
kube-dns   ClusterIP   10.96.0.10      53/UDP,53/TCP,9153/TCP   13d
Now that you know the basics, let’s see how the enterprise app from Figure 10.5 sends requests to the cerritos app.

First, the enterprise app needs to know the name of the cer Service fronting the cerritos app. That’s the job of the enterprise app developers. Assuming it knows the name, it sends requests to cer. The network stack of the app’s container automatically sends the name to the cluster DNS, asking for the associated IP. The cluster DNS responds with the ClusterIP of the cer Service, and the request gets sent to the IP. However, ClusterIPs are virtual IPs that require additional magic to ensure requests eventually reach the cerritos Pods.

ClusterIP routing
ClusterIPs are on a special network called the service network and there are no routes to it! This means every container sends ClusterIP traffic to its default gateway.

Terminology: A default gateway is where a system sends network traffic when it doesn’t know where else to send it. Default gateways then forward traffic to another device, hoping the next device will know where to send it.

The container’s default gateway sends the traffic to the node it’s running on. The node doesn’t have a route to the service network either, so it sends it to its own default gateway. This causes the node’s kernel to process the traffic, which is where the magic happens…

Every Kubernetes node runs a system service called kube-proxy that implements a controller watching the API server for new Services and EndpointSlice objects. Whenever it sees them, it creates rules in the kernel to intercept ClusterIP traffic and forward it to individual Pod IPs.

This means that every time a node’s kernel processes traffic for a ClusterIP, it redirects it to the IP of a healthy Pod matching the Service’s label selector.

Summarising service discovery
Let’s quickly summarise the service discovery process with the help of the flow diagram in Figure 10.6.

Figure 10.6
Figure 10.6
The enterprise app sends the request to the cer Service. The container converts this name to an IP address by sending it to the IP address of the cluster DNS configured in its /etc/resolv.conf file. The cluster DNS returns the Service’s ClusterIP, and the container sends the traffic to that IP address. However, ClusterIPs are on the service network and the container doesn’t have a route to it. So, it sends it to its default gateway, which forwards it to the node it’s running on. The node doesn’t have a route either, so it sends it to its own default gateway. This causes the node’s kernel to process the request and redirect it to the IP address of a Pod that matches the Service’s label selector.

Service discovery and Namespaces
Every Kubernetes object gets a name in the cluster address space, and you can partition the address space with Namespaces.

The cluster address space is a DNS domain that we usually call the cluster domain. On most clusters, it’s cluster.local, and object names have to be unique within it. For example, you can only have one Service called cer in the default Namespace, and its name will be cer.default.svc.cluster.local.

Long names like this are called fully qualified domain names (FQDN), and the format is <object-name>.<namespace>.svc.cluster.local.

You can use Namespaces to partition the address space below the cluster domain. For example, if your cluster has two Namespaces called dev and prod, the address space will be partitioned as follows:

dev: <service-name>.dev.svc.cluster.local
prod: <service-name>.prod.svc.cluster.local
Object names must be unique within a Namespace but not across Namespaces. As a quick example, Figure 10.7 shows a single cluster divided into two Namespaces called dev and prod. Both Namespaces have identical instances of the cer Service. This makes Namespaces an option for running parallel dev and prod configurations on the same cluster.

Figure 10.7 - Identical configurations in different Namespaces
Figure 10.7 - Identical configurations in different Namespaces
Apps can use short names such as ent and cer to connect to Services in the local Namespace, but they must use fully qualified domain names to connect to Services in remote Namespaces.

Let’s walk through a quick example.

Service discovery example
The following YAML is from the sd-example.yml file in the service-discovery folder of the book’s GitHub repo. It deploys the configuration from Figure 10.8.

The file defines two Namespaces, two Deployments, two Services, and a standalone jump Pod. The Deployments and Services have identical names as they’re in different Namespaces. The jump Pod is only deployed to the dev Namespace. I’ve snipped the YAML in the book.

Figure 10.8
Figure 10.8
apiVersion: v1
kind: Namespace
metadata:
  name: dev
---
apiVersion: v1
kind: Namespace
metadata:
  name: prod
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: enterprise
  namespace: dev
spec:
  replicas: 2
  template:
    spec:
      containers:
      - image: nigelpoulton/k8sbook:text-dev
        name: enterprise-ctr
        ports:
        - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: enterprise
  namespace: prod
spec:
  replicas: 2
  template:
    spec:
      containers:
      - image: nigelpoulton/k8sbook:text-prod
        name: enterprise-ctr
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: ent
  namespace: dev
spec:
  selector:
    app: enterprise
  ports:
    - port: 8080
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  name: ent
  namespace: prod
spec:
  selector:
    app: enterprise
  ports:
    - port: 8080
  type: ClusterIP
---
apiVersion: v1
kind: Pod
metadata:
  name: jump
  namespace: dev
spec:
  terminationGracePeriodSeconds: 5
  containers:
  - name: jump
    image: ubuntu
    tty: true
    stdin: true
Run the following command to deploy everything. You need to run the command from within the service-discovery directory.

$ kubectl apply -f sd-example.yml
namespace/dev created
namespace/prod created
deployment.apps/enterprise created
deployment.apps/enterprise created
service/ent created
service/ent created
pod/jump-pod created
Check that Kubernetes deployed everything correctly. I’ve trimmed the outputs to fit the page, and I’m only showing some of the objects.

$ kubectl get all --namespace dev
NAME                         READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/enterprise   2/2     2            2           51s

NAME          TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
service/ent   ClusterIP   10.96.138.186   <none>        8080/TCP   51s
<Snip>

$ kubectl get all --namespace prod
NAME                         READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/enterprise   2/2     2            2           1m24s

NAME          TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)    AGE
service/ent   ClusterIP   10.96.147.32   <none>        8080/TCP   1m25s
<snip>
You have two Namespaces called dev and prod, and each has an instance of the enterprise app and an instance of the ent Service. The dev Namespace also has a standalone Pod called jump.

Let’s see how service discovery works within a Namespace and across Namespaces.

You’ll do all of the following:

Log on to the jump Pod in the dev Namespace
Check its /etc/resolv.conf file
Connect to the ent Service in the local dev Namespace
Connect to the ent Service in the remote prod Namespace
The version of the app in each Namespace returns a different message so you can be sure you’ve connected to the right one.

Open an interactive exec session to the jump Pod’s container. Your terminal prompt will change to indicate you’re attached to the container.

$ kubectl exec -it jump --namespace dev -- bash 
root@jump:/#
Inspect the contents of the container’s /etc/resolv.conf file. It should have the IP address of your cluster’s kube-dns Service as well as the search domain for the dev Namespace (dev.svc.cluster.local)

# cat /etc/resolv.conf
search dev.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10
options ndots:5
Install the curl utility.

# apt-get update && apt-get install curl -y
<snip>
Run the following curl command to connect to the ent Service on port 8080. This will connect you to the instance in the local dev Namespace.

# curl ent:8080
Hello from the DEV Namespace!
Hostname: enterprise-76fc64bd9-lvzsn
The Hello from the DEV Namespace response proves the connection reached the instance in the dev Namespace.

The container automatically appended dev.svc.cluster.local to the name and sent the query to the cluster DNS specified in its /etc/resolv.conf file. The cluster DNS returned the ClusterIP for the ent Service in the local dev Namespace and the app sent the traffic to that IP address. En route to the node’s default gateway, the traffic caused a trap in the node’s kernel, resulting in the kernel redirecting it to a Pod hosting the app.

Run another curl command, but this time append the domain name of the prod Namespace. This will cause the cluster DNS to return the ClusterIP of the Service in the prod Namespace.

# curl ent.prod.svc.cluster.local:8080
Hello from the PROD Namespace!
Hostname: enterprise-5cfcd578d7-nvzlp
This time, the response comes from a Pod in the prod Namespace.

The tests prove that Kubernetes automatically resolves short names to the local Namespace, and that you need to specify FQDNs to connect across Namespaces.

Type exit to detach your terminal from the jump Pod.

Troubleshooting service discovery
Kubernetes makes service registration and service discovery automatic. However, a lot is happening behind the scenes, and knowing how to inspect and restart things is helpful.

As mentioned, Kubernetes uses the cluster DNS as its built-in service registry. This runs as one or more managed Pods with a Service object providing a stable endpoint. The important components are:

Pods: Managed by the coredns Deployment
Service: A ClusterIP Service called kube-dns listening on port 53 TCP/UDP
EndpointSlice objects: Names pre-fixed with kube-dns
All of these objects are in the kube-system Namespace and tagged with the k8s-app=kube-dns label to help you find them.

Check that the coredns Deployment and its Pods are running.

$ kubectl get deploy -n kube-system -l k8s-app=kube-dns
NAME      READY   UP-TO-DATE   AVAILABLE   AGE
coredns   2/2     2            2           14d

$ kubectl get pods -n kube-system -l k8s-app=kube-dns
NAME                       READY   STATUS    RESTARTS   AGE
coredns-76f75df574-6q7k7   1/1     Running   0          14d
coredns-76f75df574-krnr7   1/1     Running   0          14d
Check the logs from each of the coredns Pods. The following output is typical of a working DNS Pod. You’ll need to use the name of a Pod from your environment.

$ kubectl logs coredns-76f75df574-n7qzk -n kube-system
.:53
[INFO] plugin/reload: Running configuration SHA512 = 591cf328cccc12b...
CoreDNS-1.11.1
linux/arm64, go1.20.7, ae2bbc2
Now check the Service and EndpointSlice objects. The output should show the service is up, has an IP address in the ClusterIP field, and is listening on port 53 TCP/UDP.

The ClusterIP address for the kube-dns Service must match the IP address in the /etc/resolv.conf files of all containers on the cluster. If it doesn’t, containers will send DNS requests to the wrong place.

$ kubectl get svc kube-dns -n kube-system
NAME       TYPE        CLUSTER-IP    EXTERNAL-IP   PORT(S)                  AGE
kube-dns   ClusterIP   10.96.0.10    <none>        53/UDP,53/TCP,9153/TCP   14d
The associated kube-dns EndpointSlice object should also be up and have the IP addresses of the coredns Pods listening on port 53.

$ kubectl get endpointslice -n kube-system -l k8s-app=kube-dns
NAME             ADDRESSTYPE   PORTS        ENDPOINTS                AGE
kube-dns-jb72g   IPv4          9153,53,53   10.244.1.9,10.244.1.14   14d
Once you’ve verified the fundamental DNS components are up and working, you can perform more detailed and in-depth troubleshooting. Here are some simple tips.

Start a troubleshooting Pod with your favorite networking tools installed (ping, traceroute, curl, dig, nslookup, etc.). The registry.k8s.io/e2e-test-images/jessie-dnsutils image is a popular choice if you don’t have your own custom image. You can go to explore.ggcr.dev to browse the registry.k8s.io/e2e-test-images repo for newer versions.

The following command starts a new standalone Pod called dnsutils and will connect your terminal. It’s based on the image just mentioned and may take a few seconds to start.

$ kubectl run -it dnsutils \
  --image registry.k8s.io/e2e-test-images/jessie-dnsutils:1.7
A common way to test if the cluster DNS is working is to use nslookup to resolve the kubernetes Service. This runs on every cluster and exposes the API server to all Pods. The query should return the name kubernetes.default.svc.cluster.local and its IP address.

# nslookup kubernetes
Server:    10.96.0.10
Address:   10.96.0.10#53
Name:      kubernetes.default.svc.cluster.local
Address:   10.96.0.1
The first two lines should show the IP address of your cluster DNS. The last two should show the FQDN of the kubernetes Service and its ClusterIP. You can verify the ClusterIP of the kubernetes Service by running a kubectl get svc kubernetes command.

Errors such as nslookup: can’t resolve kubernetes are indicators that DNS isn’t working. A possible solution is to delete the coredns Pods. This will cause the coredns Deployment to recreate them.

The following command deletes the DNS Pods. If you’re still logged on to the dnsutils Pod, you’ll need to type exit to disconnect before running the command.

$ kubectl delete pod -n kube-system -l k8s-app=kube-dns
pod "coredns-76f75df574-d6nn5" deleted
pod "coredns-76f75df574-n7qzk" deleted
Run a kubectl get pods -n kube-system -l k8s-app=kube-dns to verify they’ve restarted and then test DNS again.

Clean up
Run the following commands to clean up.

$ kubectl delete pod dnsutils

$ kubectl delete -f sd-example.yml
Chapter summary
In this chapter, you learned that Kubernetes uses the internal cluster DNS for service registration and service discovery. It’s a Kubernetes-native application that watches the API server for newly created Service objects and automatically registers their names and IPs. The kubelet on each node also configures all containers to use the cluster DNS for service discovery.

The cluster DNS resolves Service names to ClusterIPs. These are stable virtual IPs on a special network called the service network. There are no routes to this network, but the kube-proxy configures all cluster nodes to redirect ClusterIP traffic to Pod IPs on the Pod network.


table of contents
search
Settings
Previous chapter
9: Wasm on Kubernetes
Next chapter
11: Kubernetes storage
Table of contents collapsed
