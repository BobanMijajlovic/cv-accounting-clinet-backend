import 'reflect-metadata'
import {
    AutoIncrement,
    BeforeBulkCreate,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}                                     from 'sequelize-typescript'
import {
    Field,
    ID,
    Int,
    ObjectType
}                                     from 'type-graphql'
import Invoice                        from './Invoice.model'
import {CONSTANT_MODEL}               from '../constants'
import * as validations               from './validations'
import {throwArgumentValidationError} from './index'
import ProformaInvoice                from './ProformaInvoice.model'
import _                              from 'lodash'
import {TForeignKeys}                 from '../graphql/types/basic'
import Calculation                    from './Calculation.model'
import {IContextApp}                  from '../graphql/resolvers/basic'

@ObjectType()
@Table({
    tableName: 'discounts'
})

export default class Discounts extends Model {
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

    @Field()
    @Column({
        allowNull: false,
        type: DataType.STRING(255)
    })
    description: string

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Invoice)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_invoice_id'
    })
    invoiceId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => ProformaInvoice)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_proforma_invoice_id'
    })
    proformaInvoiceId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Calculation)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_calculation_id'
    })
    calculationId: number

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.STATUS.ACTIVE,
        validate: {
            isValid: (value) => validations.isStatusValid.bind(null, 'Discounts')(value)
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

    static validateRecord = (item: Discounts) => {
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
    static beforeBulkCreateHook (instance: Discounts[], options: any): void {
        instance.forEach(item => Discounts.validateRecord(item))
    }

    public static async insertRows (data: IDiscountType[], ctx: IContextApp, options: any) {
        const array = data.map(d => Discounts.create({
            ...d,
            clientId: ctx.clientId
        }, options))

        return Promise.all(array)
    }

    public static async deletedRecords (data: TForeignKeys, options: any) {
        return Discounts.destroy({
            where: {
                ...data
            },
            ...options
        })
    }
}

export interface IDiscountType extends TForeignKeys {
    percent?: number
    value?: number
    description?: string
}
