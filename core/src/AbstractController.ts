
export abstract class AbstractController<T, R> {
    protected readonly mapping: any;
    protected readonly buildFingerprint: string;
    protected context: any = {};
     
    constructor(mapping, buildFingerprint) {
        this.mapping = mapping;
        this.buildFingerprint = buildFingerprint;
    }

    abstract executeScheduledEvent(): void;
    abstract executeInputEvent(input: T): R;

    protected async onError(e: Error) {}

    protected async compute(event: any) {
        if (event['detail-type'] === 'Scheduled Event') {
            await this.executeScheduledEvent();
            return;
        }

        return await this.executeInputEvent(event);
    
    }

    async runLambda(input: T, context: any) {
        this.context = context;
        try {
            const output = await this.compute(input);
            return {
                output
            }
        } catch (e) {
            await this.onError(e);
            throw e;            
        }
    }        
}

