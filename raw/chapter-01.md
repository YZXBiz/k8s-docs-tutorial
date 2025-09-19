Skip to Content
1: Kubernetes primer
This chapter gets you up-to-speed with the basics and background of Kubernetes, and I’ve divided it as follows:

Important Kubernetes background
Kubernetes: the Operating System of the cloud
Important Kubernetes background
Kubernetes is an orchestrator of containerized cloud-native microservices applications.

That’s a lot of jargon, so let’s explain it.

Orchestration
An orchestrator is a system that deploys applications and dynamically responds to changes. For example, Kubernetes can:

Deploy applications
Scale them up and down based on demand
Self-heal them when things break
Perform rollouts and rollbacks
Lots more
The best part is that it does all of this without you having to get involved. You need to configure a few things up front, but once you’ve done that, you sit back and let Kubernetes work its magic.

Containerization
Containerization is the process of packaging applications and dependencies as images and then running them as containers.

It can be useful to think of containers as the next generation of virtual machines (VM). Both are ways of packaging and running applications, but containers are smaller, faster, and more portable.

Despite these advantages, containers haven’t entirely replaced VMs, and you’ll see them running side-by-side in most environments. But containers are the first-choice solution for most new applications.

Cloud native
Cloud-native applications possess cloud-like features such as auto-scaling, self-healing, automated updates, rollbacks, and more.

Simply running a regular application in the public cloud does not make it cloud-native.

Microservices
Microservices applications are built from many small, specialized, independent parts that work together to form a useful application.

Consider an e-commerce app with the following six features:

Web front-end
Catalog
Shopping cart
Authentication
Logging
Store
To make this a microservices app, you design, develop, deploy, and manage each feature as its own small application that we call a microservice. As such, this application has six microservices.

Designing like this brings huge flexibility by allowing all six microservices to have their own small development teams and their own release cycles. It also lets you scale and update each one independently.

The most common pattern is to deploy each microservice as its own container. This means one or more web front-end containers, one or more catalog containers, one or more shopping cart containers, etc. Scaling any part of the app is as simple as adding or removing containers.

Now that we’ve explained a few things let’s revisit and rewrite that jargon-filled sentence from the start of the chapter.

The original sentence read; “Kubernetes is an orchestrator of containerized cloud-native microservices applications.” We now know this means: Kubernetes deploys, scales, self-heals, and updates applications where individual application features are packaged and deployed as containers.

Hopefully, that’s clarified some of the jargon. But don’t worry if some of it still feels fuzzy, we’ll cover everything again in more detail throughout the book.

Where did Kubernetes come from
Kubernetes was developed by a group of Google engineers partly in response to Amazon Web Services (AWS) and Docker.

AWS changed the world when it invented modern cloud computing, and the rest of the industry needed to catch up.

One of the companies catching up was Google. They’d built their own cloud but needed a way to abstract the value of AWS and make it as easy as possible for customers to get off AWS and onto their cloud. They also ran their own production apps, such as Search and Gmail, on billions of containers per week.

At the same time, Docker was taking the world by storm, and users needed help managing explosive container growth.

This led a group of Google engineers to take the lessons they’d learned using their internal container management tools and create a new tool called Kubernetes. In 2014, they open-sourced Kubernetes and donated it to the newly formed Cloud Native Computing Foundation (CNCF).


At the time of writing, Kubernetes is over 10 years old and has experienced incredible growth and adoption. However, at its core, it still does the two things Google and the rest of the industry need:

It abstracts infrastructure (such as AWS)
It simplifies applications portability
These are two of the biggest reasons Kubernetes is important to the industry.

Kubernetes and Docker
All the early versions of Kubernetes shipped with Docker as its container runtime. This means Kubernetes used Docker for low-level tasks such as creating, starting, and stopping containers. However, two things happened:

Docker got bloated
People created lots of Docker alternatives
As a result, the Kubernetes project created the container runtime interface (CRI) to make the runtime layer pluggable. This means you can now pick and choose the best runtimes for your needs. For example, some runtimes provide better isolation, some provide better performance, some work with Wasm containers, and more.

Kubernetes 1.24 finally removed support for Docker as a runtime as it was bloated and overkill for what Kubernetes needed. Since then, most new Kubernetes clusters ship with containerd (pronounced “container dee”) as the default runtime. Fortunately, containerd is a stripped-down version of Docker optimized for Kubernetes, that fully supports applications containerized by Docker. In fact, Docker, containerd, and Kubernetes all work with images and containers that implement the Open Container Initiative (OCI) standards.

Figure 1.2 shows a four-node Kubernetes cluster running multiple container runtimes.

Figure 1.2 - Single cluster with multiple runtimes
Figure 1.2 - Single cluster with multiple runtimes
Notice how some of the nodes have multiple runtimes. Configurations like this are fully supported and increasingly common. You’ll work with a configuration like this in Chapter 9 when you deploy a Wasm (WebAssembly) app to Kubernetes.

What about Docker Swarm
In 2016 and 2017, Docker Swarm, Mesosphere DCOS, and Kubernetes competed to become the industry standard container orchestrator. Kubernetes won.

However, Docker Swarm is still being developed and is still used by small companies needing a simple alternative to Kubernetes.

Kubernetes and Borg: Resistance is futile!
We already said that Google has been running containers at massive scale for a very long time. Well, they had two in-house tools called Borg and Omega orchestrating these billions of containers. So, it’s easy to make the connection with Kubernetes — all three orchestrate containers at scale, and all three are related to Google.

However, Kubernetes is not an open-source version of Borg or Omega. It’s more like Kubernetes shares its DNA and family history with them.

Figure 1.3 - Shared DNA
Figure 1.3 - Shared DNA
As things stand, Kubernetes is an open-source project owned by the CNCF. It’s licensed under the Apache 2.0 license, version 1.0 shipped way back in July 2015, and at the time of writing, we’re already at version 1.32 and averaging three new releases per year.

Kubernetes — what’s in the name
Most people pronounce Kubernetes as “koo-ber-net-eez”, but the community is very friendly, and people won’t mind if you pronounce it differently.

The word Kubernetes originates from the Greek word for helmsman which is the person who steers a ship. You can see this in the logo, which is a ship’s wheel.

Figure 1.4 - The Kubernetes logo
Figure 1.4 - The Kubernetes logo
Some of the original engineers wanted to call Kubernetes Seven of Nine. This is because Google’s Borg project inspired Kubernetes, and a famous Borg drone from the TV series Star Trek Voyager is called Seven of Nine. Copyright laws didn’t allow this, so they gave the logo seven spokes as a subtle reference to Seven of Nine.

One last thing about the name. You’ll often see it shortened to K8s and pronounced as “kates”. The number 8 replaces the eight characters between the “K” and the “s”.

Kubernetes: the operating system of the cloud
Kubernetes is the de facto platform for cloud-native applications, and we sometimes call it the operating system (OS) of the cloud. This is because it abstracts the differences between cloud platforms the same way that operating systems like Linux and Windows abstract the differences between servers:

Linux and Windows abstract server resources and schedule application processes
Kubernetes abstracts cloud resources and schedules application microservices
As a quick example, you can schedule applications on Kubernetes without caring if they’re running on AWS, Azure, Civo Cloud, GCP, or your on-premises data center. This makes Kubernetes a key enabler for:

Hybrid cloud
Multi-cloud
Cloud migrations
In summary, Kubernetes makes it easier to deploy to one cloud today and migrate to another cloud tomorrow.

Application scheduling
One of the main things an OS does is simplify the scheduling of work tasks.

For example, computers are complex collections of hardware resources such as CPU, memory, storage, and networking. Thankfully, modern operating systems hide most of this, making the world of application development a far friendlier place. For example, how many developers need to care which CPU core, memory DIMM, or flash chip their code uses? Most of the time, we let the OS decide.

Kubernetes does a similar thing with clouds and data centers.

At a high level, a cloud or data center is a complex collection of resources and services. Kubernetes abstracts most of this, making the resources easier to consume. Again, how often do you care which compute node, which failure zone, or which storage volume your app uses? Most of the time, you’ll be happy to let Kubernetes decide.

Chapter summary
Kubernetes was created by Google engineers based on lessons learned running containers at hyper-scale for many years. They donated it to the community as an open-source project and it is now the industry standard platform for deploying and managing cloud-native applications. It runs on any cloud or on-premises data center and abstracts the underlying infrastructure. This allows you to build hybrid clouds, as well as migrate on, off, and between different clouds. It’s open-sourced under the Apache 2.0 license and is owned and managed by the Cloud Native Computing Foundation (CNCF).

Don’t be afraid of all the new terminology. I’m here to help, and you can reach me at any of the following:

LinkedIn: linkedin.com/in/nigelpoulton/
BlueSky: @nigelpoulton.com
X: @nigelpoulton
Web: nigelpoulton.com
Email: tkb@nigelpoulton.com

table of contents
search
Settings
Previous chapter
0: Preface
Next chapter
2: Kubernetes principles of operation
Table of contents collapsed
