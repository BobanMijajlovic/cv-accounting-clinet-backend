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
    Resolver,
    UseMiddleware
} from 'type-graphql'

import * as validations               from './validations'
import {modelSTATUS}                  from './validations'
import {checkJWT}                     from '../graphql/middlewares'
import {IContextApp}                  from '../graphql/resolvers/basic'
import WorkOrder                      from './WorkOrder.model'
import {throwArgumentValidationError} from './index'
import Tax                            from './Tax.model'
import {WorkOrderItemType}      from '../graphql/types/WorkOrder'
import Client            from './Client.model'
import {
    Max,
    Min
}                        from 'class-validator'
import {
    ITEM_MAX_PRICE,
    ITEM_MAX_QUANTITY
}                        from '../constants'
import WarehouseItemInfo from './WarehouseItemInfo.model'
import _                 from 'lodash'
import {ExpenseItemType} from '../graphql/types/Calculation'

@ObjectType()
@Table({
    tableName: 'work_order_item'
})

export default class WorkOrderItem extends Model {
    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Min(0)
    @Max(ITEM_MAX_QUANTITY)
    @Field()
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(10, 3)
    })
    quantity: number
    
    @Field()
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(10, 2),
        field: 'tax_percent'
    })
    taxPercent: number

    @Field()
    @Min(0)
    @Max(ITEM_MAX_PRICE)
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(10, 2)
    })
    price: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.DECIMAL(10, 2),
        defaultValue: 0
    })
    finance: number

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: modelSTATUS.ACTIVE,
        validate: {
            isValid: (value) => validations.isStatusValid.bind(null, 'WorkOrder item')(value)
        }
    })
    status: number

    @Field(type => Int)
    @ForeignKey(() => WarehouseItemInfo)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_warehouse_item_info_id'
    })
    warehouseItemInfoId: number

    @Field(type => Int)
    @ForeignKey(() => WorkOrder)
    @Column({
        allowNull: false,
        type: DataType.INTEGER().UNSIGNED,
        field: 'fk_work_order_id',
    })
    workOrderId: number
    
    @Field(type => Int)
    @ForeignKey(() => Tax)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_tax_id'
    })
    taxId: number

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

    /** relations */

    @Field(type => WarehouseItemInfo)
    @BelongsTo(() => WarehouseItemInfo)
    warehouseItemInfo: WarehouseItemInfo
    
    @Field(type => WorkOrder)
    @BelongsTo(() => WorkOrder)
    workOrder: WorkOrder

    @Field(type => Client, {nullable: true})
    @BelongsTo(() => Client)
    client: Client

    @Field(type => Tax, {nullable: true})
    @BelongsTo(() => Tax)
    tax: Tax

    static async _validate (instance: WorkOrderItem, options: any, update: boolean) {
        const item = await WarehouseItemInfo.findOne({
            where: {
                id: instance.warehouseItemInfoId,
                clientId: instance.clientId
            }
        })
        !item && (!update || item.id !== instance.warehouseItemInfoId) && throwArgumentValidationError('warehouseItemInfoId', instance, {message: 'Warehouse item not exists'})
    }

    @BeforeCreate({name: 'beforeCreateHook'})
    static async _beforeCreateHook (instance: WorkOrderItem, options: any) {
        await WorkOrderItem._validate(instance, options, false)
    }

    @BeforeUpdate({name: 'beforeUpdateHook'})
    static async _beforeUpdateHook (instance: WorkOrderItem, options: any) {
        await WorkOrderItem._validate(instance, options, true)
    }

    public static async updateOne (id: number, data: WorkOrderItemType, ctx: IContextApp): Promise<WorkOrderItem> {
        const r: WorkOrderItem = await WorkOrderItem.findOne({
            where: {
                id: id,
                clientId: ctx.clientId
            }
        })
        if (!r) {
            throw Error('WorkOrderItem not found')
        }
        await r.update(data)
        return WorkOrderItem.findByPk(id)
    }

    public static async insertOne (workOrderId: number,ctx: IContextApp,data: WorkOrderItemType, taxes: Tax[], options: any) {
        const warehouseItemInfo = await WarehouseItemInfo.selectOne(data.warehouseItemInfoId,ctx)
        if (!warehouseItemInfo) {
            throwArgumentValidationError('items',data,{message: 'Warehouse item info not exists'})
        }
        const taxId = warehouseItemInfo.item.taxId
        const price = Number(_.get(warehouseItemInfo,'warehouseItem.priceStack'))
        const tax = taxes.find(t => t.id === taxId)
        return WorkOrderItem.create({
            ...data,
            workOrderId,
            clientId: ctx.clientId,
            price,
            finance: _.round(_.multiply(data.quantity,price),2),
            taxPercent: tax && (tax.values && tax.values[0].value),
            taxId: Number(taxId)
        }, options)
    }
}

@Resolver()
export class WorkOrderItemResolver {
    @UseMiddleware(checkJWT)
    @Mutation(returns => WorkOrderItem, {name: 'updateWorkOrderItem'})
    updateOne (@Arg('id', type => Int)id: number,
        @Arg('data') data: WorkOrderItemType,
        @Ctx() ctx: IContextApp) {
        return WorkOrderItem.updateOne(id, data, ctx)
    }
}

