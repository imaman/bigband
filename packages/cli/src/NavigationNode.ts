import { CompositeName, NavigationItem } from "bigband-core";


export class NavigationNode {

    public readonly children: NavigationNode[] = []
    constructor(public readonly token: string, public readonly item: NavigationItem)  {}

    addChild(token: string, item: NavigationItem): NavigationNode {
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

        let ret: NavigationNode|null = this
        for (const token of CompositeName.split(path)) {
            if (!ret) { 
                return ret
            }
            ret = ret.downTo(token)
        }

        return ret

    }
}
