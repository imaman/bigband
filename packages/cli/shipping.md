## Shipping

Bigband's desing puts a lot of effort into making deployments as quick as possible. This follows the CD thinking of frictionless, minimal time deployments.

Let us describe key mechanism employed by Bigband which help achieve that goal:


`bigband ship` is the one-and-only command used for deplyoing bigbands. You use it for first-time deployments (as you just did) as well as for every subsequent update. It ships code changes (e.g., changes to `src/greeter.ts`) as well as architecutral changes (e.g., changes to `bigband.config.ts` file). Behind the scenes, Bigband makes sure that the deployment is minimal: only things that were actully changed will be redeployed. Specifically, if you have multiple lambda instruments defined in your bigband and you have changed just a few them, then running `bigband ship` will only *update the lambdas that were changed*.

Bottom line: freely run `bigband ship` whenever you need to deploy.

