> ## [bigband-core](../README.md)

[Globals](../globals.md) / ["KinesisStreamInstrument"](../modules/_kinesisstreaminstrument_.md) / [KinesisStreamInstrument](_kinesisstreaminstrument_.kinesisstreaminstrument.md) /

# Class: KinesisStreamInstrument

## Hierarchy

* [Instrument](_instrument_.instrument.md)

  * **KinesisStreamInstrument**

### Index

#### Constructors

* [constructor](_kinesisstreaminstrument_.kinesisstreaminstrument.md#constructor)

#### Properties

* [definition](_kinesisstreaminstrument_.kinesisstreaminstrument.md#protected-definition)
* [dependencies](_kinesisstreaminstrument_.kinesisstreaminstrument.md#dependencies)

#### Methods

* [arn](_kinesisstreaminstrument_.kinesisstreaminstrument.md#arn)
* [arnService](_kinesisstreaminstrument_.kinesisstreaminstrument.md#arnservice)
* [arnType](_kinesisstreaminstrument_.kinesisstreaminstrument.md#arntype)
* [canDo](_kinesisstreaminstrument_.kinesisstreaminstrument.md#cando)
* [contributeToConsumerDefinition](_kinesisstreaminstrument_.kinesisstreaminstrument.md#contributetoconsumerdefinition)
* [createFragment](_kinesisstreaminstrument_.kinesisstreaminstrument.md#createfragment)
* [fullyQualifiedName](_kinesisstreaminstrument_.kinesisstreaminstrument.md#fullyqualifiedname)
* [getDefinition](_kinesisstreaminstrument_.kinesisstreaminstrument.md#getdefinition)
* [getEntryPointFile](_kinesisstreaminstrument_.kinesisstreaminstrument.md#getentrypointfile)
* [getPhysicalDefinition](_kinesisstreaminstrument_.kinesisstreaminstrument.md#getphysicaldefinition)
* [name](_kinesisstreaminstrument_.kinesisstreaminstrument.md#name)
* [nameProperty](_kinesisstreaminstrument_.kinesisstreaminstrument.md#nameproperty)
* [physicalName](_kinesisstreaminstrument_.kinesisstreaminstrument.md#physicalname)
* [uses](_kinesisstreaminstrument_.kinesisstreaminstrument.md#uses)

## Constructors

###  constructor

\+ **new KinesisStreamInstrument**(`packageName`: string, `name`: string, `shardCount`: number): *[KinesisStreamInstrument](_kinesisstreaminstrument_.kinesisstreaminstrument.md)*

*Overrides [Instrument](_instrument_.instrument.md).[constructor](_instrument_.instrument.md#constructor)*

*Defined in [KinesisStreamInstrument.ts:12](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/KinesisStreamInstrument.ts#L12)*

**Parameters:**

Name | Type |
------ | ------ |
`packageName` | string |
`name` | string |
`shardCount` | number |

**Returns:** *[KinesisStreamInstrument](_kinesisstreaminstrument_.kinesisstreaminstrument.md)*

___

## Properties

### `Protected` definition

● **definition**: *[Definition](_definition_.definition.md)* =  new Definition()

*Inherited from [Instrument](_instrument_.instrument.md).[definition](_instrument_.instrument.md#protected-definition)*

*Defined in [Instrument.ts:22](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L22)*

___

###  dependencies

● **dependencies**: *[Dependency](_instrument_.dependency.md)[]* =  []

*Inherited from [Instrument](_instrument_.instrument.md).[dependencies](_instrument_.instrument.md#dependencies)*

*Defined in [Instrument.ts:23](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L23)*

___

## Methods

###  arn

▸ **arn**(`section`: [Section](_section_.section.md)): *string*

*Inherited from [Instrument](_instrument_.instrument.md).[arn](_instrument_.instrument.md#arn)*

*Defined in [Instrument.ts:120](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L120)*

**Parameters:**

Name | Type |
------ | ------ |
`section` | [Section](_section_.section.md) |

**Returns:** *string*

___

###  arnService

▸ **arnService**(): *string*

*Overrides [Instrument](_instrument_.instrument.md).[arnService](_instrument_.instrument.md#abstract-arnservice)*

*Defined in [KinesisStreamInstrument.ts:23](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/KinesisStreamInstrument.ts#L23)*

**Returns:** *string*

___

###  arnType

▸ **arnType**(): *string*

*Overrides [Instrument](_instrument_.instrument.md).[arnType](_instrument_.instrument.md#abstract-arntype)*

*Defined in [KinesisStreamInstrument.ts:27](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/KinesisStreamInstrument.ts#L27)*

**Returns:** *string*

___

###  canDo

▸ **canDo**(`action`: string, `arn`: string): *`this`*

*Inherited from [Instrument](_instrument_.instrument.md).[canDo](_instrument_.instrument.md#cando)*

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

###  contributeToConsumerDefinition

▸ **contributeToConsumerDefinition**(`rig`: [Section](_section_.section.md), `consumerDef`: [Definition](_definition_.definition.md)): *void*

*Overrides [Instrument](_instrument_.instrument.md).[contributeToConsumerDefinition](_instrument_.instrument.md#abstract-contributetoconsumerdefinition)*

*Defined in [KinesisStreamInstrument.ts:35](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/KinesisStreamInstrument.ts#L35)*

**Parameters:**

Name | Type |
------ | ------ |
`rig` | [Section](_section_.section.md) |
`consumerDef` | [Definition](_definition_.definition.md) |

**Returns:** *void*

___

###  createFragment

▸ **createFragment**(`pathPrefix`: string): *[DeployableFragment](_deployablefragment_.deployablefragment.md)*

*Overrides [Instrument](_instrument_.instrument.md).[createFragment](_instrument_.instrument.md#abstract-createfragment)*

*Defined in [KinesisStreamInstrument.ts:31](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/KinesisStreamInstrument.ts#L31)*

**Parameters:**

Name | Type |
------ | ------ |
`pathPrefix` | string |

**Returns:** *[DeployableFragment](_deployablefragment_.deployablefragment.md)*

___

###  fullyQualifiedName

▸ **fullyQualifiedName**(`style`: [NameStyle](../enums/_instrument_.namestyle.md)): *string*

*Inherited from [Instrument](_instrument_.instrument.md).[fullyQualifiedName](_instrument_.instrument.md#fullyqualifiedname)*

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

*Inherited from [Instrument](_instrument_.instrument.md).[getDefinition](_instrument_.instrument.md#getdefinition)*

*Defined in [Instrument.ts:124](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L124)*

**Returns:** *[Definition](_definition_.definition.md)*

___

###  getEntryPointFile

▸ **getEntryPointFile**(): *string*

*Overrides [Instrument](_instrument_.instrument.md).[getEntryPointFile](_instrument_.instrument.md#abstract-getentrypointfile)*

*Defined in [KinesisStreamInstrument.ts:52](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/KinesisStreamInstrument.ts#L52)*

**Returns:** *string*

___

###  getPhysicalDefinition

▸ **getPhysicalDefinition**(`section`: [Section](_section_.section.md)): *[Definition](_definition_.definition.md)*

*Inherited from [Instrument](_instrument_.instrument.md).[getPhysicalDefinition](_instrument_.instrument.md#getphysicaldefinition)*

*Defined in [Instrument.ts:128](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L128)*

**Parameters:**

Name | Type |
------ | ------ |
`section` | [Section](_section_.section.md) |

**Returns:** *[Definition](_definition_.definition.md)*

___

###  name

▸ **name**(): *string*

*Inherited from [Instrument](_instrument_.instrument.md).[name](_instrument_.instrument.md#name)*

*Defined in [Instrument.ts:95](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L95)*

**Returns:** *string*

___

###  nameProperty

▸ **nameProperty**(): *string*

*Overrides [Instrument](_instrument_.instrument.md).[nameProperty](_instrument_.instrument.md#abstract-nameproperty)*

*Defined in [KinesisStreamInstrument.ts:48](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/KinesisStreamInstrument.ts#L48)*

**Returns:** *string*

___

###  physicalName

▸ **physicalName**(`section`: [Section](_section_.section.md)): *string*

*Inherited from [Instrument](_instrument_.instrument.md).[physicalName](_instrument_.instrument.md#physicalname)*

*Defined in [Instrument.ts:116](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L116)*

**Parameters:**

Name | Type |
------ | ------ |
`section` | [Section](_section_.section.md) |

**Returns:** *string*

___

###  uses

▸ **uses**(`supplier`: [Instrument](_instrument_.instrument.md), `name`: string): *void*

*Inherited from [Instrument](_instrument_.instrument.md).[uses](_instrument_.instrument.md#uses)*

*Defined in [Instrument.ts:57](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L57)*

**Parameters:**

Name | Type |
------ | ------ |
`supplier` | [Instrument](_instrument_.instrument.md) |
`name` | string |

**Returns:** *void*

___