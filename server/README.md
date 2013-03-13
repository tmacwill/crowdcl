CrowdCL Server
---

## Installation

Place the following configuration in /etc/yum.repos.d/10gen.repo file:

    [10gen]
    name=10gen Repository
    baseurl=http://downloads-distro.mongodb.org/repo/redhat/os/i686
    gpgcheck=0
    enabled=1

Now, run:

    yum install mongo-10gen mongo-10gen-server

To start running Mongo, execute:

    mongod --config /etc/mongod.conf

Next, download a copy of CrowdCL:

    git clone git://github.com/tmacwill/crowdcl.git
    cd crowdcl
    git submodule init
    git submodule update
    pushd server
    npm install
    popd

To start up the CrowdCL server, run:

    node server/app.js
