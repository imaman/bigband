import {IsolationScope} from './IsolationScope'

export class Section {
    constructor(public readonly isolationScope: IsolationScope, 
        public readonly region: string, public readonly name: string) {}    

    physicalName() {
        return `${this.isolationScope.name}-${this.name}`;
    }        
}

