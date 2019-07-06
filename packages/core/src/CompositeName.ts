export class CompositeName {
    private constructor(private readonly tokens: string[]) {
        // TODO(imaman): validate:
        //   - no empty
        //   - no slahses
        //   - dashes only in the middle
        //   - cannot start with a digit
    }

    static fromArray(tokens: string[]): CompositeName {
        return new CompositeName([...tokens])
    }

    static fromString(slashSeparatedString: string): CompositeName {
        return new CompositeName(CompositeName.split(slashSeparatedString))
    }

    static split(slashSeparatedString: string): string[] {
        return slashSeparatedString.split('/')
    }

    append(suffix: string|CompositeName): CompositeName {
        if (suffix instanceof CompositeName) {
            new CompositeName(this.tokens.concat(suffix.tokens))
        }

        const temp = [...this.tokens]
        temp.push(suffix as string)
        return new CompositeName(temp)
    }

    first(defaultValue: string): string {
        if (this.isEmpty) {
            return defaultValue
        }

        return this.tokens[0]
    }

    last(defaultValue: string): string {
        if (this.isEmpty) {
            return defaultValue
        }

        return this.tokens[this.tokens.length - 1]
    }

    butLast(): CompositeName {
        return new CompositeName(this.tokens.slice(0, -1))
    }

    get isEmpty(): boolean {
        return !this.tokens.length
    }

    get all(): string[] {
        return [...this.tokens]
    }

    toString(): string {
        return this.tokens.join('/')
    }

}