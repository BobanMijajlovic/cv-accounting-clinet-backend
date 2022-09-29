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
}                                    from 'sequelize-typescript'
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
}                                    from 'type-graphql'
import Client                        from './Client.model'
import BankAccount                   from './BankAccount.model'
import {
    Address,
    Customer,
    setUserFilterToWhereSearch,
    throwArgumentValidationError,
    User
}                                    from './index'
import BankTransactions              from './BankTransactions.model'
import {
    createBaseResolver,
    IContextApp,
    TModelResponse,
    TModelResponseSelectAll
}                                    from '../graphql/resolvers/basic'
import {
    BankTransactionCustomerSummarize,
    BankTransactionPdfParseType,
    BankTransactionType
}                                    from '../graphql/types/BankTransaction'
import _                             from 'lodash'
import {checkJWT}                    from '../graphql/middlewares'
import {CONSTANT_MODEL}              from '../constants'
import Sequelize                     from 'sequelize'
import {TSumFinance}                 from '../graphql/types/basic'
import BankTransactionAdditionalData from './BankTransactionAdditionalData.model'
import {sequelize}                   from '../sequelize'
import {parsePdfBankReport}          from '../../pdf/ParseIzvod'
import {GraphQLUpload}               from 'apollo-server-express'
import {UploadType}                  from '../graphql/types/Client'

@ObjectType()
@Table({
    tableName: 'bank_header_transactions'
})

export default class BankHeaderTransactions extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(32),
        field: 'document_id'
    })
    documentId: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        field: 'finance_claims'
    })
    financeClaims: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        field: 'finance_owes'
    })
    financeOwes: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(128),
    })
    description: string

    @Field(type => String, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.DATEONLY,
        field: 'date_processed',
        comment: 'date when bank processed the paying/ can be different then paid date'
    })
    dateProcessed: Date

    @Field(type => Int)
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.BANK_TRANSACTION_STATUS.OPENED,
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

    @Field(type => Int)
    @ForeignKey(() => BankAccount)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_bank_account_id'
    })
    bankAccountId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => User)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_user_id'
    })
    userId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Client)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_client_id'
    })
    clientId: number

    /** relations*/
    @Field(type => Client, {nullable: true})
    @BelongsTo(() => Client)
    client: Client

    @Field(type => BankAccount)
    @BelongsTo(() => BankAccount)
    bankAccount: BankAccount

    @Field(type => [BankTransactions], {nullable: true})
    @HasMany(() => BankTransactions, {onDelete: 'CASCADE'})
    bankTransactions: BankTransactions[]

    static async _validate (instance: BankHeaderTransactions, options: any, update: boolean) {

        const bankAcc = await BankAccount.findOne({
            where: {
                clientId: instance.clientId,
                id: instance.bankAccountId
            },
            ...options
        })
        !bankAcc && (!update || bankAcc.id !== instance.bankAccountId) && throwArgumentValidationError('bankAccountId', instance, {message: 'Bank account not exists'})

    }

    @BeforeCreate({name: 'beforeCreateHook'})
    static async _beforeCreateHook (instance: BankHeaderTransactions, options: any) {
        await BankHeaderTransactions._validate(instance, options, false)
    }

    @BeforeUpdate({name: 'beforeUpdateHook'})
    static async _beforeUpdateHook (instance: BankHeaderTransactions, options: any) {
        await BankHeaderTransactions._validate(instance, options, true)
    }

    public static includeOptions = () => {
        return [
            {
                model: BankAccount,
                required: false
            },
            {
                model: BankTransactions,
                include: [
                    {
                        model: Customer,
                        required: false,
                        include: [
                            {
                                model: Address,
                                required: false
                            }
                        ]
                    },
                    {
                        model: BankAccount,
                        required: false,
                        include: [
                            {
                                model: Customer,
                                required: false,
                            }
                        ]
                    },
                    {
                        model: BankTransactionAdditionalData,
                        required: false
                    },
                ]
            }
        ]
    }

    public calculateMissingValues (bankHeader) {
        const financeClaims =  bankHeader.bankTransactions.reduce((acc: number,trans) =>  trans.flag === CONSTANT_MODEL.TAX_FINANCE_FLAG.OUT ? _.round(_.add(acc,trans.finance) ,2) : acc,0)
        const financeOwes =  bankHeader.bankTransactions.reduce((acc: number,trans) => trans.flag === CONSTANT_MODEL.TAX_FINANCE_FLAG.IN  ? _.round(_.add(acc,trans.finance),2) : acc,0)
        this.financeOwes = financeOwes
        this.financeClaims = financeClaims
    }
    
    public static async selectById (id: number,ctx: IContextApp,options: any = {}): TModelResponse<BankHeaderTransactions> {
        return BankHeaderTransactions.findOne({
            where: {
                id: id,
                clientId: ctx.clientId
            },
            include: BankHeaderTransactions.includeOptions(),
            ...options
        })
    }

    public static async  selectOne (id: number, ctx: IContextApp): TModelResponse<BankHeaderTransactions> {
        return BankHeaderTransactions.selectById(id,ctx)
    }

    public static async selectAll (options: any, ctx: IContextApp): TModelResponseSelectAll<BankHeaderTransactions> {
        options = setUserFilterToWhereSearch(options, ctx)
        return BankHeaderTransactions.findAndCountAll(options)
    }

    public static async insertUpdate (id: number,entryData: BankTransactionType, ctx: IContextApp): Promise<BankHeaderTransactions | null> {

        if (!entryData) {
            throwArgumentValidationError('id', entryData, {message: 'Data is not valid.'})
        }

        if (entryData.header) {
            const header = entryData.header
            if (!header) {
                throwArgumentValidationError('header', entryData, {message: 'Header must exists'})
            }
            const transaction = await sequelize.transaction()
            if (!transaction) {
                throw Error('Transaction can\'t be open')
            }
            const options = {transaction, validate: true}

            try {

                const bankHeaderTransaction = !id ? await BankHeaderTransactions.create({
                    ...header,
                    clientId: ctx.clientId,
                    userId: ctx.userId
                }, options) : await BankHeaderTransactions.selectById(id,ctx,options)
                if (id) {
                    await bankHeaderTransaction.update(header,options)
                }
                await transaction.commit()
                return BankHeaderTransactions.selectOne(bankHeaderTransaction.id,ctx)
            } catch (e) {
                transaction.rollback()
                throw e
            }
        }

        if (typeof entryData.status !== 'undefined' && id) {
            if (entryData.status ===  CONSTANT_MODEL.BANK_TRANSACTION_STATUS.DELETED) {
                const transaction = await sequelize.transaction()
                if (!transaction) {
                    throw Error('Transaction can\'t be open')
                }

                const options = {transaction, validate: true}
                try {
                    const instance = await BankHeaderTransactions.selectById(id,ctx,options)
                    if (!instance || instance.status !== CONSTANT_MODEL.BANK_TRANSACTION_STATUS.ACTIVE) {
                        throwArgumentValidationError('id', {}, {message: 'Bank transaction not exists or not editable'})
                    }
                    await instance.update({status: CONSTANT_MODEL.BANK_TRANSACTION_STATUS.DELETED},options)
                    await BankTransactions.markDeletedRecords(instance.id,options)
                    await transaction.commit()
                    return BankHeaderTransactions.selectOne(id,ctx)
                } catch (e) {
                    await transaction.rollback()
                    throw (e)
                }
            }

            if (entryData.status ===  CONSTANT_MODEL.BANK_TRANSACTION_STATUS.ACTIVE) {
                const transaction = await sequelize.transaction()
                if (!transaction) {
                    throw Error('Transaction can\'t be open')
                }

                const options = {transaction, validate: true}
                try {
                    const instance = await BankHeaderTransactions.selectById(id,ctx,options)

                    /** check if bank transactions items not exists can't executed this action ??  */
                    if (!instance || instance.status !== CONSTANT_MODEL.BANK_TRANSACTION_STATUS.OPENED) {
                        throwArgumentValidationError('id', {}, {message: 'Bank transaction not exists or not editable'})
                    }
                    await instance.update({status: entryData.status},options)
                    await instance.calculateMissingValues(instance)
                    await instance.save(options)
                    await BankTransactions.markActiveRecords(instance.id,options)
                    await transaction.commit()
                    return BankHeaderTransactions.selectOne(instance.id,ctx)
                } catch (e) {
                    await transaction.rollback()
                    throw (e)
                }
            }
        }
    }

    public static async insertOne (entryData: BankTransactionType, ctx: IContextApp): Promise<BankHeaderTransactions> {
        return BankHeaderTransactions.insertUpdate(0, entryData, ctx)
    }

    public static async updateOne (id: number, entryData: BankTransactionType, ctx: IContextApp): Promise<BankHeaderTransactions | null> {
        return BankHeaderTransactions.insertUpdate(id, entryData, ctx)
    }
    
    public static async deleteOne (id,ctx: IContextApp): TModelResponse<BankHeaderTransactions> {
        const instance = await BankHeaderTransactions.selectOne(id,ctx)
        if (!instance || instance.status !== CONSTANT_MODEL.BANK_TRANSACTION_STATUS.OPENED) {
            throwArgumentValidationError('id', {}, {message: 'Bank transaction not exists or not editable'})
        }
        await BankHeaderTransactions.destroy({
            where: {
                id: instance.id
            }
        })
        return BankHeaderTransactions.selectOne(id,ctx)
    }

    public static async parseBankReport (buffer: Buffer,bankHeaderTransactionId: number,ctx: IContextApp) {
        const data = await parsePdfBankReport(buffer) as BankTransactionPdfParseType
        //* * find all data  for bank account */
        const items  = await data.items.reduce(async (acc: any,x: any) => {
            const _acc = await acc
            const arr =  x.bankAccount.split('-')
            const middle = BigInt(arr[1]).toString()
            const value = `${arr[0]}${middle}${Number(arr[2])}`
            const customer = await BankTransactions.getCustomerByBank(`${middle}`)
            let _customer = void(0)
            if (customer) {
                _customer = await Customer.findOne({
                    where: {
                        taxNumber: customer.taxNumber
                    },
                    ...Customer.getIncludeOptions()
                })
                if (!_customer) {
                    _customer = await Customer.insertCustomerByTin(customer.taxNumber, ctx)
                }
            }
            const bankAccount = _customer && _customer.banks && _customer.banks.find(bank => bank.accountString.replace(/\s/g,'') === value)
            return [
                ..._acc,
                {
                    ...x,
                    bankAccount: {
                        ...bankAccount,
                        accountNumber: x.bankAccount,
                        clientId: ctx.clientId,
                        customer: _customer ? {
                            id: _customer.id,
                            shortName: _customer.shortName ? _customer.shortName : _customer.fullName,
                            taxNumber: _customer.taxNumber
                        } : void(0)
                    }
                }
            ]
        },[])

        const transaction = await sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }

        const options = {transaction, validate: true}
        try {
            /** comment only for testing */
           /* const bankAccount = await BankAccount.findOne({
                where: {
                    account: obj.bankAccount.replace(/-/g, '')
                },
                ...options
            })
            if (!bankAccount) {
                throwArgumentValidationError('bankAccountId', {}, {message: 'Bank account not exists'})
            }*/
            let bankHeaderTransaction = await BankHeaderTransactions.selectById(bankHeaderTransactionId,ctx,options)
            
            if (!bankHeaderTransaction) {
                throwArgumentValidationError('id', {}, {message: 'Bank header transaction not exists'}) 
            }
            
            const _items = items.map(x => {
                return {
                    customerId: _.get(x,'bankAccount.customerId'),
                    bankAccountId: _.get(x,'bankAccount.id'),
                    finance: x.claim || x.owes,
                    datePaid: x.paidDate,
                    flag: x.claim > 0 ? CONSTANT_MODEL.TAX_FINANCE_FLAG.OUT : CONSTANT_MODEL.TAX_FINANCE_FLAG.IN,
                    additionalData : x.code ? {
                        code: x.code,
                        accountNumber: !_.get(x,'bankAccount.id') && _.get(x,'bankAccount.accountNumber')
                    } : void(0)
                }
            })

            const bankTransactions = _items.map(item => BankTransactions.create({
                ...item,
                ...{bankHeaderTransactionId: bankHeaderTransaction.id},
                clientId: ctx.clientId
            },options))
            const itemsPromise = await Promise.all(bankTransactions)
            const additionalDataPromise = _items.map((x: any,index: number) => {
                if (x.additionalData) {
                    return BankTransactionAdditionalData.create({
                        ...x.additionalData,
                        bankTransactionsId: (itemsPromise[index] as BankTransactions).id,
                    },options)
                }
            })
            await Promise.all(additionalDataPromise)
            bankHeaderTransaction = await BankHeaderTransactions.selectById(bankHeaderTransaction.id,ctx,options)
            await bankHeaderTransaction.calculateMissingValues(bankHeaderTransaction)
            await bankHeaderTransaction.save(options)
            await transaction.commit()
            return BankHeaderTransactions.selectOne(bankHeaderTransaction.id, ctx)
        } catch (e) {
            await transaction.rollback()
            throw (e)
        }
    }

    public static async totalTransactionByAccount (ctx: IContextApp,bankAccountId: number): Promise<BankTransactionCustomerSummarize> {

        const claims = BankHeaderTransactions.findOne({
            where: {
                clientId: ctx.clientId,
                bankAccountId: bankAccountId,
                status: CONSTANT_MODEL.STATUS.ACTIVE,
                financeClaims: {[Sequelize.Op.not]: 0}
            },
            attributes: [[Sequelize.fn('sum', Sequelize.col('finance_claims')), 'finance']]
        })

        const owes = BankHeaderTransactions.findOne({
            where: {
                clientId: ctx.clientId,
                bankAccountId: bankAccountId,
                status: CONSTANT_MODEL.STATUS.ACTIVE,
                financeOwes: {[Sequelize.Op.not]: 0},
            },
            attributes: [[Sequelize.fn('sum', Sequelize.col('finance_owes')), 'finance']]
        })

        const [claim, owe] = await Promise.all([claims, owes])
        return {
            financeClaims: (claim as TSumFinance<BankHeaderTransactions>).getDataValue('finance') || 0,
            financeOwes: (owe as TSumFinance<BankHeaderTransactions>).getDataValue('finance') || 0,
        }
    }
}

const BaseResolver = createBaseResolver(BankHeaderTransactions, {
    updateInputType: BankTransactionType,
    insertInputType: BankTransactionType
})

@Resolver()
export class BankHeaderTransactionsResolver extends BaseResolver {

    @UseMiddleware(checkJWT)
    @Mutation(() => BankHeaderTransactions, {name: 'uploadBankReport'})
    async uploadBankReport (@Arg('id',type => Int) id: number,
        @Arg('file', () => GraphQLUpload)
                                {
                                    createReadStream,
                                    filename
                                }: UploadType,
                                @Ctx() ctx: IContextApp): Promise<any> {
        return new Promise((resolve, reject) => {
            let buffer = Buffer.alloc(0)
            createReadStream()
                .on('data', (data) => {
                    buffer = Buffer.concat([buffer, data], Number(buffer.length) + Number(data.length))
                })
                .on('end', () => {
                    (async () => {
                        try {
                            const data = await BankHeaderTransactions.parseBankReport(buffer,id,ctx)
                            resolve(data)
                        } catch (e) {
                            reject(e)
                        }
                    })()

                })
                .on('error', () => reject(false))
        })
    }
    
    @UseMiddleware(checkJWT)
    @Query(returns => BankHeaderTransactions, {nullable: true, name: 'bankHeaderTransaction',})
    getOne (@Arg('id', type => Int)id: number,
        @Ctx() ctx: IContextApp) {
        return BankHeaderTransactions.selectOne(id, ctx)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns =>  BankHeaderTransactions, {nullable: true, name: 'deleteBankHeaderTransaction',})
    deleteOne (@Arg('id', type => Int)id: number,
        @Ctx() ctx: IContextApp) {
        return BankHeaderTransactions.deleteOne(id, ctx)
    }

    @UseMiddleware(checkJWT)
    @Query(returns => BankHeaderTransactions, {name: 'totalTransactionByAccount'})
    getTotalTransactionByAccount (@Arg('bankAccountId', type => Int)bankAccountId: number,
        @Ctx() ctx: IContextApp) {
        return BankHeaderTransactions.totalTransactionByAccount(ctx,bankAccountId)
    }
}
