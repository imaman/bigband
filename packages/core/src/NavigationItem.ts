export enum Role {
    BIGBAND,
    REGION,
    SECTION,
    PATH,
    INSTRUMENT,
    LOCAL_COMMAND,
    COMMAND
}


export interface NavigationItem {
    path: string
    role: Role
    type?: string
}
