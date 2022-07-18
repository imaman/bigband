import { Bigband } from './bigband'
import { Lambda } from './lambda'
import { Section } from './section'
import * as fs from 'fs'
import * as child_process from 'child_process'

async function main() {
  const lambda = new Lambda('lambda-200', {maxConcurrency: 'REGIONAL_ACCOUNT_LIMIT'})
  const b = new Bigband([lambda])

  const section: Section = {account: '091530143433', partition: 'aws', region: 'eu-west-1', sectionName: 'green' }

  const t = b.resolve(section)
  console.log(`t=${JSON.stringify(t, null, 2)}`)

  const stackName = `temp-green`
  const templateFile = '/tmp/x.json'
  fs.writeFileSync(templateFile, JSON.stringify(t, null, 2))


  const out = child_process.execSync(`aws --region eu-west-1 cloudformation update-stack --stack-name "${stackName}" --template-body file:///${templateFile} --capabilities CAPABILITY_NAMED_IAM`)  
  console.log(`output=${out.toString('utf-8')}`)

  console.log(`aws --region eu-west-1 cloudformation describe-stack-events --stack-name "${stackName}"`)
}


main()