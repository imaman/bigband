> ## [bigband-core](../README.md)

[Globals](../globals.md) / ["Instrument"](../modules/_instrument_.md) / [Instrument](_instrument_.instrument.md) /

# Class: Instrument

## Hierarchy

* **Instrument**

  * [DynamoDbInstrument](_dynamodbinstrument_.dynamodbinstrument.md)

  * [LambdaInstrument](_lambdainstrument_.lambdainstrument.md)

  * [KinesisStreamInstrument](_kinesisstreaminstrument_.kinesisstreaminstrument.md)

### Index

#### Constructors

* [constructor](_instrument_.instrument.md#constructor)

#### Properties

* [_name](_instrument_.instrument.md#private-_name)
* [definition](_instrument_.instrument.md#protected-definition)
* [dependencies](_instrument_.instrument.md#dependencies)
* [packageName](_instrument_.instrument.md#private-packagename)

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

*Defined in [Instrument.ts:19](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/Instrument.ts#L19)*

**Parameters:**

Name | Type |
------ | ------ |
`packageName` | string \| string[] |
`_name` | string |

**Returns:** *[Instrument](_instrument_.instrument.md)*

___

## Properties

### `Private` _name

● **_name**: *string*

*Defined in [Instrument.ts:21](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/Instrument.ts#L21)*

___

### `Protected` definition

● **definition**: *[Definition](_definition_.definition.md)* =  new Definition()

*Defined in [Instrument.ts:17](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/Instrument.ts#L17)*

___

###  dependencies

● **dependencies**: *[Dependency](_instrument_.dependency.md)[]* =  []

*Defined in [Instrument.ts:18](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/Instrument.ts#L18)*

___

### `Private` packageName

● **packageName**: *string[]*

*Defined in [Instrument.ts:19](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/Instrument.ts#L19)*

___

## Methods

###  arn

▸ **arn**(`section`: [Section](_section_.section.md)): *string*

*Defined in [Instrument.ts:86](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/Instrument.ts#L86)*

**Parameters:**

Name | Type |
------ | ------ |
`section` | [Section](_section_.section.md) |

**Returns:** *string*

___

### `Abstract` arnService

▸ **arnService**(): *string*

*Defined in [Instrument.ts:65](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/Instrument.ts#L65)*

**Returns:** *string*

___

### `Abstract` arnType

▸ **arnType**(): *string*

*Defined in [Instrument.ts:66](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/Instrument.ts#L66)*

**Returns:** *string*

___

###  canDo

▸ **canDo**(`action`: string, `arn`: string): *`this`*

*Defined in [Instrument.ts:49](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/Instrument.ts#L49)*

**Parameters:**

Name | Type |
------ | ------ |
`action` | string |
`arn` | string |

**Returns:** *`this`*

___

### `Abstract` contributeToConsumerDefinition

▸ **contributeToConsumerDefinition**(`section`: [Section](_section_.section.md), `consumerDef`: [Definition](_definition_.definition.md)): *void*

*Defined in [Instrument.ts:64](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/Instrument.ts#L64)*

**Parameters:**

Name | Type |
------ | ------ |
`section` | [Section](_section_.section.md) |
`consumerDef` | [Definition](_definition_.definition.md) |

**Returns:** *void*

___

### `Abstract` createFragment

▸ **createFragment**(`pathPrefix`: string): *[DeployableFragment](_deployablefragment_.deployablefragment.md)*

*Defined in [Instrument.ts:63](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/Instrument.ts#L63)*

**Parameters:**

Name | Type |
------ | ------ |
`pathPrefix` | string |

**Returns:** *[DeployableFragment](_deployablefragment_.deployablefragment.md)*

___

###  fullyQualifiedName

▸ **fullyQualifiedName**(`style`: [NameStyle](../enums/_instrument_.namestyle.md)): *string*

*Defined in [Instrument.ts:74](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/Instrument.ts#L74)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`style` | [NameStyle](../enums/_instrument_.namestyle.md) |  NameStyle.DASH |

**Returns:** *string*

___

###  getDefinition

▸ **getDefinition**(): *[Definition](_definition_.definition.md)*

*Defined in [Instrument.ts:90](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/Instrument.ts#L90)*

**Returns:** *[Definition](_definition_.definition.md)*

___

### `Abstract` getEntryPointFile

▸ **getEntryPointFile**(): *string*

*Defined in [Instrument.ts:68](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/Instrument.ts#L68)*

**Returns:** *string*

___

###  getPhysicalDefinition

▸ **getPhysicalDefinition**(`section`: [Section](_section_.section.md)): *[Definition](_definition_.definition.md)*

*Defined in [Instrument.ts:94](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/Instrument.ts#L94)*

**Parameters:**

Name | Type |
------ | ------ |
`section` | [Section](_section_.section.md) |

**Returns:** *[Definition](_definition_.definition.md)*

___

###  name

▸ **name**(): *string*

*Defined in [Instrument.ts:70](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/Instrument.ts#L70)*

**Returns:** *string*

___

### `Abstract` nameProperty

▸ **nameProperty**(): *string*

*Defined in [Instrument.ts:67](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/Instrument.ts#L67)*

**Returns:** *string*

___

###  physicalName

▸ **physicalName**(`section`: [Section](_section_.section.md)): *string*

*Defined in [Instrument.ts:82](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/Instrument.ts#L82)*

**Parameters:**

Name | Type |
------ | ------ |
`section` | [Section](_section_.section.md) |

**Returns:** *string*

___

###  uses

▸ **uses**(`supplier`: [Instrument](_instrument_.instrument.md), `name`: string): *void*

*Defined in [Instrument.ts:41](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/Instrument.ts#L41)*

**Parameters:**

Name | Type |
------ | ------ |
`supplier` | [Instrument](_instrument_.instrument.md) |
`name` | string |

**Returns:** *void*

___