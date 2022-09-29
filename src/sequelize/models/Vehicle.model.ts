import 'reflect-metadata'
import {
    Arg,
    Ctx,
    Field,
    ID,
    Int,
    Mutation,
    ObjectType,
    Query,
    Resolver,
    UseMiddleware
}                                     from 'type-graphql'
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
}                                     from 'sequelize-typescript'
import {modelSTATUS}                  from './validations'
import Client                         from './Client.model'
import {throwArgumentValidationError} from './index'
import {
    IContextApp,
    TModelResponse
}                                     from '../graphql/resolvers/basic'
import FuelType                       from './FuelType.model'
import {VehicleType}                  from '../graphql/types/Vehicle'
import {checkJWT}                     from '../graphql/middlewares'

@ObjectType()
@Table({
    tableName: 'vehicle'
})

export default class Vehicle extends Model {
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
        type: DataType.STRING(100)
    })
    brand: string

    @Field()
    @Column({
        allowNull: false,
        type: DataType.STRING(100)
    })
    model: string

    @Field()
    @Column({
        allowNull: false,
        unique: true,
        type: DataType.STRING(100),
        field: 'registration_number'
    })
    registrationNumber: string

    @Field()
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(10,2),
        comment: 'consumption per km'
    })
    consumption: number

    @Field(type => Int,{nullable: true})
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: 0,
        field: 'has_norm'
    })
    hasNorm: number

    @Field(type => Int)
    @ForeignKey(() => Client)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_client_id'
    })
    clientId: number

    @Field(type => Int)
    @ForeignKey(() => FuelType)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_fuel_type_id'
    })
    fuelTypeId: number

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

    @Field(type => Client, {nullable:true})
    @BelongsTo(() => Client)
    client: Client

    @Field(type => FuelType, {nullable:true})
    @BelongsTo(() => FuelType)
    fuelType: FuelType

    static async _validate (instance: Vehicle, options: any, update: boolean) {
        const vehicle = await Vehicle.findOne({
            where: {
                brand: instance.brand,
                model: instance.model,
                clientId: instance.clientId
            }
        })
        vehicle && (!update || vehicle.id !== instance.id) && throwArgumentValidationError('model', instance, {message: 'Vehicle with this brand and model exists'})

        const fuel = await FuelType.findOne({
            where: {
                id: instance.fuelTypeId
            }
        })
        !fuel && (!update || fuel.id !== instance.fuelTypeId) && throwArgumentValidationError('fuelTypeId', instance, {message: 'Fuel not exists'})

    }

    @BeforeCreate({name: 'beforeCreateHook'})
    static async _beforeCreateHook (instance: Vehicle, options: any) {
        await Vehicle._validate(instance,options,false)
    }

    @BeforeUpdate({name: 'beforeUpdateHook'})
    static async _beforeUpdateHook (instance: Vehicle, options: any) {
        await Vehicle._validate(instance,options,true)
    }

    public static async selectOne (id: number,ctx: IContextApp): TModelResponse<Vehicle> {
        return Vehicle.findOne({
            where: {
                id,
                clientId: ctx.clientId
            },
            include: [
                {
                    required: false,
                    model: FuelType
                }
            ]
        })
    }

    public static async updateOne (id: number,data: VehicleType,ctx: IContextApp): TModelResponse<Vehicle> {
        const transaction = await Vehicle.sequelize.transaction()
        const options = {transaction}

        try {
            const vehicle = await Vehicle.findOne({
                where: {
                    id,
                    clientId: ctx.clientId
                },
                ...options
            })
            if (!vehicle) {
                throwArgumentValidationError('id',{},{message: 'Vehicle not exists'})
            }
            await vehicle.update(data,options)
            await transaction.commit()
            return Vehicle.selectOne(id,ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }
}

@Resolver()
export class VehicleResolver  {

    @UseMiddleware(checkJWT)
    @Query(returns => Vehicle,{name: 'vehicle'})
    selectOne (@Arg('id', type => Int)id: number,
        @Ctx() ctx: IContextApp) {
        return Vehicle.selectOne(id,ctx)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => Vehicle, {name: 'updateVehicle'})
    updateOne (@Arg('id', type => Int)id: number,
        @Arg('data') data: VehicleType,
        @Ctx() ctx: IContextApp) {
        return Vehicle.updateOne(id, data, ctx)
    }
}
