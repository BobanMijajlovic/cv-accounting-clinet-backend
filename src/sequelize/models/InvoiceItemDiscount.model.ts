import 'reflect-metadata'
import {
    AutoIncrement,
    BeforeBulkCreate,
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}                            from 'sequelize-typescript'
import {
    Field,
    ID,
    Int,
    ObjectType
}                            from 'type-graphql'
import {CONSTANT_MODEL}      from '../constants'
import * as validations      from './validations'
import {
    InvoiceItem,
    throwArgumentValidationError
}                            from './index'
import {InvoiceDiscountType} from '../graphql/types/Invoice'
import _                     from 'lodash'

@ObjectType()
@Table({
    tableName: 'invoice_item_discount'
})

export default class InvoiceItemDiscount extends Model {
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
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
    })
    percent: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
    })
    value: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(255)
    })
    description: string

    @Field(type => Int)
    @ForeignKey(() => InvoiceItem)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_invoice_item_id'
    })
    invoiceItemId: number

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.STATUS.ACTIVE,
        validate: {
            isValid: (value) => validations.isStatusValid.bind(null, 'InvoiceItemDiscount')(value)
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
    @Field(type => InvoiceItem)
    @BelongsTo(() => InvoiceItem)
    invoiceItem: InvoiceItem

    static validateRecord = (item: InvoiceItemDiscount) => {
        let value = item.percent && _.round(item.percent, 2)
        if (value && value !== item.percent || Math.abs(value) > 99) {
            throwArgumentValidationError('percent', item, {message: 'Percent not valid'})
        }

        value = item.value && _.round(item.value, 2)
        if (value && value !== item.value) {
            throwArgumentValidationError('value', item, {message: 'Value not valid'})
        }
    }

    @BeforeBulkCreate({name: 'beforeBulkCreateHook'})
    static beforeBulkCreateHook (instance: InvoiceItemDiscount[], options: any): void {
        instance.forEach(item => InvoiceItemDiscount.validateRecord(item))
    }

    public static async insertOne (invoiceItemId: number, data: InvoiceDiscountType, options: any) {
        await InvoiceItemDiscount.create({
            ...data,
            invoiceItemId: invoiceItemId
        }, options)
    }

}
