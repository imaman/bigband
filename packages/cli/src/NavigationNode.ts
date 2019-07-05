import { Role } from "./models/BigbandModel";
import { InstrumentModel } from "./models/InstrumentModel";

export interface InspectedItem {
    path: string
    role: Role
    type?: string
    instrument?: InstrumentModel
}

export class NavigationNode {

    public readonly children: NavigationNode[] = []
    constructor(public readonly token: string, public readonly item: InspectedItem)  {}

    addChild(token: string, item: InspectedItem): NavigationNode {
        const child = this.downTo(token)
        if (child) {
            return child
        }

        const newChild = new NavigationNode(token, item)
        this.children.push(newChild)
        return newChild
    }

    downTo(token: string): NavigationNode|null {
        for (const curr of this.children) {
            if (curr.token === token) {
                return curr
            }
        }

        return null
    }

    navigate(path: string): NavigationNode|null {
        if (!path) {
            return this
        }
        const tokens = path.split('/')
        let ret: NavigationNode|null = this
        for (const token of tokens) {
            if (!ret) {
                return ret
            }
            ret = ret.downTo(token)
        }

        return ret

    }
}