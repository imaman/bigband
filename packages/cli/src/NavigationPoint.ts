import { CompositeName } from "bigband-core";

export abstract class NavigationPoint {
    abstract describe(): string
    abstract describeLong(): string[]
    abstract act(): string
    abstract downTo(name: CompositeName): NavigationPoint|null
}
