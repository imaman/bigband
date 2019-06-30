
export class ResolvedName {

  constructor(readonly fullyQualifiedName_: string, readonly physicalName_: string) {}

  physicalName() { return this.physicalName_ }
  fullyQualifiedName() { return this.fullyQualifiedName_ }
}
