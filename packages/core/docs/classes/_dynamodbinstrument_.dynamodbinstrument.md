> ## [bigband-core](../README.md)

[Globals](../globals.md) / ["DynamoDbInstrument"](../modules/_dynamodbinstrument_.md) / [DynamoDbInstrument](_dynamodbinstrument_.dynamodbinstrument.md) /

# Class: DynamoDbInstrument

## Hierarchy

* [Instrument](_instrument_.instrument.md)

  * **DynamoDbInstrument**

### Index

#### Constructors

* [constructor](_dynamodbinstrument_.dynamodbinstrument.md#constructor)

#### Properties

* [definition](_dynamodbinstrument_.dynamodbinstrument.md#protected-definition)
* [dependencies](_dynamodbinstrument_.dynamodbinstrument.md#dependencies)

#### Methods

* [arn](_dynamodbinstrument_.dynamodbinstrument.md#arn)
* [arnService](_dynamodbinstrument_.dynamodbinstrument.md#arnservice)
* [arnType](_dynamodbinstrument_.dynamodbinstrument.md#arntype)
* [canDo](_dynamodbinstrument_.dynamodbinstrument.md#cando)
* [contributeToConsumerDefinition](_dynamodbinstrument_.dynamodbinstrument.md#contributetoconsumerdefinition)
* [createFragment](_dynamodbinstrument_.dynamodbinstrument.md#createfragment)
* [fullyQualifiedName](_dynamodbinstrument_.dynamodbinstrument.md#fullyqualifiedname)
* [getDefinition](_dynamodbinstrument_.dynamodbinstrument.md#getdefinition)
* [getEntryPointFile](_dynamodbinstrument_.dynamodbinstrument.md#getentrypointfile)
* [getPhysicalDefinition](_dynamodbinstrument_.dynamodbinstrument.md#getphysicaldefinition)
* [name](_dynamodbinstrument_.dynamodbinstrument.md#name)
* [nameProperty](_dynamodbinstrument_.dynamodbinstrument.md#nameproperty)
* [physicalName](_dynamodbinstrument_.dynamodbinstrument.md#physicalname)
* [uses](_dynamodbinstrument_.dynamodbinstrument.md#uses)

## Constructors

###  constructor

\+ **new DynamoDbInstrument**(`packageName`: string | string[], `name`: string, `partitionKey`: [DynamoDbAttribute](../interfaces/_dynamodbinstrument_.dynamodbattribute.md), `sortKey?`: [DynamoDbAttribute](../interfaces/_dynamodbinstrument_.dynamodbattribute.md), `options`: [DynamoDbInstrumentOptions](../interfaces/_dynamodbinstrument_.dynamodbinstrumentoptions.md)): *[DynamoDbInstrument](_dynamodbinstrument_.dynamodbinstrument.md)*

*Overrides [Instrument](_instrument_.instrument.md).[constructor](_instrument_.instrument.md#constructor)*

*Defined in [DynamoDbInstrument.ts:31](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/DynamoDbInstrument.ts#L31)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`packageName` | string \| string[] | - |
`name` | string | - |
`partitionKey` | [DynamoDbAttribute](../interfaces/_dynamodbinstrument_.dynamodbattribute.md) | - |
`sortKey?` | [DynamoDbAttribute](../interfaces/_dynamodbinstrument_.dynamodbattribute.md) | - |
`options` | [DynamoDbInstrumentOptions](../interfaces/_dynamodbinstrument_.dynamodbinstrumentoptions.md) |  {} |

**Returns:** *[DynamoDbInstrument](_dynamodbinstrument_.dynamodbinstrument.md)*

___

## Properties

### `Protected` definition

● **definition**: *[Definition](_definition_.definition.md)* =  new Definition()

*Inherited from [Instrument](_instrument_.instrument.md).[definition](_instrument_.instrument.md#protected-definition)*

*Defined in [Instrument.ts:17](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/Instrument.ts#L17)*

___

###  dependencies

● **dependencies**: *[Dependency](_instrument_.dependency.md)[]* =  []

*Inherited from [Instrument](_instrument_.instrument.md).[dependencies](_instrument_.instrument.md#dependencies)*

*Defined in [Instrument.ts:18](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/Instrument.ts#L18)*

___

## Methods

###  arn

▸ **arn**(`section`: [Section](_section_.section.md)): *string*

*Inherited from [Instrument](_instrument_.instrument.md).[arn](_instrument_.instrument.md#arn)*

*Defined in [Instrument.ts:86](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/Instrument.ts#L86)*

**Parameters:**

Name | Type |
------ | ------ |
`section` | [Section](_section_.section.md) |

**Returns:** *string*

___

###  arnService

▸ **arnService**(): *string*

*Overrides [Instrument](_instrument_.instrument.md).[arnService](_instrument_.instrument.md#abstract-arnservice)*

*Defined in [DynamoDbInstrument.ts:95](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/DynamoDbInstrument.ts#L95)*

**Returns:** *string*

___

###  arnType

▸ **arnType**(): *string*

*Overrides [Instrument](_instrument_.instrument.md).[arnType](_instrument_.instrument.md#abstract-arntype)*

*Defined in [DynamoDbInstrument.ts:99](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/DynamoDbInstrument.ts#L99)*

**Returns:** *string*

___

###  canDo

▸ **canDo**(`action`: string, `arn`: string): *`this`*

*Inherited from [Instrument](_instrument_.instrument.md).[canDo](_instrument_.instrument.md#cando)*

*Defined in [Instrument.ts:49](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/Instrument.ts#L49)*

**Parameters:**

Name | Type |
------ | ------ |
`action` | string |
`arn` | string |

**Returns:** *`this`*

___

###  contributeToConsumerDefinition

▸ **contributeToConsumerDefinition**(`rig`: [Section](_section_.section.md), `consumerDef`: [Definition](_definition_.definition.md)): *void*

*Overrides [Instrument](_instrument_.instrument.md).[contributeToConsumerDefinition](_instrument_.instrument.md#abstract-contributetoconsumerdefinition)*

*Defined in [DynamoDbInstrument.ts:82](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/DynamoDbInstrument.ts#L82)*

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

*Defined in [DynamoDbInstrument.ts:78](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/DynamoDbInstrument.ts#L78)*

**Parameters:**

Name | Type |
------ | ------ |
`pathPrefix` | string |

**Returns:** *[DeployableFragment](_deployablefragment_.deployablefragment.md)*

___

###  fullyQualifiedName

▸ **fullyQualifiedName**(`style`: [NameStyle](../enums/_instrument_.namestyle.md)): *string*

*Inherited from [Instrument](_instrument_.instrument.md).[fullyQualifiedName](_instrument_.instrument.md#fullyqualifiedname)*

*Defined in [Instrument.ts:74](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/Instrument.ts#L74)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`style` | [NameStyle](../enums/_instrument_.namestyle.md) |  NameStyle.DASH |

**Returns:** *string*

___

###  getDefinition

▸ **getDefinition**(): *[Definition](_definition_.definition.md)*

*Inherited from [Instrument](_instrument_.instrument.md).[getDefinition](_instrument_.instrument.md#getdefinition)*

*Defined in [Instrument.ts:90](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/Instrument.ts#L90)*

**Returns:** *[Definition](_definition_.definition.md)*

___

###  getEntryPointFile

▸ **getEntryPointFile**(): *string*

*Overrides [Instrument](_instrument_.instrument.md).[getEntryPointFile](_instrument_.instrument.md#abstract-getentrypointfile)*

*Defined in [DynamoDbInstrument.ts:107](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/DynamoDbInstrument.ts#L107)*

**Returns:** *string*

___

###  getPhysicalDefinition

▸ **getPhysicalDefinition**(`section`: [Section](_section_.section.md)): *[Definition](_definition_.definition.md)*

*Inherited from [Instrument](_instrument_.instrument.md).[getPhysicalDefinition](_instrument_.instrument.md#getphysicaldefinition)*

*Defined in [Instrument.ts:94](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/Instrument.ts#L94)*

**Parameters:**

Name | Type |
------ | ------ |
`section` | [Section](_section_.section.md) |

**Returns:** *[Definition](_definition_.definition.md)*

___

###  name

▸ **name**(): *string*

*Inherited from [Instrument](_instrument_.instrument.md).[name](_instrument_.instrument.md#name)*

*Defined in [Instrument.ts:70](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/Instrument.ts#L70)*

**Returns:** *string*

___

###  nameProperty

▸ **nameProperty**(): *string*

*Overrides [Instrument](_instrument_.instrument.md).[nameProperty](_instrument_.instrument.md#abstract-nameproperty)*

*Defined in [DynamoDbInstrument.ts:103](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/DynamoDbInstrument.ts#L103)*

**Returns:** *string*

___

###  physicalName

▸ **physicalName**(`section`: [Section](_section_.section.md)): *string*

*Inherited from [Instrument](_instrument_.instrument.md).[physicalName](_instrument_.instrument.md#physicalname)*

*Defined in [Instrument.ts:82](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/Instrument.ts#L82)*

**Parameters:**

Name | Type |
------ | ------ |
`section` | [Section](_section_.section.md) |

**Returns:** *string*

___

###  uses

▸ **uses**(`supplier`: [Instrument](_instrument_.instrument.md), `name`: string): *void*

*Inherited from [Instrument](_instrument_.instrument.md).[uses](_instrument_.instrument.md#uses)*

*Defined in [Instrument.ts:41](https://github.com/imaman/bigband/blob/6553ebb/packages/core/src/Instrument.ts#L41)*

**Parameters:**

Name | Type |
------ | ------ |
`supplier` | [Instrument](_instrument_.instrument.md) |
`name` | string |

**Returns:** *void*

___