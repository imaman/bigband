import {IsolationScope} from './IsolationScope'
import {Bigband} from './Bigband'

export class Section {

    public readonly isolationScope: Bigband

    constructor(bigband: Bigband|IsolationScope, 
        public readonly region: string, public readonly name: string) {
        this.isolationScope = bigband
    }    

    physicalName() {
        return `${this.isolationScope.name}-${this.name}`;
    }        
}

