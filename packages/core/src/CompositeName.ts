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
        return new CompositeName(slashSeparatedString.split('/'))
    }

    append(token: string): CompositeName {
        const temp = [...this.tokens]
        temp.push(token)
        return new CompositeName(temp)
    }

    first(defaultValue: string): string {
        if (!this.tokens.length) {
            return defaultValue
        }

        return this.tokens[0]
    }

    get all(): string[] {
        return [...this.tokens]
    }

    toString(): string {
        return this.tokens.join('/')
    }

}