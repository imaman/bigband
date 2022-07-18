import * as child_process from 'child_process'
import * as fs from 'fs'

import { Bigband } from './bigband'
import { Lambda } from './lambda'
import { S3Bucket } from './s3-bucket'
import { Section } from './section'

function print(...args: unknown[]) {
  console.log(...args) // eslint-disable-line no-console
}

async function main() {
  const lambda = new Lambda(
    'lambda-200',
    { bucket: new S3Bucket('aaaa', {}), path: 'bbbb' },
    { maxConcurrency: 'REGIONAL_ACCOUNT_LIMIT' },
  )
  const b = new Bigband([lambda])

  const section: Section = { account: '091530143433', partition: 'aws', region: 'eu-west-1', sectionName: 'green' }

  const t = b.resolve(section)
  print(`t=${JSON.stringify(t, null, 2)}`)

  const stackName = `temp-green`
  const templateFile = '/tmp/x.json'
  fs.writeFileSync(templateFile, JSON.stringify(t, null, 2))

  const out = child_process.execSync(
    `aws --region eu-west-1 cloudformation update-stack --stack-name "${stackName}" --template-body file:///${templateFile} --capabilities CAPABILITY_NAMED_IAM`,
  )
  print(`output=${out.toString('utf-8')}`)

  print(`aws --region eu-west-1 cloudformation describe-stack-events --stack-name "${stackName}"`)
}

main()
