Skip to Content
3: Getting Kubernetes
This chapter shows you how to install and configure the tools you’ll need to follow every example in the book. These include:

Docker
A Kubernetes cluster
The kubectl command line utility
The easiest way to get all three is Docker Desktop. It installs Docker, includes a multi-node Kubernetes cluster, and automatically installs and configures kubectl. I use it every day, and I highly recommend it. However, you can’t use the Docker Desktop Kubernetes cluster for the examples in Chapter 8 and Chapter 11. This is because they integrate with cloud load balancers and cloud storage services. For those chapters, you’ll need a Kubernetes cluster in the cloud.

I recommend most readers install Docker Desktop because you get Docker and kubectl. You can then choose whether to build a cluster in the cloud or use the one that ships with Docker Desktop. You can even use Docker Desktop’s built-in cluster for some examples and only build a cluster in the cloud for Chapters 8 and 11.

I’ve divided the chapter into the following sections:

Install everything with Docker Desktop
Build a Kubernetes cluster in the Linode Cloud
I’ll provide a link that gets you $100 of free Linode credit that lasts for 60 days and is more than enough to complete all the examples in the book.

Install everything with Docker Desktop
You’ll complete all of the following in this section:

Create a Docker account (they’re free)
Install Docker Desktop
Deploy Docker Desktop’s built-in multi-node Kubernetes cluster
Note: Docker Desktop is free for personal and educational use. If you use it for work, and your company has more than 250 employees or does more than $10M USD in annual revenue, you have to pay for a license.

Create a Docker account
Go to app.docker.com/signup and fill in your details to create a free Personal account.

Install Docker Desktop
Once you’ve created your account, complete the following steps to install Docker Desktop. You need Docker Desktop version 4.38 or newer:

Search the web for Docker Desktop
Download the installer for your system (Linux, Mac, or Windows)
Fire up the installer and follow the next, next, next instructions
Windows users should install the WSL 2 subsystem when prompted.

After the installation completes, you may need to start the app manually. Once it’s running, Mac users get a whale icon in the menu bar at the top, whereas Windows users get the whale in the system tray at the bottom. Clicking the whale exposes some basic controls and shows whether Docker Desktop is running.

Open a terminal and run the following commands to ensure Docker and kubectl are installed and working.

$ docker --version
Docker version 27.5.1, build 9f9e405

$ kubectl version --client=true -o yaml
clientVersion:
  major: "1"
  minor: "31"
  platform: darwin/arm64
Congratulations, you’ve installed Docker and kubectl.

Deploy Docker Desktop’s built-in multi-node Kubernetes cluster
Docker Desktop v4.38 and later ship with a built-in multi-node Kubernetes cluster that’s simple to deploy and use.

Click the Docker whale icon in your menu bar or system tray and sign in. You’ll see your username instead of the Sign in/Sign up option if you’re already signed in.

Once signed in, click the Docker whale again and choose the Settings option to open the GUI.

Ensure the Use containerd for pulling and storing images feature is enabled on the General tab. You may need to click Apply & restart to make the changes.

Select Kubernetes from the left navigation bar, check the Enable Kubernetes option, and choose the kind (sign-in required) option. It’s important you choose this option, as the other option (kubeadm) only creates a single-node cluster.

If you’re running Docker Desktop v4.38 or later and don’t see the kind (sign-in required) option you can try using the konami code to enable it. To do this, enter the following key sequence from the Kubernetes settings page — up, up, down, down, left, right, left, right, b, a. This opens the Experimental features page where you can enable the MultiNodeKubernetes feature. Once you’ve done this, you can go back and try enabling the kind (sign-in required) cluster again.

Assuming you’ve chosen the kind (sign-in required) option, move the Node(s) slider to 3, and check the box next to Show system containers (advanced) option. You can also enable the Kubernetes Dashboard, but none of the book’s examples use it. Your options should look like Figure 3.1.

Figure 3.1 - Docker Desktop Kubernetes configuration
Figure 3.1 - Docker Desktop Kubernetes configuration
This will create a three-node cluster with one control plane node and two workers.

Click Apply & restart. It’ll take a minute or two for your cluster to start, and you can monitor the build progress from the same screen. Once it’s running, you’ll see Kubernetes running in green text at the bottom of the Docker Desktop UI.

Run the following command to see your cluster.

$ kubectl get nodes
NAME                    STATUS   ROLES           AGE   VERSION
desktop-control-plane   Ready    control-plane   10m   v1.32.2
desktop-worker          Ready    <none>          10m   v1.32.2
desktop-worker2         Ready    <none>          10m   v1.32.2
You should see three nodes with the names shown in the example.

Go back to Docker Desktop and navigate to the Containers tab, where you’ll see three containers with the same names as your three cluster nodes. This is because Docker Desktop runs your Kubernetes cluster as containers. Don’t let this confuse you, the user experience is exactly the same.

Figure 3.2 - Cluster nodes as containers
Figure 3.2 - Cluster nodes as containers
Congratulations, you’ve installed Docker and kubectl and deployed a multi-node Kubernetes cluster to your laptop. You’ll be able to use this cluster for most of the examples in the book. However, you’ll need a Kubernetes cluster in the cloud if you want to follow the Ingress and Storage examples in Chapter 8 and Chapter 11. The next section shows you how to build one.

Build a Linode Kubernetes Engine (LKE) cluster in the Linode Cloud
This section shows you how to get a multi-node Kubernetes cluster in the cloud using Linode Kubernetes Engine (LKE). Most other clouds have their own Kubernetes service, and you can use any of them. However, I’ve designed the examples in Chapter 11 to work with Linode cloud storage, meaning you’ll have to change the storage configuration files if you use a different cloud.

I also provide a link that should get new users $100 of free Linode credit, which is more than enough to complete all the examples in the book.

Build a Kubernetes cluster in the Linode Cloud
LKE is a hosted Kubernetes service where Linode builds the cluster and manages availability, performance, and updates. Hosted Kubernetes services like this are close as you’ll get to a zero-effort production-grade Kubernetes cluster.

You’ll complete the following steps to build your LKE cluster:

Sign up for a Linode account
Create your LKE cluster
Configure kubectl
Test your LKE cluster
Sign up for a Linode account
Go to the following link and sign up for your free $100 credit that lasts for sixty days. You’ll need to enter valid billing info in case you spend more or use it for longer than 60 days.

https://bit.ly/4b7YZix
If the link doesn’t work, you can try the full URL.

https://www.linode.com/lp/refer/?r=6107b344722dbd6017ea12da672510a85f8b5e84
I’m unable to help if the link doesn’t work. In that case, you’ll have to sign up from the main linode.com home page, and you may not get the free credit. Either way, you’ll need to create an account and provide payment details.

Create your LKE cluster
Once you’ve created your account, go to cloud.linode.com, select Kubernetes from the left navigation pane, and click the Create Cluster button. Give your cluster the following details:

Cluster label: tkb
Region: Choose a region close to you
Kubernetes Version: Choose a recent version
HA Control Plane: No
Control Plane ACL: Disabled
Add Node Pools: Select the Shared CPU tab and add 3 x Linode 2GB nodes
Your options will look like Figure 3.2, and you’ll have an estimated cluster cost.

Figure 3.3 - LKE cluster settings
Figure 3.3 - LKE cluster settings
Click the Create Cluster button when you’re happy with your cluster configuration and associated costs. It can take a minute or two for Linode to build your cluster.

Your LKE cluster is ready when all three nodes show green in the console, and the only thing left to do is configure kubectl to connect to it.

Configure kubectl
kubectl is the Kubernetes command-line tool and you’ll use it in all the hands-on examples. You’ll already have it if you installed Docker Desktop. If you don’t have it, search the web for install kubectl and follow the instructions for your system. It’s important that you install a version that is within one minor version of your Kubernetes cluster. For example, if your cluster is running Kubernetes v1.32.x, your kubectl should be no lower than v1.31.x and no higher than v1.33.x.

Behind the scenes, kubectl reads your kubeconfig file to know which cluster to send commands to and which credentials to authenticate with. Your kubeconfig file is called config and lives in the following hidden directories depending on your system (you’ll need to configure your system to show hidden folders):

macOS: /Users/<username>/.kube/
Windows: C:\Users\<username>\.kube\
Complete one of the following sections depending on whether you already have a kubeconfig file.

If you don’t have a kubeconfig file
Only complete these steps if you’re sure you don’t have a hidden folder called .kube in your home directory with a file called config:

Create a hidden folder in your home directory called .kube (be sure to include the leading period)
Download your LKE kubeconfig file into this new ~/.kube directory
Rename the file to config
It’s vital that the filename is config with no filename extensions such as .yaml. You may have to configure your system to show filename extensions.

You’re ready to test your LKE cluster.

If you already have a kubeconfig file
Complete these steps if you already have a kubeconfig file. You’ll rename your existing kubeconfig file, merge its contents with your LKE kubeconfig file and, use the new merged version.

Rename your existing kubeconfig file to config-bkp.

Download your LKE kubeconfig file from your Linode Cloud dashboard and copy it into your ~/.kube directory. If you built your LKE cluster according to the earlier instructions, it will be called tkb-kubeconfig.yaml. You’ll need to adjust some of the following commands if your downloaded file has a different name.

Run the following command to merge the configurations from both files and check it worked.

$ export KUBECONFIG=~/.kube/config-bkp:~/.kube/tkb-kubeconfig.yaml

$ kubectl config view
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: DATA+OMITTED
    server: https://127.0.0.1:54225
<Snip>
If you look closely, you should see your LKE cluster’s details listed in the cluster, user, and context sections.

Run the following commands to export the merged configuration into a new kubeconfig file called config and then set the KUBECONFIG environment variable to use the new file.

$ kubectl config view --flatten >  ~/.kube/config

$ export KUBECONFIG=~/.kube/config
The last thing to do is set your current context so that kubectl commands go to your LKE cluster.

If you installed Docker Desktop you can easily switch between contexts by clicking the Docker whale and choosing your LKE context from the Kubernetes Context option. If you didn’t install Docker Desktop, you can run the following commands to list your available contexts and switch to your LKE context. Remember, your LKE context name will be different from mine.

$ kubectl config get-contexts
CURRENT   NAME             CLUSTER          AUTHINFO          NAMESPACE
*         docker-desktop   docker-desktop   docker-desktop
          lke349416-ctx    lke349416        lke349416-admin   default

$ kubectl config use-context lke349416-ctx
Switched to context "lke349416-ctx".
Once you’ve completed these steps, you can move to the next section to test your LKE cluster.

Test your LKE cluster
Open a terminal and run the following command.

$ kubectl get nodes
NAME                             STATUS    ROLES     AGE    VERSION
lke349416-551020-184a46360000    Ready     <none>    19m    v1.32.1
lke349416-551020-1c6f99c20000    Ready     <none>    19m    v1.32.1
lke349416-551020-47ad6c5c0000    Ready     <none>    19m    v1.32.1
You should see three nodes, and their names should begin with lke. They should also have <none> in the ROLES column indicating they’re all worker nodes. This is because Linode manages your control plane and hides it from you.

If you get an error or your node names don’t start with lke, the most likely cause is a problem with your kubeconfig file. Review the previous processes and make sure you completed the steps exactly.

You’re ready to go if you see three nodes with names starting with lke.

Remember to delete your LKE cluster when you’re finished with it to avoid unwanted costs.

More about kubectl and your kubeconfig file
Every time you execute a kubectl command it does the following three things:

Converts the command into an HTTP REST request
Sends the request to the Kubernetes cluster defined in the current-context of your kubeconfig file
Uses the credentials specified in the current-context of your kubeconfig file
Your kubeconfig file is called config and lives in your home directory’s hidden .kube folder. It defines:

Clusters
Users (credentials)
Contexts
Current context
The clusters section is a list of known Kubernetes clusters, the users section is a list of user credentials, and the contexts section is where you match clusters and credentials. For example, you might have a context called ops-prod that combines the ops credentials with the prod cluster. If this is also defined as your current context, kubectl will send all commands to your prod cluster and authenticate with the ops credentials.

Here is a simple kubeconfig file with a single cluster called shield, a single user called coulson, and a single context called director. The director context combines the coulson credentials and the shield cluster. It’s also set as the default context.

apiVersion: v1
kind: Config
clusters:                                    <<---- All known clusters are listed in this block
- name: shield                               <<---- Friendly name for a cluster
  cluster:
    server: https://192.168.1.77:8443        <<---- Cluster's AIP endpoint (API server)
    certificate-authority-data: LS0tLS...    <<---- Cluster's certificate
users:                                       <<---- Users are in this block
- name: coulson                              <<---- Friendly name (not used by Kubernetes)
  user:
    client-certificate-data: LS0tLS1CRU...   <<---- User certificate/credentials
    client-key-data: LS0tLS1CRUdJTiBFQyB     <<---- User private key
contexts:                                    <<---- List of contexts (cluster:user pairs)
- context:                                 
  name: director                             <<---- Context called "director"
    cluster: shield                          <<---- Send commands to this cluster
    user: coulson                            <<---- Authenticate with these credentials
current-context: director                    <<---- kubectl will use this context
You can run a kubectl config view command to view your kubeconfig. The command will redact sensitive data. You can also run a kubectl config current-context to see your current context.

The following example shows a system configured to send kubectl commands to the cluster and credentials defined in the docker-desktop context.

$ kubectl config current-context
docker-desktop
If you installed Docker Desktop, you can easily switch between contexts by clicking the Docker whale and choosing the Kubernetes Context option.

Chapter summary
This chapter showed you a couple of ways to get a Kubernetes cluster. However, lots of other options exist.

I use Docker Desktop’s multi-node Kubernetes cluster most days. However, I also use k3d, KinD, and minikube to get Kubernetes clusters on my laptop. The advantage of Docker Desktop is that it ships with the full suite of Docker development tools and automatically installs kubectl.

You also created a hosted Kubernetes cluster on Linode Kubernetes Engine (LKE) and configured kubectl to use it. However, this cluster may cost money and you should delete it when you’re finished with it.

The chapter finished with an overview of kubectl and your kubeconfig file.


table of contents
search
Settings
Previous chapter
2: Kubernetes principles of operation
Next chapter
4: Working with Pods
Table of contents collapsed
