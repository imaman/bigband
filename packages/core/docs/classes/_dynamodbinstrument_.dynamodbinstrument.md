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

\+ **new DynamoDbInstrument**(`packageName`: string | string[], `name`: string, `partitionKey`: `DynamoDbAttribute`, `sortKey?`: `DynamoDbAttribute`, `options`: [DynamoDbInstrumentOptions](../interfaces/_dynamodbinstrument_.dynamodbinstrumentoptions.md)): *[DynamoDbInstrument](_dynamodbinstrument_.dynamodbinstrument.md)*

*Overrides [Instrument](_instrument_.instrument.md).[constructor](_instrument_.instrument.md#constructor)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`packageName` | string \| string[] | - |
`name` | string | - |
`partitionKey` | `DynamoDbAttribute` | - |
`sortKey?` | `DynamoDbAttribute` | - |
`options` | [DynamoDbInstrumentOptions](../interfaces/_dynamodbinstrument_.dynamodbinstrumentoptions.md) |  {} |

**Returns:** *[DynamoDbInstrument](_dynamodbinstrument_.dynamodbinstrument.md)*

___

## Properties

### `Protected` definition

● **definition**: *[Definition](_definition_.definition.md)* =  new Definition()

*Inherited from [Instrument](_instrument_.instrument.md).[definition](_instrument_.instrument.md#protected-definition)*

___

###  dependencies

● **dependencies**: *`Dependency`[]* =  []

*Inherited from [Instrument](_instrument_.instrument.md).[dependencies](_instrument_.instrument.md#dependencies)*

___

## Methods

###  arn

▸ **arn**(`section`: [Section](_section_.section.md)): *string*

*Inherited from [Instrument](_instrument_.instrument.md).[arn](_instrument_.instrument.md#arn)*

**Parameters:**

Name | Type |
------ | ------ |
`section` | [Section](_section_.section.md) |

**Returns:** *string*

___

###  arnService

▸ **arnService**(): *string*

*Overrides [Instrument](_instrument_.instrument.md).[arnService](_instrument_.instrument.md#abstract-arnservice)*

**Returns:** *string*

___

###  arnType

▸ **arnType**(): *string*

*Overrides [Instrument](_instrument_.instrument.md).[arnType](_instrument_.instrument.md#abstract-arntype)*

**Returns:** *string*

___

###  canDo

▸ **canDo**(`action`: string, `arn`: string): *`this`*

*Inherited from [Instrument](_instrument_.instrument.md).[canDo](_instrument_.instrument.md#cando)*

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

**Parameters:**

Name | Type |
------ | ------ |
`pathPrefix` | string |

**Returns:** *[DeployableFragment](_deployablefragment_.deployablefragment.md)*

___

###  fullyQualifiedName

▸ **fullyQualifiedName**(`style`: [NameStyle](../enums/_instrument_.namestyle.md)): *string*

*Inherited from [Instrument](_instrument_.instrument.md).[fullyQualifiedName](_instrument_.instrument.md#fullyqualifiedname)*

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

**Returns:** *[Definition](_definition_.definition.md)*

___

###  getEntryPointFile

▸ **getEntryPointFile**(): *string*

*Overrides [Instrument](_instrument_.instrument.md).[getEntryPointFile](_instrument_.instrument.md#abstract-getentrypointfile)*

**Returns:** *string*

___

###  getPhysicalDefinition

▸ **getPhysicalDefinition**(`section`: [Section](_section_.section.md)): *[Definition](_definition_.definition.md)*

*Inherited from [Instrument](_instrument_.instrument.md).[getPhysicalDefinition](_instrument_.instrument.md#getphysicaldefinition)*

**Parameters:**

Name | Type |
------ | ------ |
`section` | [Section](_section_.section.md) |

**Returns:** *[Definition](_definition_.definition.md)*

___

###  name

▸ **name**(): *string*

*Inherited from [Instrument](_instrument_.instrument.md).[name](_instrument_.instrument.md#name)*

**Returns:** *string*

___

###  nameProperty

▸ **nameProperty**(): *string*

*Overrides [Instrument](_instrument_.instrument.md).[nameProperty](_instrument_.instrument.md#abstract-nameproperty)*

**Returns:** *string*

___

###  physicalName

▸ **physicalName**(`section`: [Section](_section_.section.md)): *string*

*Inherited from [Instrument](_instrument_.instrument.md).[physicalName](_instrument_.instrument.md#physicalname)*

**Parameters:**

Name | Type |
------ | ------ |
`section` | [Section](_section_.section.md) |

**Returns:** *string*

___

###  uses

▸ **uses**(`supplier`: [Instrument](_instrument_.instrument.md), `name`: string): *void*

*Inherited from [Instrument](_instrument_.instrument.md).[uses](_instrument_.instrument.md#uses)*

**Parameters:**

Name | Type |
------ | ------ |
`supplier` | [Instrument](_instrument_.instrument.md) |
`name` | string |

**Returns:** *void*

___