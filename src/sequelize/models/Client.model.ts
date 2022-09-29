import 'reflect-metadata'
import {
    AutoIncrement,
    BeforeCreate,
    BeforeUpdate,
    Column,
    CreatedAt,
    DataType,
    HasMany,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}                        from 'sequelize-typescript'
import {
    Arg,
    Ctx,
    Field,
    ID,
    Int,
    Mutation,
    ObjectType,
    Query,
    Resolver,
    UseMiddleware
}                        from 'type-graphql'
import path              from 'path'
import * as validations  from './validations'
import {modelSTATUS}     from './validations'
import Address           from './Address.model'
import {omit}            from 'lodash'
import {AddressType}     from '../graphql/types/Address'
import {
    Customer,
    throwArgumentValidationError
}                        from './index'
import {
    createBaseResolver,
    IContextApp,
    TModelResponse,
    TModelResponseSelectAll
}                        from '../graphql/resolvers/basic'
import {
    ClientType,
    UploadType
}                        from '../graphql/types/Client'
import ClientSettings    from './Settings.model'
import {checkJWT}        from '../graphql/middlewares'
import BankAccount       from './BankAccount.model'
import Contact           from './Contact.model'
import fs                from 'fs'
import {GraphQLUpload}   from 'apollo-server-express'
import {ContactType}     from '../graphql/types/Contact'
import {BankAccountType} from '../graphql/types/BankAccount'
import TaxFinance        from './TaxFinance.model'
import DueDates          from './DueDates.model'

type TClientLogo = {
    url: string
}

@ObjectType()
@Table({
    tableName: 'client'
})

export default class Client extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field()
    @Column({
        allowNull: false,
        field: 'account_code',
        unique: true,
        type: DataType.STRING(16)
    })
    accountCode: string

    @Field()
    @Column({
        allowNull: true,
        field: 'short_name',
        type: DataType.STRING(64),
        validate: {
            isValid: (value) => validations.checkTrimString('Client', 'shortName', void(0), value)
        }
    })
    shortName: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        field: 'full_name',
        type: DataType.STRING(256)
    })
    fullName: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(256),
        defaultValue: ''
    })
    description: string

    @Field()
    @Column({
        allowNull: true,
        type: DataType.STRING(20),
        field: 'tax_number',
        validate: {
            isValid: (value) => {
                if (!value) {
                    return true
                }
                if (!/^[0-9A-Z-]$/i || value.length < 6 || value.length > 16) {
                    throw Error('Tax number is not valid')
                }
            }
        }
    })
    taxNumber: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(20),
        field: 'unique_company_number',
        validate: {
            isValid: (value) => {
                if (!value) {
                    return true
                }
                if (!/^[0-9A-Z-]$/i || value.length < 6 || value.length > 16) {
                    throw Error('Client number is not valid')
                }
            }
        }
    })
    uniqueCompanyNumber: string

    @Field(type => Int)
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: modelSTATUS.ACTIVE,
        validate: {
            isValid: (value) => validations.isStatusValid('Client', value)
        }
    })
    status: number

    @Field()
    @CreatedAt
    @Column({
        field: 'created_at'
    })
    createdAt: Date

    @Field()
    @UpdatedAt
    @Column({
        field: 'updated_at'
    })
    updatedAt: Date

    @Field(type => [Address], {nullable: true})
    @HasMany(() => Address)
    addresses: Address[]

    @Field(type => [ClientSettings], {nullable: true})
    @HasMany(() => ClientSettings)
    settings: ClientSettings[]

    @Field(type => [Customer], {nullable: true})
    @HasMany(() => Customer)
    customer: Customer[]

    @Field(type => [BankAccount], {nullable: true})
    @HasMany(() => BankAccount)
    banks: BankAccount[]

    @Field(type => [Contact], {nullable: true})
    @HasMany(() => Contact)
    contacts: Contact[]
    
    @Field(type => [TaxFinance],{nullable:true})
    @HasMany(() => TaxFinance)
    taxFinance: TaxFinance[]

    @Field(type => [DueDates], { nullable: true })
    @HasMany(() => DueDates)
    dueDates: DueDates[]

    static async _validateClient (instance: Client, options: any = {}, update: boolean) {

        !instance.taxNumber && throwArgumentValidationError('taxNumber', instance, {message: 'Tax number must be defined'})
        if ((!instance.shortName || instance.shortName.trim().length === 0) && (!instance.fullName || instance.fullName.trim().length === 0)) {
            throwArgumentValidationError('shortName', instance, {message: 'Short Name or Full Name must be define'})
        }

        let client = await Client.findOne({
            where: {
                taxNumber: instance.taxNumber
            },
            ...options
        })

        client && (!update || client.id !== instance.id) && throwArgumentValidationError('taxNumber', instance, {message: 'Tax number must be unique in system'})

        if (instance.uniqueCompanyNumber) {
            client = await Client.findOne({
                where: {
                    uniqueCompanyNumber: instance.uniqueCompanyNumber
                },
                ...options
            })
            client && (!update && client.id !== instance.id) && throwArgumentValidationError('uniqueCompanyNumber', instance, {message: 'UCN  must be unique in system'})
        }
    }

    /** parts for hooks */
    @BeforeCreate({name: 'beforeCreateHook'})
    static async _beforeCreateHook (instance: Client, options: any) {
        // await Client._validateClient(instance, options, false)
    }

    @BeforeUpdate({name: 'beforeUpdateHook'})
    static async _beforeUpdate (instance: Client, options: any) {
        await Client._validateClient(instance, options, true)
    }

    /** parts for functions */
    public static async selectOne (id: number, ctx?: IContextApp): TModelResponse<any> {
        return Client.findOne({
            where: {
                id
            },
            include: [
                {
                    required: false,
                    model: Address,
                    where: {
                        customerId: null
                    }
                },
                {
                    required: false,
                    model: BankAccount,
                    where: {
                        customerId: null
                    }
                },
                {
                    required: false,
                    model: Contact,
                    where: {
                        customerId: null
                    }
                }
            ]
        })

    }

    static async insertSubObjects (client: Client, options: any, data: ClientType, ctx: IContextApp) {
        if (data.addresses) {
            const promises = data.addresses.map((a: AddressType) => {
                return Address.create({
                    ...a,
                    clientId: client.id
                }, options)
            })
            await Promise.all(promises)
        }
        if (data.contacts) {
            const promiseContact = data.contacts.map((c: ContactType) => Contact.create({
                ...c,
                clientId: client.id
            }, options))
            await Promise.all(promiseContact)
        }

        if (data.banks) {
            const promiseBanks = data.banks.map((b: BankAccountType) => BankAccount.create({
                ...b,
                accountString: b.account.replace(' ', ''),
                clientId: ctx.clientId,
            }, options))
            await Promise.all(promiseBanks)
        }
    }

    public static async insertOne (data: ClientType, ctx?: IContextApp): TModelResponse<Client> {

        const transaction = await Client.sequelize.transaction()
        const options = {transaction}

        try {

            const _data = omit(data, ['addresses'])
            const client = await Client.create(_data, options)
            await Client.insertSubObjects(client, options, data, ctx)
            await transaction.commit()
            return Client.selectOne(client.id, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    /** update the Client, additional checks will be done in  hooks, address only can be added, for change addresses use direct update of address*/
    public static async updateOne (id: number, data: ClientType, ctx?: IContextApp): TModelResponse<Client> {
        const transaction = await Client.sequelize.transaction()
        const options = {transaction}
        try {
            const client = await Client.findOne({
                where: {
                    id
                },
                ...options
            })
            if (!client) {
                throwArgumentValidationError('id', {}, {message: 'Client not exists'})
            }
            const _data = omit(data, ['addresses'])
            await client.update(_data, options)
            await Client.insertSubObjects(client, options, data, ctx)
            await transaction.commit()
            return Client.selectOne(id, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }

    }

    /** Function is used by BaseResolver */
    public static async selectAll (options: any, _ctx?: IContextApp): TModelResponseSelectAll<Client> {
        return Client.findAndCountAll(options)
    }

    public static async uploadLogo (file: UploadType, ctx: IContextApp) {
        const {createReadStream,filename} = await file
        const pathName = path.join(__dirname, `/../../../images/logo/${ctx.clientId}/${filename}`)
        const dirPath = path.join(__dirname, `/../../../images/logo/${ctx.clientId}/`)
        const dir = await  fs.readdirSync(dirPath)
        if (dir.length === 0) {
            await fs.mkdirSync(path.join(__dirname, `/../../../images/logo/${ctx.clientId}/`))
        }
        if (dir.length !== 0) {
            await  fs.unlinkSync(`${dirPath}${dir[0]}`)
        }
        return new Promise((resolve, reject) => {
            createReadStream()
                .pipe(fs.createWriteStream(pathName))
                .on('finish', () => resolve(`${ctx.clientId}/${filename}`))
                .on('error', () => reject())
        })
    }

}

/** Base resolver search fo functions like:
 *   insertOne,
 *   selectAll,
 *   selectOne
 */
const BaseResolver = createBaseResolver(Client, {
    updateInputType: ClientType,
    insertInputType: ClientType
})

@Resolver()
export class ClientResolver extends BaseResolver {

    @UseMiddleware(checkJWT)
    @Query(returns => Client, {nullable: true, name: 'getLoggedClient'})
    getOne (@Ctx() ctx: IContextApp) {
        return Client.findOne({
            where: {
                id: ctx.clientId
            },
            include: [
                {
                    required: false,
                    model: Address,
                    where: {
                        customerId: null,
                        status: modelSTATUS.ACTIVE
                    }
                },
                {
                    required: false,
                    model: BankAccount,
                    where: {
                        customerId: null,
                        status: modelSTATUS.ACTIVE
                    }
                },
                {
                    required: false,
                    model: Contact,
                    where: {
                        customerId: null,
                        status: modelSTATUS.ACTIVE
                    }
                }
            ]
        })
    }

    @UseMiddleware(checkJWT)
    @Query(returns => String, {nullable: true, name: 'getClientLogoUrl'})
    async getLogoUrl (@Ctx() ctx: IContextApp) {
        const pathName = path.join(__dirname, `/../../../images/logo/${ctx.clientId}/`)
        const files = await fs.readdirSync(pathName)
        return `${ctx.clientId}/${files[0]}`
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => String, {name: 'uploadLogo'})
    _qModelUploadLogo (@Arg('file', () => GraphQLUpload)  file: UploadType,
        @Ctx() ctx: IContextApp) {
        return Client.uploadLogo(file,ctx)
    }

}

