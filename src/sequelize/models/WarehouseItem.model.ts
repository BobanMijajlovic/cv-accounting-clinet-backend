import 'reflect-metadata'
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
import {
    AutoIncrement,
    BeforeCreate,
    BeforeUpdate,
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}                        from 'sequelize-typescript'
import Client            from './Client.model'
import Warehouse         from './Warehouse.model'
import Item              from './Item.model'
import { modelSTATUS }   from './validations'
import {
    createBaseResolver,
    IContextApp,
    TModelResponse,
    TModelResponseSelectAll
}                        from '../graphql/resolvers/basic'
import {
    Customer,
    setUserFilterToWhereSearch,
    throwArgumentValidationError
}                        from './index'
import {
    IWarehouseItemsRecord,
    WarehouseItemsBulk,
    WarehouseItemType
}                        from '../graphql/types/Warehouse'
import {
    Max,
    Min
}                        from 'class-validator'
import {
    ITEM_MAX_PRICE,
    WAREHOUSE_ITEM
}                        from '../constants'
import Invoice           from './Invoice.model'
import _                 from 'lodash'
import { checkJWT }      from '../graphql/middlewares'
import WarehouseItemInfo from './WarehouseItemInfo.model'
import config            from '../../../config'
import Calculation       from './Calculation.model'
import ReturnInvoice     from './ReturnInvoice.model'

@ObjectType()
@Table({
    tableName: 'warehouse_item'
})

export default class WarehouseItem extends Model {
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
        type: DataType.DECIMAL(10, 3),
        defaultValue: 0,
        field: 'quantity_transaction_claims',
        comment: 'means calculation'
    })
    quantityTransactionClaims: number

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        type: DataType.DECIMAL(10, 3),
        defaultValue: 0,
        field: 'quantity_transaction_owes',
        comment: 'means invoice'
    })
    quantityTransactionOwes: number

    @Max(ITEM_MAX_PRICE)
    @Min(0)
    @Field()
    @Column({
        allowNull: false,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        field: 'price_transaction'
    })
    priceTransaction: number

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        type: DataType.DECIMAL(10, 3),
        field: 'quantity_on_stack'
    })
    quantityOnStack: number

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        type: DataType.DECIMAL(10, 2),
        field: 'finance_on_stack'
    })
    financeOnStack: number

    @Min(0)
    @Field()
    @Column({
        allowNull: false,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        field: 'price_stack'
    })
    priceStack: number

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        type: DataType.DECIMAL(10, 3),
        field: 'quantity_total_claims'
    })
    quantityTotalClaims: number

    @Field()
    @Column({
        allowNull: false,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        field: 'finance_total_claims'
    })
    financeTotalClaims: number

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        type: DataType.DECIMAL(10, 3),
        field: 'quantity_total_owes'
    })
    quantityTotalOwes: number

    @Field()
    @Column({
        allowNull: false,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        field: 'finance_total_owes'
    })
    financeTotalOwes: number

    @Field(type => Int, { nullable: true })
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: 0,
        field: 'claims_owes',
        comment: 'Flag is invoice / calculation'
    })
    claimsOwes: number

    @Field(type => Date, { nullable: true })
    @Column({
        allowNull: true,
        type: DataType.DATE,
        field: 'transaction_date',
        comment: 'Date of calculation/invoice'
    })
    transactionDate: Date

    @Field(type => Int, { nullable: true })
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: modelSTATUS.ACTIVE,
        comment: '1 - added , 0 - correction'
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

    @Field(type => Int)
    @ForeignKey(() => Warehouse)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_warehouse_id'
    })
    warehouseId: number

    @Field(type => Int)
    @ForeignKey(() => Customer)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_customer_id'
    })
    customerId: number

    @Field(type => Int, { nullable: true })
    @ForeignKey(() => Invoice)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_invoice_id'
    })
    invoiceId: number

    @Field(type => Int, { nullable: true })
    @ForeignKey(() => ReturnInvoice)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_return_invoice_id'
    })
    returnInvoiceId: number

    @Field(type => Int, { nullable: true })
    @ForeignKey(() => Calculation)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_calculation_id'
    })
    calculationId: number

    @Field(type => Int)
    @ForeignKey(() => Item)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_item_id'
    })
    itemId: number

    @Field()
    @CreatedAt
    @Column({
        field: 'created_at'
    })
    createdAt: Date

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        type: DataType.STRING(127),
        field: 'created_by'
    })
    createdBy: string

    @Field()
    @UpdatedAt
    @Column({
        field: 'updated_at'
    })
    updatedAt: Date

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        type: DataType.STRING(127),
        field: 'updated_by'
    })
    updatedBy: string

    @Field(type => Warehouse, { nullable: true })
    @BelongsTo(() => Warehouse)
    warehouse: Warehouse

    @Field(type => Item, { nullable: true })
    @BelongsTo(() => Item)
    item: Item

    @Field(type => Client, { nullable: true })
    @BelongsTo(() => Client)
    client: Client

    @Field(type => Customer, { nullable: true })
    @BelongsTo(() => Customer)
    customer: Customer

    @Field(type => Invoice, { nullable: true })
    @BelongsTo(() => Invoice)
    invoice: Invoice

    @Field(type => ReturnInvoice, { nullable: true })
    @BelongsTo(() => ReturnInvoice)
    returnInvoice: ReturnInvoice

    @Field(type => Calculation, { nullable: true })
    @BelongsTo(() => Calculation)
    calculation: Calculation

    static async _validateWarehouseItem (instance: WarehouseItem, options: any, update: boolean) {
        const warehouse = await Warehouse.findOne({
            where: {
                id: instance.warehouseId,
                clientId: instance.clientId
            },
            ...options
        })
        if (!warehouse && (!update || instance.warehouseId !== warehouse.id)) {
            throwArgumentValidationError('warehouseId', {}, { message: 'Warehouse not exists' })
        }

        const customer = await Customer.findOne({
            where: {
                id: instance.customerId,
                clientId: instance.clientId
            }
        })
        if (!customer && (!update || instance.customerId !== customer.id)) {
            throwArgumentValidationError('customerId', {}, { message: 'Customer not exists' })
        }

        if (instance.invoiceId) {
            const invoice = await Invoice.findOne({
                where: {
                    id: instance.invoiceId,
                    clientId: instance.clientId
                }
            })
            if (!invoice && (!update || instance.invoiceId !== invoice.id)) {
                throwArgumentValidationError('invoiceId', {}, { message: 'Invoice not exists' })
            }
        }

         if(instance.calculationId) {
            const calculation = await Calculation.findOne({
                where: {
                    id: instance.calculationId,
                    clientId: instance.clientId
                }
            })
            if (!calculation && (!update || instance.calculationId !== calculation.id)) {
                throwArgumentValidationError('calculationId', {}, {message: 'Calculation not exists'})
            }
        }

        if(instance.returnInvoiceId) {
            const returnInvoice = await ReturnInvoice.findOne({
                where: {
                    id: instance.returnInvoiceId,
                    clientId: instance.clientId
                }
            })
            if (!returnInvoice && (!update || instance.returnInvoiceId !== returnInvoice.id)) {
                throwArgumentValidationError('calculationId', {}, {message: 'Return invoice not exists'})
            }
        }

        const itemData = await Item.findOne({
            where: {
                id: instance.itemId,
            },
            ...options
        })
        if (!itemData) {
            throwArgumentValidationError('itemId', {}, { message: 'Item not exists' })
        }
        instance.claimsOwes = 1
        if (instance.calculationId && !instance.invoiceId) {
            instance.claimsOwes = 0
        }
    }

  /** hooks */

    @BeforeCreate({ name: 'beforeCreateHook' })
    static async _beforeCreateHook (instance: WarehouseItem, options: any) {
        await WarehouseItem._validateWarehouseItem(instance, options, false)
    }

    @BeforeUpdate({ name: 'beforeUpdateHook' })
    static async _beforeUpdateHook (instance: WarehouseItem, options: any) {
        await WarehouseItem._validateWarehouseItem(instance, options, true)
    }

    public static async selectOne (id: number, ctx: IContextApp): TModelResponse<WarehouseItem> {
        return WarehouseItem.findOne({
            where: {
                id: id,
                clientId: ctx.clientId
            }
        })
    }

    public static async selectAll (options: any, ctx: IContextApp): TModelResponseSelectAll<WarehouseItem> {
        options = setUserFilterToWhereSearch(options, ctx)
        return WarehouseItem.findAndCountAll(options)
    }

  /** using this function assumption is that you have all prechecked like (  customerId, warehouseId , items... ) */
    public static async insertBulk (data: IWarehouseItemsRecord, ctx: IContextApp, options: any) {
        const len = data.items.length
        const isClaim = !!data.invoiceId

        for (let i = 0; i < len; i++) {
            const item = data.items[i]
      /* if (!item.finance && !item.price) {
           throw Error('Price or finance must be set')
       }*/
            const newRecord = Object.assign({
                customerId: data.customerId,
                clientId: ctx.clientId,
                warehouseId: data.warehouseId,
                claimOwes: isClaim ? WAREHOUSE_ITEM.FLAG_CLAIMS : WAREHOUSE_ITEM.FLAG_OWES,
                itemId: item.item.id,
                priceTransaction: item.price ? item.price : _.round(_.divide(item.finance, item.quantity), 2),
                transactionDate: new Date().toISOString(),
            }, isClaim ? {
                invoiceId: data.invoiceId,
                quantityTransactionClaims: item.quantity
            } : {
                calculationId: data.calculationId,
                returnInvoiceId: data.returnInvoiceId,
                quantityTransactionOwes: item.quantity
            })

            let wItem = await WarehouseItem.findOne({
                where: {
                    clientId: ctx.clientId,
                    warehouseId: data.warehouseId,
                    itemId: item.item.id
                },
                order: [['id', 'DESC']],
                ...options
            })

            !wItem && (wItem = {
                quantityOnStack: 0,
                financeOnStack: 0,
                priceStack: 0,
                quantityTotalClaims: 0,
                financeTotalClaims: 0,
                quantityTotalOwes: 0,
                financeTotalOwes: 0
            } as any)

            const finance = item.finance ? item.finance : _.round(_.multiply(+item.quantity, +item.price), 2)
            const tempObject = (() => {
                const obj = isClaim ? {
                    quantityTotalClaims: _.round(_.add(+wItem.quantityTotalClaims, +item.quantity), 3),
                    financeTotalClaims: _.round(_.add(+wItem.financeTotalClaims, finance), 2),
                    quantityTotalOwes: +wItem.quantityTotalOwes,
                    financeTotalOwes: +wItem.financeTotalOwes
                } : {
                    quantityTotalOwes: _.round(_.add(+wItem.quantityTotalOwes, +item.quantity), 3),
                    financeTotalOwes: _.round(_.add(+wItem.financeTotalOwes, finance), 2),
                    quantityTotalClaims: +wItem.quantityTotalClaims,
                    financeTotalClaims: +wItem.financeTotalClaims
                }

                const objStack = {
                    quantityOnStack: _.round(_.subtract(+obj.quantityTotalOwes, +obj.quantityTotalClaims), 3),
                    financeOnStack: _.round(_.subtract(+obj.financeTotalOwes, +obj.financeTotalClaims), 3)
                }
                const objPrice = {
                    priceStack: _.round(_.divide(objStack.financeOnStack, objStack.quantityOnStack), 2)
                }
                return Object.assign(objStack, objPrice, obj)
            })()
            const obj = Object.assign(newRecord, tempObject)
            const warehouseItem = await WarehouseItem.create(obj, options)
            const warehouseItemInfo = await WarehouseItemInfo.findOne({
                where: {
                    warehouseId: data.warehouseId,
                    itemId: item.item.id
                },
                ...options
            })
            if (!warehouseItemInfo) {
                await WarehouseItemInfo.create({
                    warehouseId: data.warehouseId,
                    warehouseItemId: warehouseItem.id,
                    itemId: item.item.id,
                    clientId: ctx.clientId
                }, options)
            } else {
                await warehouseItemInfo.update({
                    warehouseItemId: warehouseItem.id
                }, options)
            }

            const warehouse = await Warehouse.findOne({
                where: {
                    clientId: ctx.clientId,
                    id: newRecord.warehouseId
                },
                ...options
            })
            const financeWarehouse = isClaim ? {
                financeTotalClaims: _.round(_.add(+warehouse.financeTotalClaims, finance), 2)
            } : {
                financeTotalOwes: _.round(_.add(+warehouse.financeTotalOwes, finance), 2)
            }
            await warehouse.update(financeWarehouse, options)
        }

    }

    public static async insertBulkTest (data: WarehouseItemsBulk, ctx: IContextApp): Promise<string> {
        const transaction = await Item.sequelize.transaction()
        const options = { transaction }

        try {
            const items = (await Item.itemsByArrayIds(data.items.map(x => x.itemId), ctx, options)).map(item => {
                const _item = data.items.find(i => i.itemId === item.id)
                return {
                    item,
                    price: _item.price,
                    quantity: _item.quantity
                }
            })

            await WarehouseItem.insertBulk({
                ...data,
                items
            }, ctx, options)

            await transaction.commit()
            return 'OK'
        } catch (e) {
            await transaction.rollback()
        }

    }

}

const BaseResolver = createBaseResolver(WarehouseItem, {
    updateInputType: WarehouseItemType,
    insertInputType: WarehouseItemType
})

@Resolver()
export class WarehouseItemResolver extends BaseResolver {

  /** ONLY FOR TEST */
    @UseMiddleware(checkJWT)
    @Mutation(returns => String, { name: 'testInsertWarehouseItem' })
    _qModelInsertBulk (@Arg('data', type => WarehouseItemsBulk) data: WarehouseItemsBulk,
        @Ctx() ctx: IContextApp) {
        return WarehouseItem.insertBulkTest(data, ctx)
    }

    @UseMiddleware(checkJWT)
    @Query(returns => WarehouseItem, { name: 'getLastWarehouseItem', nullable: true })
    _qModelGetOneById (@Arg('warehouseId', type => Int) warehouseId: number,
        @Arg('itemId', type => Int) itemId: number,
        @Ctx() ctx: IContextApp) {
        if (!config.TEST) {
            throw Error('This mutation can be only called in test mode.')
        }
        return WarehouseItem.findOne({
            where: {
                clientId: ctx.clientId,
                warehouseId: warehouseId,
                itemId: itemId
            },
            order: [['id', 'DESC']]
        })
    }

}

