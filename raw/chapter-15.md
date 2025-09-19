Skip to Content
15: The Kubernetes API
If you want to master Kubernetes, you need to understand the API and how it works. However, it’s large and complex, and it can be confusing if you’re new to APIs and uncomfortable with terms like RESTful. If that’s you, this chapter blows the confusion away and gets you up to speed with the fundamentals of the Kubernetes API.

I’ve divided things up as follows, and the last two sections have lots of hands-on exercises:

Kubernetes API big picture
The API server
The API
However, let’s mention a few quick things before getting started.

I’ve included lots of jargon in this chapter to help you get used to it.

I highly recommend you complete the hands-on parts as they’ll reinforce the theory.

Finally, Pods, Services, StatefulSets, StorageClasses, and more are all resources in the API. However, it’s common to call them objects when deployed to a cluster. We’ll use the terms resource and object interchangeably.

Kubernetes API big picture
Kubernetes is API-centric. This means all resources are defined in the API, and all configuration and querying goes through the API server.

Administrators and clients send requests to the API server to create, read, update, and delete objects. They’ll often use kubectl to send these requests, but they can also craft them in code or generate them through API testing and development tools. The point is, no matter how you generate requests, they always go to the API server, where they’re authenticated and authorized before being accepted. If it’s a request to create an object, Kubernetes persists the object definition in the cluster store in its serialized state and schedules it to the cluster.

Figure 15.1 shows the high-level process and highlights the central nature of the API and API server.

Figure 15.1
Figure 15.1
Let’s demystify some jargon.

JSON serialization
What does it mean to persist an object to the cluster store in its serialized state?

Serialization is the process of converting an object into a string or stream of bytes so it can be sent over a network and persisted to a data store. The reverse process of converting a string or stream of bytes into an object is deserialization.

Kubernetes serializes objects, such as Pods and Services, as JSON strings and sends them over the network via HTTP. The process happens in both directions:

Clients like kubectl serialize objects when posting them to the API server
The API server serializes responses back to clients
As well as serializing objects for transit over the network, Kubernetes also serializes them for storage in the cluster store.

Kubernetes supports JSON and Protobuf serialization schemas. Protobuf is faster and more efficient, and it scales better than JSON. But it’s harder to inspect and troubleshoot. At the time of writing, Kubernetes typically communicates with external clients via JSON but uses Protobuf when communicating with internal cluster components.

One final thing about serialization. When clients send requests to the API server, they use the Content-Type header to list the serialization schemas they support. For example, a client that only supports JSON will specify Content-Type: application/json in the HTTP header of all requests. Kubernetes will honor this with a serialized response in JSON. You’ll see this in the hands-on sections later.

API analogy
Consider a quick analogy that might help you conceptualize the Kubernetes API. You can skip this section if you’re already familiar with the concept of APIs.

Amazon sells lots of stuff:

That stuff is stored in warehouses and exposed online via the Amazon website
You use tools such as browsers and apps to search the website and buy stuff
Third parties sell their own stuff through Amazon, and you use the same browser and website
When you buy stuff through the website, it gets delivered to you, and you can start using it
The Amazon website lets you track your stuff while it’s being prepared and delivered
Once it’s delivered, you can use the Amazon website to order more or send stuff back
Kubernetes is very similar.

Kubernetes has lots of resources (stuff) such as Pods, Services, and Ingresses:

Kubernetes stuff is defined in the API and exposed through the API server
You use tools like kubectl to talk to the API server and request resources
Third parties define their own Kubernetes resources, and you use the same kubectl and API server to request them
When you request resources through the API server, they get created on your cluster, and you can start using them
The API server lets you watch your objects being created and deployed
Once they’re created, you can use the API server to create more and even delete them
Figure 15.2 shows the comparison, and you can see a feature-for-feature comparison in the following table. However, this is just an analogy, so not everything matches perfectly.

Figure 15.2
Figure 15.2
Amazon	Kubernetes
Stuff	Resources/objects
Warehouse	API
Browser	kubectl
Amazon website	API server
To recap. All deployable objects, such as Pods, Services, and Ingresses, are defined as resources in the API. If an object doesn’t exist in the API, you can’t deploy it. This is the same with Amazon — you can only buy stuff listed on the website.

API resources have properties you can inspect and configure. For example, you can configure all of the following Pod properties (we’re only showing some):

metadata (name, labels, Namespace, annotations…)
restart policy
service account name
runtime class
containers
volumes
This is the same as buying stuff on Amazon. For example, when you buy a USB cable, you configure choices such as USB type, cable length, and cable color.

To deploy a Pod, you send a Pod YAML file to the API server. Assuming the YAML is valid and you’re authorized to create Pods, Kubernetes deploys it to the cluster. After that, you can query the API server to get its status. When it’s time to delete it, you send the delete request to the API server.

This is the same as buying stuff from Amazon. To buy the previously mentioned USB cable, you configure the color, cable length, and connector options and submit the request to the Amazon website. Assuming it’s in stock and you provide the funds, it gets shipped to you. After that, you can use the website to track the shipment. If you need to return the item or make a complaint, you do all that through the Amazon website.

That’s enough with analogies. Let’s take a closer look at the API server.

The API server
The API server exposes the API over a RESTful HTTPS interface, and it’s common for the API server to be exposed on port 443 or 6443. However, you can configure it to operate on whatever port you require.

Run the following command to see the address and port your Kubernetes cluster is exposed on.

$ kubectl cluster-info
Kubernetes control plane is running at https://kubernetes.docker.internal:6443
The API server acts as the front-end to the API and is a bit like Grand Central station for Kubernetes — everything talks to everything else via REST API calls to the API server. For example:

All kubectl commands go to the API server (creating, retrieving, updating, and deleting objects)
All kubelets watch the API server for new tasks and report the status to the API server
All control plane services share data and status info via the API server
Let’s dig deeper and demystify more jargon.

The API server is a Kubernetes control plane service that some clusters run as a set of Pods in the kube-system Namespace. If you build and manage your own clusters, you need to ensure the control plane is highly available and has enough performance to ensure the API server responds quickly to requests. If you’re using hosted Kubernetes, the API server implementation, including performance and availability, is managed by your cloud provider and hidden from you.

The main job of the API server is to expose the API to clients inside and outside the cluster. It uses TLS to encrypt client connections, and it leverages authentication and authorization mechanisms to ensure only valid requests are accepted and executed. Requests from internal and external sources all have to pass through the same authentication and authorization.

The API is RESTful. This is jargon for a modern web API that accepts CRUD-style requests via standard HTTP methods. CRUD-style operations are simple create, read, update, delete operations, and they map to the standard POST, GET, PUT, PATCH, and DELETE HTTP methods.

The following table shows how CRUD operations, HTTP methods, and kubectl commands match up. If you’ve read the chapter on API security, you’ll know we use the term verb to refer to CRUD operations.

K8s CRUD verb	HTTP method	kubectl example
create	POST	$ kubectl create -f <filename>
get list, watch	GET	$ kubectl get pods
update	PUT/PATCH	$ kubectl edit deployment <deployment-name>
delete	DELETE	$ kubectl delete ingress <ig-name>
As you can see, CRUD verb names, HTTP method names, and kubectl sub-command names don’t always match. For example, a kubectl edit command uses the update CRUD verb and the HTTP PATCH method.

A word on REST and RESTful
You’ll hear the terms REST and RESTful a lot. REST is short for REpresentational State Transfer and is the industry standard for communicating with web-based APIs. Systems that use REST, such as Kubernetes, are often referred to as RESTful.

REST requests comprise a verb and a path to a resource. Verbs relate to actions and map to the standard HTTP methods you saw in the previous table. Paths are URI paths to the resource in the API.

Terminology: We often use the term verb to refer to CRUD operations as well as HTTP methods. Basically, any time we say verb, we’re referring to an action.

The following example shows a kubectl command and associated REST request to list all Pods in the shield Namespace. The kubectl tool converts the command to the REST request shown — notice how the REST request has the verb and path we just mentioned.

$ kubectl get pods --namespace shield

GET /api/v1/namespaces/shield/pods
Hands-on
You’ll need a copy of the book’s GitHub repo, and you’ll need to work on the 2025 branch.

$ git clone https://github.com/nigelpoulton/TKB.git
<Snip>

$ cd TKB

$ git fetch origin

$ git checkout -b 2025 origin/2025
Run the following command to start a kubectl proxy session. This exposes the API on your localhost adapter and handles all authentication. Feel free to use a different port.

$ kubectl proxy --port 9000 &
[1] 27533
Starting to serve on 127.0.0.1:9000
With the proxy running, you can use tools like curl to form API requests.

Run the following command to list all Pods in the shield Namespace. The command issues an HTTP GET, and the URI is the path to Pods in the shield Namespace.

$ curl -X GET http://localhost:9000/api/v1/namespaces/shield/pods 
{
  "kind": "PodList",
  "apiVersion": "v1",
  "metadata": {
    "resourceVersion": "9524"
  },
  "items": []
}
The request returned an empty list because there are no Pods in the shield Namespace.

Try this next request to get a list of all the Namespaces on your cluster.

$ curl -X GET http://localhost:9000/api/v1/namespaces
{
  "kind": "NamespaceList",
  "apiVersion": "v1",
  "metadata": {
    "resourceVersion": "9541"
  },
  "items": [
    {
      "metadata": {
        "name": "kube-system",
        "uid": "f5d39dd2-ccfe-4523-b634-f48ba3135663",
        "resourceVersion": "10",
<Snip>
As you learned earlier in the chapter, Kubernetes uses JSON as its preferred serialization schema. This means a command such as kubectl get pods --namespace shield will generate a request with the content type set to application/json. Assuming it’s authenticated and authorized, it will result in HTTP 200 (OK) response code, and Kubernetes will respond with a serialized JSON list of all Pods in the shield Namespace.

Run one of the previous curl commands again, but add the -v flag to see the send and receive headers. I’ve trimmed the response to fit the page and draw your attention to the most important parts.

$ curl -v -X GET http://localhost:9000/api/v1/namespaces/shield/pods

> GET /api/v1/namespaces/shield/pods HTTP/1.1    <<---- HTTP GET method to REST path of Pods
> Accept: */*                                    <<---- Accept all serialization schemas  
> 
< HTTP/1.1 200 OK                                <<---- Accepted request and starting response 
< Content-Type: application/json                 <<---- Responding using JSON serialization
< X-Kubernetes-Pf-Flowschema-Uid: d50...
< X-Kubernetes-Pf-Prioritylevel-Uid: 828...
< 
{                                                <<---- Start of response (serialized object)
  "kind": "PodList",
  "apiVersion": "v1",
  "metadata": {
    "resourceVersion": "34217"
  },
  "items": []
}
Lines starting with > are header data sent by curl. Lines starting with < are header data returned by the API server.

The > lines show curl sending a GET request to the /api/v1/namespaces/shield/pods REST path and telling the API server it can accept responses using any valid serialization schema (Accept: */*). The lines starting with < show the API server returning an HTTP response code and using JSON serialization. The X-Kubernetes lines are priority and fairness settings specific to Kubernetes.

A word on CRUD
CRUD is an acronym for the four basic functions web APIs use to manipulate and persist objects — Create, Read, Update, Delete. As previously mentioned, the Kubernetes API exposes and implements CRUD-style operations via the common HTTP methods.

Let’s consider an example.

The following JSON is from the ns.json file in the api folder of the book’s GitHub repo. It defines a new Namespace object called shield.

{
  "kind": "Namespace",
  "apiVersion": "v1",
  "metadata": {
    "name": "shield",
    "labels": {
      "chapter": "api"
    }
  }
}
You could create it now with the kubectl apply -f ns.json command, but I don’t want you to do that. You’ll create it in a later step.

However, if you did run the command, kubectl would form a request to the API server using the HTTP POST method. This is why you’ll occasionally hear people say they’re POSTing a configuration to the API server. The POST method creates a new object of the specified resource type. In this example, it would create a new Namespace called shield.

The following is a simplified example of what the request header would look like. The body will be the contents of the JSON file.

Request header:

POST https://<api-server>/api/v1/namespaces
Content-Type: application/json
Accept: application/json
If the request is successful, the response will include a standard HTTP response code, content type, and payload like the following:

HTTP/1.1 200 (OK)
Content-Type: application/json
{
    <payload>
}
Run the following curl command to post the ns.json file to the API server. It relies on you still having the kubectl proxy process running from earlier (kubectl proxy --port 9000 &), and you’ll need to run the command from the api directory where the ns.json file exists. If the shield Namespace already exists, you’ll need to delete it before continuing.

Windows users will need to replace the backslash with a backtick and place a backtick immediately before the @ symbol.

$ curl -X POST -H "Content-Type: application/json" \
  --data-binary @ns.json http://localhost:9000/api/v1/namespaces

{
  "kind": "Namespace",
  "apiVersion": "v1",
  "metadata": {
    "name": "shield",
<Snip>
The -X POST argument forces curl to use the HTTP POST method. The -H "Content-Type..." tells the API server the request contains serialized JSON. The --data-binary @ns.json specifies the manifest file, and the URI is the address the API server is exposed on by kubectl proxy and includes the REST path for the resource.

Verify the new shield Namespace exists.

$ kubectl get ns
NAME              STATUS   AGE
kube-system       Active   47h
kube-public       Active   47h
kube-node-lease   Active   47h
default           Active   47h
shield            Active   14s
Now delete the Namespace by running a curl command specifying the DELETE HTTP method.

$ curl -X DELETE \
  -H "Content-Type: application/json" http://localhost:9000/api/v1/namespaces/shield 
{
  "kind": "Namespace",
  "apiVersion": "v1",
  "metadata": {
    "name": "shield",
    <Snip>
  },
  "spec": {
    "finalizers": [
      "kubernetes"
    ]
  },
  "status": {
    "phase": "Terminating"
  }
}
In summary, the API server exposes the API over a secure RESTful interface that lets you manipulate and query the state of objects on the cluster. It runs on the control plane, which needs to be highly available and have enough performance to service requests quickly.

The API
The API is where all Kubernetes resources are defined. It’s large, modular, and RESTful.

When Kubernetes was new, the API was monolithic and all resources existed in a single global namespace. However, as Kubernetes grew, we split the API into smaller, more manageable groups that we call named groups or sub-groups.

Figure 15.3 shows a simplified view of the API with resources divided into groups.

Figure 15.3 - Simplified view of Kubernetes API
Figure 15.3 - Simplified view of Kubernetes API
The image shows the API with four groups. There are lots more than four, but I’m keeping the picture simple.

There are two types of API group:

The core group
The named groups
The core API group
The core group is where we define all the original objects from when Kubernetes was new (before it grew and we divided the API into groups). Some of the resources in this group include Pods, Nodes, Services, Secrets, and ServiceAccounts, and you can find them in the API below the /api/v1 REST path. The following table lists some example paths for resources in the core group.

Resource	REST Path
Pods	/api/v1/namespaces/{namespace}/pods/
Services	/api/v1/namespaces/{namespace}/services/
Nodes	/api/v1/nodes/
Namespaces	/api/v1/namespaces/
Notice how some objects are namespaced and some aren’t. Namespaced objects have longer REST paths as you have to include two additional segments — ../namespaces/{namespace}/... For example, listing all Pods in the shield Namespace requires the following path.

GET /api/v1/namespaces/shield/pods/
Objects, such as nodes, that aren’t namespaced have much shorter REST paths.

GET /api/v1/nodes/
Expected HTTP response codes for read requests are 200: OK or 401: Unauthorized.

On the topic of REST paths, GVR stands for group, version, and resource, and can be a good way to remember the structure of REST paths. Figure 15.4 shows the REST path to the v1 StorageClasses resource in the storage.k8s.io named group.

Figure 15.4
Figure 15.4
You shouldn’t expect any new resources to be added to the core group.

Named API groups
The named API groups are where we add all new resources, and we sometimes call them sub-groups.

Each of the named groups is a collection of related resources. For example, the apps group defines resources such as Deployments, StatefulSets, and DaemonSets that manage application workloads. Likewise, we define Ingresses, Ingress Classes, and Network Policies in the networking.k8s.io group. Notable exceptions to this pattern are older resources in the core group that came along before the named groups existed. For example, Pods and Services are both in the core group. However, if we invented them today, we’d probably put Services in the networking.k8s.io group and Pods in the apps group.

Resources in the named groups live below the /apis/{group-name}/{version}/ REST path. The following table lists some examples.

Resource	Path
Ingress	/apis/networking.k8s.io/v1/namespaces/{namespace}/ingresses/
ClusterRole	/apis/rbac.authorization.k8s.io/v1/clusterroles/
StorageClass	/apis/storage.k8s.io/v1/storageclasses/
Notice how the URI paths for named groups start with /apis (plural) and include the name of the group. This differs from the core group that starts with /api (singular) and doesn’t include a group name. In fact, in some places, you’ll see the core API group referred to by empty double quotes (“”). This is because no thought was given to groups when we originally created the API — everything was “just in the API”.

Dividing the API into smaller groups makes it more scalable and easier to navigate and extend.

Inspecting the API
The following commands are good ways for you to see API-related info.

The kubectl api-resources command lists all the API resources and groups your cluster supports. It also shows resource shortnames and whether they are namespaced or cluster-scoped. I’ve tweaked the output to fit the page and show a mix of resources from different groups.

$ kubectl api-resources
NAME                       SHORT    APIVERSION            NAMESPACED   KIND
namespaces                 ns       v1                    false        Namespace
nodes                      no       v1                    false        Node
pods                       po       v1                    true         Pod
deployments                deploy   apps/v1               true         Deployment
replicasets                rs       apps/v1               true         ReplicaSet
statefulsets               sts      apps/v1               true         StatefulSet
cronjobs                   cj       batch/v1              true         CronJob
jobs                                batch/v1              true         Job
horizontalpodautoscalers   hpa      autoscaling/v2        true         HorizontalPodAutoscaler
ingresses                  ing      networking.k8s.io/v1  true         Ingress
networkpolicies            netpol   networking.k8s.io/v1  true         NetworkPolicy
storageclasses             sc       storage.k8s.io/v1     false        StorageClass
The next command shows which API versions your cluster supports. It doesn’t list which resources belong to which APIs, but it’s good for finding out whether your cluster has things like alpha APIs enabled. Notice how some API groups have multiple versions enabled, such as beta and stable, or v1 and v2.

$ kubectl api-versions
admissionregistration.k8s.io/v1
apiextensions.k8s.io/v1
apps/v1
<Snip>
autoscaling/v1
autoscaling/v2
v1
The next command is more complicated and only lists the kind and version fields for supported resources. It doesn’t work on Windows.

$ for kind in `kubectl api-resources | tail +2 | awk '{ print $1 }'`; \
 do kubectl explain $kind; done | grep -e "KIND:" -e "VERSION:"

KIND:     Binding
VERSION:  v1
KIND:     ComponentStatus
VERSION:  v1
<Snip>
KIND:     HorizontalPodAutoscaler
VERSION:  autoscaling/v2
KIND:     CronJob
VERSION:  batch/v1
KIND:     Job
VERSION:  batch/v1
<Snip>
You can run the following commands if your kubectl proxy process is still running.

Run the following command to list all API versions available below the core API group. You should only see the v1 version.

$ curl http://localhost:9000/api
{
  "kind": "APIVersions",
  "versions": [
    "v1"                   <<---- v1 version
  ],
  "serverAddressByClientCIDRs": [
    {
      "clientCIDR": "0.0.0.0/0",
      "serverAddress": "172.21.0.4:6443"
    }
  ]
}
Run this command to list all named APIs and groups. I’ve trimmed the output to save space.

$ curl http://localhost:9000/apis
{
  "kind": "APIGroupList",
  "apiVersion": "v1",
  "groups": [
    <Snip>
    {
      "name": "apps",
      "versions": [
        {
          "groupVersion": "apps/v1",
          "version": "v1"
        }
      ],
      "preferredVersion": {
        "groupVersion": "apps/v1",
        "version": "v1"
      }
    },
    <Snip>
You can list specific object instances or lists of objects on your cluster. The following command returns a list of all Namespaces.

$ curl http://localhost:9000/api/v1/namespaces
{
  "kind": "NamespaceList",
  "apiVersion": "v1",
  "metadata": {
    "resourceVersion": "35234"
  },
  "items": [
    {
      "metadata": {
        "name": "kube-system",
        "uid": "05fefa13-cbec-458b-aece-d65eb1972dfb",
        "resourceVersion": "4",
        "creationTimestamp": "2025-02-12T09:59:42Z",
        "labels": {
          "kubernetes.io/metadata.name": "kube-system"
        },
        "managedFields": [
          {
            "manager": "Go-http-client",
            "operation": "Update",
            "apiVersion": "v1",
<Snip>
Feel free to poke around. You can put the same URI paths into a browser and API tools like Postman.

Leave the kubectl proxy process running, as you’ll use it again later in the chapter.

Alpha beta and stable
Kubernetes has a well-documented process for accepting new API resources. They come in as alpha, progress through beta, and eventually graduate as Generally Available (GA). We sometimes refer to GA as stable.

API version	Track
Alpha	Experimental
Beta	Pre-release
GA (Generally Available))	Stable
Alpha resources are experimental and you should consider them hairy and scary. You should expect them to have bugs, drop features without warning, and change a lot when they move into beta. This is why most clusters disable them by default.

As a quick example, a new resource called tkb in the apps API group that goes through two alpha versions will have the following API names:

/apis/apps/v1alpha1/tkb
/apis/apps/v1alpha2/tkb
After alpha, it goes through beta testing.

Beta resources are considered pre-release and should be very close to what the developers expect the final GA release to look like. However, it’s normal to expect minor changes when promoted to GA. Most clusters enable beta APIs by default, and you’ll occasionally see beta resources in production environments. However, that’s not a recommendation. You need to make those decisions yourself.

If you put the same tkb resource through two beta versions, Kubernetes will serve them via the following APIs:

/apis/apps/v1beta1/tkb
/apis/apps/v1beta2/tkb
The final phase after beta is Generally Available (GA), sometimes referred to as stable.

GA resources are considered production-ready, and Kubernetes has a strong long-term commitment to them.

Most GA resources are v1. However, some have continued to evolve and progressed to v2. When you create a v2 resource, you put it through the exact same incubation and graduation process. For example, the same tkb resource in the apps API would go through the same alpha and beta process before reaching v2:

/apis/apps/v2alpha1/tkb
<Snip>
/apis/apps/v2beta1/tkb
<Snip>
/apis/apps/v2/tkb
Real-world examples of paths to stable resources include the following:

/apis/networking.k8s.io/v1/ingresses
/apis/batch/v1/cronjobs
/apis/autoscaling/v2/horizontalpodautoscalers
You can deploy an object via one API, and then read it back and manage it using a more recent API. For example, you can deploy an object via a v1beta2 API and then update and manage it later through the stable v1 API.

Resource deprecation
As previously mentioned, alpha and beta objects can experience a lot of changes before promotion to GA. However, GA objects don’t change, and Kubernetes is strongly committed to maintaining long-term usability and support.

At the time of writing, Kubernetes has the following commitments to beta and GA resources:

Beta: Resources in beta have a 9-month window to either release a newer beta version or graduate to GA. This is to prevent resources from stagnating in beta. For example, the Ingress resource remained in beta for over 15 Kubernetes releases!
GA: GA resources are expected to be long-lived. When deprecated, Kubernetes continues to serve and support them for 12 months or three releases, whichever is longest. After this period they are removed. However, Kubernetes will only deprecate an existing stable resource after a newer stable version is available. For example, it will only deprecate a v1 resource if the v2 of the same resource is already released.
Recent versions of Kubernetes do three things when you deploy a deprecated resource:

Return a deprecation warning message on the CLI
Add a k8s.io/deprecated:true annotation to the audit record for the request
Set an apiserver_requested_deprecated_apis gauge metric
Deprecation warning messages on the CLI give you immediate feedback that you’ve used a deprecated API. The other two allow you to query audit logs and process logs to determine if you’re using deprecated APIs. These last two can be useful when planning Kubernetes upgrades as they help you to know if you’re using deprecated resources.

Extending the API
Kubernetes ships with a collection of built-in controllers that deploy and manage built-in resources. However, you can extend Kubernetes by adding your own resources and controllers.

This is a popular way for network and storage vendors to expose advanced features, such as snapshot schedules or IP address management, via the Kubernetes API. In the storage example, volumes are surfaced inside of Kubernetes via CSI drivers, Pods consume them via built-in Kubernetes resources such as StorageClasses and PersistentVolumeClaims, but advanced features such as snapshot scheduling can be managed via custom API resources and controllers. This allows developers and Kubernetes operators to deploy and manage everything via well-understood API interfaces and standard tools such as kubectl and YAML files.

The high-level pattern for extending the API involves two main things:

Create your custom resource
Write and deploy your custom controller
Kubernetes has a CustomResourceDefinition (CRD) object that lets you create new API resources that look, smell, and feel like native Kubernetes resources. You create your custom resource as a CRD and then use kubectl to create instances and inspect them just like you do with native resources. Your custom resources even get their own REST paths in the API.

The following YAML is from the crd.yml file in the api folder. It defines a new cluster-scoped custom resource called books in the nigelpoulton.com API group served via the v1 path.

apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: books.nigelpoulton.com
spec:
  group: nigelpoulton.com      <<---- API sub-group (a.k.a. "named API group")
  scope: Cluster               <<---- Can be "Namespaced" or "Cluster"
  names:
    plural: books              <<---- All resources need a plural and singular name
    singular: book             <<---- Singular names are used on CLI and command outputs
    kind: Book                 <<---- kind property used in YAML files
    shortNames:
    - bk                       <<---- Short name that can be used by kubectl
  versions:                    <<---- Resources can be served by multiple API versions
    - name: v1                  
      served: true             <<---- If set to false, "v1" will not be served
      storage: true            <<---- Store instances of the object as this version
      schema:                  <<---- This block defines the resource's properties
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                <Snip>
If you haven’t already done so, run the following commands to clone the book’s GitHub repo and switch to the 2025 branch.

$ git clone https://github.com/nigelpoulton/TKB.git
<Snip>

$ cd TKB

$ git fetch origin

$ git checkout -b 2025 origin/2025
Change into the api directory.

$ cd TKB/api
Run the following command to deploy the custom resource.

$ kubectl apply -f crd.yml
customresourcedefinition.apiextensions.k8s.io/books.nigelpoulton.com created
Congratulations, the new resource exists in the API and Kubernetes is serving it on the following REST path.

apis/nigelpoulton.com/v1/books/
Verify it exists in the API. Replace the grep books argument with Select-String -Pattern 'books' if you’re using Windows.

$ kubectl api-resources | grep books
NAME      SHORTNAMES     APIGROUP                NAMESPACED     KIND
books     bk             nigelpoulton.com/v1     false          Book

$ kubectl explain book
GROUP:      nigelpoulton.com
KIND:       Book
VERSION:    v1
DESCRIPTION:
    <empty>
FIELDS:
    <Snip>
The following YAML is from the book.yml file and defines a new Book object called ai. Notice how the fields in the spec section match the names and types defined in the custom resource.

apiVersion: nigelpoulton.com/v1
kind: Book
metadata:
  name: ai
spec:
  bookTitle: "AI Explained"
  subTitle: "Facts, Fiction, and Future"
  topic: "Artificial Intelligence"
  edition: 1
  salesUrl: https://www.amazon.com/dp/1916585388
Deploy it with the following command.

$ kubectl apply -f book.yml
book.nigelpoulton.com/ai created
You can now list and describe it with the usual commands. The following command uses the resource’s bk shortname.

$ kubectl get bk
NAME    TITLE           SUBTITLE                      EDITION    URL
ai      AI Explained    Facts, Fiction, and Future    1          www.amazon.com/dp/1916585388
You can also use tools like curl to query the new API group and resource.

The following commands start a kubectl proxy process and then list all resources under the new nigelpoulton.com named group. You don’t need to start another proxy if you’re still running the one from earlier in the chapter.

$ kubectl proxy --port 9000 &
[1] 14784
Starting to serve on 127.0.0.1:9000

$ curl http://localhost:9000/apis/nigelpoulton.com/v1/
{
  "kind": "APIResourceList",
  "apiVersion": "v1",
  "groupVersion": "nigelpoulton.com/v1",
  "resources": [
    {
      "name": "books",
      "singularName": "book",
      "namespaced": false,
      "kind": "Book",
      "verbs": [
        "delete",
        "deletecollection",
        "get",
        "list",
        "patch",
        "create",
        "update",
        "watch"
      ],
      "shortNames": [
        "bk"
      ],
      "storageVersionHash": "F2QdXaP5vh4="
    }
  ]
}
This is all good and interesting. However, custom resources don’t do anything useful until you create a custom controller to do something with them. Writing your own controllers is beyond the scope of this chapter, but you’ve learned a lot about the Kubernetes API and how it works.

Clean up
If you’ve been following along, you’ll have all the following resources that need cleaning up:

A kubectl proxy process
An ai book resource
A books.nigelpoulton.com custom resource (CRD)
Run one of the following commands to get the process ID (PID) of your kubectl proxy process.

// Linux and Mac command

$ ps | grep kubectl
PID     TTY       TIME      CMD
27533   ttys001   0:03.13   kubectl proxy --port 9000

// Windows command

> tasklist | Select-String -Pattern 'kubectl'
Image Name       PID  Session Name   Session#
=============  =====  ============   ========
kubectl.exe    19776  Console               1     
Run one of the following commands to kill it, and remember to use the PID from your system.

// Linux and Mac command

$ kill -9 27533
[1]  + 27533 killed     kubectl proxy --port 9000

// Windows command

> taskkill /F /PID 19776
SUCCESS: The process with PID 19776 has been terminated.
Run the following command to delete the ai book object.

$ kubectl delete book ai
book.nigelpoulton.com "ai" deleted
Now delete the books.nigelpoulton.com custom resource.

$ kubectl delete crd books.nigelpoulton.com
customresourcedefinition.apiextensions.k8s.io "books.nigelpoulton.com" deleted
Chapter summary
Now that you’ve read the chapter, all of the following should make sense. But don’t worry if some of it is still confusing. APIs can be hard to understand, and the Kubernetes API is large and complex.

Anyway, here goes…

Kubernetes is an API-driven platform, and the API is exposed internally and externally via the API server.

The API server runs as a control plane service, and all internal and external clients interact with the API via the API server. This means your control plane needs to be highly available and high-performance. If it’s not, you risk slow API responses or entirely losing access to the API.

The Kubernetes API is a modern resource-based RESTful API that accepts CRUD-style operations via uniform HTTP methods such as POST, GET, PUT, PATCH, and DELETE. It’s divided into named groups for convenience and extensibility. Older resources created in the early days of Kubernetes exist in the original core group, which you access via the /api/v1 REST path. All newer objects go into named groups. For example, we define newer network resources in the networking.k8s.io sub-group available at the /apis/networking.k8s.io/v1/ REST path.

Most of the resources in the Kubernetes API are objects, so we sometimes use the terms resources and objects to mean the same thing. It’s common to refer to their API definitions as resources or resource definitions, whereas running instances on a cluster are often referred to as objects. For example, “The Pod resource exists in the core API group, and there are five Pod objects running in the default Namespace.”

All new resources enter the API as alpha, progress through beta, and hopefully graduate to GA. Alpha resources are considered experimental, and, therefore, subject to change and usually disabled on most clusters. Beta resources are considered pre-release and, therefore, more reliable and won’t change much when they graduate to GA. Most clusters enable beta resources by default, but you should be cautious about using them in production. GA resources are considered stable and production-ready. Kubernetes has a strong commitment to GA resources and backs this up with a well-defined deprecation policy guaranteeing support for at least 12 months, or three versions, after the deprecation announcement.

Finally, the Kubernetes API is becoming the de facto cloud API, with many third-party technologies extending it so they can expose their own technologies through it. Kubernetes makes it easy to extend the API through CustomResourceDefinitions that make 3rd-party resources look and feel like native Kubernetes resources.

Hopefully, that made sense, but don’t worry if you’re still unsure about some of it. I recommend you play around with as many of the examples as possible. You should also consider reading the chapter again tomorrow — it’s normal for new concepts to take a while to learn.

If you liked this or any other chapter, jump over to Amazon and show the book some love with a quick review. The cloud-native gods will smile on you ;-)


table of contents
search
Settings
Previous chapter
14: API security and RBAC
Next chapter
16: Threat modeling Kubernetes
Table of contents collapsed
