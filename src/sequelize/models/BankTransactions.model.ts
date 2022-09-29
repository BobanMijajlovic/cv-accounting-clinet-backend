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
    HasOne,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}                                    from 'sequelize-typescript'
import {
    Arg,
    Args,
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
import Customer                      from './Customer.model'
import Client                        from './Client.model'
import BankAccount                   from './BankAccount.model'
import BankHeaderTransactions        from './BankHeaderTransactions.model'
import Sequelize                     from 'sequelize'
import {
    IContextApp,
    TModelResponse,
    TModelResponseSelectAll
}                                    from '../graphql/resolvers/basic'
import {checkJWT}                    from '../graphql/middlewares'
import {
    BankTransactionCustomerSummarize,
    BankTransactionItemType
}                                    from '../graphql/types/BankTransaction'
import {CONSTANT_MODEL}              from '../constants'
import {
    PaginatedResponse,
    RequestFilterSort,
    TSumFinance
}                                    from '../graphql/types/basic'
import {
    setUserFilterToWhereSearch,
    throwArgumentValidationError
}                                    from './index'
import {requestOptions}              from '../graphql/FilterRequest'
import {getCustomerByBankAccount}    from '../../server/Server'
import BankTransactionAdditionalData from './BankTransactionAdditionalData.model'
import {sequelize}                   from '../sequelize'
import _                             from 'lodash'

@ObjectType()
@Table({
    tableName: 'bank_transactions',
    underscored: true,
    indexes: [
        {
            name: 'sum-by-customer-transaction-bank',
            unique: false,
            using: 'BTREE',
            fields: ['fk_client_id', 'fk_customer_id', 'status', 'date_processed']

        }
    ]
})

export default class BankTransactions extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(12, 2)
    })
    finance: number

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
    })
    expenses: number

    @Field(type => String, { nullable: true })
    @Column({
        allowNull: true,
        type: DataType.DATEONLY,
        field: 'date_paid',
        comment: 'date when it is paid'
    })
    datePaid: Date

    @Field(type => String, { nullable: true })
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

    @Field(type => Int, { nullable: true })
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.TAX_FINANCE_FLAG.IN
    })
    flag: number

    @Field(type => Int, { nullable: true })
    @ForeignKey(() => Customer)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_customer_id'
    })
    customerId: number

    @Field(type => Int, { nullable: true })
    @ForeignKey(() => Client)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_client_id'
    })
    clientId: number

    @Field(type => Int, { nullable: true })
    @ForeignKey(() => BankAccount)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_bank_account_id'
    })
    bankAccountId: number

    @Field(type => Int)
    @ForeignKey(() => BankHeaderTransactions)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_bank_header_transaction_id'
    })
    bankHeaderTransactionId: number

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

    @Field(type => Client)
    @BelongsTo(() => Client)
    client: Client

    @Field(type => BankHeaderTransactions)
    @BelongsTo(() => BankHeaderTransactions)
    bankHeaderTransaction: BankHeaderTransactions

    @Field(type => Customer, { nullable: true })
    @BelongsTo(() => Customer)
    customer: Customer

    @Field(type => BankAccount, {nullable: true})
    @BelongsTo(() => BankAccount)
    bankAccount: BankAccount
    
    @Field(type => BankTransactionAdditionalData,{ nullable: true })
    @HasOne(() => BankTransactionAdditionalData, {onDelete: 'CASCADE',hooks:true})
    transactionAdditionalData: BankTransactionAdditionalData

    static async _validate (instance: BankTransactions, options: any, update: boolean) {
        
        if (instance.customerId) {
            const customer = await Customer.findOne({
                where: {
                    clientId: instance.clientId,
                    id: instance.customerId
                },
                ...options
            })

            !customer && (!update || customer.id !== instance.customerId) && throwArgumentValidationError('customerId', instance, {message: 'Customer not exists.'})

        }
       
        if (instance.bankAccountId) {
            let bankAcc = await BankAccount.findOne({
                where: {
                    clientId: instance.clientId,
                    id: instance.bankAccountId
                },
                ...options
            })
            !bankAcc && (!update || bankAcc.id !== instance.bankAccountId) && throwArgumentValidationError('bankAccountId', instance, {message: 'Bank account not exists.'})

            bankAcc = await BankAccount.findOne({
                where: {
                    clientId: instance.clientId,
                    id: instance.bankAccountId,
                    customerId: instance.customerId
                },
                ...options
            })
            !bankAcc && (!update || bankAcc.id !== instance.bankAccountId) && throwArgumentValidationError('bankAccountId', instance, {message: 'Bank account does not belong to the selected customer.'})
        }
    }

    @BeforeCreate({name: 'beforeCreateHook'})
    static async _beforeCreateHook (instance: BankTransactions, options: any) {
        await BankTransactions._validate(instance, options, false)
    }

    @BeforeUpdate({name: 'beforeUpdateHook'})
    static async _beforeUpdateHook (instance: BankTransactions, options: any) {
        await BankTransactions._validate(instance, options, true)
    }

    public static async totalTransactionByCustomer (ctx: IContextApp, customerId?: number, dateStart?: Date, dateEnd?: Date): Promise<BankTransactionCustomerSummarize> {

        if (!dateStart) {
            dateStart = new Date(2000, 1, 1)
        }

        if (!dateEnd) {
            dateEnd = new Date()
            dateEnd.setDate(dateEnd.getDate() + 1)
        }

        const claims = BankTransactions.findOne({
            where: Object.assign({
                clientId: ctx.clientId,
                status: CONSTANT_MODEL.STATUS.ACTIVE,
                dateProcessed: {
                    [Sequelize.Op.and]: {
                        [Sequelize.Op.gte]: dateStart,
                        [Sequelize.Op.lte]: dateEnd
                    },
                },
                financeClaims: { [Sequelize.Op.not]: 0 },
            }, customerId && { customerId: customerId }),
            attributes: [[Sequelize.fn('sum', Sequelize.col('finance_claims')), 'finance']]
        })

        const owes = BankTransactions.findOne({
            where: Object.assign({
                clientId: ctx.clientId,
                status: CONSTANT_MODEL.STATUS.ACTIVE,
                dateProcessed: {
                    [Sequelize.Op.and]: {
                        [Sequelize.Op.gte]: dateStart,
                        [Sequelize.Op.lte]: dateEnd
                    },
                },
                financeOwes: { [Sequelize.Op.not]: 0 },
            }, customerId && { customerId: customerId }),
            attributes: [[Sequelize.fn('sum', Sequelize.col('finance_owes')), 'finance']]
        })

        const [claim, owe, customer] = await Promise.all([claims, owes, Customer.findByPk(customerId)])
        return {
            customer,
            financeClaims: (claim as TSumFinance<BankTransactions>).getDataValue('finance') || 0,
            financeOwes: (owe as TSumFinance<BankTransactions>).getDataValue('finance') || 0,
        }
    }

    public static async selectAll (options: any, ctx: IContextApp): TModelResponseSelectAll<BankTransactions> {
        options = setUserFilterToWhereSearch(options, ctx)
        return BankTransactions.findAndCountAll(options)
    }

    public static getCustomerByBank = async (account: string) => {
        let customer = void(0)
        try {
            customer = await getCustomerByBankAccount(account) as any
            return customer
        } catch (e) {
            return customer
        }
        
    }
    
    public static async insertRows (bankHeaderTransactionId: number,data: BankTransactionItemType[],ctx: IContextApp): TModelResponse<BankHeaderTransactions> {
        const transaction = await sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}
        try {
            let bankHeaderTransaction =  await BankHeaderTransactions.findOne({
                where: {
                    id:bankHeaderTransactionId,
                    clientId: ctx.clientId,
                    status: CONSTANT_MODEL.BANK_TRANSACTION_STATUS.OPENED
                },
                ...options
            })
            if (!bankHeaderTransaction) {
                throwArgumentValidationError('id', {}, {message: 'Bank HeaderTransactions not exists or not editable'})
            }
            const bankTransactions = data.map(item => BankTransactions.create({
                ...item,
                ...{bankHeaderTransactionId: bankHeaderTransaction.id},
                clientId: ctx.clientId
            },options))
            const items = await Promise.all(bankTransactions)
            const additionalDataPromise = data.map((x: any,index: number) => {
                if (x.additionalData) {
                    return BankTransactionAdditionalData.create({
                        ...x.additionalData,
                        bankTransactionsId: items[index].id,
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
            transaction.rollback()
            throw e
        }
    }

    public static async updateOne (id: number,data: BankTransactionItemType,ctx: IContextApp): TModelResponse<BankHeaderTransactions> {
        const transaction = await sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = { transaction, validate: true }

        try {
            const bankTransaction = await BankTransactions.findOne({
                where: {
                    id,
                    clientId: ctx.clientId
                },
                ...options
            })
            if (!bankTransaction) {
                throwArgumentValidationError('id',{},{message: 'Bank transaction not exits'})
            }
            await bankTransaction.update(_.omit(data,['additionalData']),options)
            if (data.additionalData) {
                const additionalData = await BankTransactionAdditionalData.findOne({
                    where: {
                        bankTransactionsId: bankTransaction.id
                    },
                    ...options
                })
                if (!additionalData) {
                    await BankTransactionAdditionalData.create({
                        ...data.additionalData,
                        bankTransactionsId: bankTransaction.id
                    },options)
                } else {
                    await additionalData.update(data.additionalData,options)
                }
            }
            const bankHeader = await BankHeaderTransactions.selectById(bankTransaction.bankHeaderTransactionId,ctx,options)
            await bankHeader.calculateMissingValues(bankHeader)
            await bankHeader.save(options)
            await transaction.commit()
            return BankHeaderTransactions.selectOne(bankHeader.id,ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    public static async markActiveRecords (bankHeaderTransactionId: number, options: any) {
        return BankTransactions.update({ status: CONSTANT_MODEL.BANK_TRANSACTION_STATUS.ACTIVE},
            {
                where: {
                    bankHeaderTransactionId
                },
                ...options
            })
    }

    public static async markDeletedRecords (bankHeaderTransactionId: number, options: any) {
        return BankTransactions.update({ status: CONSTANT_MODEL.BANK_TRANSACTION_STATUS.DELETED},
            {
                where: {
                    bankHeaderTransactionId
                },
                ...options
            })
    }

    public static async deleteOne (id: number,ctx: IContextApp): TModelResponse<BankHeaderTransactions> {
        const transaction = await sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = { transaction, validate: true }
        
        try {
            const bankTransaction = await BankTransactions.findOne({
                where: {
                    id,
                    clientId: ctx.clientId
                },
                ...options
            })
            if (!bankTransaction) {
                throwArgumentValidationError('id',{},{message: 'Bank transaction not exits'})
            }

            await BankTransactions.destroy({
                where: {
                    id,
                    clientId: ctx.clientId
                },
                ...options
            })
            const bankHeader = await BankHeaderTransactions.selectById(bankTransaction.bankHeaderTransactionId,ctx,options)
            await bankHeader.calculateMissingValues(bankHeader)
            await bankHeader.save(options)
            await transaction.commit()
            return BankHeaderTransactions.selectOne(bankTransaction.bankHeaderTransactionId,ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }
}

@ObjectType('responseBankTransactions')
class ClassPaginationResponse extends PaginatedResponse(BankTransactions) {}

@Resolver()
export class BankTransactionsResolver {

    @UseMiddleware(checkJWT)
    @Query(returns => BankTransactionCustomerSummarize, { nullable: true, name: 'bankTransactionAccountsCustomerSum' })
    getCustomerSum (@Arg('customerId', type => Int, { nullable: true })customerId: number,
        @Arg('dateStart', type => Date, { nullable: true }) dateStart: Date,
        @Arg('dateEnd', type => Date, { nullable: true }) dateEnd: Date,
        @Ctx() ctx: IContextApp) {
        return BankTransactions.totalTransactionByCustomer(ctx, customerId, dateStart)
    }

    @UseMiddleware(checkJWT)
    @Query(returns => ClassPaginationResponse, { name: 'bankTransactions' })
    async _qModelSelectAll (@Ctx() ctx: IContextApp,
        @Args() request: RequestFilterSort) {
        const find = requestOptions(request)
        const result = await BankTransactions.selectAll(find, ctx)
        return {
            items: result.rows,
            count: result.count,
            perPage: find.limit,
            page: Math.floor(find.offset / find.limit) + 1,
            hasMore: true
        }
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => BankHeaderTransactions, {name: 'deleteBankTransaction'})
    async _deleteBankTransaction (@Arg('id', type => Int) id: number,
        @Ctx() ctx: IContextApp) {
        return BankTransactions.deleteOne(id, ctx)

    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => BankHeaderTransactions, {name: 'insertBankTransactions'})
    async _insertBankTransactions (@Arg('data', type => [BankTransactionItemType!]) data: BankTransactionItemType[],
        @Arg('bankHeaderTransactionId', type => Int) bankHeaderTransactionId: number,
        @Ctx() ctx: IContextApp) {
        return BankTransactions.insertRows(bankHeaderTransactionId, data, ctx)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => BankHeaderTransactions, {name: 'updateBankTransaction'})
    async _updateBankTransaction (@Arg('id', type => Int) id: number,
        @Arg('data', type => BankTransactionItemType) data: BankTransactionItemType,
        @Ctx() ctx: IContextApp) {
        return BankTransactions.updateOne(id,data, ctx)

    }

}
