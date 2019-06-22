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

###  fromNpmPackage

▸ **fromNpmPackage**(`npmPackageName`: string): *`this`*

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

*Overrides [Instrument](_instrument_.instrument.md).[getEntryPointFile](_instrument_.instrument.md#abstract-getentrypointfile)*

**Returns:** *string*

___

###  getNpmPackage

▸ **getNpmPackage**(): *string*

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