import 'reflect-metadata'
import {
    AutoIncrement,
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
}                      from 'sequelize-typescript'
import {
    Field,
    ID,
    Int,
    ObjectType
}                      from 'type-graphql'
import {MinLength}     from 'class-validator'
import Client          from './Client.model'
import {TaxTypeDefine} from '../graphql/types/Tax'
import {IContextApp}   from '../graphql/resolvers/basic'

@ObjectType()
@Table({
    tableName: 'records_tax'
})

export default class RecordsTax extends Model {

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
        type: DataType.STRING(12),
        field: 'short'
    })
    short: string

    @Field()
    @MinLength(1)
    @Column({
        allowNull: false,
        type: DataType.STRING(4),
        field: 'mark'
    })
    mark: string

    @Field()
    @MinLength(1)
    @Column({
        allowNull: false,
        type: DataType.STRING(2),
        field: 'unique_key'
    })
    uniqueKey: string

    @Field()
    @Max(100)
    @Min(-1)
    @Column({
        allowNull: true,
        type: DataType.DECIMAL(10, 2),
    })
    value: number

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

    public static async insertUpdateTaxesRecords (data: TaxTypeDefine[], ctx: IContextApp, options: any) {
        const proms = data.map(tax => RecordsTax.insertUpdateOne(tax,ctx,options))
        return Promise.all(proms)
    }

    public static async insertUpdateOne (data: TaxTypeDefine, ctx: IContextApp, options: any) {
        const record = await RecordsTax.findOne({
            where: {
                short: data.short,
                mark: data.mark,
                uniqueKey: data.uniqueKey,
                value: data.value,
                clientId: ctx.clientId
            },
            ...options
        })
        if (!record) {
            await RecordsTax.create({
                ...data,
                clientId: ctx.clientId
            }, options)
        }
        return
    }

}

