import 'reflect-metadata'
import {
    Field,
    ID,
    Int,
    ObjectType
}                    from 'type-graphql'
import {
    AutoIncrement,
    Column,
    CreatedAt,
    DataType,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}                    from 'sequelize-typescript'
import {modelSTATUS} from './validations'

@ObjectType()
@Table({
    tableName: 'fuel_type'
})

export default class FuelType extends Model {
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
        type: DataType.STRING(20)
    })
    type: string

    @Field()
    @Column({
        allowNull: false,
        type: DataType.STRING(20)
    })
    name: string

    @Field(type => Int,{nullable:true})
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: modelSTATUS.ACTIVE
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
}
