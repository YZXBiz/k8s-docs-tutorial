Skip to Content
14: API security and RBAC
Kubernetes is API-centric and the API is served through the API server. In this chapter, you’ll follow a typical API request as it passes through various security-related checks.

I’ve divided the chapter into the following sections:

API security big picture
Authentication
Authorization (RBAC)
Admission control
See Chapter 15 for a more in-depth look at the design and structure of the API.

API security big picture
All of the following make CRUD-style requests to the API server (create, read, update, delete):

Operators and developers using kubectl
Pods
Kubelets
Control plane services
Kubernetes-native apps
Figure 14.1 shows the flow of a typical API request passing through the standard checks. The flow is the same, no matter where the request originates. authN is short for authentication, whereas authZ is short for authorization.

Figure 14.1
Figure 14.1
Consider a quick example where a user called grant-ward is trying to create a Deployment called hive in the terran Namespace.

The grant-ward user uses the kubectl apply command to send the YAML file to Kubernetes to create the Deployment in the terran Namespace. The kubectl command-line tool generates a request to the API server with the user’s credentials embedded. The connection between kubectl and the API server is secured by TLS. As soon as the request reaches the API server, the authentication module determines whether the request originates from grant-ward or an imposter. Assuming it is grant-ward, the authorization module determines whether grant-ward has permission to create Deployments in the terran Namespace. If the request passes authentication and authorization, admission controllers ensure the Deployment object meets policy requirements. The request is executed only after passing authentication, authorization, and admission control checks.

The process is similar to flying on a commercial plane. You travel to the airport and authenticate yourself with a photo ID, usually your passport. Assuming you clear passport authentication, the system checks if you’ve bought a seat and are therefore authorized to board the plane. If you pass authentication and you’re authorized to board, admission controls may check and apply airline policies such as restricting hand luggage and prohibiting alcohol and weapons in the cabin. After all that, you can finally take your seat and fly to your destination.

Let’s take a closer look at authentication.

Authentication
Authentication is about proving your identity. You might see or hear it shortened to authN, pronounced “auth en”.

Credentials are at the heart of authentication, and all requests to the API server include credentials. It’s the responsibility of the authentication layer to verify them. If verification fails, the API server returns an HTTP 401 and denies the request. If the request passes authentication, it moves on to authorization.

The Kubernetes authentication layer is pluggable, and popular modules include client certificates, webhooks, and integration with external identity management systems such as Active Directory (AD) and cloud-based Identity Access Management (IAM) systems. In fact, Kubernetes does not have its own built-in identity database. Instead, it forces you to use an external system. This avoids creating yet another identity management silo.

Out-of-the-box, most Kubernetes clusters support client certificates, but in the real world you’ll want to integrate with your chosen cloud or corporate identity management system. Many hosted Kubernetes services automatically integrate with the underlying cloud’s identity management system.

In these situations, Kubernetes offloads authentication to the external system.

Checking your current authentication setup
Your cluster details and user credentials are stored in a kubeconfig file. Tools like kubectl read this file to determine which cluster to send commands to and which credentials to use. The file is called config and lives in the following locations:

Windows: C:\Users\<user>\.kube\config
Linux/Mac: /home/<user>/.kube/config
Here’s what a kubeconfig file looks like.

apiVersion: v1
kind: Config
clusters:                        <<---- Cluster block defining one or more clusters and certs
- cluster:                  
  name: prod-shield              <<---- This block defines a cluster called "prod-shield"
    server: https://<url-or-ip-address-of-api-server>:443     <<---- This is the cluster's URL
    certificate-authority-data: LS0tLS1C...LS0tCg==           <<---- Cluster's certificate
 users:                          <<---- Users block defining one or more users and credentials
- name: njfury                   <<---- User called njfury
  user:
    as-user-extra: {}
    token: eyJhbGciOiJSUzI1NiIsImtpZCI6IlZwMzl...SZY3uUQ     <<---- User's credentials
contexts:                        <<---- Context block. A context is a cluster + user
- context:
  name: shield-admin             <<---- This block defines a context called "shield-admin"
    cluster: prod-shield         <<---- Cluster
    user: njfury                 <<---- User  
    namespace: default
current-context: shield-admin    <<---- Context used by kubectl
If you look closely, you’ll see it has four top-level sections:

Clusters
Users
Contexts
Current-context
The clusters section defines one or more Kubernetes clusters. Each has a friendly name, an API server endpoint, and the public key of its certificate authority (CA).

The users section defines one or more users. Each user requires a name and token. The token is often an X.509 certificate signed by the cluster’s CA (or a CA trusted by the cluster).

The contexts section is a list of user and cluster pairs, and the current-context is the cluster and user for kubectl commands.

The following YAML snippet is from the same kubeconfig file and will send all requests to the prod-shield cluster as the njfury user.

current-context: shield-admin    <<---- Current context
contexts:                        
- context:
  name: shield-admin             <<---- This block defines a context called "shield-admin"
    cluster: prod-shield         <<---- Send commands to this cluster 
    user: njfury                 <<---- User to authenticate as
    namespace: default
It’s the job of the cluster’s authentication module to determine whether the user is genuinely njfury. If your cluster integrates with an external IAM system, it’ll hand off authentication to that system.

Assuming authentication is successful, requests progress to the authorization phase.

Authorization (RBAC)
Authorization happens immediately after successful authentication, and you’ll sometimes see it shortened to authZ (pronounced “auth zee”).

Kubernetes authorization is also pluggable, and you can run multiple authZ modules on a single cluster. However, most clusters use RBAC. Also, if your cluster has multiple authorization modules, as soon as any module authorizes a request, it skips all other authZ modules and moves immediately to admissions control.

This section covers the following:

RBAC big picture
Users and permissions
Cluster-level users and permissions
Pre-configured users and permissions
RBAC big picture
The most common authorization module is RBAC (Role-Based Access Control). At the highest level, RBAC is about three things:

Users
Actions
Resources
Which users can perform which actions against which resources.

The following table shows a few examples.

User (subject)	Action	Resource	Effect
Bao	create	Pods	Bao can create Pods
Kalila	list	Deployments	Kalila can list Deployments
Josh	delete	ServiceAccounts	Josh can delete ServiceAccounts
RBAC is enabled on most Kubernetes clusters and is a least-privilege deny-by-default system. This means it locks everything down, and you need to create allow rules to open things up. In fact, Kubernetes doesn’t support deny rules — it only supports allow rules. This might seem small, but it makes implementation and troubleshooting much simpler.

Users and Permissions
Two concepts are vital to understanding Kubernetes RBAC:

Roles
RoleBindings
Roles define a set of permissions, and RoleBindings bind them to users.

The following resource manifest defines a Role object. It’s called read-deployments and grants permission to get, watch, and list Deployment objects in the shield Namespace.

apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: shield
  name: read-deployments
rules:
- verbs: ["get", "watch", "list"]   <<---- Allowed actions
  apiGroups: ["apps"]                ----┐ on resources 
  resources: ["deployments"]         ----┘ of this type
However, Roles don’t do anything until you bind them to users.

The following RoleBinding binds the previous read-deployments Role to a user called sky.

apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-deployments
  namespace: shield
subjects:
- kind: User
  name: sky                   <<---- Name of the authenticated user
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: read-deployments      <<---- Bind this Role to the authenticated user above
  apiGroup: rbac.authorization.k8s.io
Deploying both objects to your cluster will allow an authenticated user called sky to run commands such as kubectl get deployments -n shield.

The username listed in the RoleBinding must be a string and has to match an authenticated user.

Looking closer at rules
Role objects have a rules section that defines the following three properties:

verbs
apiGroups
resources
Together, they define which actions are allowed against which objects.

The verbs field lists permitted actions, whereas the apiGroups and resources fields identify which objects the actions are permitted on. The following snippet from the previous Role object allows read access (get, watch and list) against Deployment objects.

rules:
- verbs: ["get", "watch", "list"]
  apiGroups: ["apps"] 
  resources: ["deployments"]
The following table shows some possible apiGroup and resources combinations.

apiGroup	resource	Kubernetes API path
””	pods	/api/v1/namespaces/{namespace}/pods
””	secrets	/api/v1/namespaces/{namespace}/secrets
“storage.k8s.io”	storageclass	/apis/storage.k8s.io/v1/storageclasses
“apps”	deployments	/apis/apps/v1/namespaces/{namespace}/deployments
An empty set of double quotes (“”) in the apiGroups field indicates the core API group. You need to specify all other API groups as a string enclosed in double-quotes.

The following table lists the complete set of verbs Kubernetes supports for object access. It demonstrates the REST-based nature of the Kubernetes API by mapping the verbs to standard HTTP methods and HTTP response codes.

Kubernetes verb(s)	HTTP method	Common responses
create	POST	201 created, 403 Access Denied
get, list, watch	GET	200 OK, 403 Access Denied
update	PUT	200 OK, 403 Access Denied
patch	PATCH	200 OK, 403 Access Denied
delete	DELETE	200 OK, 403 Access Denied
Run the following command to show all API resources and supported verbs. The output is useful when you’re building rule definitions.

$ kubectl api-resources --sort-by name -o wide
NAME          APIGROUP           KIND        VERBS
deployments   apps               Deployment  [create delete ... get list patch update watch]
ingresses     networking.k8s.io  Ingress     [create delete ... get list patch update watch]
pods                             Pod         [create delete ... get list patch update watch]
secrets                          Secret      [create delete ... get list patch update watch]
services                         Service     [create delete get list patch update watch]
<Snip>
When building rules, you can use the asterisk (*) to refer to all API groups, all resources, and all verbs. For example, the following Role object grants all actions on all resources in every API group. It’s just for demonstration purposes, and you probably shouldn’t create rules like this.

apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: shield
  name: read-deployments
rules:
- verbs: ["*"]       <<---- All actions
  resources: ["*"]   <<---- on all resources
  apiGroups: ["*"]   <<---- in every API group
Cluster-level users and permissions
So far, you’ve seen Roles and RoleBindings. However, Kubernetes actually has four RBAC objects:

Roles
RoleBindings
ClusterRoles
ClusterRoleBindings
Roles and RoleBindings are namespaced objects, meaning you apply them to specific Namespaces. On the other hand, ClusterRoles and ClusterRoleBindings are cluster-wide objects and apply to all Namespaces. They’re all defined in the same API sub-group, and their YAML structures are almost identical.

A powerful pattern is to use ClusterRoles to define roles once at the cluster level and then use RoleBindings to bind them to multiple specific Namespaces. This lets you define common roles once and re-use them in as many Namespaces as required. Figure 14.2 shows a single ClusterRole applied to two Namespaces via two separate RoleBindings.

Figure 14.2 - Combining ClusterRoles and RoleBindings
Figure 14.2 - Combining ClusterRoles and RoleBindings
The following YAML defines the read-deployments role from earlier. But this time it’s a ClusterRole, meaning you can use RoleBindings to apply it to as many Namespaces as you need — one RoleBinding per Namespace.

apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole                   <<---- Cluster-scoped role
metadata:
  name: read-deployments
rules:
- verbs: ["get", "watch", "list"]
  apiGroups: ["apps"] 
  resources: ["deployments"]
If you look closely at the YAML, the only difference with the earlier one is that this one has its kind property set to ClusterRole and it doesn’t have a metadata.namespace property.

Real-world example
Let’s look at a real-world example.

Most Kubernetes clusters have a set of pre-created roles and bindings to help with initial configuration and getting started.

The following example walks you through how Docker Desktop’s built-in multi-node Kubernetes cluster uses ClusterRoles and ClusterRoleBindings to grant cluster admin rights to the user configured in your kubeconfig file.

You can follow along if you’re using Docker Desktop’s built-in multi-node Kubernetes cluster that we showed you how to build in Chapter 3. Other clusters will do things slightly differently, but the principles will be similar.

Docker Desktop automatically configures your kubeconfig file with a client certificate defining an admin user. The certificate is signed by the cluster’s built-in CA, meaning the cluster will trust its credentials.

Run the following command to see the Docker Desktop user entry in your kubeconfig file. I’ve trimmed the output to highlight the bits we’re interested in.

$ kubectl config view
<Snip>
users:
- name: docker-desktop                  ----┐ 
  user:                                     | This is the Docker Desktop 
    client-certificate-data: DATA+OMITTED   | kubeconfig entry for the built-in user
    client-key-data: DATA+OMITTED           | including client certificate
<Snip>                                  ----┘
The user entry is called docker-desktop, but this is just a friendly name. The username that kubectl authenticates with is embedded within the client certificate in the same section of the file.

Run the following long command to decode the username and group memberships embedded in your kubeconfig’s client certificate. The command only works on Linux-style systems, and you’ll need the jq utility installed. You’ll also need to make sure your kubeconfig’s current context is set to your Docker Desktop user and cluster.

$ kubectl config view --raw -o json \
    | jq ".users[] | select(.name==\"docker-desktop\")" \
    | jq -r '.user["client-certificate-data"]' \
    | base64 -d | openssl x509 -text | grep "Subject:"

    Subject: O=kubeadm:cluster-admins, CN=kubernetes-admin
The output shows that kubectl commands will authenticate as the kubernetes-admin user that is a member of the kubeadm:cluster-admins group.

Note: Client certificates encode usernames in the CN property and group memberships in the O property.

Remember, the cluster’s CA signs the certificate, so it will pass authentication.

Now that you know you’re authenticating as the kubernetes-admin user, which is a member of the kubeadm:cluster-admins group, let’s see how the cluster uses ClusterRoles and ClusterRoleBindings to give you cluster-wide admin access.

Many Kubernetes clusters use a ClusterRole called cluster-admin to grant admin rights on the cluster. This means your kubernetes-admin user (a member of the kubeadm:cluster-admins group) needs binding to the cluster-admin ClusterRole. See Figure 14.3.

Figure 14.3
Figure 14.3
Run the following command to see what access the cluster-admin ClusterRole has.

$ kubectl describe clusterrole cluster-admin
Name:         cluster-admin
Labels:       kubernetes.io/bootstrapping=rbac-defaults
Annotations:  rbac.authorization.kubernetes.io/autoupdate: true
PolicyRule:
  Resources  Non-Resource URLs  Resource Names  Verbs
  ---------  -----------------  --------------  -----
  *.*        []                 []              [*]
             [*]                []              [*]
The PolicyRule section shows this Role has access to all verbs on all resources in all Namespaces. This means accounts bound to this role can do everything to every object everywhere. This is the equivalent of root and is a powerful and dangerous set of permissions.

Run the following command to see if your cluster has any ClusterRoleBindings referencing the cluster-admin role.

$ kubectl get clusterrolebindings | grep cluster-admin
NAME                        ROLE
cluster-admin               ClusterRole/cluster-admin
kubeadm:cluster-admins      ClusterRole/cluster-admin
It’s referenced in two ClusterRoleBindings, and we’re interested in the kubeadm:cluster-admins binding. Hopefully, it will list our kubernetes-admin user or the kubeadm:cluster-admins group our user is a member of.

Run the following command to inspect it.

$ kubectl describe clusterrolebindings kubeadm:cluster-admins
Name:         kubeadm:cluster-admins
Labels:       <none>
Annotations:  <none>
Subjects:                        ----┐ 
  Kind   Name                        | Bind subjects (users) that are
  ----   ----                        | members of the
  Group  kubeadm:cluster-admins      | "kubeadm:cluster-admins group"
Role:                                | to the
  Kind:  ClusterRole                 | ClusterRole 
  Name:  cluster-admin           ----┘ called "cluster-admin"
Great. It binds subjects (users) in the kubeadm:cluster-admins group to the cluster-admin Role. Our kubernetes-admin user is a member of that group, so it will get full admin rights on the cluster.

In summary, and as shown in Figure 14.4, Docker Desktop configures your kubeconfig file with a client certificate that identifies a user called kubernetes-admin that is a member of the kubeadm:cluster-admins group. The certificate is signed by the cluster’s CA, meaning it will pass authentication. The Docker Desktop Kubernetes cluster has a ClusterRoleBinding called kubeadm:cluster-admins that binds authenticated members of the kubeadm:cluster-admins group to a ClusterRole called cluster-admin. This cluster-admin ClusterRole grants admin rights to all objects in all Namespaces.

Figure 14.4 - Mapping kubectl users to cluster admin
Figure 14.4 - Mapping kubectl users to cluster admin
Summarizing authorization
Authorization ensures authenticated users are allowed to execute actions. RBAC is a popular Kubernetes authorization module that implements least privilege access based on a deny-by-default model that denies all actions unless you create rules that allow them.

Kubernetes RBAC uses Roles and ClusterRoles to grant permissions, and it uses RoleBindings and ClusterRoleBindings to bind those permissions to users.

Once a request passes authentication and authorization, it moves to admission control.

Admission control
Admission control runs immediately after successful authentication and authorization and is all about policies.

Kubernetes supports two types of admission controllers:

Mutating
Validating
The names tell you a lot. Mutating controllers check for compliance and can modify requests, whereas validating controllers check for compliance but cannot modify requests.

Kubernetes always runs mutating controllers first, and both types only apply to requests attempting to modify the cluster. Read requests are not subjected to admission control.

As a quick example, you might have a production cluster with a policy that all new and updated objects must have the env=prod label. A mutating controller can check new and updated objects for the presence of the label and add it if it doesn’t exist. However, a validating controller can only reject the request if the label doesn’t exist.

Running the following command on a Docker Desktop cluster shows the API server is configured to use the NodeRestriction admission controller.

$ kubectl describe pod kube-apiserver-desktop-control-plane  \
  --namespace kube-system | grep admission

--enable-admission-plugins=NodeRestriction
Most real-world clusters will run a lot more admission controllers. For example, the AlwaysPullImages mutating admission controller sets the spec.containers.imagePullPolicy of all new Pods to Always. This forces the container runtime on all nodes to pull all images from the configured registry, preventing Pods from using locally cached images. It requires all nodes to have valid credentials to pull images.

If any admission controller rejects a request, the request is immediately denied without checking other admission controllers. This means all admission controllers must approve a request before it runs on the cluster.

As previously mentioned, there are lots of admission controllers, and they’re very important in real-world production clusters.

Chapter summary
In this chapter, you learned that all requests to the API server include credentials and must pass authentication, authorization, and then admission control checks. The connection between the client and the API server is also secured with TLS.

The authentication layer validates the identity of requests, and most clusters support client certificates. However, production clusters should use enterprise-grade Identity and Access Management (IAM) solutions.

The authorization layer checks whether authenticated requests have permission to carry out specific actions. This layer is also pluggable, and the most common authorization module is RBAC. RBAC comprises four objects that let you define permissions and grant them to authenticated users.

Admission controllers kick in after authorization and are responsible for enforcing policies. Validating admission controllers reject requests if they don’t meet policy requirements, whereas mutating controllers can modify requests to meet policy requirements.


table of contents
search
Settings
Previous chapter
13: StatefulSets
Next chapter
15: The Kubernetes API
Table of contents collapsed
