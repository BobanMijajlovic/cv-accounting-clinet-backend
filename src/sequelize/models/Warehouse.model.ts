import 'reflect-metadata'
import {
    Arg,
    Ctx,
    Field,
    ID,
    Int,
    Mutation,
    ObjectType,
    Resolver,
    UseMiddleware
}                        from 'type-graphql'
import {
    AutoIncrement,
    BeforeCreate,
    BeforeUpdate,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    HasMany,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}                        from 'sequelize-typescript'
import Client            from './Client.model'
import {modelSTATUS}     from './validations'
import {
    createBaseResolver,
    IContextApp,
    TModelResponse,
    TModelResponseSelectAll
}                        from '../graphql/resolvers/basic'
import {WarehouseType}   from '../graphql/types/Warehouse'
import {merge as _merge} from 'lodash'
import {
    setUserFilterToWhereSearch,
    throwArgumentValidationError
}                        from './index'
import {checkJWT}        from '../graphql/middlewares'
import Sequelize from 'sequelize'
import {
    CONSTANT_MODEL,
    WAREHOUSE_TYPE
}                from '../constants'
import Address   from './Address.model'

@ObjectType()
@Table({
    tableName: 'warehouse'
})

export default class Warehouse extends Model {
    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED,
    })
    id: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.STRING(255)
    })
    name: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(255)
    })
    description: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(12, 2),
        field: 'finance_total_owes'
    })
    financeTotalOwes: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(12, 2),
        field: 'finance_total_claims'
    })
    financeTotalClaims: number

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: WAREHOUSE_TYPE.WHOLESALE
    })
    flag: number

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: modelSTATUS.ACTIVE
    })
    status: number

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

    @Field(type => [Address], {nullable: true})
    @HasMany(() => Address)
    addresses: Address[]

    static _validateWarehouse (instance: Warehouse, options: any, update: boolean) {
        if ((!instance.name || instance.name.trim().length === 0) && !update) {
            throwArgumentValidationError('name', instance, {
                message: 'Warehouse name must be define.',
                model: 'Warehouse'
            })
        }
        instance.name = instance.name.replace(/\s+/, ' ').trim()
    }

    /** hooks */

    @BeforeCreate({name: 'beforeCreateHook'})
    static async _beforeCreateHook (instance: Warehouse, options: any) {
        await Warehouse._validateWarehouse(instance, options, false)
    }

    @BeforeUpdate({name: 'beforeUpdateHook'})
    static async _beforeUpdateHook (instance: Warehouse, options: any) {
        await Warehouse._validateWarehouse(instance, options, true)
    }

    /** functions */

    public static async selectOne (id: number, ctx?: IContextApp): TModelResponse<Warehouse> {
        return Warehouse.findOne({
            where: {
                id,
                clientId: ctx.clientId
            },
            include: [
                {
                    model: Address
                }
            ]
        })
    }

    public static async selectAll (options: any, ctx: IContextApp): TModelResponseSelectAll<Warehouse> {
        options.where = {
            [Sequelize.Op.and]: [
                {status: CONSTANT_MODEL.STATUS.ACTIVE},
                {
                    ...options.where
                }
            ]
        }
        options = setUserFilterToWhereSearch(options, ctx)
        return Warehouse.findAndCountAll(options)
    }

    public static async insertOne (data: WarehouseType, ctx?: IContextApp): TModelResponse<Warehouse> {
        const warehouse = await Warehouse.create(_merge({clientId: ctx.clientId}, data))
        return Warehouse.selectOne(warehouse.id, ctx)
    }

    public static async updateOne (id: number, data: WarehouseType, ctx: IContextApp): TModelResponse<Warehouse> {
        const warehouse = await Warehouse.findOne({
            where: {
                id,
                clientId: ctx.clientId
            }
        })
        if (!warehouse) {
            throwArgumentValidationError('id', {}, {message: 'Warehouse not exists'})
        }
        await warehouse.update(data)
        return Warehouse.selectOne(id, ctx)
    }

    public static async insertBulk (data: WarehouseType[], ctx: IContextApp): Promise<string> {
        const transaction = await Warehouse.sequelize.transaction()
        const options = {transaction}
        try {
            const notValid = data.every(instance => !(!instance.name || instance.name.trim().length === 0))
            if (!notValid) {
                throwArgumentValidationError('name', {}, {message: 'Name must be define'})
            }
            const warehouses = data.map(warehouse => {
                return {
                    ...warehouse,
                    clientId: ctx.clientId
                }
            })
            await Warehouse.bulkCreate(warehouses, options)
            await transaction.commit()
            return 'OK'
        } catch (e) {
            transaction.rollback()
            throw (e)

        }
    }

}

const BaseResolver = createBaseResolver(Warehouse, {
    updateInputType: WarehouseType,
    insertInputType: WarehouseType
})

@Resolver()
export class WarehouseResolver extends BaseResolver {
    @UseMiddleware(checkJWT)
    @Mutation(returns => String, {name: 'insertWarehouses'})
    _qModelInsertBulk (@Arg('data', type => [WarehouseType]) data: WarehouseType[],
        @Ctx() ctx: IContextApp) {
        return Warehouse.insertBulk(data, ctx)
    }
}

