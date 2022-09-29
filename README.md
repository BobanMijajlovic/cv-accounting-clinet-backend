[Accounting Client Backend App](https://gitlab.com/boban.mijajlovic/backend-acc-client).

## Init Database

In the project directory, you can run:

First clear hole database in file: src/index.ts : <br/>
Change flag drop on true in line :      
### `await initSequelize('test', true)`

When init is finish return flag drop to false.

## Available Scripts

### `npm start`

Wait for few moments for init test data.

Open [http://localhost:4000/graphql](http://localhost:4000/graphql) to view it in the browser. <br/>
You  can see all database structure with Models and Types, also you can test queries and mutations.


ssh boban@192.168.1.217
///password- 2003hwt
cd /var/www/html/backend-acc-client

kill port 4000

git status
git stash
git pull

sudo -b npm start
