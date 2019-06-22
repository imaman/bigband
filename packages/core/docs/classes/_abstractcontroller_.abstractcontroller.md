> ## [bigband-core](../README.md)

[Globals](../globals.md) / ["AbstractController"](../modules/_abstractcontroller_.md) / [AbstractController](_abstractcontroller_.abstractcontroller.md) /

# Class: AbstractController <**T, R**>

## Type parameters

■` T`

■` R`

## Hierarchy

* **AbstractController**

### Index

#### Constructors

* [constructor](_abstractcontroller_.abstractcontroller.md#constructor)

#### Properties

* [buildFingerprint](_abstractcontroller_.abstractcontroller.md#protected-buildfingerprint)
* [context](_abstractcontroller_.abstractcontroller.md#protected-context)
* [mapping](_abstractcontroller_.abstractcontroller.md#protected-mapping)

#### Methods

* [compute](_abstractcontroller_.abstractcontroller.md#protected-compute)
* [executeInputEvent](_abstractcontroller_.abstractcontroller.md#abstract-executeinputevent)
* [executeScheduledEvent](_abstractcontroller_.abstractcontroller.md#abstract-executescheduledevent)
* [onError](_abstractcontroller_.abstractcontroller.md#protected-onerror)
* [runLambda](_abstractcontroller_.abstractcontroller.md#runlambda)

## Constructors

###  constructor

\+ **new AbstractController**(`mapping`: any, `buildFingerprint`: any): *[AbstractController](_abstractcontroller_.abstractcontroller.md)*

**Parameters:**

Name | Type |
------ | ------ |
`mapping` | any |
`buildFingerprint` | any |

**Returns:** *[AbstractController](_abstractcontroller_.abstractcontroller.md)*

___

## Properties

### `Protected` buildFingerprint

● **buildFingerprint**: *string*

___

### `Protected` context

● **context**: *any*

___

### `Protected` mapping

● **mapping**: *any*

___

## Methods

### `Protected` compute

▸ **compute**(`event`: any): *`Promise<undefined | R>`*

**Parameters:**

Name | Type |
------ | ------ |
`event` | any |

**Returns:** *`Promise<undefined | R>`*

___

### `Abstract` executeInputEvent

▸ **executeInputEvent**(`input`: `T`): *`R`*

**Parameters:**

Name | Type |
------ | ------ |
`input` | `T` |

**Returns:** *`R`*

___

### `Abstract` executeScheduledEvent

▸ **executeScheduledEvent**(): *void*

**Returns:** *void*

___

### `Protected` onError

▸ **onError**(`e`: `Error`): *`Promise<void>`*

**Parameters:**

Name | Type |
------ | ------ |
`e` | `Error` |

**Returns:** *`Promise<void>`*

___

###  runLambda

▸ **runLambda**(`input`: `T`, `context`: any): *`Promise<object>`*

**Parameters:**

Name | Type |
------ | ------ |
`input` | `T` |
`context` | any |

**Returns:** *`Promise<object>`*

___