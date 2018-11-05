export const config = {
    namespace: {
        s3Bucket: 'servicemix-example',
        s3Prefix: 'root',
        name: 'servicemix-example-app'
    },
    package: {
        region: "eu-central-1",
        name: 'chronology',
        functions: {
            "importantDates": {
                controller: "src/chronology/compute",
                properties: {
                    Description: "returns important dates for a year",
                    MemorySize: 1024,
                    Timeout: 30      
                }
            }
        }
    },
}

