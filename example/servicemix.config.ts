export const config = {
    s3Object: 'deployables/a.zip',
    namespace: {
        s3Bucket: 'servicemix-example',
        name: 'servicemixExample'
    },
    package: {
        region: "eu-central-1",
        name: 'chronology',
        functions: {
            "importantDates": {
                controller: "compute",
                properties: {
                    Description: "returns important dates for a year",
                    MemorySize: 1024,
                    Timeout: 30      
                }
            }
        }
    },
}

