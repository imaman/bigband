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

*Defined in [AbstractController.ts:5](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/AbstractController.ts#L5)*

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

*Defined in [AbstractController.ts:4](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/AbstractController.ts#L4)*

___

### `Protected` context

● **context**: *any*

*Defined in [AbstractController.ts:5](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/AbstractController.ts#L5)*

___

### `Protected` mapping

● **mapping**: *any*

*Defined in [AbstractController.ts:3](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/AbstractController.ts#L3)*

___

## Methods

### `Protected` compute

▸ **compute**(`event`: any): *`Promise<undefined | R>`*

*Defined in [AbstractController.ts:17](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/AbstractController.ts#L17)*

**Parameters:**

Name | Type |
------ | ------ |
`event` | any |

**Returns:** *`Promise<undefined | R>`*

___

### `Abstract` executeInputEvent

▸ **executeInputEvent**(`input`: `T`): *`R`*

*Defined in [AbstractController.ts:13](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/AbstractController.ts#L13)*

**Parameters:**

Name | Type |
------ | ------ |
`input` | `T` |

**Returns:** *`R`*

___

### `Abstract` executeScheduledEvent

▸ **executeScheduledEvent**(): *void*

*Defined in [AbstractController.ts:12](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/AbstractController.ts#L12)*

**Returns:** *void*

___

### `Protected` onError

▸ **onError**(`e`: `Error`): *`Promise<void>`*

*Defined in [AbstractController.ts:15](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/AbstractController.ts#L15)*

**Parameters:**

Name | Type |
------ | ------ |
`e` | `Error` |

**Returns:** *`Promise<void>`*

___

###  runLambda

▸ **runLambda**(`input`: `T`, `context`: any): *`Promise<object>`*

*Defined in [AbstractController.ts:27](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/AbstractController.ts#L27)*

**Parameters:**

Name | Type |
------ | ------ |
`input` | `T` |
`context` | any |

**Returns:** *`Promise<object>`*

___