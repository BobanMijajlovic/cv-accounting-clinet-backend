import 'reflect-metadata'
import {
    AutoIncrement,
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    Max,
    Min,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}                       from 'sequelize-typescript'
import {
    Field,
    ID,
    Int,
    ObjectType
}                       from 'type-graphql'
import Tax              from './Tax.model'
import Client           from './Client.model'
import {CONSTANT_MODEL} from '../constants'
import * as validations from './validations'

@ObjectType()
@Table({
    tableName: 'tax_value'
})

export default class TaxValue extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number

    @Field()
    @Max(100)
    @Min(-1)
    @Column({
        allowNull: true,
        type: DataType.DECIMAL(10, 2),
    })
    value: number

    @Field()
    @Column({
        allowNull: false,
    })
    date: Date

    @Column({
        type: DataType.STRING(64),
        allowNull: false,
        field: 'record_key'
    })
    recordKey: string

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

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.STATUS.ACTIVE,
        validate: {
            isValid: (value) => validations.isStatusValid.bind(null, 'CustomerInfo')(value)
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

    @Field(type => Tax, {nullable:true})
    @BelongsTo(() => Tax)
    tax: Tax
}

