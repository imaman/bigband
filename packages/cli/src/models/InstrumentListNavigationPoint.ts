import { NavigationPoint } from "../NavigationPoint";
import { InstrumentModel } from "./InstrumentModel";
import { CompositeName } from "bigband-core";

export class InstrumentListNavigationPoint implements NavigationPoint {
    constructor(private readonly instruments: InstrumentModel[], private readonly offset: number) {}

    describe(): string { return "" }
    describeLong(): string[] { return [] }
    act(): string { return "-" }

    downTo(name: CompositeName): NavigationPoint|null {
        if (name.isEmpty) {
            return this
        }

        const token = name.first("")
        const matching = this.instruments.filter(im => im.instrument.cname.at(this.offset) === token)
        if (!matching.length) {
            return null
        } 

        return new InstrumentListNavigationPoint(matching, this.offset + 1)
    }
}