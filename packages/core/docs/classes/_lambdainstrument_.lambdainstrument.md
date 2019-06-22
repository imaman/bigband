> ## [bigband-core](../README.md)

[Globals](../globals.md) / ["LambdaInstrument"](../modules/_lambdainstrument_.md) / [LambdaInstrument](_lambdainstrument_.lambdainstrument.md) /

# Class: LambdaInstrument

## Hierarchy

* [Instrument](_instrument_.instrument.md)

  * **LambdaInstrument**

  * [KinesisStreamConsumer](_kinesisstreamconsumer_.kinesisstreamconsumer.md)

### Index

#### Constructors

* [constructor](_lambdainstrument_.lambdainstrument.md#constructor)

#### Properties

* [definition](_lambdainstrument_.lambdainstrument.md#protected-definition)
* [dependencies](_lambdainstrument_.lambdainstrument.md#dependencies)

#### Methods

* [arn](_lambdainstrument_.lambdainstrument.md#arn)
* [arnService](_lambdainstrument_.lambdainstrument.md#arnservice)
* [arnType](_lambdainstrument_.lambdainstrument.md#arntype)
* [canDo](_lambdainstrument_.lambdainstrument.md#cando)
* [contributeToConsumerDefinition](_lambdainstrument_.lambdainstrument.md#contributetoconsumerdefinition)
* [createFragment](_lambdainstrument_.lambdainstrument.md#createfragment)
* [fromNpmPackage](_lambdainstrument_.lambdainstrument.md#fromnpmpackage)
* [fullyQualifiedName](_lambdainstrument_.lambdainstrument.md#fullyqualifiedname)
* [getDefinition](_lambdainstrument_.lambdainstrument.md#getdefinition)
* [getEntryPointFile](_lambdainstrument_.lambdainstrument.md#getentrypointfile)
* [getNpmPackage](_lambdainstrument_.lambdainstrument.md#getnpmpackage)
* [getPhysicalDefinition](_lambdainstrument_.lambdainstrument.md#getphysicaldefinition)
* [invokeEveryMinutes](_lambdainstrument_.lambdainstrument.md#invokeeveryminutes)
* [name](_lambdainstrument_.lambdainstrument.md#name)
* [nameProperty](_lambdainstrument_.lambdainstrument.md#nameproperty)
* [physicalName](_lambdainstrument_.lambdainstrument.md#physicalname)
* [uses](_lambdainstrument_.lambdainstrument.md#uses)

## Constructors

###  constructor

\+ **new LambdaInstrument**(`packageName`: string | string[], `name`: string, `controllerPath`: string, `cloudFormationProperties`: any): *[LambdaInstrument](_lambdainstrument_.lambdainstrument.md)*

*Overrides [Instrument](_instrument_.instrument.md).[constructor](_instrument_.instrument.md#constructor)*

*Defined in [LambdaInstrument.ts:16](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/LambdaInstrument.ts#L16)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`packageName` | string \| string[] | - |
`name` | string | - |
`controllerPath` | string | - |
`cloudFormationProperties` | any |  {} |

**Returns:** *[LambdaInstrument](_lambdainstrument_.lambdainstrument.md)*

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

*Defined in [LambdaInstrument.ts:73](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/LambdaInstrument.ts#L73)*

**Returns:** *string*

___

###  arnType

▸ **arnType**(): *string*

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

*Overrides [Instrument](_instrument_.instrument.md).[getEntryPointFile](_instrument_.instrument.md#abstract-getentrypointfile)*

*Defined in [LambdaInstrument.ts:85](https://github.com/imaman/bigband/blob/1dee7b5/packages/core/src/LambdaInstrument.ts#L85)*

**Returns:** *string*

___

###  getNpmPackage

▸ **getNpmPackage**(): *string*

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