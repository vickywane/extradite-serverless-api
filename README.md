# Extradite Serverless Api

An AWS Lambda-powered project boostraped using the Serverless Application Model (SAM) framework. This project will the chrome extension for download blob files into stroage buckets right from the browser. 

## AWS Services In Use: 
This project uses the following AWS services through then SAM framework; 

- Lambda Functions 
- Secrets Manager

## Prerequisties 
You need the following to run Extradite API:
 - Docker installed on your computer

## Steps To Run: 
- Launch two terminal windows to recompile the Lambda functions for the SAM runner and the other to start the API locally; 

- Execugithubte the command below in terminal 1 and leave it running:
  ```bash
  sam local start-api
  ```

- Execute the one-time command below in terminal 2:
  ```bash
  sam build
  ```

You can interact with the running APIs at http://127.0.0.1:3000