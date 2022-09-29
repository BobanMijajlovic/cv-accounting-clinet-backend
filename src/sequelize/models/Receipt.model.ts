import 'reflect-metadata'
import {
    Arg,
    Ctx,
    Field,
    ID,
    Int,
    ObjectType,
    Query,
    Resolver,
    UseMiddleware
}                         from 'type-graphql'
import {
    AutoIncrement,
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
}                         from 'sequelize-typescript'
import Client             from './Client.model'
import CurrencyDefinition from './CurrencyDefinition.model'
import {CONSTANT_MODEL}   from '../constants'
import * as validations   from './validations'
import {
    createBaseResolver,
    IContextApp,
    TModelResponseSelectAll
}                         from '../graphql/resolvers/basic'
import {
    Item,
    setUserFilterToWhereSearch,
    throwArgumentValidationError
}                         from './index'
import Tax                from './Tax.model'
import TaxValue           from './TaxValue.model'
import ReceiptItem        from './ReceiptItem.model'
import ReceiptPayment     from './ReceiptPayment.model'
import {ReceiptType}      from '../graphql/types/Receipt'
import {
    endOfToday,
    guid
}                         from '../../utils'
import Sequelize          from 'sequelize'
import {
    add as _add,
    keyBy as _keyBy,
    merge as _merge,
    multiply as _multiply,
    round as _round,
    values as _values
}                         from 'lodash'
import User               from './User.model'
import {isAfter}          from 'date-fns'
import {checkJWT}         from '../graphql/middlewares'
import {
    ReportItems,
    ReportSaleByItem,
    TransactionReportsSummarize
} from '../graphql/types/Receipt'

@ObjectType()
@Table({
    underscored: true,
    tableName: 'receipt',
    indexes: [
        {
            name: 'receipt-sum-index-1',
            unique: false,
            using: 'BTREE',
            fields: ['fk_client_id', 'fk_user_id', 'date']
        }
    ]
})

export default class Receipt extends Model {
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
        type: DataType.STRING(128),
        field: 'receipt_number',
    })
    receiptNumber: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        comment: 'Currency value for faster search',
        field: 'currency_value'
    })
    currencyValue: number

    @Field(type => Int)
    @ForeignKey(() => Client)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_client_id'
    })
    clientId: number

    @Field(type => Int)
    @ForeignKey(() => User)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_user_id'
    })
    userId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => CurrencyDefinition)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_currency_id'
    })
    currencyId: number

    @Field(type => String, {nullable: true})
    @Column({
        allowNull: false,
        type: DataType.DATEONLY,
    })
    date: Date

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.STATUS.ACTIVE,
        validate: {
            isValid: (value) => validations.isStatusValid.bind(null, 'Receipt')(value)
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

  /** relations*/

    @Field(type => Client)
    @BelongsTo(() => Client)
    client: Client

    @Field(type => User)
    @BelongsTo(() => User)
    user: User

    @Field(type => CurrencyDefinition, {nullable: true})
    @BelongsTo(() => CurrencyDefinition)
    currency: CurrencyDefinition

    @Field(type => [ReceiptItem], {nullable: true})
    @HasMany(() => ReceiptItem)
    items: ReceiptItem[]

    @Field(type => [ReceiptPayment], {nullable: true})
    @HasMany(() => ReceiptPayment)
    payments: ReceiptPayment[]

    public static async getReceiptById (id, clientId, options = {}): Promise<Receipt> {
        return Receipt.findOne({
            where: {
                id: id,
                clientId: clientId
            },
            include: [
                {
                    model: ReceiptItem,
                    required: false,
                    include: [
                        {
                            model: Item,
                        },
                        {
                            model: Tax,
                            include: [TaxValue]
                        }
                    ]
                },
                {
                    model: ReceiptPayment
                },
                {
                    model: Client
                },
                {
                    model: User
                }
            ],
            ...options
        })
    }

    public static async selectOne (id: number, ctx?: IContextApp): Promise<Receipt> {
        return Receipt.getReceiptById(id,ctx.clientId)
    }

    public static async selectAll (options: any, ctx: IContextApp): TModelResponseSelectAll<Receipt> {
        options = setUserFilterToWhereSearch(options, ctx)
        return Receipt.findAndCountAll(options)
    }

    private  checkIsReceiptValid = () => {
        const totalByItems = _round(this.items.reduce((acc, x) => {
            return _add(acc, _multiply(x.quantity, x.price))
        }, 0), 2)

        const totalByPayments = _round(this.payments.reduce((acc,x) => _add(acc,x.value),0),2)
        if (totalByItems !== totalByPayments) {
            throw Error('Payments and items finance are not same!')
        }
    }

    public static async insertOne (data: ReceiptType, ctx: IContextApp): Promise<Receipt> {
        const validTaxes = await Tax.getValidTax(ctx)
        if (!validTaxes) {
            throw Error('Vats not exists in system')
        }

        if (data.items.length === 0 || data.payments.length === 0) {
            throw Error('Receipt data is not valid')
        }

        const items = await Item.findAll({
            where: {
                id: {
                    [Sequelize.Op.in]: data.items.map(x => x.itemId)
                },
                status: CONSTANT_MODEL.STATUS.ACTIVE,
                clientId: ctx.clientId
            }
        })

        if (!data.items.every((x: any) => items.findIndex(item => +item.id === +x.itemId) !== -1)) {
            throw Error('Item not found in system')
        }

        const transaction = await Receipt.sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }

        const options = {transaction, validate: true}
        try {
            const receipt = await Receipt.create({
                receiptNumber: guid(),
                clientId: ctx.clientId,
                userId: ctx.userId,
                date: new Date().toISOString(),
            }, options)
            if (!receipt) {
                throwArgumentValidationError('id', data, {message: 'Receipt not exists!'})
            }
            const itemsPromise = data.items.map(item => {
                const _itemDef = items.find(x => x.id === item.itemId)
                return ReceiptItem.insertOne(receipt.id, {
                    ...item,
                    price: _itemDef.mp
                }, options, validTaxes, ctx)
            })
            await Promise.all(itemsPromise)

            const paymentPromise = data.payments.map(payment => {
                return ReceiptPayment.create({
                    ...payment,
                    receiptId: receipt.id
                }, options)
            })
            await Promise.all(paymentPromise)
            /* const _receipt = await Receipt.getReceiptById(receipt.id,ctx.clientId,options)
             await _receipt.checkIsReceiptValid()*/
            await transaction.commit()
            return Receipt.selectOne(receipt.id, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    public static async getSales (ctx: IContextApp, dateStart?: Date, dateEnd?: Date) {

        if (!dateStart) {
            dateStart = new Date(2000, 1, 1)
        }

        if (!dateEnd) {
            dateEnd = new Date()
            dateEnd.setDate(dateEnd.getDate() + 1)
        }

        if (isAfter(dateEnd, new Date())) {
            dateEnd = endOfToday()
        }

        const receiptCounts = await Receipt.findAll({
            where: {
                clientId: ctx.clientId,
                date: {
                    [Sequelize.Op.and]: {
                        [Sequelize.Op.gte]: dateStart,
                        [Sequelize.Op.lte]: dateEnd
                    },
                },
            },
            attributes: [
                'date',
                [Sequelize.fn('COUNT', Sequelize.col('Receipt.date')), 'receiptCount'],
            ],
            group: ['Receipt.date'],
            raw: true,
        })

        const receiptData = await Receipt.findAll({
            where: {
                clientId: ctx.clientId,
                date: {
                    [Sequelize.Op.and]: {
                        [Sequelize.Op.gte]: dateStart,
                        [Sequelize.Op.lte]: dateEnd
                    },
                },
            },
            attributes: [
                'date',
                [Sequelize.fn('sum',Sequelize.literal('COALESCE(items.finance_final_vp, 0) + COALESCE(items.tax_finance, 0)')), 'totalFinance']
            ],
            group: ['Receipt.date'],
            raw: true,
            include: [
                {
                    model: ReceiptItem,
                    required: true,
                    attributes:[]
                }
            ]
        })

        return _values(_merge(_keyBy(receiptData, 'date'), _keyBy(receiptCounts, 'date'))) as any
    }

    public static async getSalesByUser (ctx: IContextApp, userId: number, dateStart?: Date, dateEnd?: Date) {

        if (!dateStart) {
            dateStart = new Date(2000, 1, 1)
        }

        if (!dateEnd) {
            dateEnd = new Date()
            dateEnd.setDate(dateEnd.getDate() + 1)
        }

        if (isAfter(dateEnd, new Date())) {
            dateEnd = endOfToday()
        }

        const receiptCounts = await Receipt.findAll({
            where: {
                clientId: ctx.clientId,
                userId: userId,
                date: {
                    [Sequelize.Op.and]: {
                        [Sequelize.Op.gte]: dateStart,
                        [Sequelize.Op.lte]: dateEnd
                    },
                },
            },
            attributes: [
                'date',
                [Sequelize.fn('COUNT', Sequelize.col('Receipt.date')), 'receiptCount'],
            ],
            group: ['Receipt.date'],
            raw: true,
        })

        const receiptData = await Receipt.findAll({
            where: {
                clientId: ctx.clientId,
                userId: userId,
                date: {
                    [Sequelize.Op.and]: {
                        [Sequelize.Op.gte]: dateStart,
                        [Sequelize.Op.lte]: dateEnd
                    },
                },
            },
            attributes: [
                'date',
                [Sequelize.fn('sum',Sequelize.literal('COALESCE(items.finance_final_vp, 0) + COALESCE(items.tax_finance, 0)')), 'totalFinance']
            ],
            group: ['Receipt.date'],
            raw: true,
            include: [
                {
                    model: ReceiptItem,
                    required: true,
                    attributes:[]
                }
            ]
        })

        const user = await User.selectOne(userId, ctx)

        const items = _values(_merge(_keyBy(receiptData, 'date'), _keyBy(receiptCounts, 'date'))) as any

        return {
            user,
            items
        }
    }

    public static async getSalesByItem (ctx: IContextApp, itemId: number, dateStart?: Date, dateEnd?: Date) {

        if (!dateStart) {
            dateStart = new Date(2000, 1, 1)
        }

        if (!dateEnd) {
            dateEnd = new Date()
            dateEnd.setDate(dateEnd.getDate() + 1)
        }

        if (isAfter(dateEnd, new Date())) {
            dateEnd = endOfToday()
        }

        const items = await ReceiptItem.findAll({
            where: {
                clientId: ctx.clientId,
                itemId: itemId,
                date: {
                    [Sequelize.Op.and]: {
                        [Sequelize.Op.gte]: dateStart,
                        [Sequelize.Op.lte]: dateEnd
                    },
                },
            },
            attributes: [
                'date',
                [Sequelize.fn('COUNT', Sequelize.col('date')), 'receiptCount'],
                [Sequelize.fn('sum',Sequelize.literal('COALESCE(finance_final_vp, 0) + COALESCE(tax_finance, 0)')), 'totalFinance']
            ],
            group: ['date'],
            raw: true,
        })

        const item = await Item.selectOne(itemId,ctx)

        return {
            item,
            items
        }
    }

}

const BaseResolver = createBaseResolver(Receipt, {
    updateInputType: ReceiptType,
    insertInputType: ReceiptType
})

@Resolver()
export class ReceiptResolver extends BaseResolver {

    @UseMiddleware(checkJWT)
    @Query(returns => [ReportItems], {nullable: true, name: 'totalSales'})
    _totalSales (@Arg('dateStart', type => Date, {nullable: true}) dateStart: Date,
        @Arg('dateEnd', type => Date, {nullable: true}) dateEnd: Date,
        @Ctx() ctx: IContextApp) {
        return Receipt.getSales(ctx, dateStart, dateEnd)
    }

    @UseMiddleware(checkJWT)
    @Query(returns => TransactionReportsSummarize, {nullable: true, name: 'totalSalesByUser'})
    _totalSalesByUser (@Arg('userId', type => Int) userId: number,
        @Arg('dateStart', type => Date, {nullable: true}) dateStart: Date,
        @Arg('dateEnd', type => Date, {nullable: true}) dateEnd: Date,
        @Ctx() ctx: IContextApp) {
        return Receipt.getSalesByUser(ctx, userId, dateStart, dateEnd)
    }

    @UseMiddleware(checkJWT)
    @Query(returns => ReportSaleByItem, {nullable: true, name: 'totalSalesByItem'})
    _totalSalesByItem (@Arg('itemId', type => Int) itemId: number,
        @Arg('dateStart', type => Date, {nullable: true}) dateStart: Date,
        @Arg('dateEnd', type => Date, {nullable: true}) dateEnd: Date,
        @Ctx() ctx: IContextApp) {
        return Receipt.getSalesByItem(ctx, itemId, dateStart, dateEnd)
    }
}
