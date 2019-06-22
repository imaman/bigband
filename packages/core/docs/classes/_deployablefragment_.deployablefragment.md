> ## [bigband-core](../README.md)

[Globals](../globals.md) / ["DeployableFragment"](../modules/_deployablefragment_.md) / [DeployableFragment](_deployablefragment_.deployablefragment.md) /

# Class: DeployableFragment

## Hierarchy

* **DeployableFragment**

### Index

#### Properties

* [atoms](_deployablefragment_.deployablefragment.md#private-atoms)
* [usedPaths](_deployablefragment_.deployablefragment.md#private-usedpaths)

#### Methods

* [add](_deployablefragment_.deployablefragment.md#add)
* [addText](_deployablefragment_.deployablefragment.md#addtext)
* [forEach](_deployablefragment_.deployablefragment.md#foreach)
* [scan](_deployablefragment_.deployablefragment.md#scan)
* [toString](_deployablefragment_.deployablefragment.md#tostring)

## Properties

### `Private` atoms

● **atoms**: *[DeployableAtom](_deployablefragment_.deployableatom.md)[]* =  []

*Defined in [DeployableFragment.ts:14](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/DeployableFragment.ts#L14)*

___

### `Private` usedPaths

● **usedPaths**: *`Set<string>`* =  new Set<string>()

*Defined in [DeployableFragment.ts:13](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/DeployableFragment.ts#L13)*

___

## Methods

###  add

▸ **add**(`atom`: [DeployableAtom](_deployablefragment_.deployableatom.md)): *[DeployableFragment](_deployablefragment_.deployablefragment.md)*

*Defined in [DeployableFragment.ts:17](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/DeployableFragment.ts#L17)*

**Parameters:**

Name | Type |
------ | ------ |
`atom` | [DeployableAtom](_deployablefragment_.deployableatom.md) |

**Returns:** *[DeployableFragment](_deployablefragment_.deployablefragment.md)*

___

###  addText

▸ **addText**(`path`: string, `content`: string): *void*

*Defined in [DeployableFragment.ts:26](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/DeployableFragment.ts#L26)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |
`content` | string |

**Returns:** *void*

___

###  forEach

▸ **forEach**(`f`: function): *void*

*Defined in [DeployableFragment.ts:30](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/DeployableFragment.ts#L30)*

**Parameters:**

■` f`: *function*

▸ (`_`: [DeployableAtom](_deployablefragment_.deployableatom.md)): *void*

**Parameters:**

Name | Type |
------ | ------ |
`_` | [DeployableAtom](_deployablefragment_.deployableatom.md) |

**Returns:** *void*

___

###  scan

▸ **scan**(`pathInFragment`: string, `absolutePath`: string): *void*

*Defined in [DeployableFragment.ts:35](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/DeployableFragment.ts#L35)*

**Parameters:**

Name | Type |
------ | ------ |
`pathInFragment` | string |
`absolutePath` | string |

**Returns:** *void*

___

###  toString

▸ **toString**(): *string*

*Defined in [DeployableFragment.ts:50](https://github.com/imaman/bigband/blob/2497e7d/packages/core/src/DeployableFragment.ts#L50)*

**Returns:** *string*

___