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
    Field,
    ID,
    Int,
    ObjectType,
    Resolver
} from 'type-graphql'

import {
    createBaseResolver,
    IContextApp,
    TModelResponse,
    TModelResponseSelectAll
}                           from '../graphql/resolvers/basic'
import WorkOrderItem        from './WorkOrderItem.model'
import {
    Item,
    setUserFilterToWhereSearch,
    throwArgumentValidationError,
    Warehouse
}                           from './index'
import Client               from './Client.model'
import _, { omit as _omit } from 'lodash'
import {
    WorkOrderItemType,
    WorkOrderType
}                           from '../graphql/types/WorkOrder'
import WarehouseItemInfo    from './WarehouseItemInfo.model'
import Tax                  from './Tax.model'
import { CONSTANT_MODEL }   from '../constants'

@ObjectType()
@Table({
    tableName: 'work_order'
})

export default class WorkOrder extends Model {
    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field(type => Int)
    @ForeignKey(() => Warehouse)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'from_warehouse_id'
    })
    fromWarehouseId: number

    @Field(type => Int)
    @ForeignKey(() => Warehouse)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'to_warehouse_id',
    })
    toWarehouseId: number

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        type: DataType.DECIMAL(10, 2)
    })
    finance: number

    @Field(type => Date)
    @Column({
        allowNull: false,
        type: DataType.DATE,
        field: 'transfer_date'
    })
    transferDate: Date

    @Field(type => Int, { nullable: true })
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.WORK_ORDER_STATUS.OPENED
    })
    status: number

    @Field(type => Int)
    @ForeignKey(() => Client)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,  /* why not INTEGER(10) */
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

    @Field(type => Client)
    @BelongsTo(() => Client)
    client: Client

    @Field(type => Warehouse)
    @BelongsTo(() => Warehouse, 'fromWarehouseId')
    fromWarehouse: Warehouse

    @Field(type => Warehouse)
    @BelongsTo(() => Warehouse, 'toWarehouseId')
    toWarehouse: Warehouse

    @Field(type => [WorkOrderItem], { nullable: true })
    @HasMany(() => WorkOrderItem)
    workOrderItems: WorkOrderItem[]

    static async _validate (instance: WorkOrder, options: any, update: boolean) {
        let warehouse = await Warehouse.findOne({
            where: {
                id: instance.fromWarehouseId,
                clientId: instance.clientId
            },
            ...options
        })
        if (!warehouse && (!update || instance.fromWarehouseId !== warehouse.id)) {
            throwArgumentValidationError('fromWarehouseId', {}, { message: 'Warehouse not exists' })
        }

        warehouse = await Warehouse.findOne({
            where: {
                id: instance.toWarehouseId,
                clientId: instance.clientId
            },
            ...options
        })
        if (!warehouse && (!update || instance.toWarehouseId !== warehouse.id)) {
            throwArgumentValidationError('toWarehouseId', {}, { message: 'Warehouse not exists' })
        }
    }

  /** hooks */
    @BeforeCreate({ name: 'beforeCreateHook' })
    static async _beforeCreateHook (instance: WorkOrder, options: any, fn: any) {
        await WorkOrder._validate(instance, options, false)
    }

    @BeforeUpdate({ name: 'beforeUpdateHook' })
    static async _beforeUpdateHook (instance: WorkOrder, options: any, fn: any) {
        await WorkOrder._validate(instance, options, true)
    }

    private calculateMissingValues = () => {
        this.finance = _.round(this.workOrderItems.reduce((acc: number, item) => _.add(acc, item.finance), 0), 2)
    }

    public static async getWorkOrderById (id: number, clientId: number, options = {}): Promise<WorkOrder> {
        return WorkOrder.findOne({
            where: {
                id,
                clientId
            },
            include: [
                {
                    required: false,
                    model: WorkOrderItem,
                    include: [
                        {
                            model: WarehouseItemInfo,
                            include: [
                                {
                                    model: Item
                                }
                            ]
                        }
                    ]
                },
                {
                    model: Warehouse,
                    as: 'fromWarehouse'
                },
                {
                    model: Warehouse,
                    as: 'toWarehouse'
                }
            ],
            ...options
        })
    }

    public static selectOne (id: number, _ctx: IContextApp): TModelResponse<WorkOrder | null> {
        return WorkOrder.getWorkOrderById(id, _ctx.clientId)
    }

    public static async selectAll (options: any, ctx: IContextApp): TModelResponseSelectAll<WorkOrder> {
        options = setUserFilterToWhereSearch(options, ctx)
        return WorkOrder.findAndCountAll(options)
    }

    public static async insertUpdateOne (id: number, data: WorkOrderType, ctx: IContextApp): TModelResponse<WorkOrder> {
        const validTaxes = await Tax.getValidTax(ctx)
        if (!validTaxes) {
            throw Error('Vats not exists in system')
        }

        const transaction = await WorkOrder.sequelize.transaction()
        const options = { transaction }

        if (data.status && id) {
            if (data.status === CONSTANT_MODEL.WORK_ORDER_STATUS.SAVED) {
                const workOrder = await WorkOrder.getWorkOrderById(id, ctx.clientId, options)
                if (!workOrder || workOrder.status !== CONSTANT_MODEL.WORK_ORDER_STATUS.OPENED) {
                    throwArgumentValidationError('id', {}, { message: 'Work order not exists or not editable' })
                }
                await workOrder.update({ status: data.status }, options)
                /** TRANSFER ITEM FROM WAREHOUSE AND INSERT INTO WAREHOUSE FINANCE TABLE **/
                await transaction.commit()
                return WorkOrder.selectOne(workOrder.id, ctx)
            }
            if (data.status === CONSTANT_MODEL.WORK_ORDER_STATUS.CANCELED) {
                const transaction = await WorkOrder.sequelize.transaction()
                if (!transaction) {
                    throw Error('Transaction can\'t be open')
                }
                const options = { transaction, validate: true }
                const workOrder = await WorkOrder.getWorkOrderById(id, ctx.clientId, options)
                if (!workOrder || workOrder.status !== CONSTANT_MODEL.WORK_ORDER_STATUS.OPENED) {
                    throwArgumentValidationError('id', {}, { message: 'Work order not exists or not editable' })
                }
                await workOrder.update({ status: data.status }, options)
                /** ONLY CHANGE STATUS FROM WORK ORDER TABLE **/
                await transaction.commit()
                return WorkOrder.selectOne(workOrder.id, ctx)
            }
        }

        try {
            let workOrder = id ? await WorkOrder.getWorkOrderById(id, ctx.clientId, options)
                : await WorkOrder.create({
                    ..._omit(data, ['items']),
                    clientId: ctx.clientId
                }, options)

            if (!workOrder) {
                throwArgumentValidationError('workOrderId', data, { message: 'Work order not created' })
            }

            if (id) {
                const opt = {
                    where: {
                        workOrderId: workOrder.id
                    },
                    ...options
                }
                await Promise.all([WorkOrderItem.destroy(opt)])
                await workOrder.update(_.omit(data, ['items']), options)
            }

            if (data.items && data.items.length !== 0) {
                const proms = data.items.map((workItem: WorkOrderItemType) => WorkOrderItem.insertOne(Number(workOrder.id), ctx, workItem, validTaxes, options))
                await Promise.all(proms)
            }
            workOrder = await WorkOrder.getWorkOrderById(Number(workOrder.id), ctx.clientId, options)
            await workOrder.calculateMissingValues()
            await workOrder.save(options)
            await transaction.commit()
            return WorkOrder.selectOne(workOrder.id, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }

    }

    public static async insertOne (data: WorkOrderType, ctx: IContextApp): TModelResponse<WorkOrder> {
        return WorkOrder.insertUpdateOne(0, data, ctx)
    }

    public static async updateOne (id: number, data: WorkOrderType, ctx: IContextApp): TModelResponse<WorkOrder> {
        return WorkOrder.insertUpdateOne(id, data, ctx)
    }
}

const BaseResolver = createBaseResolver(WorkOrder, {
    updateInputType: WorkOrderType,
    insertInputType: WorkOrderType
})

@Resolver()
export class WorkOrderResolver extends BaseResolver {}

