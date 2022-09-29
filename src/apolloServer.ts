import 'reflect-metadata'
import { createSchemaGraphQL } from './sequelize/sequelize'
import { ApolloServer }        from 'apollo-server-express'

import configuration from '../config'

let server = void(0)

const context = (data) => {
    const { req, res } = data
    const token = (() => {
        if (configuration.TEST) {
            return {
                req: req,
                res: res
            }
        }
        const authorization = req.headers['authorization']
        if (!authorization) {
            return ''
        }
        const data = authorization.split(' ')
        return data.length > 1 ? data[1] : ''
    })()
 //   const refreshTokenCookie = configuration.JWT.COOKIE && req.cookies ? req.cookies['refresh-token'] : void(0)
    const CONTEXT = {
        req: req,
        res: res,
        accessToken: token,
      //  refreshToken: refreshTokenCookie
    }
    return CONTEXT
}

const createApolloServer = () => {
    if (server) {
        return server
    }
    const schema = createSchemaGraphQL()
    server = new ApolloServer({
        schema,
        context: (data) => context(data),
        formatError (err) {
            console.log('error', err)
            return err
        }
    })
    return server
}

export default createApolloServer
