import 'reflect-metadata'
import {
    Field,
    ID,
    Int,
    ObjectType,
    Resolver
}                        from 'type-graphql'
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
}                        from 'sequelize-typescript'
import {modelSTATUS}     from './validations'
import Client            from './Client.model'
import Vehicle           from './Vehicle.model'
import {
    createBaseResolver,
    IContextApp,
    TModelResponse,
    TModelResponseSelectAll
}                        from '../graphql/resolvers/basic'
import TravelOrderUser   from './TravelOrderUser.model'
import FuelType          from './FuelType.model'
import {TravelOrderType} from '../graphql/types/TravelOrder'
import {
    merge as _merge,
    omit as _omit
}                        from 'lodash'
import {
    setUserFilterToWhereSearch,
    throwArgumentValidationError
}                        from './index'

@ObjectType()
@Table({
    tableName: 'travel_order'
})

export default class TravelOrder extends Model {

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
        type: DataType.DATE,
        field: 'date_issued'
    })
    dateIssued: Date

    @Field()
    @Column({
        allowNull: false,
        field: 'date_start'
    })
    dateStart: Date

    @Field()
    @Column({
        allowNull: false,
        field: 'date_end'
    })
    dateEnd: Date

    @Field(type => Int)
    @Column({
        allowNull: false,
        type: DataType.INTEGER,
        field: 'total_hours'
    })
    totalHours: number

    @Field(type => Int)
    @Column({
        allowNull: false,
        type: DataType.INTEGER,
        field: 'no_of_days'
    })
    noOfDays: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(10,2),
        field: 'wage_finance'
    })
    wageFinance: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(10,2),
        field: 'total_finance'
    })
    totalFinance: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.STRING(100)
    })
    from: string

    @Field()
    @Column({
        allowNull: false,
        type: DataType.STRING(100)
    })
    to: string

    @Field()
    @Column({
        allowNull: false,
        type: DataType.STRING(500)
    })
    reason: string

    @Field(type => Int)
    @Column({
        allowNull: false,
        type: DataType.INTEGER,
        field: 'total_distance'
    })
    totalDistance: number

    @Field(type => Int)
    @Column({
        allowNull:false,
        type: DataType.INTEGER,
        field: 'total_consumption'
    })
    totalConsumption: number

    @Field(type => Int)
    @ForeignKey(() => Vehicle)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_vehicle_id'
    })
    vehicleId: number

    @Field(type => Int)
    @ForeignKey(() => Client)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_client_id'
    })
    clientId: number

    @Field(type => Int,{nullable:true})
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: modelSTATUS.ACTIVE,
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

    @Field(type => Client, {nullable:true})
    @BelongsTo(() => Client)
    client: Client

    @Field(type => Vehicle, {nullable:true})
    @BelongsTo(() => Vehicle)
    vehicle: Vehicle

    static async _validate (instance: TravelOrder, options: any, update: boolean) {
        const vehicle = await Vehicle.findOne({
            where: {
                vehicleId: instance.vehicleId,
                clientId: instance.clientId
            }
        })
        !vehicle && (!update || vehicle.id !== instance.id) && throwArgumentValidationError('vehicleId', instance, {message: 'Vehicle not exists'})

        /**
         * set total Hours
         * set number of days
         * set wage finance
         * set total finance
         * */

    }

    @BeforeCreate({name: 'beforeCreateHook'})
    static async _beforeCreateHook (instance: TravelOrder, options: any) {
        await TravelOrder._validate(instance,options,false)
    }

    @BeforeUpdate({name: 'beforeUpdateHook'})
    static async _beforeUpdateHook (instance: TravelOrder,options: any) {
        await TravelOrder._validate(instance,options,true)
    }

    public static async selectOne (id: number,ctx: IContextApp): TModelResponse<TravelOrder> {
        return TravelOrder.findOne({
            where: {
                id,
                clientId: ctx.clientId
            },
            include: [
                {
                    required: false,
                    model: TravelOrderUser
                },
                {
                    required: false,
                    model: Vehicle,
                    include: [
                        {
                            model: FuelType,
                            as: 'fuel'
                        }
                    ]
                }
            ]
        })
    }

    public static async selectAll (options: any,ctx: IContextApp): TModelResponseSelectAll<TravelOrder> {

        options = {
            ...options,
            ... {
                include: [
                    {
                        required: false,
                        model: Vehicle
                    }
                ]
            }
        }

        options = setUserFilterToWhereSearch(options, ctx)
        return TravelOrder.findAndCountAll(options)
    }

    public static async insertOne (data: TravelOrderType,ctx: IContextApp): TModelResponse<TravelOrder> {
        const transaction = await TravelOrder.sequelize.transaction()
        const options = {transaction}

        try {
            const _data = _omit(data,['users'])
            const travelOrder = await TravelOrder.create(_merge(_data,{
                clientId: ctx.clientId
            }),options)
            if (data.users) {
                const promises = data.users.map((x: any) =>  TravelOrderUser.create({
                    ...x,
                    travelOrderId: travelOrder.id,
                    wage: 0,
                    totalFinanceForUser:0
                },options))
                await Promise.all(promises)
            }
            await transaction.commit()
            return TravelOrder.selectOne(travelOrder.id,ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    public static async updateOne (id: number,data: TravelOrderType,ctx: IContextApp): TModelResponse<TravelOrder> {
        const transaction = await TravelOrder.sequelize.transaction()
        const options = {transaction}

        try {
            const travelOrder = await TravelOrder.findOne({
                where: {
                    id,
                    clientId: ctx.clientId
                },
                ...options
            })
            if (!travelOrder) {
                throw ('Travel order not exists')
            }
            const _data = _omit(data,['users'])
            await travelOrder.update(_data,options)
            if (data.users) {
                const promises = data.users.map((x: any) =>  TravelOrderUser.create({
                    ...x,
                    travelOrderId: travelOrder.id,
                    wage: 0,
                    totalFinanceForUser:0
                },options))
                await Promise.all(promises)
            }
            await transaction.commit()
            return TravelOrder.selectOne(travelOrder.id,ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

}

const BaseResolver = createBaseResolver(TravelOrder,{
    updateInputType: TravelOrderType,
    insertInputType: TravelOrderType
})

@Resolver()
export class TravelOrderResolver extends BaseResolver {}
