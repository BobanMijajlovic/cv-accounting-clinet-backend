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
}                                       from 'sequelize-typescript'
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
}                                       from 'type-graphql'
import {
    Address,
    Customer,
    Item,
    setUserFilterToWhereSearch,
    Warehouse
} from './index'
import {
    createBaseResolver,
    IContextApp,
    TModelResponse,
    TModelResponseSelectAll
}                                       from '../graphql/resolvers/basic'
import Client                           from './Client.model'
import Notes                            from './Notes.model'
import {
    InvoiceHeaderType,
    InvoiceType
}                                       from '../graphql/types/Invoice'
import CurrencyDefinition               from './CurrencyDefinition.model'
import Tax                              from './Tax.model'
import Expense                          from './Expense.model'
import InvoiceItem                      from './InvoiceItem.model'
import {
    CONSTANT_MODEL,
    WAREHOUSE_TYPE
}                                       from '../constants'
import _                                from 'lodash'
import { IWarehouseItem }               from '../graphql/types/Warehouse'
import WarehouseItem                    from './WarehouseItem.model'
import WarehouseItemInfo                from './WarehouseItemInfo.model'
import WarehouseFinance                 from './WarehouseFinance.model'
import { TransactionCustomerSummarize } from '../graphql/types/Customer'
import { checkJWT }                     from '../graphql/middlewares'
import * as InvoiceUtils                from './Invoice.utils'
import TaxValue                         from './TaxValue.model'
import ExpenseItem                      from './ExpenseItem.model'
import InvoiceItemDiscount              from './InvoiceItemDiscount.model'
import InvoiceAdvanceInvoice            from './InvoiceAdvanceInvoice.model'
import DueDates                         from './DueDates.model'
import TaxFinance                       from './TaxFinance.model'
import Discounts                        from "./Discounts.model";

interface IItemForWarehouse {
    warehouseId: number,
    items: Partial<IWarehouseItem>[]
}

interface IItemWithWarehouseItemInfo {
    item: Item,
    quantity: number
    warehouseItemInfo: WarehouseItemInfo
}

export interface IItemsByWarehouse {
    warehouseId: number,
    items: IItemWithWarehouseItemInfo[]
}

@ObjectType()
@Table({
    tableName: 'invoice',
    underscored: true,
    indexes: [
        {
            name: 'sum-by-customer-invoice',
            unique: false,
            using: 'BTREE',
            fields: ['fk_client_id', 'fk_customer_id', 'status', 'date']

        }
    ]
})

export default class Invoice extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field(type => Int, { nullable: true })
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: WAREHOUSE_TYPE.WHOLESALE,
        comment: 'define what kind of sale by warehouse items'
    })
    flag: number

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        type: DataType.STRING(16),
    })
    number: string

    @Field(type => Date)
    @Column({
        allowNull: false,
        type: DataType.DATE
    })
    date: Date

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(12, 2),
        comment: 'Total net for faster search',
        field: 'total_finance_net_vp'
    })
    totalFinanceVP: number

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(12, 2),
        comment: 'Total finance for faster search',
        field: 'total_finance_tax'
    })
    totalFinanceTax: number

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(12, 2),
        comment: 'Total mp for faster search',
        field: 'total_finance_mp'
    })
    totalFinanceMP: number

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        comment: 'Currency value for faster search',
        field: 'currency_value'
    })
    currencyValue: number

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        comment: 'Default discount percent',
        field: 'discount_default'
    })
    discountDefault: number

    @Field(type => Int, { nullable: true })
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.INVOICE_STATUS.OPENED
    })
    status: number

    @Field(type => Int, { nullable: true })
    @ForeignKey(() => CurrencyDefinition)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_currency_id'
    })
    currencyId: number

    @Field(type => Int)
    @ForeignKey(() => Customer)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_customer_id'
    })
    customerId: number

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

  /** relations*/
    @Field(type => Client)
    @BelongsTo(() => Client)
    client: Client

    @Field(type => Customer, { nullable: true })
    @BelongsTo(() => Customer)
    customer: Customer

    @Field(type => [Discounts], { nullable: true })
    @HasMany(() => Discounts)
    discount: Discounts[]

    @Field(type => [Notes], { nullable: true })
    @HasMany(() => Notes)
    notes: Notes[]

  /** change DueDates model for relation */

    @Field(type => [DueDates], { nullable: true })
    @HasMany(() => DueDates)
    dueDates: DueDates[]

    @Field(type => [TaxFinance], { nullable: true })
    @HasMany(() => TaxFinance)
    vats: TaxFinance[]

    @Field(type => [Expense], { nullable: true })
    @HasMany(() => Expense, { onDelete: 'CASCADE' })
    expense: Expense[]

    @Field(type => [InvoiceItem], { nullable: true })
    @HasMany(() => InvoiceItem)
    items: InvoiceItem[]

    @Field(type => [InvoiceAdvanceInvoice], { nullable: true })
    @HasMany(() => InvoiceAdvanceInvoice)
    invoiceAdvance: InvoiceAdvanceInvoice[]

    static async _validate (instance: Invoice, options: any, update: boolean) {
        await InvoiceUtils.validate<Invoice>(Invoice, instance, options, update)
    }

  /** hooks */
    @BeforeCreate({ name: 'beforeCreateHook' })
    static async _beforeCreateHook (instance: Invoice, options: any) {
        await Invoice._validate(instance, options, false)
    }

    @BeforeUpdate({ name: 'beforeUpdateHook' })
    static async _beforeUpdateHook (instance: Invoice, options: any) {
        await Invoice._validate(instance, options, true)
    }

    public static selectOneById (id: number, clientId: number, options = {}): TModelResponse<Invoice> {
        return Invoice.findOne({
            where: {
                id: id,
                clientId,
            },
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
                    model: Discounts,
                    required: false
                },
                {
                    model: Notes,
                    required: false
                },
                {
                    model: DueDates,
                    required: false
                },
                {
                    model: TaxFinance,
                    required: false,
                    include: [
                        {
                            model: Tax,
                            include: [TaxValue]
                        }
                    ]
                },
                {
                    model: Expense,
                    required: false,
                    include: [
                        {
                            model: ExpenseItem,
                            include: [
                                {
                                    model: Tax,
                                    include: [TaxValue]
                                }
                            ]
                        },
                        {
                            model: Customer
                        }
                    ]
                },
                {
                    model: InvoiceItem,
                    required: false,
                    include: [
                        {
                            model: Item,
                            include: [
                                {
                                    model: Tax,
                                    include: [TaxValue]
                                }
                            ]
                        },
                        {
                            model: Warehouse
                        },
                        {
                            model: Tax
                        },
                        {
                            model: InvoiceItemDiscount,
                            required: false
                        }
                    ]
                }
            ],
            ...options
        })
    }

    public static async selectOne (id: number, ctx: IContextApp): TModelResponse<Invoice> {
        return InvoiceUtils.selectOneById<Invoice>(Invoice, id, ctx.clientId)
    }

    public static async selectAll (options: any, ctx: IContextApp): TModelResponseSelectAll<Invoice> {
        options = setUserFilterToWhereSearch(options, ctx)
        return Invoice.findAndCountAll(options)
    }

    public static async createInvoice (header: InvoiceHeaderType, options: any, ctx: IContextApp) {
        return InvoiceUtils.createHeaderInvoice<Invoice>(Invoice, header, options, ctx)
    }

    public calcAll = async (options: any) => InvoiceUtils.recalculateInvoiceValuesFinance(this, options)

    public saveToWarehouse = async (options: any, ctx: any) => {

    /** merge the same  we care only for quantity*/
        const arrayItems = this.items.reduce((acc, item) => {
            const it = acc.find(x => x.item.id === item.item.id && x.warehouseId === item.warehouseId)
            if (!it) {
                return [...acc, item]
            }
            it.quantity = _.round(_.add(it.quantity, item.quantity), 3)
            return acc
        }, [])

    /** collect with same warehouseid */

        const arrayByWarehouse: IItemsByWarehouse[] = await arrayItems.reduce(async (acc, item) => {
            const accArr = await acc
            const obj = accArr.find(a => a.warehouseId === item.warehouseId)
            const warehouseItemInfo = await WarehouseItemInfo.findOne({
                where: {
                    warehouseId: item.warehouseId,
                    itemId: item.itemId,
                    clientId: ctx.clientId
                },
                include: [
                    {
                        model: WarehouseItem,
                        required: true
                    }
                ], ...options
            })

            const article = await Item.findOne({
                where: {
                    id: item.itemId
                },
                ...options
            })

            const data = {
                item: article,
                quantity: item.quantity,
                warehouseItemInfo
            }

            if (!obj) {
                return [...accArr, {
                    warehouseId: item.warehouseId,
                    items: [data]
                }]
            }
            obj.items.push(data)
            return accArr
        }, [])

        const itemsForWarehouse: IItemForWarehouse[] = arrayByWarehouse.map((m) => {
            return {
                warehouseId: m.warehouseId,
                items: m.items.map(i => {
                    return {
                        item: i.item,
                        quantity: i.quantity,
                        finance: !i.warehouseItemInfo ? 0 : _.round(_.multiply(i.quantity, i.warehouseItemInfo.warehouseItem.priceStack), 2)
                    }
                })
            }
        })

        const arrayWarehouseItem = itemsForWarehouse.map(m => {
            const warehouseItems = {
                ...m,
                customerId: this.customerId,
                invoiceId: this.id
            }
            return WarehouseItem.insertBulk(warehouseItems as any, ctx, options)
        })

        const arrayWarehouseInfo = itemsForWarehouse.map(m => {
            const warehouseInfo = {
                warehouseId: m.warehouseId,
                date: this.date,
                invoiceId: this.id,
                claims: _.round(m.items.reduce((acc, it) => {
                    return _.add(acc, it.finance)
                }, 0), 2)
            }
            return WarehouseFinance.insertOneRecordWithTransaction(warehouseInfo as any, options, ctx.clientId)
        })
        await Promise.all(arrayWarehouseItem)
        await Promise.all(arrayWarehouseInfo)
    }

    public insertInvoiceTaxes = async (ctx: IContextApp, options: any): Promise<any> => InvoiceUtils.insertInvoiceTaxes(Invoice, this, ctx, options)

    public static async insertUpdate (id: number, entryData: InvoiceType, ctx: IContextApp): Promise<Invoice> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
        return InvoiceUtils.insertUpdate<Invoice>(Invoice, id, entryData, ctx)
    }

    public static async insertOne (entryData: InvoiceType, ctx: IContextApp): Promise<Invoice> {
        return Invoice.insertUpdate(0, entryData, ctx)
    }

    public static async updateOne (id: number, entryData: InvoiceType, ctx: IContextApp): Promise<Invoice> {
        return Invoice.insertUpdate(id, entryData, ctx)
    }

    public static async totalTransactionByCustomer (ctx: IContextApp, customerId?: number, dateStart?: Date, dateEnd?: Date): Promise<TransactionCustomerSummarize> {
        return InvoiceUtils.totalTransactionByCustomer<Invoice>(Invoice, ctx, customerId, dateStart, dateEnd)
    }
}

const BaseResolver = createBaseResolver(Invoice, {
    updateInputType: InvoiceType,
    insertInputType: InvoiceType
})

@Resolver()
export class InvoiceResolver extends BaseResolver {
    @UseMiddleware(checkJWT)
    @Query(returns => TransactionCustomerSummarize, { nullable: true, name: 'TransactionInvoiceCustomerSum' })
    getCustomerSum (@Arg('customerId', type => Int, { nullable: true })customerId: number,
        @Arg('dateStart', type => Date, { nullable: true }) dateStart: Date,
        @Arg('dateEnd', type => Date, { nullable: true }) dateEnd: Date,
        @Ctx() ctx: IContextApp) {
        return Invoice.totalTransactionByCustomer(ctx, customerId, dateStart)
    }
}
