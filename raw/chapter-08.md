Skip to Content
8: Ingress
Ingress is all about accessing multiple web applications through a single LoadBalancer Service.

You’ll need a working knowledge of Kubernetes Services before reading this chapter. If you don’t already have this, consider going back and reading the previous chapter first.

I’ve divided this chapter into the following three sections:

Setting the scene for Ingress
Ingress architecture
Hands-on with Ingress
We’ll capitalize Ingress as it’s a resource in the Kubernetes API. We’ll also use the terms LoadBalancer and load balancer as follows:

LoadBalancer refers to a Kubernetes Service object of type=LoadBalancer
load balancer refers to one of your cloud’s internet-facing load balancers
As an example, when you create a Kubernetes LoadBalancer Service, Kubernetes talks to your cloud platform and provisions a cloud load balancer.

Ingress was promoted to generally available (GA) in Kubernetes version 1.19 after being in beta for over 15 releases. During the 3+ years it was in alpha and beta, service meshes increased in popularity, and there’s now some overlap in functionality. As a result, if you’re planning to deploy a service mesh, you may not need Ingress.

Setting the Scene for Ingress
The previous chapter showed you how to use NodePort and LoadBalancer Services to expose applications to external clients. However, both have limitations.

NodePort Services only work on high port numbers, and clients need to keep track of node IP addresses. LoadBalancer Services fix this but only provide a one-to-one mapping between internal Services and cloud load balancers. This means a cluster with 25 internet-facing apps will need 25 cloud load balancers, and cloud load balancers cost money! Your cloud may also limit the number of load balancers you can create.

Ingress fixes this by letting you expose multiple Services through a single cloud load balancer.

It does this by creating a single cloud load balancer on port 80 or 443 and using host-based and path-based routing to map connections to different Services on the cluster. We’ll explain this jargon soon.

Ingress architecture
Ingress is defined in the networking.k8s.io/v1 API sub-group, and it requires the usual two constructs:

A resource
A controller
The resource defines the routing rules, and the controller implements them.

However, Kubernetes doesn’t have a built-in Ingress controller, meaning you need to install one. This differs from Deployments, ReplicaSets, Services, and most other resources that have built-in pre-configured controllers. However, some cloud platforms simplify this by allowing you to install one when you build the cluster. We’ll show you how to install the popular NGINX Ingress controller in the hands-on section.

Once you have an Ingress controller, you deploy Ingress resources with rules telling the controller how to route requests.

On the topic of routing, Ingress operates at layer 7 of the OSI model, also known as the application layer. This means it can inspect HTTP headers and forward traffic based on hostnames and paths.

Note: The OSI model is the industry-standard reference model for TCP/IP networking and has seven layers numbered 1-7. The lowest layers are concerned with signaling and electronics, the middle layers deal with reliability through acknowledgements and retries, and the higher layers add services for things like HTTP. Ingress operates at layer 7, also known as the application layer, and implements HTTP intelligence.

The following table shows how hostnames and paths can route to backend ClusterIP Services.

Host-based example	Path-based example	Backend K8s Service
shield.mcu.com	mcu.com/shield	shield
hydra.mcu.com	mcu.com/hydra	hydra
Figure 8.1 shows two requests hitting the same cloud load balancer. Behind the scenes, DNS name resolution maps both hostnames to the same load balancer IP. An Ingress controller watches the load balancer and routes the requests based on the hostnames in the HTTP headers. In this example, it routes shield.mcu.com to the shield ClusterIP Service, and hydra.mcu.com to the hydra Service. The logic is the same for path-based routing, and we’ll see both in the hands-on section.

Figure 8.1 Host-based routing
Figure 8.1 Host-based routing
In summary, a single Ingress can expose multiple Kubernetes Services through a single cloud load balancer. You create and deploy Ingress resources that tell your Ingress controller how to route requests based on hostnames and paths in request headers. You might have to install an Ingress controller manually.

Let’s see it in action.

Hands-on with Ingress
This section doesn’t work with the multi-node Kubernetes cluster that ships with Docker Desktop v4.38 or earlier. It may work with future releases. I recommend you work with a cloud-based cluster such as the LKE cluster we show you how to build in Chapter 3.

You’ll need both of these if you’re following along:

A Kubernetes cluster
A clone of the book’s GitHub repo
If you don’t already have it, clone the book’s GitHub repo and switch to the 2025 branch.

$ git clone https://github.com/nigelpoulton/TKB.git
Cloning from...

$ cd TKB

$ git fetch origin

$ git checkout -b 2025 origin/2025
Change into the ingress directory and run all commands from there.

You’ll complete all of the following steps:

Install the NGINX Ingress controller
Configure an Ingress class
Deploy a sample app
Configure an Ingress object
Inspect the Ingress object
Configure DNS name resolution
Test the Ingress
Install the NGINX Ingress controller
You’ll install the NGINX controller from a YAML file hosted in the Kubernetes GitHub repo. It installs a bunch of Kubernetes constructs, including a Namespace, ServiceAccounts, ConfigMaps, Roles, RoleBindings, and more.

Install it with the following command. I’ve split the command over two lines because the URL is so long. You’ll have to run it on a single line.

$ kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/
controller-v1.12.0/deploy/static/provider/cloud/deploy.yaml

namespace/ingress-nginx created
serviceaccount/ingress-nginx created
<Snip>
Run the following command to check the ingress-nginx Namespace and ensure the controller Pod is running. It may take a few seconds for it to enter the running phase, and Windows users will need to replace the backslash (\ ) at the end of the first line with a backtick (`).

$ kubectl get pods -n ingress-nginx \
  -l app.kubernetes.io/name=ingress-nginx

NAME                                        READY   STATUS      RESTARTS   AGE
ingress-nginx-admission-create-789md        0/1     Completed   0          25s
ingress-nginx-admission-patch-tc4cl         0/1     Completed   0          25s
ingress-nginx-controller-7445ddc6c4-csf98   0/1     Running     0          26s
Don’t worry about the Completed Pods. These were short-lived Pods that initialized the environment.

Once the controller Pod is running, you have an NGINX Ingress controller and are ready to create some Ingress objects. However, before doing that, let’s look at Ingress classes.

Ingress classes
Ingress classes allow you to run multiple Ingress controllers on a single cluster. The process is simple:

You map each Ingress controller to its own Ingress class
When you create Ingress objects, you assign them to an Ingress class
If you’re following along, you’ll have at least one Ingress class called nginx. This was created when you installed the NGINX controller.

$ kubectl get ingressclass
NAME    CONTROLLER             PARAMETERS   AGE
nginx   k8s.io/ingress-nginx   <none>       2m25s
You’ll have multiple classes if your cluster already had an Ingress controller.

Take a closer look at the nginx Ingress class with the following command. There is no shortname for Ingress class objects.

$ kubectl describe ingressclass nginx
Name:         nginx
Labels:       app.kubernetes.io/component=controller
              app.kubernetes.io/instance=ingress-nginx
              app.kubernetes.io/name=ingress-nginx
              app.kubernetes.io/part-of=ingress-nginx
              app.kubernetes.io/version=1.9.4
Annotations:  <none>
Controller:   k8s.io/ingress-nginx
Events:       <none>
With an Ingress controller and Ingress class in place, you’re ready to deploy and configure an Ingress object.

Configure host-based and path-based routing
This section deploys two apps and a single Ingress object. The Ingress will route traffic to both apps via a single load balancer. This can be a cloud-based load balancer or localhost on some local clusters.

You’ll complete all the following steps:

Deploy an app called shield and front it with a ClusterIP Service (backend) called svc-shield
Deploy an app called hydra and front it with a ClusterIP Service (backend) called svc-hydra
Deploy an Ingress object that creates a single load balancer and routing rules for the following hostnames and paths
Host-based: shield.mcu.com >> svc-shield
Host-based: hydra.mcu.com >> svc-hydra
Path-based: mcu.com/shield >> svc-shield
Path-based: mcu.com/hydra >> svc-hydra
Configure DNS name resolution to that shield.mcu.com, hydra.mcu.com, and mcu.com point to your load balancer
Figure 8.2 shows the overall architecture using host-based and path-based routing.

Figure 8.2 Host-based routing
Figure 8.2 Host-based routing
Traffic flow to the shield Pods will be as follows:

Client sends traffic to shield.mcu.com or mcu.com/shield
DNS name resolution ensures the traffic goes to the cloud load balancer
Ingress controller reads the HTTP headers and finds the hostname (shield.mcu.com) or path (mcu.com/shield)
Ingress rule triggers and routes the traffic to the svc-shield ClusterIP backend Service
The ClusterIP Service ensures the traffic reaches a shield Pod
Deploy the sample environment
This section deploys the two apps and ClusterIP Services that the Ingress will route traffic to.

The lab is defined in the app.yml file in the ingress folder and comprises the following.

An app called shield, listening on port 8080, and fronted by a ClusterIP Service called svc-shield
Another app called hydra, also listening on port 8080, and fronted by a ClusterIP Service called svc-hydra
Deploy it with the following command.

$ kubectl apply -f app.yml
service/svc-shield created
service/svc-hydra created
pod/shield created
pod/hydra created
Once the Pods and Services are up and running, proceed to the next section to create the Ingress.

Create the Ingress object
You’ll deploy the ingress object defined in the ig-all.yml file. It describes an Ingress object called mcu-all with four rules.

1  apiVersion: networking.k8s.io/v1
2  kind: Ingress
3  metadata:
4    name: mcu-all
5    annotations:
6      nginx.ingress.kubernetes.io/rewrite-target: /
7  spec:
8    ingressClassName: nginx
9    rules:
10   - host: shield.mcu.com     ----┐ 
11     http:                        |
12       paths:                     |
13       - path: /                  |
14         pathType: Prefix         | Host rule block for shield app
15         backend:                 |
16           service:               |
17             name: svc-shield     |
18             port:                |
19               number: 8080   ----┘
20   - host: hydra.mcu.com      ----┐
21     http:                        |
22       paths:                     |
23       - path: /                  |
24         pathType: Prefix         | Host rule block for hydra app
25         backend:                 |
26           service:               |
27             name: svc-hydra      |
28             port:                |
29               number: 8080   ----┘
30   - host: mcu.com
31     http:
32       paths:
33       - path: /shield        ----┐
34         pathType: Prefix         |
35         backend:                 |
36           service:               |  Path rule block for shield app
37             name: svc-shield     |
38             port:                |
39               number: 8080   ----┘
40       - path: /hydra         ----┐ 
41         pathType: Prefix         |
42         backend:                 |
43           service:               | Path rule block for shield app
44             name: svc-hydra      |
45             port:                |
46               number: 8080   ----┘ 
Let’s step through it.

The first two lines tell Kubernetes to deploy an Ingress object based on the schema in the networking.k8s.io/v1 API.

Line four calls the Ingress mcu-all.

The annotation on line six tells the controller to make a best-effort attempt to rewrite paths to the path your app expects. This example rewrites incoming paths to “/”. For example, traffic hitting the load balancer on the mcu.com/shield path will have the path rewritten to mcu.com/. You’ll see an example shortly. This annotation is specific to the NGINX Ingress controller, and you’ll have to comment it out if you’re using a different controller.

The spec.ingressClassName field on line eight tells Kubernetes this Ingress object needs to be managed by the NGINX Ingress controller you installed earlier. You’ll have to change this line, or comment it out, if you’re using a different Ingress controller.

The file contains four rules:

Lines 10-19 define a host-based rule for traffic arriving on shield.mcu.com
Lines 20-29 define a host-based rule for traffic arriving on hydra.mcu.com
Lines 30-39 define a path-based rule for traffic arriving on mcu.com/shield
Lines 40-49 define a path-based rule for traffic arriving on mcu.com/hydra
Let’s look at one of the host-based rules and then a path-based rule.

The following host-based rule triggers on traffic arriving via shield.mcu.com at the root “/” path and forwards it to the ClusterIP back-end Service called svc-shield on port 8080.

- host: shield.mcu.com            <<---- Traffic arriving via this hostname
  http:
    paths:
    - path: /                     <<---- Arriving at root (no subpath specified)
      pathType: Prefix
      backend:                    <<---- The next five lines send traffic to an
        service:                  <<---- existing "backend" ClusterIP Service
          name: svc-shield        <<---- called "svc-shield"
          port:                   <<---- that's listening on 
            number: 8080          <<---- port 8080
The following path-based rule triggers when traffic arrives on mcu.com/shield. It gets routed to the same svc-shield back-end Service on the same port.

  - host: mcu.com                 <<---- Traffic arriving via this hostname
    http:
      paths:
      - path: /shield             <<---- Arriving on this subpath
        pathType: Prefix
        backend:                  <<---- The next five lines send traffic to an 
          service:                <<---- existing "backend" ClusterIP Service
            name: svc-shield      <<---- called "svc-shield"
            port:                 <<---- that's listening on 
              number: 8080        <<---- port 8080
Deploy the Ingress object with the following command.

$ kubectl apply -f ig-all.yml 
ingress.networking.k8s.io/mcu-all created
Inspecting Ingress objects
List all Ingress objects in the default Namespace. If your cluster is on a cloud, it can take a minute or so to get an ADDRESS while the cloud provisions the load balancer.

$ kubectl get ing
NAME      CLASS   HOSTS                                  ADDRESS          PORTS
mcu-all   nginx   shield.mcu.com,hydra.mcu.com,mcu.com   212.2.246.150    80
The CLASS field shows which Ingress class is handling this set of rules. It may show as <None> if you only have one Ingress controller and didn’t configure classes. The HOSTS field is a list of hostnames the Ingress will handle traffic for. The ADDRESS field is the load balancer endpoint. If you’re on a cloud, it will be a public IP or public DNS name. If you’re on a local cluster, it’ll probably be localhost. The PORTS field can be 80 or 443.

On the topic of ports, Ingress only supports HTTP and HTTPS.

Describe the Ingress. I’ve trimmed the output to fit the page.

$ kubectl describe ing mcu-all
Name:             mcu-all
Namespace:        default
Address:          212.2.246.150
Ingress Class:    nginx
Default backend:  <default>
Rules:
  Host            Path      Backends
  ----            ----      --------
  shield.mcu.com  /         svc-shield:8080 (10.36.1.5:8080)
  hydra.mcu.com   /         svc-hydra:8080 (10.36.0.7:8080)
  mcu.com         /shield   svc-shield:8080 (10.36.1.5:8080)
                  /hydra    svc-hydra:8080 (10.36.0.7:8080)
Annotations:      nginx.ingress.kubernetes.io/rewrite-target: /
Events:           <none>
  Type    Reason  Age                From                      Message
  ----    ------  ----               ----                      -------
  Normal  Sync    27s (x2 over 28s)  nginx-ingress-controller  Scheduled for sync
Let’s step through the output.

The Address line is the IP or DNS name of the load balancer created by the Ingress. It might be localhost on local clusters.

Default backend is where the controller sends traffic arriving on a hostname or path it doesn’t have a route for. Not all Ingress controllers implement a default backend.

The Rules section defines the mappings between hosts, paths, and backends. Remember that backends are usually ClusterIP Services that send traffic to Pods.

You can use annotations to define controller-specific features and integrations with your cloud back end. This example tells the controller to rewrite all paths so they look like they arrived on root “/”. This is a best-effort approach, and as you’ll see later, it doesn’t work with all apps.

At this point, your load balancer is created. You can probably view it through your cloud console if you’re on a cloud platform. Figure 8.3 shows how it looks on the Google Cloud back end if your cluster is on Google Kubernetes Engine (GKE).

Figure 8.3 Cloud back-end load balancer configuration
Figure 8.3 Cloud back-end load balancer configuration
If you’ve been following along, you’ll have all of the following:

Two apps and associated ClusterIP Services
Load balancer (cloud-based or localhost)
Ingress (controller and resource) configured to route traffic
The only thing left to configure is DNS name resolution so that shield.mcu.com, hydra.mcu.com and mcu.com all send traffic to the load balancer.

Configure DNS name resolution
In the real world, you’ll configure your internal DNS or internet DNS to point hostnames to the Ingress load balancer. How you do this varies depending on your environment and who provides your internet DNS.

If you’re following along, the easiest thing to do is edit the hosts file on your local computer and map the hostnames to the Ingress load balancer.

On Mac and Linux, this file is /etc/hosts, and you’ll need root permissions to edit it. On Windows, it’s C:\Windows\System32\drivers\etc\hosts, and you’ll need to open it as an administrator.

Windows users will need to open notepad.exe as an administrator and then open the hosts file in C:\Windows\System32\drivers\etc. Make sure the open dialog window is set to open All files (.).

Create three new lines mapping shield.mcu.com, hydra.mcu.com, and mcu.com to the IP of the load balancer. Use the IP from the output of a kubectl get ing mcu-all command. If you’re using a local cluster and yours says localhost, use the 127.0.0.1 IP address.

$ sudo vi /etc/hosts

# Host Database
<Snip>
212.2.246.150 shield.mcu.com
212.2.246.150 hydra.mcu.com
212.2.246.150 mcu.com
Remember to save your changes.

With this done, any traffic you send to shield.mcu.com, hydra.mcu.com, or mcu.com will be sent to the Ingress load balancer.

Test the Ingress
Open a web browser and try the following URLs:

shield.mcu.com
hydra.mcu.com
mcu.com
Figure 8.4 shows the overall architecture and traffic flow. Traffic hits the load balancer that Kubernetes automatically created when you deployed the Ingress. The traffic arrives on port 80 and the Ingress sends it to an internal ClusterIP Service based on the hostname in the headers. Traffic for shield.mcu.com goes to the svc-shield Service, and traffic for hydra.mcu.com goes to the svc-hydra Service.

Figure 8.4 - host-based routing
Figure 8.4 - host-based routing
Notice that requests to mcu.com are routed to the default backend. This is because you didn’t create an Ingress rule for mcu.com. Depending on your Ingress controller, the message returned will be different, and your Ingress may not even implement a default backend. The default backend configured by the GKE built-in Ingress returns a helpful message saying, response 404 (backend NotFound), service rules for [ / ] non-existent.

Now try connecting to either of the following:

mcu.com/shield
mcu.com/hydra
For path-based routing like this, the Ingress uses the rewrite targets feature as specified in the object annotation. However, the image doesn’t display because path rewrites like this don’t work for all apps.

Congratulations, you’ve successfully configured Ingress for host-based and path-based routing — you’ve got two applications fronted by two ClusterIP Services, but both are published through a single load balancer created and managed by Kubernetes Ingress!

Clean up
If you’re following along, you’ll have all of the following on your cluster:

Pods	Services	Ingress controllers	Ingress resources
shield	svc-shield	ingress-nginx	mcu-all
hydra	svc-hydra	 	 
Delete the Ingress resource.

$ kubectl delete -f ig-all.yml
ingress.networking.k8s.io "mcu-all" deleted
Delete the Pods and ClusterIP Services. It may take a few seconds for the Pods to terminate gracefully.

$ kubectl delete -f app.yml
service "svc-shield" deleted
service "svc-hydra" deleted
pod "shield" deleted
pod "hydra" deleted
Delete the NGINX Ingress controller. I’ve split the command over two lines so its fits the page better. You’ll have to run it on one line, and it can take about a minute for the command to complete and release your terminal.

$ kubectl delete -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/
controller-v1.12.0/deploy/static/provider/cloud/deploy.yaml

namespace "ingress-nginx" deleted
serviceaccount "ingress-nginx" deleted
<Snip>
Finally, don’t forget to revert your /etc/hosts file if you added manual entries earlier.

$ sudo vi /etc/hosts

# Host Database
<Snip>
212.2.246.150 shield.mcu.com       <<---- Delete this entry
212.2.246.150 hydra.mcu.com        <<---- Delete this entry
212.2.246.150 mcu.com              <<---- Delete this entry
Chapter summary
In this chapter, you learned that Ingress is a way to expose multiple applications (ClusterIP Services) via a single cloud load balancer. They’re stable objects in the API but have features that overlap with a lot of service meshes. If you’re running a service mesh, you may not need Ingress.

Lots of Kubernetes clusters require you to install an Ingress controller, and lots of options exist. However, some hosted Kubernetes services make things easy by shipping with a built-in Ingress controller.

Once you’ve installed an Ingress controller, you create and deploy Ingress objects, which are lists of rules governing how incoming traffic is routed to applications on your cluster. It supports host-based and path-based HTTP routing.


table of contents
search
Settings
Previous chapter
7: Kubernetes Services
Next chapter
9: Wasm on Kubernetes
Table of contents collapsed
