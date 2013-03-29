CrowdCL
---

## CrowdCL API

The CrowdCL API allows pre-defined problems to be solved on the GPU in the background as a user browses the page. To begin solving problems, construct a new instance of the `CrowdCL` class, where the constructor takes the following parameters:

* `id`: Required. The unique ID of the problem to solve.
* `server`: Required. URL of the server to send data to by default.
* `onBest`: Optional. Callback to be executed when a new best result is found.
* `stage`: Optional. The number of results to be staged locally before being sent to the server.
* `timeout`: Optional. The initial time before runs of the problem, which decreases as the user is idle.

Once constructed, the CrowdCL object provides the following methods:

* `interrupt()`: Interrupt the run loop, forwarding the interrupt message to the problem instance.
* `interrupted()`: Return whether or not the problem is currently paused.
* `resume()`: Resume the execution of an interrupted problem.
* `sleep(milliseconds)`: Pause the execution of a problem for a number of milliseconds, then resume the execution loop.

## Problems

Each CrowdCL problem instance is defined in a single class. This class must implement the following methods:

* Constructor: Do any initial setup for the problem. This method will be called once when the problem is initialized.
* `run`: Run a single iteration of the problem. This method will be called automatically as the user browses a page.

This class can also implement the following optional methods:

* `interrupt`: Pause the execution of the run loop.
* `sync`: Override the default saving behavior.

## Minifying

To minify a problem, simply run:

    ./build.sh PROBLEM

where `PROBLEM` is the name of a problem from the `problems/` directory. The `index.html` file in the `example/` directory shows how a problem can be included on a web page.
