Build production grade systems by securely assmebling Lambda functions, storage servcies, identity providers, etc.


# Development

Build and deploy the example bigband: 
```bash
./bigband-example.sh
```


Invoke one of the lambda in the example bigband:
```bash
./bigband-example.sh invoke --function-name placeFinder --input '{"query": "United Kingdom"}'
```


