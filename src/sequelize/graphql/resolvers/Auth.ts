import {
    Arg,
    Ctx,
    Mutation,
    Query,
    Resolver,
    UseMiddleware
} from 'type-graphql'
import {
    throwArgumentValidationError,
    User
} from '../../models'

import bcrypt        from 'bcryptjs'
import jsonwebtoken  from 'jsonwebtoken'
import configuration from '../../../../config'
import {IContextApp} from './basic'

import Client        from '../../models/Client.model'
import {
    AuthChangePassword,
    AuthUnlock,
    AuthUserLogin,
    AuthUserRegister,
    LoginResponse
}                    from '../types/Auth'
import {
    CONSTANT_MODEL,
    SETTINGS
}                    from '../../constants'
import Settings      from '../../models/Settings.model'
import Email         from '../../models/Email.model'
import CONFIGURATION from '../../../../config/index'
import _             from 'lodash'
import {FindOptions} from 'sequelize'
import {checkJWT}    from '../middlewares'

const sendEmailRegistration = async (user: User, tokenString: string, subject: string, action: string) => {
    const settings = await Settings.selectOneByKey(SETTINGS.KEY_APPLICATION_CONFIRM_EMAIL)
    const text = await Settings.selectOneByKey(SETTINGS.KEY_APPLICATION_CONFIRM_EMAIL_TEXT)
    if (settings && text) {
        let data = text.value
        //const domain = CONFIGURATION.DOMAIN
        const token = jsonwebtoken.sign({
            userId: user.id,
            email: user.email,
            userName: user.userName
        },
            tokenString,
            {expiresIn: '30m'})
        const ref = CONFIGURATION.JWT.COOKIE ? `${CONFIGURATION.DOMAIN}#/application/auth/${action}?key=${user.id},${token}` : `${CONFIGURATION.DOMAIN_IONIC}/${action}?key=${user.id},${token}`
        data = data.replace(/href=LINK_TO_REPLACE/, `href="${ref}"`)
        await Email.insertOne(user.email, subject, data)
    }
}

export const createAccessToken = (user: User) => {

    return jsonwebtoken.sign({userId: user.id, clientId: user.clientId},
        configuration.JWT.KEY,
        {expiresIn: configuration.JWT.KEY_EXPIRE})

}

const getTime = (time: string) => {
    let number = 0
    let str = ''
    if (/s/g.test(time)) {
        str = time.replace(/s/g, '')
        number = _.multiply(Number(str), 1000)
    }
    if (/m/g.test(time)) {
        str = time.replace(/m/g, '')
        number = _.multiply(Number(str), _.multiply(60, 1000))
    }
    if (/d/g.test(time)) {
        str = time.replace(/d/g, '')
        number = _.multiply(Number(str), 24 * 60 * 1000)
    }
    return Number(number)
}

/*
export const createRefreshTokenCookie = (user: User, resp: any) => {
    const token = jsonwebtoken.sign({ userId: user.id, clientId: user.clientId },
    configuration.JWT.KEY_REFRESH,
    { expiresIn: configuration.JWT.KEY_REFRESH_EXPIRE })
    resp.cookie('refresh-token', token, {
       // domain: '192.168.1.26:4000',
       // sameSite: 'none',
        httpOnly: true,
        // maxAge: 90000,
        expire: getTime(configuration.JWT.KEY_EXPIRE),
        path: '/refresh_token'
    })
}
*/

export const createRefreshToken = (user: User, resp: any) => {
    const token = jsonwebtoken.sign({userId: user.id, clientId: user.clientId},
        configuration.JWT.KEY_REFRESH,
        {expiresIn: configuration.JWT.KEY_REFRESH_EXPIRE})
    resp.cookie('refresh-token', token, {
        httpOnly: true,
        expire: getTime(configuration.JWT.KEY_EXPIRE),
        path: '/refresh_token'
    })
    return token
}

export const verifyRefreshToken = (token: string) => {
    const key = configuration.JWT.KEY_REFRESH
    return jsonwebtoken.verify(token, key)
}

@Resolver()
export default class AuthResolver {

    private static createTempToken = () => {
        const token = [...new Array(127)].map(x => {
            let char = Math.floor((Math.random() * (122 - 48))) + 48
            while (char) {
                if ((char >= 48 && char <= 57) || (char >= 65 && char <= 90) || (char >= 97 && char <= 122)) {
                    return char
                }
                char = Math.floor((Math.random() * (122 - 48))) + 48
            }
        }).map(x => String.fromCharCode(x))
            .join('')

        return token
    }

    @Query(returns => LoginResponse, {name: 'authLogin'})
    async authLogin (@Arg('data') data: AuthUserLogin,
        @Ctx() ctx: IContextApp) {
        /**   First thy to find user by user name, we can check before this is userName valid email  */
        const user = data.accountCode ? await User.findOne({
            where: {
                userName: data.userName
            },
            include: [
                {
                    required: true,
                    model: Client,
                    where: {
                        accountCode: data.accountCode
                    }
                }
            ]
        }) : await User.findOne({
            where: {
                email: data.userName
            }
        })

        !user && throwArgumentValidationError('userName', {}, {message: 'User name or password  not match'})
        const valid = await bcrypt.compare(data.password, user.password)
        !valid && throwArgumentValidationError('password', {}, {message: 'User name or password not match'})
        return {
            token: createAccessToken(user),
            refresh: createRefreshToken(user, ctx.res),
            user
        }
    }

    @UseMiddleware(checkJWT)
    @Query(returns => LoginResponse, {name: 'authUnlock'})
    async unlock (@Arg('data') data: AuthUnlock,
        @Ctx() ctx: IContextApp) {
        /** First thy to find user by user name, we can check before this is userName valid email*/
        const options: FindOptions = {
            where: {
                pinCode: data.pinCode,
                clientId: ctx.clientId
            }
        }
        const user = await User.findOne(options)
        if (!user) {
            throwArgumentValidationError('pinCode', {}, {message: 'Pin code not match'})
        }
        return {
            token: createAccessToken(user),
            refresh: createRefreshToken(user, ctx.res),
            user
        }
    }

    @Mutation(returns => String, {name: 'authRegistration'})
    async authRegistration (@Ctx() ctx: IContextApp,
        @Arg('data') data: AuthUserRegister) {

        const user = await User.findOne({
            where: {
                email: data.email,
            },
            include: [
                {
                    model: Client
                }
            ]
        })
        if (user) {
            if (data.userName !== data.userName) {
                throwArgumentValidationError('userName', data, {message: 'User Name  already exists'})
            }
            if (user.status !== 0) {
                throw new Error('User account is already active !')
            }
            const token = AuthResolver.createTempToken()
            await user.update({
                token
            })
            sendEmailRegistration(user, token, 'Verification', 'confirm-registration')
            throw new Error('User account exists, check email to confirm !')
        }

        if (data.accountCode) {
            data.accountCode = data.accountCode.trim()
            const client = await Client.findOne({
                where: {
                    accountCode: data.accountCode
                }
            })
            if (client) {
                throwArgumentValidationError('accountCode', data, {message: 'Account Code  already exists'})
            }
        }

        const transaction = await User.sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}
        const token = AuthResolver.createTempToken()

        try {

            const client = await Client.create({
                accountCode: data.accountCode
            } as any, options)

            const hash = await bcrypt.hash(data.password, 12)
            await User.create({
                password: hash,
                clientId: client.id,
                userName: data.userName,
                email: data.email,
                token: token,
                status: CONSTANT_MODEL.USER_STATUS.REQUESTED
            }, options)
            transaction.commit()
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
        await sendEmailRegistration(user, token, 'Verification', 'confirm-registration')
        return 'OK'
    }

    @Mutation(returns => String, {name: 'authConfirmation'})
    async confirmation (@Arg('key', type => String) key: string,) {

        const data = /(.*),(.*)/.exec(key)
        if (!data || !Array.isArray(data) || data.length < 2) {
            throw Error('Data are not valid')
        }
        const user = await User.findByPk(data[1])
        if (!user || user.status !== CONSTANT_MODEL.USER_STATUS.REQUESTED) {
            throw Error('Account not found')
        }
        const dataToken = jsonwebtoken.verify(data[2], user.token)
        if (dataToken.userId !== user.id || dataToken.email !== user.email) {
            throw ('Data not valid')
        }

        /** here active but should be  approved  and then to active by admin*/
        await user.update({
            status: CONSTANT_MODEL.USER_STATUS.ACTIVE
        })

        return 'OK'
    }

    @Mutation(returns => String, {name: 'authPasswordChange'})
    async changePassword (@Ctx() ctx: IContextApp,
        @Arg('data') data: AuthChangePassword) {

        const keyData = /(.*),(.*)/.exec(data.key)
        if (!keyData || !Array.isArray(keyData) || keyData.length < 2) {
            throw Error('Data are not valid')
        }
        const user = await User.findByPk(keyData[1])
        if (!user || user.status !== 1) {
            throw Error('Account not found')
        }
        const dataToken = jsonwebtoken.verify(keyData[2], user.token)
        if (dataToken.userId !== user.id || dataToken.email !== user.email) {
            throw ('Data not valid')
        }

        const hash = await bcrypt.hash(data.password, 12)
        await user.update({
            password: hash
        })
        return 'OK'
    }

    @Mutation(returns => String, {name: 'authPasswordRecovery'})
    async accountRecoverPasswordByEmail (@Arg('email', type => String) email: string) {
        const user = await User.findOne({
            where: {
                email: email
            }
        })
        if (!user) {
            throwArgumentValidationError('email', {}, {message: 'Email not exists in system'})
        }

        if (user.status !== CONSTANT_MODEL.USER_STATUS.ACTIVE) {
            throwArgumentValidationError('email', {}, {message: 'Account is not active any more, contact admin!'})
        }

        const token = AuthResolver.createTempToken()
        await user.update({
            token
        })
        await sendEmailRegistration(user, token, 'Change Password', 'change-password')
        return 'OK'
    }

    /*
  /!** Returns current logged account *!/

    @UseMiddleware(checkJWT)
    @Query(returns => Account, {name: 'authLogged'})
    async accountLogged(@Ctx() ctx: IContextApp) {
        return Account.selectOne(ctx.accountId, ctx)
    } */

}
