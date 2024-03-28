# Reporduce only on flyio

1. Run the following to lauch and deploy this server to flyio
```
fly launch --org intuned-dev --remote-only
fly deploy --remote-only
```
2. cd into update HOSTNAME and MACHINE_URL contansts with the flyio veriables

3. cd into `testing` and run `ts-node index.ts` this should run the `main` function. Read note before running.

NOTE: 
- This function calls `installDepsAndGetBrowserSession` which will create a directory, mount templete files and install dependacies and will get you a browser session to the test connection to it. The connection string should work normally. This connection string works on both localhost and flyio.

- The websocket url that fails to connect on flyio is on `getNodeProcessConnectionUrl`. To get that one out run 
    - `flyctl ssh console -a {flyio-app-name}`
    - start node debugging process `node --inspect-brk ./node_modules/.bin/intuned-api-runner`
    - uncomment `getNodeProcessConnectionUrl` and comment `installDepsAndGetBrowserSession` and run `ts-node index.ts` inside testing folder. 
    - You'll get the connection string in console similar to `ws://{hostname}/devtools/process/631e2c83-3877-46ee-b130-8763d5d1c1c5`. This is what were we are struggling to connect to and couldn't reproduce localy or on other hosting services like aws.
