Skip to Content
12: ConfigMaps and Secrets
Most business applications have two components:

The application
The configuration
Simple examples include web servers such as NGINX and httpd (Apache). Neither is very useful until you add a configuration.

In the past, we packaged applications and their configurations as a single easy-to-deploy unit, and we brought this pattern with us in the early days of cloud-native microservices. However, it’s an anti-pattern, and you should decouple modern applications from their configurations, as it brings the following benefits:

Reuse
Simpler development and testing
Simpler and less-disruptive changes
We’ll explain all these and more as we go through the chapter.

Note: An anti-pattern is something that seems like a good idea but turns out to be a bad idea.

I’ve divided the chapter as follows:

The big picture
ConfigMap theory
Hands-on with ConfigMaps
Hands-on with Secrets
Everything you’ll learn about ConfigMaps applies to Secrets later in the chapter.

The big picture
As previously mentioned, most applications comprise an application binary and a configuration. Kubernetes lets you build and store them as separate objects and bring them together at run time.

Consider a quick example.

Imagine you work for a company with three environments:

Dev
Test
Prod
You perform initial testing in the dev environment, more extensive testing in the test environment, and apps finally graduate to the prod environment. However, each environment has its own network and security policies, as well as its own unique credentials and certificates.

You currently package applications and their configurations together in the same image, forcing you to perform all of the following for every application:

Build three images (one with the dev config, one with the test config, and one with prod)
Store the images in three distinct repositories (one for the dev image, one for test, and one for prod)
Run different configurations of each app in each of the three environments (the dev app in the dev environment, test in test, prod in prod)
Every time you change the app, even a small change like fixing a typo, you have to build, test, store, and re-deploy three times — once for dev, once for test, and once for prod.

It’s also harder to troubleshoot and isolate issues when every update includes the app code and the config.

What it looks like in a decoupled world
Imagine you work for the same company, and they ask you to build a new web app. However, the company now decouples code and configurations.

You decide to base the new app on NGINX and create a hardened NGINX base image that other teams and applications can reuse with their own configurations. This means:

You only build a single image that you’ll use across all three environments
You only store and protect that single image in a single repository
You run the same version of this image in all your environments
To make this work, you build a single base image containing nothing more than the hardened NGINX with no embedded configuration.

You then create three configurations for dev, test, and prod that you’ll apply at run time. Each one configures the hardened NGINX container with the app configuration, policy settings, and credentials for the correct environment. Other teams and applications can reuse the same hardened NGINX image for their own web apps by applying their own configurations.

In this model, you create and test a single version of NGINX, build it into a single image, and store it in a single repository. You can grant all developers access to pull the repository as it contains no sensitive data, and you can push changes to either the application or its configuration independently of each other. For example, if there’s a typo on the homepage, you can fix it in the configuration and push that to existing containers in all three environments. You no longer have to stop and replace every container in all three environments.

Let’s see how Kubernetes makes this possible.

ConfigMap theory
Kubernetes has an API resource called a ConfigMap (CM) that lets you store configuration data outside of Pods and inject it at run time.

ConfigMaps are first-class objects in the core API group. They’re also v1. This tells us a few things:

They’re stable (v1)
They’ve been around for a while (new stuff never goes in the core API group)
You can define and deploy them in YAML files
You can manage them with kubectl
You’ll typically use ConfigMaps to store non-sensitive configuration data such as:

Environment variables
Configuration files like web server configs and database configs
Hostnames
Service name and Service ports
Account names
You should not use ConfigMaps to store sensitive data such as certificates and passwords, as Kubernetes makes no effort to protect their contents. For sensitive data, you should use Kubernetes Secrets as part of a comprehensive secrets management solution.

You’ll work with Secrets later in the chapter.

How ConfigMaps work
At a high level, a ConfigMap is an object for storing configuration data that you can easily inject into containers at run time. You can configure them to work with environment variables and volumes so that they work seamlessly with applications.

Let’s look a bit closer.

Behind the scenes, ConfigMaps are Kubernetes objects that hold a map of key-value pairs:

Keys are an arbitrary name that can include alphanumerics, dashes, dots, and underscores
Values can store anything, including full configuration files with multiple lines and carriage returns
They’re limited to 1MiB (1,048,576 bytes) in size
Here’s an example of a ConfigMap with three entries.

kind: ConfigMap
apiVersion: v1
metadata:
  name: epl
data:
  Competition: Premier League    -----┐
  Season: 2024-2025                   | 3 x map entries (key:value pairs)
  Champions: Liverpool           -----┘
Here’s an example where the value is a complete configuration file.

kind: ConfigMap
apiVersion: v1
metadata:
  name: cm2
data:                       
  test.conf: |                 <<---- Key
    env = plex-test            -----┐
    endpoint = 0.0.0.0:31001        |
    char = utf8                     | Value
    vault = PLEX/test               |
    log-size = 512M            -----┘
Once you’ve created a ConfigMap, you can use any of the following methods to inject it into containers at run time:

Environment variables
Arguments to the container’s startup command
Files in a volume
Figure 12.1 shows how the pieces connect. The ConfigMap exists outside the app, and its values are mapped to standard constructs such as environment variables and volumes that apps can easily access.

Figure 12.1
Figure 12.1
All three methods work without having to add Kubernetes knowledge to existing applications. However, the volume option is the most flexible as it enables updates. You’ll try them all, but first, let’s quickly mention Kubernetes-native applications.

ConfigMaps and Kubernetes-native apps
Kubernetes-native applications know they’re running on Kubernetes and can talk to the Kubernetes API server. This has a lot of benefits, including the ability to read ConfigMaps directly through the API without having to mount them as volumes or via environment variables. It also means live containers can see updates to the ConfigMap. However, apps like these can only run on Kubernetes and create Kubernetes lock-in where your apps only work on Kubernetes.

All of our examples use environment variables and volumes so that existing apps can access ConfigMap data without needing rewrites or being locked to Kubernetes.

Hands-on with ConfigMaps
You’ll need a Kubernetes cluster and the lab files from the book’s GitHub repo if you want to follow along.

$ git clone https://github.com/nigelpoulton/TKB.git
Cloning into 'TKB'...

$ cd TKB

$ git fetch origin

$ git checkout -b 2025 origin/2025

$ cd configmaps
Be sure you’re on the 2025 branch, and run all commands from the configmaps folder.

As with most Kubernetes resources, you can create ConfigMaps imperatively and declaratively. We’ll look at the imperative method first.

Creating ConfigMaps imperatively
You create ConfigMaps imperatively with the kubectl create configmap command. However, you can shorten configmap to cm, and the command accepts two sources of data:

Literal values on the command line (--from-literal)
From a file (--from-file)
Run the following command to create a ConfigMap called testmap1 and populate it with two entries from command-line literals. Windows users should replace the backslashes with backticks at the end of the first two lines.

$ kubectl create configmap testmap1 \
  --from-literal shortname=SAFC \
  --from-literal longname="Sunderland Association Football Club"
Run the following command to see how Kubernetes stores map entries.

$ kubectl describe cm testmap1
Name:         testmap1
Namespace:    default
Labels:       <none>
Annotations:  <none>
Data
====
shortname:
----
SAFC
longname:
----
Sunderland Association Football Club
BinaryData
====
Events:  <none>
You can see it’s just a map of key-value pairs dressed up as a Kubernetes object.

The following command uses the --from-file flag to create a ConfigMap called testmap2 from a file called cmfile.txt. The file contains a single line of text, and you’ll need to run the command from the configmaps folder.

$ kubectl create cm testmap2 --from-file cmfile.txt
configmap/testmap2 created
You’ll inspect this one in the next section.

Inspecting ConfigMaps
ConfigMaps are first-class API objects, meaning you can inspect and query them like any other API object.

List all ConfigMaps in your current Namespace.

$ kubectl get cm
AME       DATA   AGE
testmap1   2      11m
testmap2   1      2m23s
The following kubectl describe command shows some interesting info about the testmap2 map that you created from the local file:

The operation created a single map entry
The name of the key matches the name of the input file (cmfile.txt)
The value stores the contents of the file
$ kubectl describe cm testmap2
Name:         testmap2
Namespace:    default
Labels:       <none>
Annotations:  <none>
Data
====
cmfile.txt:                   <<---- key
----
Kubernetes FTW!               <<---- value
BinaryData
====
Events:  <none>
You can also run a kubectl get command with the -o yaml flag to see the entire object.

$ kubectl get cm testmap2 -o yaml
apiVersion: v1
data:
  cmfile.txt: |
    Kubernetes FTW!
kind: ConfigMap
metadata:
  creationTimestamp: "2025-02-04T14:19:21Z"
  name: testmap2
  namespace: default
  resourceVersion: "18128"
  uid: 146da79c-aa09-4b10-8992-4dffa087dbfb
If you look closely, you’ll notice the spec and status subresources are missing. This is because ConfigMaps don’t have the concept of desired state and observed state. They have a data subresource instead.

Let’s see how to create ConfigMaps declaratively.

Creating ConfigMaps declaratively
The following YAML is from the fullname.yml file in the book’s GitHub repo and defines two map entries: firstname and lastname. It creates a ConfigMap called multimap with the usual kind, apiVersion and metadata fields. However, it has a data subresource instead of the usual spec.

kind: ConfigMap 
apiVersion: v1 
metadata:
  name: multimap 
data:
  firstname: Nigel
  lastname: Poulton
Deploy it with the following command.

$ kubectl apply -f fullname.yml
configmap/multimap created
This next YAML object is from the singlemap.yml file and looks more complex than the previous one. However, it’s actually simpler, as it only has a single entry in the data block. It looks more complicated because the value entry contains an entire configuration file.

kind: ConfigMap 
apiVersion: v1 
metadata:
  name: test-config
data:
  test.conf: |           <<---- Key
    env = plex-test      -----┐
    endpoint = 0.0.0.0:31001  |
    char = utf8               | Value
    vault = PLEX/test         |
    log-size = 512M      -----┘
If you look closely, you’ll see the pipe character (|) after the name of the key property. This tells Kubernetes to treat everything after the pipe as a single value. If you deploy it, you’ll get the ConfigMap shown in the following table called test-config with a single complex map entry:

Object name	Key	Value
test-config	test.conf	env = plex-test
 	 	endpoint = 0.0.0.0:31001
 	 	char = utf8
 	 	vault = PLEX/test
 	 	log-size = 512M
Deploy it with the following command.

$ kubectl apply -f singlemap.yml 
configmap/test-config created
Run the following command to inspect it.

$ kubectl describe cm test-config
Name:         test-config
Namespace:    default
Labels:       <none>
Annotations:  <none>
Data
====
test.conf:
----
env = plex-test
endpoint = 0.0.0.0:31001
char = utf8
vault = PLEX/test
log-size = 512M
BinaryData
====
Events:  <none>
Injecting ConfigMap data into Pods and containers
There are three ways to inject ConfigMap data into containers:

As environment variables
As arguments to container startup commands
As files in a volume
The first two inject data when you create containers and have no way of updating the values in a running container. The volumes option also injects data at creation time, but automatically pushes updates to live containers.

Let’s look at both.

ConfigMaps and environment variables
Figure 12.2 shows the process of using environment variable to inject ConfigMap data into containers. You create the ConfigMap. You then map its entries into environment variables in the containers section of the Pod template. Finally, when Kubernetes starts the container, the environment variables appear as standard Linux or Windows environment variables, meaning apps can consume them without knowing about the ConfigMap.

Figure 12.2
Figure 12.2
You’ve already deployed a ConfigMap called multimap with the following two entries:

firstname=Nigel
lastname=Poulton
The following Pod manifest deploys a single container with two environment variables mapped to the values in the ConfigMap. It’s from the podenv.yml file you’re about to deploy.

FIRSTNAME: Maps to the firstname entry in the CM
LASTNAME: Maps to the lastname entry in the CM
apiVersion: v1
kind: Pod
<Snip>
spec:
  containers:
    - name: ctr1
      env:
        - name: FIRSTNAME       <<---- Environment variable called FIRSTNAME
          valueFrom:            <<---- based on
            configMapKeyRef:    <<---- a ConfigMap
              name: multimap    <<---- called "multimap"
              key: firstname    <<---- and populated by the value in the "firstname" field
        - name: LASTNAME        <<---- Environment variable called LASTNAME
          valueFrom:            <<---- based on
            configMapKeyRef:    <<---- a ConfigMap
              name: multimap    <<---- called "multimap"
              key: lastname     <<---- and populated by the value in the "lastname" field
<Snip>
I’ve given the environment variable names capital letters so you can distinguish them from their ConfigMap counterparts. In reality, you can name them anything you like.

When Kubernetes schedules the Pod, and the container starts, it creates FIRSTNAME and LASTNAME as standard Linux environment variables so that applications can use them without knowing anything about ConfigMaps.

Run the following command to deploy a Pod from the podenv.yml.

$ kubectl apply -f podenv.yml
pod/envpod created
Run the following exec command to list environment variables in the container with the “NAME” string in their name. You’ll see the FIRSTNAME and LASTNAME variables with their values from the ConfigMap.

Make sure the Pod is running before executing the command. Windows users need to replace the grep NAME argument with Select-String -Pattern 'NAME'.

$ kubectl exec envpod -- env | grep NAME
HOSTNAME=envpod
FIRSTNAME=Nigel    
LASTNAME=Poulton
Remember though, environment variables are static. This means you can update the values in the map, but the envpod won’t get the updates.

ConfigMaps and container startup commands
The concept of using ConfigMaps with container startup commands is simple. You specify the container’s startup command in the Pod template and pass in environment variables as arguments.

The following example is from the podstartup.yml file. It describes a single container called args1 based on the busybox image. It then defines and populates two environment variables from the multimap ConfigMap and references them in the container’s startup command.

The main difference with the previous configuration is the spec.containers.command line that references the environment variables.

spec:
  containers:
    - name: args1
      image: busybox
      env:                         ----┐
        - name: FIRSTNAME              |
          valueFrom:                   |
            configMapKeyRef:           |
              name: multimap           | Same environment variable mappings
              key: firstname           | as previous example. But this time
        - name: LASTNAME               | used by the startup command below
          valueFrom:                   |
            configMapKeyRef:           |
              name: multimap           |
              key: lastname        ----┘
      command: [ "/bin/sh", "-c", "echo First name $(FIRSTNAME) last name $(LASTNAME)" ]
Figure 12.3 summarizes how the ConfigMap entries get populated to the environment variables and then referenced in the startup command.

Figure 12.3 - Mapping ConfigMap entries to startup commands
Figure 12.3 - Mapping ConfigMap entries to startup commands
Start a new Pod from the podstartup.yml file. The Pod will start, print First name Nigel last name Poulton to the container’s logs, and then quit (succeed). It might take a few seconds for the Pod to start and execute.

$ kubectl apply -f podstartup.yml
pod/startup-pod created
Run the following command to inspect the container’s logs and verify it printed First name Nigel last name Poulton.

$ kubectl logs startup-pod -c args1
First name Nigel last name Poulton
Describing the Pod will show the following data about the environment variables.

$ kubectl describe pod startup-pod
<Snip>
Environment:
  FIRSTNAME:  <set to the key 'firstname' of config map 'multimap'> 
  LASTNAME:  <set to the key 'lastname' of config map 'multimap'> 
<Snip>
As you’ve seen, using ConfigMaps with container startup commands still uses environment variables. As such, it suffers from the same limitation — updates to the ConfigMap don’t get pushed to existing variables.

If you ran the startup-pod, it should be in the completed state. This is because it completed its task and then terminated. Delete it.

$ kubectl delete pod startup-pod
pod "startup-pod" deleted
ConfigMaps and volumes
Using ConfigMaps with volumes is the most flexible option. They let you reference entire configuration files and they get updates. However, it can take a minute or two for the updates to appear in your containers.

The high-level process of injecting ConfigMap data into containers via volumes is as follows:

Create the ConfigMap
Define a ConfigMap volume in the Pod template
Mount the ConfigMap volume into the container
ConfigMap entries will appear as files inside the container
Figure 12.4 shows the process.

Figure 12.4 - Mapping ConfigMap entries through a volume
Figure 12.4 - Mapping ConfigMap entries through a volume
You’ve already deployed the multimap ConfigMap, and it has the following values:

firstname=Nigel
lastname=Poulton
The following YAML is from the podvol.yml file and defines a Pod called cmvol with the following configuration:

spec.volumes creates a volume called volmap based on the multimap ConfigMap
spec.containers.volumeMounts mounts the volmap volume to /etc/name in the container
apiVersion: v1
kind: Pod
metadata:
  name: cmvol
spec:                             
  volumes:                        
    - name: volmap                <<---- Create a volume called "volmap"
      configMap:                  <<---- based on the ConfigMap
        name: multimap            <<---- called "multimap"
  containers:
    - name: ctr
      image: nginx
      volumeMounts:               <<---- These lines mount the
        - name: volmap            <<---- "volmap" volume into the
          mountPath: /etc/name    <<---- container at "/etc/name"
Run the following command to deploy the cmvol Pod from the previous YAML.

$ kubectl apply -f podvol.yml
pod/cmvol created
Wait for the Pod to enter the running phase and then run the following command to list the files in the container’s /etc/name/ directory.

$ kubectl exec cmvol -- ls /etc/name
firstname
lastname
You can see the container has two files matching the ConfigMap entries. Feel free to run additional kubectl exec commands to cat the contents of the files and ensure they match the values in the ConfigMap.

Now, let’s prove that changes you make to the map appear in your live cmvol container.

Use kubectl edit to edit the ConfigMap and change any value in the data block. The command will open the YAML object in your default editor, which is usually vi on Linux and Mac, and usually notepad.exe on Windows. If you’re uncomfortable using vi, you can manually edit the YAML file in a different editor and use kubectl apply to re-post it to the API server.

I’ve annotated the code block to show which lines to change.

$ kubectl edit cm multimap

# Please edit the object below. Lines beginning with a '#' will be ignored,
# and an empty file will abort the edit. If an error occurs while saving 
# this file will be reopened with the relevant failures.
#
apiVersion: v1
data:
  City: Macclesfield       <<---- changed
  Country: UK              <<---- changed
kind: ConfigMap
metadata:
<Snip>
Save your changes and check if the updates appear in the container. It may take a minute or so for your changes to appear.

$ kubectl exec cmvol -- ls /etc/name
City
Country

$ kubectl exec cmvol -- cat /etc/name/Country
UK
Congratulations, you’ve surfaced the contents of the multimap ConfigMap into the container’s filesystem via a ConfigMap volume, and you’ve proved the volume received your updates.

Hands-on with Secrets
Secrets work the same as ConfigMaps — they hold configuration data that Kubernetes injects into containers at run time. However, Secrets are designed to work as part of a more comprehensive secrets management solution for storing sensitive data such as passwords, certificates, and OAuth tokens.

Are Kubernetes Secrets secure?
The quick answer to this question is no. But here’s the slightly longer answer…

A secure secrets management system involves a lot more than just Kubernetes Secrets. You have to consider all of the following and more:

Encryption of secrets while at rest in the cluster store
Encryption of secrets while in flight on the network
Protection of secrets when surfaced in nodes/Pods/containers
Controlling API access to secrets via least privilege RBAC
Controlling access to etcd nodes (cluster store)
Preventing privileged containers from accessing secrets
Preventing exposure via source code repositories like GitHub
Securely deleting secrets when no longer in use
Most new Kubernetes clusters do none of those things — they store them unencrypted in the cluster store, send them over the network in plain text, and mount them in containers as plain text! However, you can configure EncryptionConfiguration objects to encrypt Secrets at rest in the cluster store, deploy a service mesh to encrypt all network traffic, and configure strong RBAC to secure API access to Secrets. You can even restrict access to control plane nodes and etcd nodes, securely delete secrets after use, and more.

In the real world, many production clusters implement service meshes that secure network traffic, and they store secrets outside of Kubernetes in 3rd party vaults such as HashiCorp’s Vault or similar cloud services. Kubernetes even has a native Secrets Store CSI Driver for integrating with external vaults.

As you can imagine, there are lots of vaults and secrets management systems, and they all have their own complex configurations. With this in mind, we’ll focus on what you get out-of-the-box with most Kubernetes installations and leave the intricacies of specific platforms to you.

A typical secrets workflow that only uses Kubernetes Secrets looks like this:

You create the Secret which Kubernetes persists to the cluster store as an un-encrypted object
You schedule a Pod with a container that uses the Secret
Kubernetes transfers the un-encrypted Secret over the network to the node running the Pod
The kubelet on the node starts the Pod and its containers
The container runtime mounts the Secret into the container via an in-memory tmpfs filesystem and decodes it from base64 to plain text
The application consumes it
When you delete the Pod, Kubernetes deletes the copy of the Secret on the node (it keeps the copy in the cluster store)
An obvious use case for Secrets is a TLS termination proxy. Figure 12.5 shows a single image configured with three different Secrets for three different environments. Each of the Secrets could contain the TLS certificates for the specific environment, and Kubernetes loads the appropriate Secret into each container at run time.

Figure 12.5 - Injecting Secrets at run time
Figure 12.5 - Injecting Secrets at run time
Creating Secrets
Remember that most Kubernetes installations do nothing to encrypt Secrets in the cluster store or while in flight on the network. And even if you implement these, they’re always surfaced as plain text in containers so that applications can easily consume them.

As with all API resources, you can create Secrets imperatively and declaratively.

Run the following command to create a new Secret called creds. Remember to replace the backslash with a backtick if you’re on Windows.

$ kubectl create secret generic creds \
  --from-literal user=nigelpoulton \
  --from-literal pwd=Password123
You learned earlier that Kubernetes obscures Secrets by encoding them as base64 values. Check this with the following command.

$ kubectl get secret creds -o yaml
apiVersion: v1
kind: Secret
data:
  pwd: UGFzc3dvcmQxMjM=
  user: bmlnZWxwb3VsdG9u
<Snip>
The username and password values are both base64 encoded. Run the following command to decode them. You’ll need the base64 utility installed on your system for the command to work. If you don’t have it, you can use an online decoder.

$ echo UGFzc3dvcmQxMjM= | base64 -d
Password123
The decoding completes successfully without a key, proving that base64 encoding is not secure. As such, you should never store Secrets on platforms like GitHub, as anyone with access can read them.

The following YAML object is from the tkb-secret.yml file in the configmaps folder. It describes a Secret called tkb-secret with two base64-encoded entries. You can add plain text entries by changing the data block to stringData, but you should never store either type on places like GitHub, as anyone with access can read them.

apiVersion: v1
kind: Secret
metadata:
  name: tkb-secret
  labels:
    chapter: configmaps
type: Opaque
data:                          <<---- Change to "stringData" for plain text entries
  username: bmlnZWxwb3VsdG9u
  password: UGFzc3dvcmQxMjM=
Deploy it to your cluster. Be sure to run the command from the configmaps folder.

$ kubectl apply -f tkb-secret.yml 
secret/tkb-secret created
Run kubectl get and kubectl describe commands to inspect it.

Using Secrets in Pods
In this section, you’ll deploy a Pod that uses the tkb-secret you created in the previous section.

Secrets work like ConfigMaps, meaning you can inject them into containers as environment variables, command line arguments, or volumes. As with ConfigMaps, the most flexible option is a volume.

The following YAML is from the secretpod.yml file and describes a single-container Pod with a Secret volume called secret-vol based on the tkb-secret you created in the previous step. It mounts secret-vol into the container at /etc/tkb.

apiVersion: v1
kind: Pod
metadata:
  name: secret-pod
  labels:
    topic: secrets
spec:
  volumes:
  - name: secret-vol             <<---- Volume name
    secret:                      <<---- Volume type
      secretName: tkb-secret     <<---- Populate volume with this Secret
  containers:
  - name: secret-ctr
    image: nginx
    volumeMounts:
    - name: secret-vol           <<---- Mount the volume defined above
      mountPath: "/etc/tkb"      <<---- into this path
Secret volumes are resources in the Kubernetes API, and Kubernetes automatically mounts them as read-only to prevent containers and applications from accidentally mutating their contents.

Deploy the Pod with the following command. This causes Kubernetes to transfer the unencrypted Secret over the network to the kubelet on the node running the Pod. From there, the container runtime mounts it into the container using a tmpfs mount.

$ kubectl apply -f secretpod.yml
pod/secret-pod created
Run the following command to see the Secret mounted in the container as two files at /etc/tkb — one file for each entry in the Secret.

$ kubectl exec secret-pod -- ls /etc/tkb                  
password
username
If you inspect the contents of either file, you’ll see they’re mounted in plain text so that applications can easily consume them.

$ kubectl exec secret-pod -- cat /etc/tkb/password
Password123
Well done. You’ve created a Secret and mounted it into a Pod via a Secret volume. As you chose the volume option, you can update the Secret and the app will see it.

Remember, a complete secrets management solution involves a lot more than just storing sensitive data in Kubernetes Secrets. You need to encrypt them at rest, encrypt them in flight, control API access, restrict etcd node access, handle privileged containers, prevent Secret manifest files from being hosted on public source control repos, and more. Most real-world solutions store secret data outside of Kubernetes in a 3rd-party vault.

Clean up
Use kubectl get to list the Pods, ConfigMaps and Secrets you’ve deployed.

$ kubectl get pods
NAME           READY    STATUS       RESTARTS    AGE
cmvol          1/1      Running      0           27m
envpod         1/1      Running      0           22m
secret-pod     1/1      Running      0           16m

$ kubectl get cm
NAME                DATA    AGE
kube-root-ca.crt    1       71m    <<---- Don't delete this one
multimap            2       19m
test-config         1       17m
testmap1            2       24m
testmap2            1       22m

$ kubectl get secrets
NAME          TYPE      DATA    AGE
creds         Opaque    2       4m55s
tkb-secret    Opaque    2       3m35s
Now delete them. It can take a few seconds for the Pods to delete.

$ kubectl delete pods cmvol envpod secret-pod

$ kubectl delete cm multimap test-config testmap1 testmap2

$ kubectl delete secrets creds tkb-secret
Chapter Summary
ConfigMaps and Secrets are how you decouple applications from their configuration data.

Both are first-class objects in the Kubernetes API, meaning you can create them imperatively and declaratively and inspect them with kubectl.

ConfigMaps are designed for application configuration parameters and even entire configuration files, whereas Secrets are for sensitive data and intended for use as part of a wider secrets management solution.

You can inject both into containers at run time via environment variables, container start commands, and volumes. Volumes are the preferred method as they propagate changes to live containers.

Kubernetes does not automatically encrypt Secrets in the cluster store or while transmitting them over the network.


table of contents
search
Settings
Previous chapter
11: Kubernetes storage
Next chapter
13: StatefulSets
Table of contents collapsed
