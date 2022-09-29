import 'reflect-metadata'
import {
    Field,
    ID,
    Int,
    ObjectType
}              from 'type-graphql'
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
}                        from 'sequelize-typescript'
import Receipt           from './Receipt.model'
import {CONSTANT_MODEL}  from '../constants'
import * as validations  from './validations'

@ObjectType()
@Table({
    tableName: 'receipt_payment'
})

export default class ReceiptPayment extends Model {
    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field(type => Int)
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: 0,
        comment: '0 - CASH, 1 - CARD, 2 - CHEQUE'
    })
    type: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(10, 2),
    })
    value: number

    @Field(type => Int)
    @ForeignKey(() => Receipt)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_receipt_id'
    })
    receiptId: number

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

    @Field(type => Receipt)
    @BelongsTo(() => Receipt)
    receipt: Receipt

}