import 'reflect-metadata'
import {
    Field,
    ID,
    Int,
    ObjectType,
    Resolver
}                            from 'type-graphql'
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
}                            from 'sequelize-typescript'
import {CONSTANT_MODEL}      from '../constants'
import {
    Customer,
    Item,
    setUserFilterToWhereSearch,
    throwArgumentValidationError,
    User
}                            from './index'
import Normative             from './Normative.model'
import Client                from './Client.model'
import Expense               from './Expense.model'
import ProductionOrderItem   from './ProductionOrderItem.model'
import {
    createBaseResolver,
    IContextApp,
    TModelResponse,
    TModelResponseSelectAll
}                            from '../graphql/resolvers/basic'
import ExpenseItem           from './ExpenseItem.model'
import Tax                   from './Tax.model'
import TaxValue              from './TaxValue.model'
import {ProductionOrderType} from '../graphql/types/ProductionOrder'
import {sequelize}           from '../sequelize'
import _                     from 'lodash'

@ObjectType()
@Table({
    tableName: 'production_order'
})

export default class ProductionOrder extends Model {

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
        type: DataType.STRING(16),
    })
    number: string

    @Field(type => String, {nullable: true})
    @Column({
        allowNull: false,
        type: DataType.DATEONLY,
    })
    date: Date

    @Field(type => String, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.DATEONLY,
        field: 'date_finish'
    })
    dateFinish: Date

    @Field()
    @Column({
        allowNull: false,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 3),
    })
    quantity: number

    @Field(type => Int)
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.PRODUCTION_ORDER.OPENED
    })
    status: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Item)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_item_id'
    })
    itemId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Normative)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_normative_id'
    })
    normativeId: number

    @Field(type => Int)
    @ForeignKey(() => User)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_user_id'
    })

    userId: number

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

    @Field(type => Item, {nullable: true})
    @BelongsTo(() => Item)
    item: Item

    @Field(type => Normative, {nullable: true})
    @BelongsTo(() => Normative)
    normative: Normative

    @Field(type => [ProductionOrderItem], {nullable: true})
    @HasMany(() => ProductionOrderItem, {onDelete: 'CASCADE'})
    items: ProductionOrderItem[]

    @Field(type => [Expense], {nullable: true})
    @HasMany(() => Expense, {onDelete: 'CASCADE'})
    expense: Expense[]

    public static selectOneById (id: number, ctx: IContextApp, options = {}): TModelResponse<ProductionOrder> {
        return ProductionOrder.findOne({
            where: {
                id,
                clientId: ctx.clientId
            },
            include: [
                {
                    model: Item,
                    required: true
                },
                {
                    model: Normative,
                    required: false
                },
                {
                    model: ProductionOrderItem,
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
            ],
            ...options
        })
    }

    public static async selectOne (id: number, ctx: IContextApp): TModelResponse<ProductionOrder> {
        return ProductionOrder.selectOneById(id, ctx)
    }

    public static async selectAll (options: any, ctx: IContextApp): TModelResponseSelectAll<ProductionOrder> {
        options = setUserFilterToWhereSearch(options, ctx)
        return ProductionOrder.findAndCountAll(options)
    }
    
    public saveToWarehouse = async (options: any,ctx: any) => {
        /** insert too warehouse */
    }

    public static async insertUpdate (id: number, entryData: ProductionOrderType, ctx: IContextApp): TModelResponse<ProductionOrder> {
        if (!entryData) {
            throwArgumentValidationError('id', entryData, {message: 'Data is not valid.'})
        }

        if (entryData.header) {
            const header = entryData.header
            const transaction = await sequelize.transaction()
            if (!transaction) {
                throw Error('Transaction can\'t be open')
            }
            const options = {transaction, validate: true}
            try {

                const rec = await ProductionOrder.findOne({
                    order: [['id', 'DESC']],
                    ...options
                })
                const str = 'PROD-ORDER'
                let strNumber = (rec ? +rec.number.substr(str.length + 4) + 1 : 1).toString()
                while (strNumber.length < 0) {
                    strNumber = '0' + strNumber
                }
                const year = (new Date()).getFullYear()
                    .toString()
                    .substr(2)

                let normative = await Normative.findOne({
                    where: {
                        id: header.normativeId
                    },
                    ...options
                })
                if (!normative) {
                    throwArgumentValidationError('normativeId', {}, {message: 'Normative not exists in system.'})
                }

                const productionOrder = !id ? await ProductionOrder.create({
                    ...header,
                    number: `${str}-${year}-${strNumber}`,
                    clientId: ctx.clientId,
                    userId: ctx.userId
                }, options) : await ProductionOrder.selectOneById(id, ctx, options)

                if (id) {
                    if (!productionOrder) {
                        throwArgumentValidationError('id', {}, {message: 'Production order not exists in system.'})
                    }
                    await productionOrder.update(header, options)
                    await ProductionOrderItem.destroy({
                        where: {
                            productionOrderId: productionOrder.id
                        },
                        ...options
                    })
                    await Expense.destroy({
                        where: {
                            productionOrderId: productionOrder.id
                        },
                        ...options
                    })
                }

                normative = await Normative.selectById(productionOrder.normativeId, ctx, options)
                if (normative.items) {
                    const promise = normative.items.map(x => ProductionOrderItem.create({
                        itemId: x.itemId,
                        quantity: _.round(_.multiply(Number(productionOrder.quantity), Number(x.quantity)), 2),
                        productionOrderId: productionOrder.id
                    }, options))
                    await Promise.all(promise)
                }

                if (header.expense && header.expense.length !== 0) {
                    if ((header.expense as any).items && !header.expense.every(e => e.items.length)) {
                        throwArgumentValidationError('header', header, {message: 'Additional Expense must have even one item'})
                    }
                    const arrayCustomerId = _.uniq(header.expense.map(e => e.customerId))
                    const allCustomers = await Customer.findAll({
                        where: {
                            id: arrayCustomerId,
                            clientId: productionOrder.clientId
                        },
                        ...options
                    })
                    if (allCustomers.length !== arrayCustomerId.length) {
                        throwArgumentValidationError('header', header, {message: 'Customer not found in base'})
                    }
                    const expensePromise = header.expense.map((e, index) => {
                        if (!e.invoiceNumber || e.invoiceNumber !== e.invoiceNumber.trim().replace(/\s+/, ' ')) {
                            throwArgumentValidationError('header', header, {message: 'Additional Expense must have valid invoice number'})
                        }
                        const same = header.expense.find((a, ind) => ind !== index && a.customerId === e.customerId && a.invoiceNumber === e.invoiceNumber)
                        if (same) {
                            throwArgumentValidationError('header', header, {message: 'Additional Expense must be unique by client and number of invoice'})
                        }
                        return Expense.insertOne(e, {productionOrderId: productionOrder.id}, ctx, options)
                    })
                    await Promise.all(expensePromise)
                }
                await transaction.commit()
                return ProductionOrder.selectOne(productionOrder.id, ctx)
            } catch (e) {
                transaction.rollback()
                throw e
            }
        }

        if (entryData.status && id) {
            if (entryData.status === CONSTANT_MODEL.PRODUCTION_ORDER.FINISHED) {
                const transaction = await sequelize.transaction()
                if (!transaction) {
                    throw Error('Transaction can\'t be open')
                }
                const options = {transaction, validate: true}
                try {
                    const productionOrder = await ProductionOrder.selectOneById(id,ctx,options)
                    switch (productionOrder.status) {
                        case CONSTANT_MODEL.PRODUCTION_ORDER.DELETED: 
                            throw ('Action not allowed')
                        case CONSTANT_MODEL.PRODUCTION_ORDER.FINISHED:
                            throw ('Action not allowed')
                    }
                    await productionOrder.saveToWarehouse(options,ctx)
                    await productionOrder.update({
                        dateFinish: new Date().toISOString(),
                        status: entryData.status
                    },options)
                    await transaction.commit()
                    return ProductionOrder.selectOne(id,ctx)
                } catch (e) {
                    transaction.rollback()
                    throw e 
                }
            }

            if (entryData.status === CONSTANT_MODEL.PRODUCTION_ORDER.DELETED) {
                const transaction = await sequelize.transaction()
                if (!transaction) {
                    throw Error('Transaction can\'t be open')
                }
                const options = {transaction, validate: true}
                try {
                    const productionOrder = await ProductionOrder.selectOneById(id, ctx, options)
                    switch (productionOrder.status) {
                        case CONSTANT_MODEL.PRODUCTION_ORDER.DELETED:
                            throw ('Action not allowed')
                        case CONSTANT_MODEL.PRODUCTION_ORDER.FINISHED:
                            throw ('Action not allowed')
                    }
                    await productionOrder.update({status: entryData.status}, options)
                    const proms = productionOrder.items.map(x => x.update({status: CONSTANT_MODEL.STATUS.DELETED}))
                    await Promise.all(proms)
                    await transaction.commit()
                    return ProductionOrder.selectOne(id, ctx)
                } catch (e) {
                    transaction.rollback()
                    throw e
                }
            }

        }

    }

    public static async insertOne (entryData: ProductionOrderType, ctx: IContextApp): Promise<ProductionOrder> {
        return ProductionOrder.insertUpdate(0, entryData, ctx)
    }

    public static async updateOne (id: number, entryData: ProductionOrderType, ctx: IContextApp): Promise<ProductionOrder | null> {
        return ProductionOrder.insertUpdate(id, entryData, ctx)
    }
}

const BaseResolver = createBaseResolver(ProductionOrder, {
    updateInputType: ProductionOrderType,
    insertInputType: ProductionOrderType
})

@Resolver()
export class ProductionOrderResolver extends BaseResolver {

}