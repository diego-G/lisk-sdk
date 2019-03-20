# Controller

## Description

The controller is a parent process, that is responsible for managing every user interaction with each component of the ecosystem.
E.g. restarting the node, starting a snapshot process, etc.
It is derived by an executable file which is the entry point to interact with Lisk Core.

The controller is responsible for initialization of the infrastructure-level components: Database, Cache, Logger, System.
The controller also initializes each module separately.
If any module is configured to load as a child process, then it is the Controller's responsibility to do so.
The controller defines a set of events, that each component can subscribe to:

### Default Events & Actions

The following events and actions should be implemented in the redesigned Lisk Core and be accessible by all modules.

#### Events

| Event                       | Description                                                                                                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| _module_:registeredToBus    | Triggered when the module has completed registering its events and actions with the controller. So when this event is triggered, the subscriber of event can be sure that the Controller has whitelisted its requested events and actions. |
| _module_:loading:started    | Triggered just before the Controller calls the module’s `load` method.                                                                                                                                                                     |
| _module_:loading:error      | Triggered if any error occurred during call of the module's `load` method.                                                                                                                                                                 |
| _module_:loading:finished   | Triggered just after the module’s `load` method has completed execution.                                                                                                                                                                   |
| _module_:unloading:started  | Triggered just before the Controller calls the module’s `unload` method.                                                                                                                                                                   |
| _module_:unloading:error    | Triggered if any error occurred during call of module’s `unload` method.                                                                                                                                                                   |
| _module_:unloading:finished | Triggered just after the module’s `unload` method has completed execution.                                                                                                                                                                 |
| lisk:ready                  | Triggered when the Controller has finished initialising the modules and each module has been successfully loaded.                                                                                                                          |

#### Actions

| Action                  | Description                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| lisk:getComponentConfig | A controller action to get the configuration of any component defined in controller space. |

Most of the data flow will be handled through the propagation of such events.
Each module can also define its own custom events or actions and will register that list with the controller at the time of initialization.
The controller contains a complete list of events which may occur in the modules of Lisk Core at any given time.
