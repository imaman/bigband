export enum Role {
    BIGBAND,
    REGION,
    SECTION,
    PATH,
    INSTRUMENT
}


export interface NavigationItem {
    path: string
    role: Role
    type?: string
}
