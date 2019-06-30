export class NameValidator {
    static isOk(s: string): boolean {
        return Boolean(s.match(/^([a-z][a-z0-9]*)(-[a-z][a-z0-9]*)*$/))
    }
}

