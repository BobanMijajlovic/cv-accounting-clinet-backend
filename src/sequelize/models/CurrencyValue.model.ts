import 'reflect-metadata'
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
}                           from 'sequelize-typescript'
import Sequelize            from 'sequelize'
import {
    Arg,
    Field,
    ID,
    Int,
    ObjectType,
    Query,
    Resolver,
    UseMiddleware
}                           from 'type-graphql'
import {createBaseResolver} from '../graphql/resolvers/basic'
import CurrencyDefinition   from './CurrencyDefinition.model'
import {CurrencyValueType}  from '../graphql/types/Currency'
import {CONSTANT_MODEL}     from '../constants'
import {getCurrencyList}    from '../../server/Server'
import {format}             from 'date-fns'
import {checkJWT}           from '../graphql/middlewares'

@ObjectType()
@Table({
    tableName: 'currency_value'
})

export default class CurrencyValue extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field(type => String)
    @Column({
        allowNull: false,
        type: DataType.DATEONLY
    })
    date: string

    @Field(type => String)
    @Column({
        allowNull: false,
        type: DataType.DATEONLY,
        field: 'date_to'
    })
    dateTo: string

    @Field(type => String)
    @Column({
        allowNull: false,
        type: DataType.DATEONLY,
        field: 'date_created'
    })
    dateCreated: string

    @Field()
    @Column({
        allowNull: false,
        type: DataType.INTEGER,
    })
    unit: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(10, 4),
        field: 'buying_rate'
    })
    buyingRate: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(10, 4),
        field: 'middle_rate'
    })
    middleRate: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(10, 4),
        field: 'selling_rate'
    })
    sellingRate: number

    @Field(type => Int)
    @ForeignKey(() => CurrencyDefinition)
    @Column({
        allowNull: false,
        type: DataType.INTEGER().UNSIGNED,
        field: 'fk_currency_definition_id'
    })
    currencyDefinitionId: number

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

    @Field(type => CurrencyDefinition)
    @BelongsTo(() => CurrencyDefinition)
    currencyDefinition: CurrencyDefinition

    public static async getValuesByDate (date: Date, options = {}) {
        const Op = Sequelize.Op
        const data = await CurrencyValue.findAll({
            where: {
                date: {
                    [Op.lte]: date,
                },
                dateTo: {
                    [Op.gt]: date,
                }
            },
            order: [
                ['date', 'DESC']
            ],
            include: [
                {
                    model: CurrencyDefinition,
                    required: true,
                }
            ],
            ...options
        })

        return data.reduce((acc, x) => {
            const v = acc.find(y => y.currencyDefinitionId === x.currencyDefinitionId)
            return v ? acc : [...acc, x]
        }, [])
    }

    public static async getCurrencyListByDate (date?: Date): Promise<CurrencyDefinition[]> {
        const _date = date ? date :  new Date()
        const currencyList = await CurrencyValue.getValuesByDate(_date)
        if (currencyList.length > 0) {
            return currencyList
        }
        const dateString = format(_date,'yyyy-MM-dd')
        await getCurrencyList(dateString)
        return CurrencyValue.getValuesByDate(_date)
    }

}

const BaseResolver = createBaseResolver(CurrencyValue, {
    updateInputType: CurrencyValueType,
    insertInputType: CurrencyValueType
})

@Resolver()
export class CurrencyValueResolver extends BaseResolver {
    @UseMiddleware(checkJWT)
    @Query(returns => [CurrencyValue], {name: 'getCurrencyList'})
    _getCurrencyList (@Arg('date', type => Date,{nullable:true})date?: Date) {
        return CurrencyValue.getCurrencyListByDate(date)
    }
}

