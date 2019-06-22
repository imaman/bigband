> ## [bigband-core](../README.md)

[Globals](../globals.md) / ["Instrument"](../modules/_instrument_.md) / [Instrument](_instrument_.instrument.md) /

# Class: Instrument

Bigband's basic building block. Usually corresponds to an AWS resources such as: a Lambda function, a DynamoDB
table, a Kinesis stream, etc.

## Hierarchy

* **Instrument**

  * [DynamoDbInstrument](_dynamodbinstrument_.dynamodbinstrument.md)

  * [LambdaInstrument](_lambdainstrument_.lambdainstrument.md)

  * [KinesisStreamInstrument](_kinesisstreaminstrument_.kinesisstreaminstrument.md)

### Index

#### Constructors

* [constructor](_instrument_.instrument.md#constructor)

#### Properties

* [definition](_instrument_.instrument.md#protected-definition)
* [dependencies](_instrument_.instrument.md#dependencies)

#### Methods

* [arn](_instrument_.instrument.md#arn)
* [arnService](_instrument_.instrument.md#abstract-arnservice)
* [arnType](_instrument_.instrument.md#abstract-arntype)
* [canDo](_instrument_.instrument.md#cando)
* [contributeToConsumerDefinition](_instrument_.instrument.md#abstract-contributetoconsumerdefinition)
* [createFragment](_instrument_.instrument.md#abstract-createfragment)
* [fullyQualifiedName](_instrument_.instrument.md#fullyqualifiedname)
* [getDefinition](_instrument_.instrument.md#getdefinition)
* [getEntryPointFile](_instrument_.instrument.md#abstract-getentrypointfile)
* [getPhysicalDefinition](_instrument_.instrument.md#getphysicaldefinition)
* [name](_instrument_.instrument.md#name)
* [nameProperty](_instrument_.instrument.md#abstract-nameproperty)
* [physicalName](_instrument_.instrument.md#physicalname)
* [uses](_instrument_.instrument.md#uses)

## Constructors

###  constructor

\+ **new Instrument**(`packageName`: string | string[], `_name`: string): *[Instrument](_instrument_.instrument.md)*

*Defined in [Instrument.ts:24](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L24)*

Creates an instance of Instrument.

**`memberof`** Instrument

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`packageName` | string \| string[] | the package name of the instrument. The package names allows logical      grouping of related instruments: can be thought of as the "last name" of the instrument whereas the name      (see _name) can be thought of as "first name". Package names are hierarchical: ["p1", "p2", "p3"] is      nested inside ["p1", "p2"] which, in turn, is nested inside ["p1"]. If a string it is treated as a single      element array, that is: "p1" is equivalent to ["p1"]. |
`_name` | string | the "first name" of the instrument |

**Returns:** *[Instrument](_instrument_.instrument.md)*

___

## Properties

### `Protected` definition

● **definition**: *[Definition](_definition_.definition.md)* =  new Definition()

*Defined in [Instrument.ts:22](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L22)*

___

###  dependencies

● **dependencies**: *[Dependency](_instrument_.dependency.md)[]* =  []

*Defined in [Instrument.ts:23](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L23)*

___

## Methods

###  arn

▸ **arn**(`section`: [Section](_section_.section.md)): *string*

*Defined in [Instrument.ts:120](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L120)*

**Parameters:**

Name | Type |
------ | ------ |
`section` | [Section](_section_.section.md) |

**Returns:** *string*

___

### `Abstract` arnService

▸ **arnService**(): *string*

*Defined in [Instrument.ts:90](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L90)*

**Returns:** *string*

___

### `Abstract` arnType

▸ **arnType**(): *string*

*Defined in [Instrument.ts:91](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L91)*

**Returns:** *string*

___

###  canDo

▸ **canDo**(`action`: string, `arn`: string): *`this`*

*Defined in [Instrument.ts:74](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L74)*

Add an IAM permission to this instrument

**`memberof`** Instrument

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`action` | string | the action to be allowed |
`arn` | string | specifies the resource that this instrument is being granted permission to access |

**Returns:** *`this`*

this

___

### `Abstract` contributeToConsumerDefinition

▸ **contributeToConsumerDefinition**(`section`: [Section](_section_.section.md), `consumerDef`: [Definition](_definition_.definition.md)): *void*

*Defined in [Instrument.ts:89](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L89)*

**Parameters:**

Name | Type |
------ | ------ |
`section` | [Section](_section_.section.md) |
`consumerDef` | [Definition](_definition_.definition.md) |

**Returns:** *void*

___

### `Abstract` createFragment

▸ **createFragment**(`pathPrefix`: string): *[DeployableFragment](_deployablefragment_.deployablefragment.md)*

*Defined in [Instrument.ts:88](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L88)*

**Parameters:**

Name | Type |
------ | ------ |
`pathPrefix` | string |

**Returns:** *[DeployableFragment](_deployablefragment_.deployablefragment.md)*

___

###  fullyQualifiedName

▸ **fullyQualifiedName**(`style`: [NameStyle](../enums/_instrument_.namestyle.md)): *string*

*Defined in [Instrument.ts:108](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L108)*

Computes the full name of this instrument. The full name is a composition of the "last name" (as specified by the
package name) with the "first name" (this instrument's name)

**`memberof`** Instrument

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`style` | [NameStyle](../enums/_instrument_.namestyle.md) |  NameStyle.DASH |

**Returns:** *string*

the full qualified name

___

###  getDefinition

▸ **getDefinition**(): *[Definition](_definition_.definition.md)*

*Defined in [Instrument.ts:124](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L124)*

**Returns:** *[Definition](_definition_.definition.md)*

___

### `Abstract` getEntryPointFile

▸ **getEntryPointFile**(): *string*

*Defined in [Instrument.ts:93](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L93)*

**Returns:** *string*

___

###  getPhysicalDefinition

▸ **getPhysicalDefinition**(`section`: [Section](_section_.section.md)): *[Definition](_definition_.definition.md)*

*Defined in [Instrument.ts:128](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L128)*

**Parameters:**

Name | Type |
------ | ------ |
`section` | [Section](_section_.section.md) |

**Returns:** *[Definition](_definition_.definition.md)*

___

###  name

▸ **name**(): *string*

*Defined in [Instrument.ts:95](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L95)*

**Returns:** *string*

___

### `Abstract` nameProperty

▸ **nameProperty**(): *string*

*Defined in [Instrument.ts:92](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L92)*

**Returns:** *string*

___

###  physicalName

▸ **physicalName**(`section`: [Section](_section_.section.md)): *string*

*Defined in [Instrument.ts:116](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L116)*

**Parameters:**

Name | Type |
------ | ------ |
`section` | [Section](_section_.section.md) |

**Returns:** *string*

___

###  uses

▸ **uses**(`supplier`: [Instrument](_instrument_.instrument.md), `name`: string): *void*

*Defined in [Instrument.ts:57](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L57)*

**Parameters:**

Name | Type |
------ | ------ |
`supplier` | [Instrument](_instrument_.instrument.md) |
`name` | string |

**Returns:** *void*

___