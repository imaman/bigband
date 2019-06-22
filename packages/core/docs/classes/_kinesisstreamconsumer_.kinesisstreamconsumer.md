> ## [bigband-core](../README.md)

[Globals](../globals.md) / ["KinesisStreamConsumer"](../modules/_kinesisstreamconsumer_.md) / [KinesisStreamConsumer](_kinesisstreamconsumer_.kinesisstreamconsumer.md) /

# Class: KinesisStreamConsumer

## Hierarchy

  * [LambdaInstrument](_lambdainstrument_.lambdainstrument.md)

  * **KinesisStreamConsumer**

### Index

#### Constructors

* [constructor](_kinesisstreamconsumer_.kinesisstreamconsumer.md#constructor)

#### Properties

* [definition](_kinesisstreamconsumer_.kinesisstreamconsumer.md#protected-definition)
* [dependencies](_kinesisstreamconsumer_.kinesisstreamconsumer.md#dependencies)

#### Methods

* [arn](_kinesisstreamconsumer_.kinesisstreamconsumer.md#arn)
* [arnService](_kinesisstreamconsumer_.kinesisstreamconsumer.md#arnservice)
* [arnType](_kinesisstreamconsumer_.kinesisstreamconsumer.md#arntype)
* [canDo](_kinesisstreamconsumer_.kinesisstreamconsumer.md#cando)
* [contributeToConsumerDefinition](_kinesisstreamconsumer_.kinesisstreamconsumer.md#contributetoconsumerdefinition)
* [createFragment](_kinesisstreamconsumer_.kinesisstreamconsumer.md#createfragment)
* [fromNpmPackage](_kinesisstreamconsumer_.kinesisstreamconsumer.md#fromnpmpackage)
* [fullyQualifiedName](_kinesisstreamconsumer_.kinesisstreamconsumer.md#fullyqualifiedname)
* [getDefinition](_kinesisstreamconsumer_.kinesisstreamconsumer.md#getdefinition)
* [getEntryPointFile](_kinesisstreamconsumer_.kinesisstreamconsumer.md#getentrypointfile)
* [getNpmPackage](_kinesisstreamconsumer_.kinesisstreamconsumer.md#getnpmpackage)
* [getPhysicalDefinition](_kinesisstreamconsumer_.kinesisstreamconsumer.md#getphysicaldefinition)
* [invokeEveryMinutes](_kinesisstreamconsumer_.kinesisstreamconsumer.md#invokeeveryminutes)
* [name](_kinesisstreamconsumer_.kinesisstreamconsumer.md#name)
* [nameProperty](_kinesisstreamconsumer_.kinesisstreamconsumer.md#nameproperty)
* [physicalName](_kinesisstreamconsumer_.kinesisstreamconsumer.md#physicalname)
* [uses](_kinesisstreamconsumer_.kinesisstreamconsumer.md#uses)

## Constructors

###  constructor

\+ **new KinesisStreamConsumer**(`packageName`: string, `name`: string, `controllerPath`: string, `stream`: [KinesisStreamInstrument](_kinesisstreaminstrument_.kinesisstreaminstrument.md), `batchSize`: number, `cloudFormationProperties`: any): *[KinesisStreamConsumer](_kinesisstreamconsumer_.kinesisstreamconsumer.md)*

*Overrides [LambdaInstrument](_lambdainstrument_.lambdainstrument.md).[constructor](_lambdainstrument_.lambdainstrument.md#constructor)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`packageName` | string | - |
`name` | string | - |
`controllerPath` | string | - |
`stream` | [KinesisStreamInstrument](_kinesisstreaminstrument_.kinesisstreaminstrument.md) | - |
`batchSize` | number | - |
`cloudFormationProperties` | any |  {} |

**Returns:** *[KinesisStreamConsumer](_kinesisstreamconsumer_.kinesisstreamconsumer.md)*

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

*Inherited from [LambdaInstrument](_lambdainstrument_.lambdainstrument.md).[arnService](_lambdainstrument_.lambdainstrument.md#arnservice)*

*Overrides [Instrument](_instrument_.instrument.md).[arnService](_instrument_.instrument.md#abstract-arnservice)*

**Returns:** *string*

___

###  arnType

▸ **arnType**(): *string*

*Inherited from [LambdaInstrument](_lambdainstrument_.lambdainstrument.md).[arnType](_lambdainstrument_.lambdainstrument.md#arntype)*

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

*Inherited from [LambdaInstrument](_lambdainstrument_.lambdainstrument.md).[contributeToConsumerDefinition](_lambdainstrument_.lambdainstrument.md#contributetoconsumerdefinition)*

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

*Inherited from [LambdaInstrument](_lambdainstrument_.lambdainstrument.md).[createFragment](_lambdainstrument_.lambdainstrument.md#createfragment)*

*Overrides [Instrument](_instrument_.instrument.md).[createFragment](_instrument_.instrument.md#abstract-createfragment)*

**Parameters:**

Name | Type |
------ | ------ |
`pathPrefix` | string |

**Returns:** *[DeployableFragment](_deployablefragment_.deployablefragment.md)*

___

###  fromNpmPackage

▸ **fromNpmPackage**(`npmPackageName`: string): *`this`*

*Inherited from [LambdaInstrument](_lambdainstrument_.lambdainstrument.md).[fromNpmPackage](_lambdainstrument_.lambdainstrument.md#fromnpmpackage)*

**Parameters:**

Name | Type |
------ | ------ |
`npmPackageName` | string |

**Returns:** *`this`*

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

*Inherited from [LambdaInstrument](_lambdainstrument_.lambdainstrument.md).[getEntryPointFile](_lambdainstrument_.lambdainstrument.md#getentrypointfile)*

*Overrides [Instrument](_instrument_.instrument.md).[getEntryPointFile](_instrument_.instrument.md#abstract-getentrypointfile)*

**Returns:** *string*

___

###  getNpmPackage

▸ **getNpmPackage**(): *string*

*Inherited from [LambdaInstrument](_lambdainstrument_.lambdainstrument.md).[getNpmPackage](_lambdainstrument_.lambdainstrument.md#getnpmpackage)*

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

###  invokeEveryMinutes

▸ **invokeEveryMinutes**(`durationInMinutes`: number): *`this`*

*Inherited from [LambdaInstrument](_lambdainstrument_.lambdainstrument.md).[invokeEveryMinutes](_lambdainstrument_.lambdainstrument.md#invokeeveryminutes)*

**Parameters:**

Name | Type |
------ | ------ |
`durationInMinutes` | number |

**Returns:** *`this`*

___

###  name

▸ **name**(): *string*

*Inherited from [Instrument](_instrument_.instrument.md).[name](_instrument_.instrument.md#name)*

**Returns:** *string*

___

###  nameProperty

▸ **nameProperty**(): *string*

*Inherited from [LambdaInstrument](_lambdainstrument_.lambdainstrument.md).[nameProperty](_lambdainstrument_.lambdainstrument.md#nameproperty)*

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