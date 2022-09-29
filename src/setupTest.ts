import 'reflect-metadata'
import createApolloServer from './apolloServer'
import {initSequelize, sequelize}    from './sequelize/sequelize'

beforeAll(async () => {
    await initSequelize('test',  false)
    createApolloServer()
})

afterAll(async (done) => {
    await sequelize.close()
    done()
})