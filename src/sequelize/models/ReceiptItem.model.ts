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
}                                 from 'type-graphql'
import {
    AutoIncrement,
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}                                 from 'sequelize-typescript'
import Tax                        from './Tax.model'
import {
    Item,
    throwArgumentValidationError,
    WarehouseItem
}                                 from './index'
import Receipt                    from './Receipt.model'
import {CONSTANT_MODEL}           from '../constants'
import * as validations           from './validations'
import {IContextApp}              from '../graphql/resolvers/basic'
import {ReceiptItemType}          from '../graphql/types/Receipt'
import _                          from 'lodash'
import {TransactionItemSummarize} from '../graphql/types/Customer'
import Sequelize         from 'sequelize'
import {checkJWT}        from '../graphql/middlewares'
import Client            from './Client.model'
import {
    differenceInCalendarDays,
    endOfMonth,
    format,
    isAfter,
    startOfMonth
}                        from 'date-fns'
import {endOfToday}      from '../../utils'
import WarehouseItemInfo from './WarehouseItemInfo.model'

export type TSumMonth<T> = T & Record<'month', string>

@ObjectType()
@Table({
    tableName: 'receipt_item',
    underscored: true,
    indexes: [
        {
            name: 'sum-by-item-receipt-item',
            unique: false,
            using: 'BTREE',
            fields: ['fk_client_id', 'fk_item_id', 'created_at']
        }
    ]
})

export default class ReceiptItem extends Model {
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
        type: DataType.DECIMAL(10, 2),
    })
    price: number

    @Field()
    @Column({
        allowNull: false,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 3),
    })
    quantity: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 3),
        field: 'finance_vp'
    })
    financeVP: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        field: 'discount_percent'
    })
    discountPercent: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        field: 'discount_value'
    })
    discountValue: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 3),
        field: 'finance_final_vp'
    })
    financeFinalVP: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(10, 2),
        field: 'tax_percent'
    })
    taxPercent: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.DECIMAL(10, 2),
        field: 'tax_finance'
    })
    taxFinance: number

    @Field(type => Int)
    @ForeignKey(() => Receipt)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_receipt_id'
    })
    receiptId: number

    @Field(type => Int)
    @ForeignKey(() => Item)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_item_id'
    })
    itemId: number

    @Field(type => Int)
    @ForeignKey(() => Tax)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_tax_id'
    })
    taxId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => WarehouseItem)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_warehouse_item_id'
    })
    warehouseItemId: number

    @Field(type => Int)
    @ForeignKey(() => Client)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_client_id'
    })
    clientId: number

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
            isValid: (value) => validations.isStatusValid.bind(null, 'ReceiptItem')(value)
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

    @Field(type => Item)
    @BelongsTo(() => Item)
    item: Item

    @Field(type => Tax)
    @BelongsTo(() => Tax)
    tax: Tax

    @Field(type => Receipt)
    @BelongsTo(() => Receipt)
    receipt: Receipt

    @Field(type => WarehouseItem, {nullable: true})
    @BelongsTo(() => WarehouseItem)
    warehouseItem: WarehouseItem

    private calcMissingValues () {
        const financeMP = _.round(_.multiply(this.quantity, this.price), 2)
        const tax = _.round(_.subtract(financeMP, _.round(_.divide(_.multiply(financeMP, 100), _.add(100, Number(this.taxPercent))), 2)), 2)
        this.financeVP = _.round(_.subtract(financeMP, tax), 2)
        this.financeFinalVP = this.discountPercent ? _.round(_.divide(_.multiply(this.financeVP, _.subtract(100, this.discountPercent)), 100), 2)
            : this.discountValue ? _.round(_.subtract(this.financeVP, this.discountValue), 2) : this.financeVP
        this.taxFinance = _.round(_.divide(_.multiply(this.financeFinalVP, this.taxPercent), 100), 2)
    }

    public static async insertOne (receiptId: number, data: ReceiptItemType, options: any, taxes: Tax[], ctx: IContextApp) {

        const item = await Item.findOne({
            where: {
                id: data.itemId,
                clientId: ctx.clientId
            },
            ...options
        })

        if (!item) {
            throwArgumentValidationError('id', {}, {message: 'Item not found'})
        }

        const warehouseItem = await WarehouseItemInfo.findOne({
            where: {
                itemId: item.id,
                clientId: ctx.clientId,
            },
            ...options
        })

        const taxPercent = Tax.findTaxPercent(taxes, item.taxId)
        const instance = await ReceiptItem.create({
            ...data,
            clientId: ctx.clientId,
            taxId: Number(item.taxId),
            date: data.date ? data.date : new Date().toISOString(),
            taxPercent,
            receiptId: receiptId,
            warehouseItemId: warehouseItem && warehouseItem.id
        }, options)
        instance.calcMissingValues()
        await instance.save(options)
    }

}

@Resolver()
export class ReceiptItemResolver {}

