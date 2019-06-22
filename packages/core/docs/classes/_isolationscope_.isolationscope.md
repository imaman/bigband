> ## [bigband-core](../README.md)

[Globals](../globals.md) / ["IsolationScope"](../modules/_isolationscope_.md) / [IsolationScope](_isolationscope_.isolationscope.md) /

# Class: IsolationScope

## Hierarchy

* **IsolationScope**

### Index

#### Constructors

* [constructor](_isolationscope_.isolationscope.md#constructor)

#### Properties

* [awsAccount](_isolationscope_.isolationscope.md#awsaccount)
* [name](_isolationscope_.isolationscope.md#name)
* [profile](_isolationscope_.isolationscope.md#profile)
* [profileName](_isolationscope_.isolationscope.md#profilename)
* [s3Bucket](_isolationscope_.isolationscope.md#s3bucket)
* [s3Prefix](_isolationscope_.isolationscope.md#s3prefix)

#### Methods

* [create](_isolationscope_.isolationscope.md#static-create)

## Constructors

###  constructor

\+ **new IsolationScope**(`awsAccount`: string, `name`: string, `s3Bucket`: string, `s3Prefix`: string, `profile`: string): *[IsolationScope](_isolationscope_.isolationscope.md)*

*Defined in [IsolationScope.ts:4](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/IsolationScope.ts#L4)*

**Parameters:**

Name | Type |
------ | ------ |
`awsAccount` | string |
`name` | string |
`s3Bucket` | string |
`s3Prefix` | string |
`profile` | string |

**Returns:** *[IsolationScope](_isolationscope_.isolationscope.md)*

___

## Properties

###  awsAccount

● **awsAccount**: *string*

*Defined in [IsolationScope.ts:5](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/IsolationScope.ts#L5)*

___

###  name

● **name**: *string*

*Defined in [IsolationScope.ts:5](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/IsolationScope.ts#L5)*

___

###  profile

● **profile**: *string*

*Defined in [IsolationScope.ts:7](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/IsolationScope.ts#L7)*

___

###  profileName

● **profileName**: *string*

*Defined in [IsolationScope.ts:4](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/IsolationScope.ts#L4)*

___

###  s3Bucket

● **s3Bucket**: *string*

*Defined in [IsolationScope.ts:6](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/IsolationScope.ts#L6)*

___

###  s3Prefix

● **s3Prefix**: *string*

*Defined in [IsolationScope.ts:6](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/IsolationScope.ts#L6)*

___

## Methods

### `Static` create

▸ **create**(`init`: [IsolationScopeInit](../interfaces/_isolationscope_.isolationscopeinit.md)): *[IsolationScope](_isolationscope_.isolationscope.md)*

*Defined in [IsolationScope.ts:11](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/IsolationScope.ts#L11)*

**Parameters:**

Name | Type |
------ | ------ |
`init` | [IsolationScopeInit](../interfaces/_isolationscope_.isolationscopeinit.md) |

**Returns:** *[IsolationScope](_isolationscope_.isolationscope.md)*

___