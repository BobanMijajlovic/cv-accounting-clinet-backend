import 'reflect-metadata'
import {
    AutoIncrement,
    BeforeCreate,
    BeforeUpdate,
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    HasMany,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
} from 'sequelize-typescript'
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
} from 'type-graphql'

import * as validations from './validations'
import {modelSTATUS}    from './validations'

import Address from './Address.model'

import _, {
    flatten as _flatten,
    omit,
    uniq as _uniq,
}                              from 'lodash'
import {AddressType}           from '../graphql/types/Address'
import {
    setUserFilterToWhereSearch,
    throwArgumentValidationError
}                              from './index'
import {
    createBaseResolver,
    IContextApp,
    TModelResponse,
    TModelResponseSelectAll
}                              from '../graphql/resolvers/basic'
import {
    CustomerInfoType,
    CustomerType
}                              from '../graphql/types/Customer'
import Client                  from './Client.model'
import Contact                 from './Contact.model'
import {ContactType}           from '../graphql/types/Contact'
import CustomerInfo            from './CustomerInfo.model'
import {
    CONSTANT_ADDRESS_TYPES,
    CONSTANT_MODEL
}                              from '../constants'
import {checkJWT}              from '../graphql/middlewares'
import {BankAccountType}       from '../graphql/types/BankAccount'
import BankAccount             from './BankAccount.model'
import {
    getCustomerByBankAccount,
    getCustomerByName,
    getCustomerByTin
}                              from '../../server/Server'
import {isAfter}               from 'date-fns'
import FinanceTransferDocument from './FinanceTransferDocument.model'
import DueDates                from './DueDates.model'

@ObjectType()
@Table({
    tableName: 'customer'
})

export default class Customer extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED,
    })
    id: number

    @Field()
    @Column({
        allowNull: false,
        field: 'short_name',
        type: DataType.STRING(128),
        validate: {
            isValid: (value) => validations.checkTrimString.bind(null, 'Customer', 'shortName', void(0))(value)
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
        allowNull: false,
        type: DataType.STRING(20),
        field: 'tax_number',
        validate: {
            isValid: (value) => {
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
                    throw Error('Customer Company Number is not valid')
                }
            }
        }
    })
    uniqueCompanyNumber: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        comment: 'Total owes by all transactions/invoices/calculations',
        field: 'total_owes'
    })
    totalOwes: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        comment: 'Total claims by all transactions/invoices/calculations',
        field: 'total_claims'
    })
    totalClaims: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        comment: 'Total paid from customer',
        field: 'paid_from'
    })
    paidFrom: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        comment: 'Total paid to customer',
        field: 'paid_to'
    })
    paidTo: number

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.STATUS.ACTIVE,
        validate: {
            isValid: (value) => validations.isStatusValid.bind(null, 'Customer')(value)
        }
    })
    status: number

    @Field(type => Int)
    @ForeignKey(() => Client)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_client_id'
    })
    clientId: number

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

    @Field(type => Client, {nullable: true})
    @BelongsTo(() => Client)
    client: Client

    @Field(type => [Address], {nullable: true})
    @HasMany(() => Address)
    addresses: Address[]

    @Field(type => [Contact], {nullable: true})
    @HasMany(() => Contact)
    contacts: Contact[]

    @Field(type => [BankAccount], {nullable: true})
    @HasMany(() => BankAccount)
    banks: BankAccount[]

    @Field(type => [CustomerInfo], {nullable: true})
    @HasMany(() => CustomerInfo)
    infos: CustomerInfo[]

    @Field(type => [FinanceTransferDocument], {nullable: true})
    @HasMany(() => FinanceTransferDocument)
    financeTransferDocument: FinanceTransferDocument[]

    @Field(type => [DueDates], {nullable: true})
    @HasMany(() => DueDates)
    dueDates: DueDates[]

    static async _validateCustomer (instance: Customer, options: any = {}, update: boolean) {
        !instance.taxNumber && throwArgumentValidationError('taxNumber', instance, {message: 'Tax number must be defined'})
        if ((!instance.shortName || instance.shortName.trim().length === 0) && (!instance.fullName || instance.fullName.trim().length === 0)) {
            throwArgumentValidationError('shortName', instance, {message: 'Short Name or Full Name must be define'})
        }

        let customer = await Customer.findOne({
            where: {
                clientId: instance.clientId,
                taxNumber: instance.taxNumber
            },
            ...options
        })
        customer && (!update || customer.id !== instance.id) && throwArgumentValidationError('taxNumber', instance, {message: 'Tax number must be unique in system'})

        if (instance.uniqueCompanyNumber) {
            customer = await Customer.findOne({
                where: {
                    clientId: instance.clientId,
                    uniqueCompanyNumber: instance.uniqueCompanyNumber
                },
                ...options
            })

            customer && (!update || customer.id !== instance.id) && throwArgumentValidationError('uniqueCompanyNumber', instance, {message: 'UCN  must be unique in system'})
        }
    }

    /** parts for hooks */
    @BeforeCreate({name: 'beforeCreateHook'})
    static async _beforeCreateHook (instance: Customer, options: any) {
        await Customer._validateCustomer(instance, options, false)
    }

    @BeforeUpdate({name: 'beforeUpdateHook'})
    static async _beforeUpdate (instance: Customer, options: any) {
        await Customer._validateCustomer(instance, options, true)
    }

    public static getIncludeOptions () {
        return {
            include: [
                {
                    required: false,
                    model: Address,
                    where: {
                        status: modelSTATUS.ACTIVE
                    }
                },
                {
                    required: false,
                    model: Contact,
                    where: {
                        status: modelSTATUS.ACTIVE
                    }
                },
                {
                    required: false,
                    model: CustomerInfo,
                    where: {
                        status: modelSTATUS.ACTIVE
                    }
                },
                {
                    required: false,
                    model: BankAccount,
                    where: {
                        status: modelSTATUS.ACTIVE
                    }
                }
            ]
        }
    }

    /** parts for functions */
    public static async selectOne (id: number, ctx?: IContextApp): TModelResponse<Customer> {
        return Customer.findOne({
            where: {
                id,
                clientId: ctx.clientId
            },
            include: [
                {
                    required: false,
                    model: Address,
                    where: {
                        status: modelSTATUS.ACTIVE
                    }
                },
                {
                    required: false,
                    model: Contact,
                    where: {
                        status: modelSTATUS.ACTIVE
                    }
                },
                {
                    required: false,
                    model: CustomerInfo,
                    where: {
                        status: modelSTATUS.ACTIVE
                    }
                },
                {
                    required: false,
                    model: BankAccount,
                    where: {
                        status: modelSTATUS.ACTIVE
                    }
                }
            ]
        })
    }

    static async insertSubObjects (customer: Customer, options: any, data: CustomerType, ctx: IContextApp) {
        if (data.addresses) {
            const promises = data.addresses.map((a: AddressType) => {
                return Address.create({
                    ...a,
                    customerId: customer.id
                }, options)
            })
            await Promise.all(promises)
        }
        if (data.contacts) {
            const promiseContact = data.contacts.map((c: ContactType) => Contact.create({
                ...c,
                customerId: customer.id
            }, options))
            await Promise.all(promiseContact)
        }

        if (data.infos) {
            const promiseInfo = data.infos.map((c: CustomerInfoType) => CustomerInfo.create({
                ...c,
                clientId: ctx.clientId,
                customerId: customer.id
            }, options))
            await Promise.all(promiseInfo)
        }

        if (data.banks) {
            const promiseBanks = data.banks.map((b: BankAccountType) => BankAccount.create({
                ...b,
                accountString: b.account.replace(' ', ''),
                clientId: ctx.clientId,
                customerId: customer.id
            }, options))
            await Promise.all(promiseBanks)
        }
    }

    public static async insertOne (data: CustomerType, ctx: IContextApp): TModelResponse<Customer> {
        const transaction = await Customer.sequelize.transaction()
        const options = {transaction}

        try {
            const customer = await Customer.create({
                ...omit(data, ['addresses', 'contacts', 'infos']),
                clientId: ctx.clientId
            }, options)

            await Customer.insertSubObjects(customer, options, data, ctx)
            await transaction.commit()
            return Customer.selectOne(customer.id, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    /** update the Customer, additional checks will be done in  hooks, address only can be added, for change addresses use direct update of address*/
    public static async updateOne (id: number, data: CustomerType, ctx: IContextApp): TModelResponse<Customer> {
        const transaction = await Customer.sequelize.transaction()
        const options = {transaction}
        try {
            const customer = await Customer.findOne({
                where: {
                    id,
                    clientId: ctx.clientId
                },
                ...options
            })
            !customer && throwArgumentValidationError('id', {}, {message: 'Customer not exists'})

            await customer.update(omit(data, ['addresses', 'contacts', 'infos']), options)
            await Customer.insertSubObjects(customer, options, data, ctx)
            await transaction.commit()
            return Customer.selectOne(id, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }

    }

    /** Function is used by BaseResolver */
    public static async selectAll (options: any, ctx?: IContextApp): TModelResponseSelectAll<Customer> {
        options = setUserFilterToWhereSearch(options, ctx)
        return Customer.findAndCountAll(options)
    }

    public static async insertBulk (data: CustomerType[], ctx: IContextApp): Promise<string> {

        const transaction = await Customer.sequelize.transaction()
        const options = {transaction}

        try {

            await (async () => {
                let notValid = data.filter(item => !item.taxNumber)
                if (notValid.length > 0) {
                    throwArgumentValidationError('Tax Number', {}, {message: 'Tax Number  must me define'})
                }
                notValid = data.filter(customer => (!customer.shortName || customer.shortName.trim().length === 0) && (!customer.fullName || customer.fullName.trim().length === 0))
                if (notValid.length > 0) {
                    throwArgumentValidationError('shortName', {}, {message: 'Short Name or Full Name must be define'})
                }

                const taxs = _uniq(data.map(item => item.taxNumber))
                if (taxs.length !== data.length) {
                    throwArgumentValidationError('Tax Number', {}, {message: 'Tax Number must be unique'})
                }

                let res = await Customer.findAll({
                    where: {
                        clientId: ctx.clientId,
                        taxNumber: taxs
                    },
                    ...options
                })
                if (res.length > 0) {
                    throwArgumentValidationError('Tax Number', {}, {message: 'Tax Number must be unique'})
                }

                const unqCmpNum = data.filter(c => !!c.uniqueCompanyNumber).map(c => c.uniqueCompanyNumber)
                const _unqCmpNum = _uniq(unqCmpNum)
                if (unqCmpNum.length !== _unqCmpNum.length) {
                    throwArgumentValidationError('uniqueCompanyNumber', {}, {message: 'UCN  must be unique in system'})
                }

                res = await Customer.findAll({
                    where: {
                        clientId: ctx.clientId,
                        uniqueCompanyNumber: _unqCmpNum
                    },
                    ...options
                })

                if (res.length > 0) {
                    throwArgumentValidationError('uniqueCompanyNumber', {}, {message: 'UCN  must be unique in system'})
                }

            })()

            const customers = data.map(x => {
                const y = omit(x, ['addresses', 'contacts', 'infos', 'banks'])
                return {
                    ...y,
                    clientId: ctx.clientId
                }
            })

            const result = await Customer.bulkCreate(customers, options)
            const addresses = _flatten(data.filter(x => x.addresses && x.addresses.length > 0).map(customer => {
                const cc = result.find(c => c.taxNumber === customer.taxNumber)
                if (!cc) {
                    return null
                }
                return customer.addresses.map(a => ({
                    ...a,
                    customerId: cc.id
                }))
            })
                .filter(a => !!a))

            const banks = _flatten(data.filter(x => x.banks && x.banks.length > 0).map(customer => {
                const cc = result.find(c => c.taxNumber === customer.taxNumber)
                if (!cc) {
                    return null
                }
                return customer.banks.map(b => ({
                    ...b,
                    accountString: b.account.replace(/(\s)/g, ''),
                    customerId: cc.id,
                    clientId: ctx.clientId
                }))
            })
                .filter(a => !!a))

            await Address.bulkCreate(addresses, options)
            await BankAccount.bulkCreate(banks, options)
            await transaction.commit()
            return 'OK'
        } catch
        (e) {
            console.log(e)
            transaction.rollback()
            throw (e)
        }
    }

    public static async getExternalCustomerByName (name: string): Promise<Customer> {
        const data = await getCustomerByName(name)
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        return data.map((c: Customer, index: number) => ({
            id: (9999999 + index + 1),
            ...c,
        } as Customer))
    }

    public static async getExternalCustomerByTin (tin: string): Promise<Customer> {
        try {
            const data: any = await getCustomerByTin(tin)
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            // @ts-ignore
            return {
                id: (9999999 + 1),
                ..._.pick(data, ['shortName', 'fullName', 'taxNumber', 'uniqueCompanyNumber']),
                addresses: data.addresses && data.addresses.map((x, index) => {
                    return {
                        ..._.pick(x, ['street', 'zipCode', 'city', 'state', 'type']),
                        id: _.add(index, 9999999)
                    }
                }),
                banks: data.banks && data.banks.map((x, index) => {
                    return {
                        id: _.add(index, 9999999),
                        ..._.pick(x, ['bankId', 'account', 'accountString']),
                        bank: {
                            bankName: _.get(x, 'bank.bankName')
                        }
                    }
                })
            }
        } catch (e) {
            throwArgumentValidationError('accountNumber', {}, {message: 'Customer not found'})
        }
    }

    public static async getExternalByBankAccount (account: string): Promise<Customer> {
        try {
            const data: any = await getCustomerByBankAccount(account)

            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            // @ts-ignore
            return {
                id: (9999999 + 1),
                ..._.pick(data, ['shortName', 'fullName', 'taxNumber', 'uniqueCompanyNumber']),
                addresses: data.addresses && data.addresses.map((x, index) => {
                    return {
                        ..._.pick(x, ['street', 'zipCode', 'city', 'state', 'type']),
                        id: _.add(index, 9999999)
                    }
                }),
                banks: data.banks && data.banks.map((x, index) => {
                    return {
                        id: _.add(index, 9999999),
                        ..._.pick(x, ['bankId', 'account', 'accountString']),
                        bank: {
                            bankName: _.get(x, 'bank.bankName')
                        }
                    }
                }),
            }
        } catch (e) {
            throwArgumentValidationError('accountNumber', {}, {message: 'Customer not found'})
        }

    }

    public static async insertCustomerByTin (tin: string, ctx: IContextApp): Promise<Customer> {
        const data = await getCustomerByTin(tin)
        if (!data) {
            throw new Error(`Customer with tin ${tin} not exists!`)
        }

        const _data = {..._.omit(data, ['id', 'serverUpdate', 'createdAt', 'updatedAt'])}
        const {addresses, banks}: any = _data
        if (addresses && addresses.length > 0) {
            _data.addresses = addresses.map(a => _.omit(a, ['id', 'customerId', 'createdAt', 'updatedAt']))
        }

        if (banks && banks.length > 0) {
            _data.banks = banks.map(b => _.omit(b, ['id', 'customerId', 'accountString', 'bank', 'createdAt', 'updatedAt']))
        }

        const customer = await Customer.findOne({
            where: {
                taxNumber: tin
            },
            ...Customer.getIncludeOptions()
        })

        const {addresses: addServer, banks: banksServer}: any = data
        if (customer) {
            if (customer.addresses && customer.addresses.length > 0 && addServer && addServer.length > 0) {
                let address = customer.addresses.find((add: Address) => add.type === CONSTANT_ADDRESS_TYPES.HEADQUARTERS)
                const add = addServer.find((add: Address) => add.type === CONSTANT_ADDRESS_TYPES.HEADQUARTERS)
                if (address && add && isAfter(new Date(add.updatedAt), new Date(address.updatedAt))) {
                    address = await Address.findByPk(Number(address.id))
                    await address.update({
                        street: add.street,
                        zipCode: add.zipCode,
                        city: add.city,
                        state: add.state
                    })
                }
            } else {
                const add = addServer.find((add: Address) => add.type === CONSTANT_ADDRESS_TYPES.HEADQUARTERS)
                add && await Address.create({
                    street: add.street,
                    zipCode: add.zipCode,
                    city: add.city,
                    state: add.state,
                    type: CONSTANT_ADDRESS_TYPES.HEADQUARTERS,
                    customerId: Number(customer.id),
                    clientId: ctx.clientId
                })
            }

            if (customer.banks && banksServer && banksServer.length > 0) {
                const bankPromise = await banksServer.map(bSvr => {
                    const isBank = customer.banks.findIndex(b => b.bankId === bSvr.bankId && b.accountString === bSvr.accountString)
                    if (isBank === -1) {
                        return BankAccount.create({
                            account: bSvr.account,
                            accountString: bSvr.accountString,
                            bankId: Number(bSvr.bankId),
                            customerId: Number(customer.id),
                            clientId: ctx.clientId
                        })
                    }
                })
                bankPromise.length > 0 && await Promise.all(bankPromise)
            }
            return Customer.selectOne(Number(customer.id), ctx)
        }

        return Customer.insertOne(_data as any, ctx)
    }
}

const BaseResolver = createBaseResolver(Customer, {
    updateInputType: CustomerType,
    insertInputType: CustomerType
})

@Resolver()
export class CustomerResolver extends BaseResolver {

    @UseMiddleware(checkJWT)
    @Query(returns => [Customer], {name: 'customerExternalByName'})
    _qModelsCustomerExternalByName (@Arg('value', type => String) value: string,
        @Ctx() ctx: IContextApp) {
        return Customer.getExternalCustomerByName(value)
    }

    @UseMiddleware(checkJWT)
    @Query(returns => Customer, {name: 'customerExternalByTin'})
    _qModelsCustomerExternalByTin (@Arg('value', type => String) value: string,
        @Ctx() ctx: IContextApp) {
        return Customer.getExternalCustomerByTin(value)
    }

    @UseMiddleware(checkJWT)
    @Query(returns => Customer, {name: 'customerExternalByBankAccount'})
    _qModelsCustomerExternalByBankAccount (@Arg('value', type => String) value: string,
        @Ctx() ctx: IContextApp) {
        return Customer.getExternalByBankAccount(value)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => Customer, {name: 'insertExternalCustomerByTin'})
    _qModelInsertExternalCustomerByTin (@Arg('value', type => String) value: string,
        @Ctx() ctx: IContextApp) {
        return Customer.insertCustomerByTin(value, ctx)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => String, {name: 'insertCustomers'})
    _qModelInsertBulk (@Arg('data', type => [CustomerType]) data: CustomerType[],
        @Ctx() ctx: IContextApp) {
        return Customer.insertBulk(data, ctx)
    }

}

