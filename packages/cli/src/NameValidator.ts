import { CompositeName } from "bigband-core";

export class NameValidator {
    static isOk(s: string): boolean {
        return Boolean(s.match(/^([a-z][a-z0-9]*)(-[a-z][a-z0-9]*)*$/))
    }
    static isCompositeNameOk(name: CompositeName): boolean {
        return !name.all.find(t => !NameValidator.isOk(t))
    }
}

