Skip to Content
9: Wasm on Kubernetes
Wasm (WebAssembly) is driving a new wave of cloud computing, and platforms like Kubernetes and Docker are evolving to take advantage.

Virtual Machines were the first wave, containers were the second, and Wasm is the third. Each subsequent wave enables smaller, faster, and more portable applications that can go places and do things the previous waves couldn’t.

Figure 9.1
Figure 9.1
I’ve split the chapter as follows:

Wasm Primer
Understanding Wasm on Kubernetes
Hands-on with Wasm on Kubernetes
The Wasm Primer section gets you up-to-speed on what Wasm is and its pros and cons. The Understanding Wasm on Kubernetes section overviews the requirements for running Wasm apps on Kubernetes. Finally, the Hands-on with Wasm on Kubernetes section walks you through the end-to-end process of building and configuring a Kubernetes cluster capable of running Wasm apps, as well as writing, compiling, containerizing, and running a Wasm app on Kubernetes.

There are other simpler ways of creating Wasm apps and configuring Kubernetes to run them. For example, the SpinKube project from Fermyon automates many of the things you’re about to learn, and you’ll probably use something like SpinKube in the real world. But doing everything manually, as you will in this chapter, will help you gain a deeper understanding.

A quick word on terminology.

The terms Wasm and WebAssembly mean the same thing, and we’ll use them interchangeably. In fact, Wasm is short for WebAssembly and isn’t an acronym. This means the correct way to write it is Wasm, not WASM. However, be kind to people and don’t be critical of unimportant mistakes like this.

Also, Wasm on Kubernetes is only one of many use cases covered by terms such as “WebAssembly outside the browser”, “WebAssembly on the server”, “WebAssembly in the cloud”, and “WebAssembly at the edge”.

Wasm Primer
WebAssembly first appeared on the scene in 2017 and immediately made a name for itself by speeding up web apps. Fast-forward eight years, and it’s an official W3C standard, it’s in all the major browsers, and it’s the go-to solution for web games and web apps that require high performance without sacrificing security and portability.

It should, therefore, come as no surprise that cloud entrepreneurs observed the rise of WebAssembly and realized it would be a great technology for cloud apps.

In fact, Wasm is such a great fit for the cloud that Docker Founder Solomon Hykes famously tweeted, “If Wasm+WASI existed in 2008, we wouldn’t have needed to create Docker. That’s how important it is. WebAssembly on the server is the future of computing. A standardized system interface was the missing link. Let’s hope WASI is up to the task!”.

He quickly followed up with another tweet saying he expected a future where Linux containers and Wasm containers work side-by-side, and Docker works with them all.

Well, Solomon’s predicted future is already here. Docker has excellent support for Wasm, and you can run Linux containers side-by-side with Wasm containers in the same Kubernetes Pod. However, the Wasm standards and ecosystem are still relatively new, meaning traditional Linux containers remain the best solution for many cloud apps and use cases.

On the technical side, Wasm is a binary instruction set architecture (ISA) like ARM, x86, MIPS, and RISC-V. This means programming languages can compile source code into Wasm binaries that will run on any system with a Wasm runtime. Wasm apps execute inside a deny-by-default secure sandbox that distrusts the application, meaning access to everything is denied and must be explicitly allowed. This is the opposite of containers that start with everything wide open.

WASI is the WebAssembly System Interface and allows sandboxed Wasm apps to securely access external services such as key-value stores, networks, the host environment, and more. WASI is absolutely vital to the success of Wasm outside the browser, and at the time of writing, WASI Preview 2 is released and is a huge step forward.

You’ll sometimes see WASI Preview 2 written as WASI 0.2 and wasip2.

Let’s quickly cover the security, portability, and performance aspects of Wasm.

Wasm security
Wasm starts with everything locked down. Containers start with everything wide open.

Despite containers defaulting to an open security policy, it’s important to acknowledge the incredible work done by the community securing containers and container orchestration platforms. It’s easier than ever to run secure containerized apps, especially on hosted Kubernetes platforms. However, the allow-by-default model with broad access to a shared kernel will always present security challenges for containers.

Wasm is very different. Wasm apps execute in a deny-by-default sandbox where the runtime has to explicitly allow access to resources outside the sandbox. You should also know that this sandbox has been battle-hardened through many years of use in one of the most hostile environments in the world… the web!

Wasm portability
It’s a common misconception that containers are portable. They’re not!

We only think containers are portable because they’re smaller than VMs and easier to copy between hosts and registries. However, this isn’t true portability. In fact, containers are architecture-dependent, meaning they’re not portable. For example, you cannot run an ARM container on an AMD processor or a Windows container on a Linux system.

Yes, it’s true that build tools have made it a lot easier to build container images for different platforms. However, each container still only works on one platform or architecture, and many organizations end up with image sprawl. As an oversimplified example, I maintain two images for most of the apps in this book — one for Linux on ARM and another for Linux on AMD64. Sometimes, I’ll update an app and forget to build the Linux/amd64 image, causing examples to fail for readers running Kubernetes on Linux/amd64.

WebAssembly solves this and delivers on the build once, run everywhere promise!

It does this by implementing its own bytecode format that requires a runtime to execute. You build an app once as a Wasm binary, which you can then run on any system with a Wasm runtime.

As a quick example, I built the sample app for this chapter on an ARM-based Mac. However, I compiled it to Wasm, meaning it’ll run on any host with an appropriate Wasm runtime. Later in the chapter, we’ll execute it on a Kubernetes cluster that could be on your laptop, in a data center, or in the cloud. It can also run on any architecture supported by Kubernetes. Wasm runtimes even exist for exotic architectures that you find on IoT and edge devices.

Speaking of IoT devices, Wasm apps are typically a lot smaller than Linux containers, meaning you can run them in resource-constrained environments, such as the edge and IoT, where you can’t run containers.

In summary, Wasm delivers on the promise of build once, run anywhere.

Wasm performance
As a general rule, VMs take minutes to start, and containers take seconds, but Wasm gets us into the exciting world of sub-second start times. So much so that Wasm cold starts are so fast they don’t feel like cold starts. For example, Wasm apps commonly start in around ten milliseconds or less. And with the right optimizations, some can start in microseconds!

This is game-changing and is driving a lot of the early use cases. For example, Wasm is great for event-driven architectures like serverless functions. It also makes things like true scale-to-zero a possibility.

Quick recap
Wasm apps are smaller, faster, more portable, and more secure than traditional Linux containers. However, it’s still the early days, and Wasm isn’t the right choice for everything. Currently, Wasm is a great choice for event handlers and anything needing super-fast startup times. It can also be great for IoT, edge computing, and building extensions and plugins. However, at the time of writing, containers may still be the better choice for traditional cloud apps where networking, heavy I/O, and connecting to other services are requirements.

Despite all of this, Wasm is developing fast, and WASI Preview 2 is a significant step forward.

Now that we know a bit about Wasm, let’s see how it can work with Kubernetes.

Understanding Wasm on Kubernetes
This section introduces the major requirements for running Wasm apps on Kubernetes clusters that use containerd. Other ways to run Wasm apps on Kubernetes exist.

This is also just an overview section. We’ll cover everything in more detail in the hands-on section.

Kubernetes is a high-level orchestrator that uses other tools to perform low-level tasks such as creating, starting, and stopping containers. The most common configuration is Kubernetes using containerd to manage these lower-level tasks.

Figure 9.2 shows Kubernetes scheduling tasks to a worker node that’s running containerd. In the example, containerd receives the work tasks and instructs runc to build the containers and start the apps. Once the containers are running, runc exits, leaving the shim processes to maintain the connections between the running containers and containerd.

Figure 9.2
Figure 9.2
In this architecture, everything below containerd is hidden from Kubernetes. This means you can replace runc and the standard shim with a Wasm runtime and a Wasm shim. Figure 9.3 shows the same node running two additional Wasm workloads.

Figure 9.3
Figure 9.3
Remember, there’s still a single containerd instance on the node, and Kubernetes doesn’t see anything below containerd. This is a fully supported configuration, and we’ll deploy something very similar in the hands-on section.

It’s also worth noting that the Wasm shim architecture differs from the runc shim architecture. As shown in Figure 9.4, a Wasm shim is a single binary that includes the shim code and the Wasm runtime code.

Figure 9.4
Figure 9.4
The Wasm shim code that interfaces with containerd is runwasi, but each shim can embed a specific Wasm runtime. For example, the Spin shim embeds the runwasi Rust library and the Spin runtime code. Likewise, the Slight shim embeds runwasi and the Slight runtime. In each shim, the embedded Wasm runtime creates the Wasm host and executes the Wasm app, while runwasi does all the translating and interfacing with containerd.

One last thing on shims. containerd mandates that we name all shim binaries as follows:

Use the containerd-shim- prefix
Specify the name of the runtime
Specify the version
As an example, the Spin shim is called containerd-shim-spin-v2.

Figure 9.5 shows a Kubernetes cluster with two nodes running different shims. One is running the WasmEdge shim and the other is running the Spin shim. In configurations like this, Kubernetes needs help scheduling workloads to nodes with the correct shims. We provide this help through node labels and RuntimeClass objects. Node 2 in the diagram has the spin=yes label, and Kubernetes has a RuntimeClass object that selects on this label and specifies the target runtime in the handler property. This ensures any Pod referencing this RuntimeClass will be scheduled to Node 2 and use the Spin runtime (handler).

Don’t worry if this is confusing, everything will all fall into place when we do the hands-on exercises.

Figure 9.5
Figure 9.5
The workflow to deploy a Wasm app to a Kubernetes cluster using containerd is as follows:

Write the app and compile it as a Wasm binary
Package the Wasm binary as an OCI image and store it in an OCI registry
Install the appropriate Wasm shim on at least one cluster node and label the node
Create a RuntimeClass that specifies the node labels and Wasm shim
Create a Pod for the Wasm app (use the Wasm image from step 2)
Reference the RuntimeClass in the Pod
Deploy the Pod to Kubernetes
All of the following will happen when you deploy the Pod:

Kubernetes will schedule the Pod a node matching the node selector in the RuntimeClass
The kubelet on the node will pass the work to containerd with the shim info from the RuntimeClass
containerd will start the app using the shim requested in the RuntimeClass
Talk is cheap. Let’s do it.

Hands-on with Wasm on Kubernetes
Before starting this section, you’ll need a clone of the book’s GitHub repo and you’ll need to be on the 2025 branch.

$ git clone https://github.com/nigelpoulton/TKB.git
<Snip>

$ cd TKB

$ git fetch origin

$ git checkout -b 2025 origin/2025
Now change into the wasm folder.

$ cd TKB/wasm
In this section, you’ll complete all the following steps to write a Wasm app and run it on a multi-node Kubernetes cluster:

Install and test the pre-requisites
Write and compile the Wasm app
Build it into an OCI image and push it to an OCI registry
Build and configure a new multi-node Kubernetes cluster for Wasm
Deploy the app to Kubernetes
In the real world, cloud platforms and tools such as SpinKube will simplify and automate much of the process. However, you’ll perform the steps manually, giving you a deeper understanding of everything involved so you’re ready to deploy and manage Wasm apps on Kubernetes in the real world.

Install and test the pre-requisites
You’ll need all of the following if you plan on following along:

An up-to-date version of Docker Desktop with Wasm support enabled
Rust 1.82 or later with the wasm32-wasip1 target installed
Spin 3.1.2 or later
k3d 5.8.1 or later
See Chapter 3 if you haven’t installed Docker.

Go to https://www.rust-lang.org/tools/install to install Rust.

Once you’ve installed it, run the following command to install the wasm32-wasip1 target so Rust can compile code to Wasm binaries.

$ rustup target add wasm32-wasip1
info: downloading component 'rust-std' for 'wasm32-wasip1'
info: installing component 'rust-std' for 'wasm32-wasip1'
Spin is a popular Wasm framework that includes a Wasm runtime and tools to build and work with Wasm apps. Search the web for install Fermyon Spin and follow the installation instructions for your platform.

Run the following command to confirm the installation worked.

$ spin --version
spin 3.1.2 (3d37bd8 2025-01-13)
With Rust and Spin configured, it’s time to write the app.

Write and compile the Wasm app
In this section, you’ll use Spin to build and compile a Wasm app.

Run the following spin new command from within the wasm folder and complete the prompts as shown. This will scaffold a simple Spin app that responds to web requests on port 80 on the /tkb path. TKB is short for The Kubernetes Book.

$ spin new tkb-wasm -t http-rust
Description []: My first Wasm app
HTTP path [/...]: /tkb
You’ll have a new directory called tkb-wasm containing everything needed to build and run the app.

Change into the tkb-wasm directory and list its contents. If your system doesn’t have the tree command, you can try running an ls -R or equivalent Windows command.

$ cd tkb-wasm

$ tree
├── Cargo.toml
├── spin.toml
└── src
    └── lib.rs

2 directories, 3 files
We’re only interested in two files:

spin.toml tells Spin how to build and run the app
src/lib.rs is the app source code
Edit the src/lib.rs file so that it returns the text The Kubernetes Book loves Wasm!. Only change the text on the line indicated by the annotation in the snippet.

use spin_sdk::http::{IntoResponse, Request, Response};
<Snip>
fn handle_tkb_wasm(req: Request) -> anyhow::Result<impl IntoResponse> {
    println!("Handling request to {:?}", req.header("spin-full-url"));
    Ok(Response::builder()
        .status(200)
        .header("content-type", "text/plain")
        .body("The Kubernetes Book loves Wasm!")             <<---- Only change this line
        .build())
}
Save your changes and run a spin build to compile the app as a Wasm binary. Behind the scenes, spin build runs a more complicated cargo build command from the Rust toolchain.

$ spin build
Building component tkb-wasm with `cargo build --target wasm32-wasip1 --release`
    Updating crates.io index
    <Snip>
Finished building all Spin components
Congratulations, you just built and compiled a Wasm app!

The application binary is called tkb_wasm.wasm in the target/wasm32-wasip1/release/ folder. This will run on any machine with the Spin Wasm runtime. Later in the chapter, you’ll run it on a Kubernetes node with the Spin Wasm runtime.

Build an OCI image and push it to an OCI registry
Now that you’ve compiled the app, the next step is to package it as a container so you can share it on an OCI registry and run it on Kubernetes.

The first thing you need is a Dockerfile telling Docker how to package it as an OCI image.

Create a new Dockerfile in the tkb-wasm folder with the following content. Be sure to include the periods at the end of the last two lines.

FROM scratch
COPY /target/wasm32-wasip1/release/tkb_wasm.wasm .
COPY spin.toml .
The FROM scratch line tells Docker to package your Wasm app inside an empty scratch image instead of a typical Linux base image. This keeps the image small and helps build a minimal container at runtime. You can do this because Wasm apps don’t need a container with a Linux filesystem and other constructs. However, platforms such as Docker and Kubernetes use tools that expect to work with basic container constructs and packaging your Wasm app in a scratch image accomplishes this. At runtime, the Wasm app and Wasm runtime will execute inside a minimal container that is basically just namespaces and cgroups (no filesystem etc.).

The first COPY instruction copies the compiled Wasm binary into the container’s root folder. The second one copies the spin.toml file into the same root folder.

The spin.toml file tells the spin runtime where the Wasm app is and how to execute it. Right now, it expects the Wasm app to be in the target/wasm32-wasip1/release folder, but the Dockerfile copies it to the root folder in the container. This means you need to update the spin.toml file to expect it in the root (/) folder.

Edit the spin.toml file and strip the leading path from the [component.tkb-wasm] source field to look like this. The annotation in the snippet is only there to show you which line to change, do not include it in your file.

$ vim spin.toml
<Snip>
[component.tkb-wasm]
source = "tkb_wasm.wasm"      <<---- Remove the leading path from this line
<Snip>
At this point, you have all the following:

A Wasm app (Wasm binary)
A spin.toml file telling the Spin Wasm runtime how to execute the Wasm app
A Dockerfile telling Docker how to build the Wasm app into an OCI image
Run the following command to build the Wasm app into an OCI image. You’ll need to use your own Docker Hub username on the last line if you plan on pushing it to a registry in a later step.

$ docker build \
  --platform wasi/wasm \
  --provenance=false \
  -t nigelpoulton/k8sbook:wasm-0.2 .
The --platform wasi/wasm flag sets the OS and Architecture of the image. Tools like docker run and containerd can read these attributes at runtime to help them create the container and run the app.

Check the image exists on your local machine. Feel free to run a docker inspect and verify the OS and Architecture attributes.

$ docker images
REPOSITORY              TAG         IMAGE ID        CREATED          SIZE
nigelpoulton/k8sbook    wasm-0.2    a003c43b1308    7 seconds ago    104kB
Notice how small the image is. Similar hello world Linux containers are usually several megabytes in size.

Congratulations! You’ve created a Wasm app and packaged it as an OCI image that you can push to a registry so that Kubernetes can pull it later. You don’t have to push the image to a registry, as I have a pre-created image you can use. However, if you do push it to a registry, you’ll need to replace the image tag with the one you created in the earlier step. You’ll also need an account on the registry you’re pushing to.

$ docker push nigelpoulton/k8sbook:wasm-0.2
The push refers to repository [docker.io/nigelpoulton/k8sbook]
4073bf46d785: Pushed
7893057c9bbc: Pushed
wasm-0.2: digest: sha256:a003c43b1308dce78c8654b7561d9a...779c5c9f9b51979c9925f6f size: 695
So far, you’ve written an app, compiled it to Wasm, packaged it as an OCI image, and pushed it to a registry. Next, you’ll build and configure a Kubernetes cluster capable of running Wasm apps.

Build and configure a new multi-node Kubernetes cluster for Wasm
This section shows you how to build a new k3d Kubernetes cluster on your local machine and configure it for Wasm. It’s based on a custom k3d image that includes pre-installed Wasm shims that other clusters might not include. This means you’ll need to build this exact cluster if you want to follow along.

You’ll complete all of the following steps:

Install k3d
Build a 3-node Kubernetes cluster (one control plane node and two workers)
Inspect the Wasm configuration on one of the worker nodes
Label one of the worker nodes so that Kubernetes knows it can run Wasm apps
Create a RuntimeClass so Kubernetes knows where to schedule Wasm apps
Go to the k3d.io homepage and scroll down until you find the installation instructions for your platform. Follow the instructions and then run a k3d --version command to ensure it is installed correctly.

Once you’ve installed k3d, run the following command to create a new k3d cluster called wasm. Doing this will also change your kubectl context to the new cluster.

$ k3d cluster create wasm \
      --image ghcr.io/deislabs/containerd-wasm-shims/examples/k3d:v0.11.1 \
      -p "5005:80@loadbalancer" --agents 2
The first line creates a new cluster called wasm.

The --image flag tells k3d which image to use to build the control plane node and worker nodes. This is a special image that includes containerd Wasm shims.

The -p flag creates a load balancer that connects to an Ingress on the cluster and maps port 5005 on your host machine to an Ingress on port 80 inside the cluster.

The --agents 2 flag creates two worker nodes.

Once the cluster is up, you can test connectivity with the following command. You should see three nodes — one control plane node and two workers.

$ kubectl get nodes
NAME                 STATUS    ROLES            AGE    VERSION
k3d-wasm-server-0    Ready     control-plane    17s    v1.27.8+k3s2
k3d-wasm-agent-1     Ready     <none>           15s    v1.27.8+k3s2
k3d-wasm-agent-0     Ready     <none>           15s    v1.27.8+k3s2
You need at least one cluster node with both of the following if you want to run Wasm workloads:

containerd installed and running
A containerd Wasm shim installed and registered
Exec onto the k3d-wasm-agent-1 worker node and check if containerd is running.

$ docker exec -it k3d-wasm-agent-1 ash

$ ps | grep containerd
PID   USER     COMMAND
98    0        containerd
<Snip>
Now check the node for Wasm shims. The shim files should be in the /bin directory and named according to the containerd shim naming convention, which prefixes the shim name with containerd-shim- and requires a version number at the end. The following output shows five shims — containerd-shim-runc-v2 is the default shim for executing Linux containers, and the other four are Wasm shims. The important one for us is the Spin shim called containerd-shim-spin-v2.

$ ls /bin | grep shim
containerd-shim-lunatic-v1
containerd-shim-runc-v2
containerd-shim-slight-v1
containerd-shim-spin-v2
containerd-shim-wws-v1
The presence of a Wasm shim in the filesystem isn’t enough, they also need to be registered with containerd and loaded as part of the containerd config.

Check the config.toml containerd configuration file for Wasm shim entries. You can usually find the file in /etc/containerd, but k3d currently stores it in a different location. I’ve trimmed the output so it only shows the Wasm runtimes.

$ cat /var/lib/rancher/k3s/agent/etc/containerd/config.toml

<Snip>
[plugins.cri.containerd.runtimes.spin]
  runtime_type = "io.containerd.spin.v2"

[plugins.cri.containerd.runtimes.slight]
  runtime_type = "io.containerd.slight.v1"

[plugins.cri.containerd.runtimes.wws]
  runtime_type = "io.containerd.wws.v1"

[plugins.cri.containerd.runtimes.lunatic]
  runtime_type = "io.containerd.lunatic.v1"
You can also run the following command to verify the active containerd config. It parses the output for references to the Spin Wasm shim.

$ containerd --config \
  /var/lib/rancher/k3s/agent/etc/containerd/config.toml \
  config dump | grep spin

<Snip>
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.spin]
    runtime_type = "io.containerd.spin.v2"
    [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.spin.options]
You’ve confirmed that containerd is running and the Spin Wasm shim is present and registered. This means the node can run Spin apps in Wasm containers.

All nodes in your k3d cluster are running the same shims, meaning every node can run Wasm apps and no further work is needed. However, most real-world environments have heterogeneous node configurations where different nodes have different shims and runtimes. In these scenarios, you need to label nodes and create RuntimeClasses to help Kubernetes schedule work to the correct nodes.

We’ll label the agent-1 node with the wasm=yes label and create a RuntimeClass that targets nodes with that label.

Run the following command to add the wasm=yes label to the agent-1 worker. You’ll need to type exit to quit your exec session and return to your host’s terminal first.

# exit

$ kubectl label nodes k3d-wasm-agent-1 wasm=yes
node/k3d-wasm-agent-1 labeled
Verify the operation worked. Your output may include a lot more labels.

$ kubectl get nodes --show-labels | grep wasm=yes
NAME                STATUS    ROLES     VERSION         LABELS
k3d-wasm-agent-0    Ready     <none>    v1.27.8+k3s2    beta.kubernetes...,wasm=yes
Run the following command to create the rc-spin RuntimeClass.

$ kubectl apply -f rc-spin.yml
runtimeclass.node.k8s.io/rc-spin created
The scheduling.nodeSelector field ensures that Pods referencing this RuntimeClass will only be scheduled to nodes with the wasm=yes label. The handler field tells containerd on the node to use the spin shim to execute Wasm apps.

Check you created it correctly.

$ kubectl get runtimeclass
NAME      HANDLER   AGE
rc-spin   spin      14s
At this point, your Kubernetes cluster has everything it needs to run Wasm workloads — the agent-1 worker node is labeled and has four Wasm shims installed, and you’ve created a RuntimeClass to schedule Wasm tasks to the node.

Deploy and test the app
The app is defined in the app.yml file in the wasm folder of the book’s GitHub repo and comprises a Deployment, a Service, and an Ingress.

apiVersion: apps/v1
kind: Deployment
metadata:
  name: wasm-spin
spec:
  replicas: 3
  <Snip>
  template:
    metadata:
      labels:
        app: wasm
    <Snip>
    spec:
      runtimeClassName: rc-spin                   <<---- Referencing the RuntimeClass
      containers:
        - name: testwasm
          image: nigelpoulton/k8sbook:wasm-0.1    <<---- Pre-created image
          command: ["/"]
The important part of the Deployment YAML is the reference to the RuntimeClass in the Pod spec. This ensures Kubernetes will schedule all three replicas to a node that meets the nodeSelector requirements in the RuntimeClass — nodes with the wasm=yes label. Kubernetes will schedule all three replicas to the agent-1 node in our example.

The YAML file also has an Ingress and a Service that I’m not showing. The Ingress directs traffic arriving on the "/" path to a ClusterIP Service called wasm-spin which forwards the traffic to all Pods with the app=wasm label on port 80. The replicas defined in the Deployment all have the app=wasm label.

You can see the traffic flow in Figure 9.6.

Figure 9.6
Figure 9.6
In this next step, you’ll deploy the app defined in the app.yml file. It uses a pre-created Wasm image from the book’s Docker Hub repo. If you want to use the image you created in the earlier steps, edit your app.yml file and change the image field.

$ kubectl apply -f app.yml
deployment.apps/wasm-spin created
service/svc-wasm created
ingress.networking.k8s.io/ing-wasm created
Check the status of the Deployment with a kubectl get deploy wasm-spin command.

Wait for all three replicas to be ready, and then run the following command to ensure they’re all scheduled to the agent-1 worker node.

$ kubectl get pods -o wide
NAME                          READY    STATUS     ...    NODE            
wasm-spin-5f6fccc557-5jzx6    1/1      Running    ...    k3d-wasm-agent-1
wasm-spin-5f6fccc557-c2tq7    1/1      Running    ...    k3d-wasm-agent-1
wasm-spin-5f6fccc557-ft6nz    1/1      Running    ...    k3d-wasm-agent-1
Kubernetes has scheduled all three to the agent-1 node. This means the label and RuntimeClass worked as expected.

Test the app with the following curl command. You can also point your browser to http://localhost:5005/tkb.

$ curl http://localhost:5005/tkb
The Kubernetes Book loves Wasm!
Congratulations, the Wasm app is running on your Kubernetes cluster!

Clean up
If you followed along, you’ll have all the following artifacts that you may wish to clean up:

k3d Kubernetes cluster called wasm
Wasm OCI image stored in an OCI registry
Wasm OCI image on your local host
Spin app on your local machine
The easiest way to clean up your Kubernetes cluster is to delete it with this command.

$ k3d cluster delete wasm
If you want to keep the cluster and only delete the resources, run the following two commands.

$ kubectl delete -f app.yml
deployment.apps "wasm-spin" deleted
service "svc-wasm" deleted
ingress.networking.k8s.io "ing-wasm" deleted

$ kubectl delete runtimeclass rc-spin
runtimeclass.node.k8s.io "rc-spin" deleted 
You can delete the Wasm image on your local machine with the following command. Be sure to substitute the name of your image.

$ docker rmi nigelpoulton/k8sbook:wasm-0.1
When you created the app with spin new and spin build, you got a new directory called tkb-wasm containing all the application artifacts. Use your favorite tool to delete the directory and all files in it. Be sure to delete the correct directory!

Set your Kubernetes context back to the cluster you’ve been using for the other examples in the book. If you’ve got Docker Desktop, click the Docker whale and choose the context from the Kubernetes context option. If you don’t have Docker Desktop you can run the following commands. The first one lists your contexts and the second one sets your current context to docker-desktop. You’ll need to set yours back to the correct context in your environment.

$ kubectl config get-contexts
CURRENT   NAME             CLUSTER          AUTHINFO         NAMESPACE
          docker-desktop   docker-desktop   docker-desktop
          lke349416-ctx    lke349416        lke349416-admin   default
*         k3d-wasm         k3d-wasm         admin@k3d-wasm

$ kubectl config current-context docker-desktop
docker-desktop
Chapter Summary
Wasm is powering the third wave of cloud computing, and platforms like Docker and Kubernetes are evolving to work with it. Docker can already build Wasm apps into container images, run them with docker run, and host them on Docker Hub. Projects like containerd and runwasi make it possible to run Wasm containers on Kubernetes and projects like SpinKube make it easy.

Wasm is a binary instruction set that programming languages use as a compilation target — instead of compiling to something like Linux on ARM, you compile to Wasm.

Compiled Wasm apps are tiny binaries that can run anywhere with a Wasm runtime. Wasm apps are smaller, faster, more portable, and more secure than traditional Linux containers. However, at the time of writing, Wasm apps cannot do everything that Linux containers can.

The high-level process is to write apps in existing languages, compile them as Wasm binaries, and then use tools such as docker build and docker push to build them into OCI images and push them to OCI registries. From there, you can wrap them in Kubernetes Pods and run them on Kubernetes just like regular containers.

Kubernetes clusters running containerd have a growing choice of Wasm runtimes that are implemented as containerd shims. To run a Wasm app on a Kubernetes cluster with containerd, you need to install and register a Wasm shim on at least one worker node. You then need to label the node and reference the label in a RuntimeClass so the scheduler can assign Wasm apps to it. In the real world, projects like SpinKube and cloud services automate many of these tasks.

For further information, I recommend you look into the SpinKube project and the containerd shim lifecycle community proposal.


table of contents
search
Settings
Previous chapter
8: Ingress
Next chapter
10: Service discovery deep dive
Table of contents collapsed
