import 'reflect-metadata'
import {
    Field,
    ID,
    Int,
    ObjectType,
    Resolver
}                             from 'type-graphql'
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
}                             from 'sequelize-typescript'
import Client                 from './Client.model'
import {
    Calculation,
    setUserFilterToWhereSearch,
    throwArgumentValidationError,
    Warehouse
}                             from './index'
import Invoice                from './Invoice.model'
import {
    createBaseResolver,
    IContextApp,
    TModelResponse,
    TModelResponseSelectAll
}                             from '../graphql/resolvers/basic'
import {WarehouseFinanceType} from '../graphql/types/Warehouse'
import _, {merge as _merge}   from 'lodash'
import ReturnInvoice          from "./ReturnInvoice.model";

@ObjectType()
@Table({
    tableName: 'warehouse_finance'
})

export default class WarehouseFinance extends Model {
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
        type: DataType.DATE
    })
    date: Date

    @Field()
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(12, 2)
    })
    owes: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(12, 2)
    })
    claims: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(14, 2)
    })
    balance: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(14, 2),
        field: 'total_owes'
    })
    totalOwes: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(14, 2),
        field: 'total_claims'
    })
    totalClaims: number

    @Field(type => Int)
    @ForeignKey(() => Warehouse)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_warehouse_id'
    })
    warehouseId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Calculation)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_calculation_id'
    })
    calculationId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Invoice)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_invoice_id'
    })
    invoiceId: number


    @Field(type => Int, {nullable: true})
    @ForeignKey(() => ReturnInvoice)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_return_invoice_id'
    })
    returnInvoiceId: number

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

    @Field(type => Warehouse)
    @BelongsTo(() => Warehouse)
    warehouse: Warehouse

    @Field(type => Client)
    @BelongsTo(() => Client)
    client: Client

    @Field(type => ReturnInvoice, {nullable: true})
    @BelongsTo(() => ReturnInvoice)
    returnInvoice: ReturnInvoice

    @Field(type => Invoice, {nullable: true})
    @BelongsTo(() => Invoice)
    invoice: Invoice

    @Field(type => Calculation, {nullable: true})
    @BelongsTo(() => Calculation)
    calculation: Calculation

    static async _validate (instance: WarehouseFinance, options: any, update: boolean) {

        const warehouse = await Warehouse.findOne({
            where: {
                id: instance.warehouseId,
                clientId: instance.clientId
            },
            ...options
        })
        if (!warehouse && (!update || instance.warehouseId !== warehouse.id)) {
            throwArgumentValidationError('warehouseId', {}, {message: 'Warehouse not exists'})
        }

        if (instance.calculationId) {
            const calculation = await Calculation.findOne({
                where: {
                    id: instance.calculationId,
                    clientId: instance.clientId
                },
                ...options
            })
            if (!calculation && (!update || instance.calculationId !== calculation.id)) {
                throwArgumentValidationError('calculationId', {}, {message: 'Calculation not exists'})
            }
        }

        if (instance.invoiceId) {
            const invoice = await Invoice.findOne({
                where: {
                    id: instance.invoiceId,
                    clientId: instance.clientId
                },
                ...options
            })
            if (!invoice && (!update || instance.invoiceId !== invoice.id)) {
                throwArgumentValidationError('invoiceId', {}, {message: 'Invoice not exists'})
            }
        }

        if (instance.returnInvoiceId) {
            const returnInvoice = await ReturnInvoice.findOne({
                where: {
                    id: instance.returnInvoiceId,
                    clientId: instance.clientId
                },
                ...options
            })
            if (!returnInvoice && (!update || instance.returnInvoiceId !== returnInvoice.id)) {
                throwArgumentValidationError('returnInvoiceId', {}, {message: ' Return Invoice not exists'})
            }
        }

        let value = instance.owes && _.round(instance.owes, 2)
        if (value && value !== instance.owes) {
            throwArgumentValidationError('owes', instance, {message: 'Owes not valid'})
        }
        value = instance.claims && _.round(instance.claims, 2)
        if (value && value !== instance.claims) {
            throwArgumentValidationError('claims', instance, {message: 'Claims not valid'})
        }
    }

  /** hooks */

    @BeforeCreate({name: 'beforeCreateHook'})
    static async _beforeCreateHook (instance: WarehouseFinance, options: any) {
        await WarehouseFinance._validate(instance, options, false)
    }

    @BeforeUpdate({name: 'beforeUpdateHook'})
    static async _beforeUpdateHook (instance: WarehouseFinance, options: any) {
        await WarehouseFinance._validate(instance, options, true)
    }

    public static async selectOne (id: number, ctx: IContextApp): TModelResponse<WarehouseFinance> {
        return WarehouseFinance.findOne({
            where: {
                id: id,
                clientId: ctx.clientId
            },
            include: [
                {
                    model: Client,
                    required: false
                },
                {
                    model: Warehouse,
                    required: false
                },
                {
                    model: Calculation,
                    required: false
                },
                {
                    model: Invoice,
                    required: false
                },
                {
                    model: ReturnInvoice,
                    required: false
                }
            ]
        })
    }

    public static async selectAll (options: any, ctx: IContextApp): TModelResponseSelectAll<WarehouseFinance> {
        options = setUserFilterToWhereSearch(options, ctx)
        return WarehouseFinance.findAndCountAll(options)
    }

    public static async insertOneRecordWithTransaction (data, options: any, clientId: number) {
        let wFinance = await WarehouseFinance.findOne({
            where: {
                clientId: clientId,
                warehouseId: data.warehouseId
            },
            order: [['id', 'DESC']],
            ...options
        })
        !wFinance && (wFinance = {
            totalOwes: 0,
            totalClaims: 0,
            balance: 0,
            owes: 0,
            claims: 0
        } as any)
        const _data = (() => {
            const obj = data.invoiceId ? {
                totalOwes: wFinance.totalOwes,
                totalClaims: _.round(_.add(_.toNumber(wFinance.totalClaims), _.toNumber(data.claims)), 2),
                balance: _.round(_.subtract(_.toNumber(wFinance.balance), _.toNumber(data.claims)), 2),
                owes: 0,
                claims: data.claims
            } : (data.calculationId || data.returnInvoiceId) ? {
                totalClaims: wFinance.totalClaims,
                totalOwes: _.round(_.add(_.toNumber(wFinance.totalOwes), _.toNumber(data.owes)), 2),
                balance: _.round(_.add(_.toNumber(wFinance.balance), _.toNumber(data.owes)), 2),
                owes: data.owes,
                claims: 0
            } : {}
            return Object.assign({
                ..._.omit(data, ['owes', 'claims'])
            }, obj)
        })()

        return WarehouseFinance.create(_merge({clientId: clientId}, _data), options)
    }

    public static async insertOne (data: WarehouseFinanceType, ctx?: IContextApp): TModelResponse<WarehouseFinance> {
        const transaction = await WarehouseFinance.sequelize.transaction()
        const options = {transaction}
        try {
            const warehouse = await WarehouseFinance.insertOneRecordWithTransaction(data, options, ctx.clientId)
            await transaction.commit()
            return WarehouseFinance.selectOne(warehouse.id, ctx)
        } catch (e) {
            await transaction.rollback()
        }
    }

}

const BaseResolver = createBaseResolver(WarehouseFinance, {
    updateInputType: WarehouseFinanceType,
    insertInputType: WarehouseFinanceType
})

@Resolver()
export class WarehouseFinanceResolver extends BaseResolver {
}

