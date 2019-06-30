import {Bigband} from './Bigband'

/**
 * Bigband's unit of deployment: all instruments within a given Section will be deployed together (by using the CLI's 
 * "ship" command). Conceptually can be thought of as a set of instruments. Note however, that a Section object does
 * not have a list of its instuments.  
 * 
 * For instance, suppose you have in your Bigband several lambda functio that form your application's reccomendation
 * engine. Then you would tyically want to deploy all of these instruments together so you will place them in a 
 * dedicated section called "reccomendations". If you also have a staging environment, you are likely to create
 * two distinct sections "reccomendations-prod" and "reccomendations-staging".
 * 
 * The decision how to separate your bigband into sections depends on your exact needs and your deployment patterns.
 * In particualr, a sections may contain instruments of different types (for instance: several Lambda instruments and
 * a DynamoDB instrument). 
 * 
 * The deployment of a section is not atomic: while a deployment takes place both the "new" and "old" version will
 * be alive (which is the typical situation in any non-monolithic distributed system). Thus, you need to write your code in
 * forward/backward compatible manner. Alternatively, you can use your source control system to break your change
 * into smaller chunks, such that each chunk changes just a single instrument, and then deploy chunk-by-chunk.
 *
 * If you have an insturment that persists data and you move this instrument acorss sections
 * its physical name (its name as AWS sees it) will change which means that the persisted data will be lost. This is an
 * inherent limitation of AWS (there is no API for renanming a DynamoDB table).
 * 
 * @export
 * @class Section
 */
export class Section {

    public readonly bigband: Bigband

    /**
     *Creates an instance of Section.

     * @param {Bigband} bigband the Bigband instance that this section is part of
     * @param {string} region the AWS region this section will be deployed at
     * @param {string} name the name of the section. Should be unique within its Bigband
     * @memberof Section
     */
    constructor(bigband: Bigband, 
        public readonly region: string, public readonly name: string) {
        this.bigband = bigband
    }    

    physicalName() {
        return `${this.bigband.name}-${this.name}`;
    }        
}

