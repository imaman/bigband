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

*Defined in [KinesisStreamConsumer.ts:5](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/KinesisStreamConsumer.ts#L5)*

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

*Inherited from [LambdaInstrument](_lambdainstrument_.lambdainstrument.md).[arnService](_lambdainstrument_.lambdainstrument.md#arnservice)*

*Overrides [Instrument](_instrument_.instrument.md).[arnService](_instrument_.instrument.md#abstract-arnservice)*

*Defined in [LambdaInstrument.ts:73](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/LambdaInstrument.ts#L73)*

**Returns:** *string*

___

###  arnType

▸ **arnType**(): *string*

*Inherited from [LambdaInstrument](_lambdainstrument_.lambdainstrument.md).[arnType](_lambdainstrument_.lambdainstrument.md#arntype)*

*Overrides [Instrument](_instrument_.instrument.md).[arnType](_instrument_.instrument.md#abstract-arntype)*

*Defined in [LambdaInstrument.ts:77](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/LambdaInstrument.ts#L77)*

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

*Inherited from [LambdaInstrument](_lambdainstrument_.lambdainstrument.md).[contributeToConsumerDefinition](_lambdainstrument_.lambdainstrument.md#contributetoconsumerdefinition)*

*Overrides [Instrument](_instrument_.instrument.md).[contributeToConsumerDefinition](_instrument_.instrument.md#abstract-contributetoconsumerdefinition)*

*Defined in [LambdaInstrument.ts:131](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/LambdaInstrument.ts#L131)*

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

*Defined in [LambdaInstrument.ts:93](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/LambdaInstrument.ts#L93)*

**Parameters:**

Name | Type |
------ | ------ |
`pathPrefix` | string |

**Returns:** *[DeployableFragment](_deployablefragment_.deployablefragment.md)*

___

###  fromNpmPackage

▸ **fromNpmPackage**(`npmPackageName`: string): *`this`*

*Inherited from [LambdaInstrument](_lambdainstrument_.lambdainstrument.md).[fromNpmPackage](_lambdainstrument_.lambdainstrument.md#fromnpmpackage)*

*Defined in [LambdaInstrument.ts:26](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/LambdaInstrument.ts#L26)*

**Parameters:**

Name | Type |
------ | ------ |
`npmPackageName` | string |

**Returns:** *`this`*

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

*Inherited from [LambdaInstrument](_lambdainstrument_.lambdainstrument.md).[getEntryPointFile](_lambdainstrument_.lambdainstrument.md#getentrypointfile)*

*Overrides [Instrument](_instrument_.instrument.md).[getEntryPointFile](_instrument_.instrument.md#abstract-getentrypointfile)*

*Defined in [LambdaInstrument.ts:85](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/LambdaInstrument.ts#L85)*

**Returns:** *string*

___

###  getNpmPackage

▸ **getNpmPackage**(): *string*

*Inherited from [LambdaInstrument](_lambdainstrument_.lambdainstrument.md).[getNpmPackage](_lambdainstrument_.lambdainstrument.md#getnpmpackage)*

*Defined in [LambdaInstrument.ts:31](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/LambdaInstrument.ts#L31)*

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

###  invokeEveryMinutes

▸ **invokeEveryMinutes**(`durationInMinutes`: number): *`this`*

*Inherited from [LambdaInstrument](_lambdainstrument_.lambdainstrument.md).[invokeEveryMinutes](_lambdainstrument_.lambdainstrument.md#invokeeveryminutes)*

*Defined in [LambdaInstrument.ts:36](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/LambdaInstrument.ts#L36)*

**Parameters:**

Name | Type |
------ | ------ |
`durationInMinutes` | number |

**Returns:** *`this`*

___

###  name

▸ **name**(): *string*

*Inherited from [Instrument](_instrument_.instrument.md).[name](_instrument_.instrument.md#name)*

*Defined in [Instrument.ts:95](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/Instrument.ts#L95)*

**Returns:** *string*

___

###  nameProperty

▸ **nameProperty**(): *string*

*Inherited from [LambdaInstrument](_lambdainstrument_.lambdainstrument.md).[nameProperty](_lambdainstrument_.lambdainstrument.md#nameproperty)*

*Overrides [Instrument](_instrument_.instrument.md).[nameProperty](_instrument_.instrument.md#abstract-nameproperty)*

*Defined in [LambdaInstrument.ts:81](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/LambdaInstrument.ts#L81)*

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