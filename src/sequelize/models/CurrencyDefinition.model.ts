import 'reflect-metadata'
import {
    AutoIncrement,
    Column,
    CreatedAt,
    DataType,
    HasMany,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}                                     from 'sequelize-typescript'
import {
    Field,
    ID,
    Int,
    ObjectType,
    Resolver
}                                     from 'type-graphql'
import {
    createBaseResolver,
    IContextApp,
    TModelResponse
}                                     from '../graphql/resolvers/basic'
import {CurrencyDefinitionType}       from '../graphql/types/Currency'
import {MinLength}                    from 'class-validator'
import {throwArgumentValidationError} from './index'
import {CONSTANT_MODEL}               from '../constants'
import CurrencyValue                  from './CurrencyValue.model'

@ObjectType()
@Table({
    tableName: 'currency_definition'
})

export default class CurrencyDefinition extends Model {

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
        type: DataType.STRING(32),
        field: 'name'
    })
    name: string

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
        unique: true,
        type: DataType.STRING(4),
        field: 'mark'
    })
    mark: string

    @Field()
    @MinLength(1)
    @Column({
        allowNull: false,
        type: DataType.STRING(50)
    })
    country: string

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.STATUS.ACTIVE
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

    @Field(type => [CurrencyValue], {nullable: true})
    @HasMany(() => CurrencyValue)
    values: CurrencyValue[]

    public static async selectOne(id: number, ctx?: IContextApp): TModelResponse<CurrencyDefinition> {
        return CurrencyDefinition.findOne({
            where: {
                id
            },
            include: [
                {
                    model: CurrencyValue,
                    required: false,
                    as: 'values',
                    order: [
                        ['id', 'DESC']
                    ],
                    limit: 1
                }
            ]
        })
    }

    /** update the Client, additional checks will be done in  hooks, address only can be added, for change addresses use direct update of address*/
    public static async updateOne(id: number, data: CurrencyDefinitionType, ctx?: IContextApp): TModelResponse<CurrencyDefinition> {
        const instance = await CurrencyDefinition.findOne({where: {id}})
        !instance && throwArgumentValidationError('id', {}, {message: 'Instance not exists'})
        await instance.update(data)
        return CurrencyDefinition.selectOne(id, ctx)
    }

}

const BaseResolver = createBaseResolver(CurrencyDefinition, {
    updateInputType: CurrencyDefinitionType,
    insertInputType: CurrencyDefinitionType
})

@Resolver()
export class CurrencyDefinitionResolver extends BaseResolver {

}

