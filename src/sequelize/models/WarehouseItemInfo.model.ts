import 'reflect-metadata'
import {
    Arg,
    Args,
    Ctx,
    Field,
    ID,
    Int,
    ObjectType,
    Query,
    Resolver,
    UseMiddleware
}                       from 'type-graphql'
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
}                       from 'sequelize-typescript'
import Warehouse        from './Warehouse.model'
import {
    Item,
    setUserFilterToWhereSearch
}                       from './index'
import WarehouseItem    from './WarehouseItem.model'
import {checkJWT}       from '../graphql/middlewares'
import {
    PaginatedResponse,
    RequestFilterSort
}                       from '../graphql/types/basic'
import {requestOptions} from '../graphql/FilterRequest'
import {
    IContextApp,
    TModelResponse,
    TModelResponseArray,
    TModelResponseSelectAll
}                       from '../graphql/resolvers/basic'
import Client           from './Client.model'
import Sequelize        from 'sequelize'

@ObjectType()
@Table({
    tableName: 'warehouse_item_info'
})

export default class WarehouseItemInfo extends Model {
    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED,
    })
    id: number

    @Field(type => Int)
    @ForeignKey(() => Warehouse)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_warehouse_id'
    })
    warehouseId: number

    @Field(type => Int)
    @ForeignKey(() => Item)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_item_id'
    })
    itemId: number

    @Field(type => Int)
    @ForeignKey(() => WarehouseItem)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_warehouse_item_id'
    })
    warehouseItemId: number

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

  /** relations */

    @Field(type => Warehouse, {nullable: true})
    @BelongsTo(() => Warehouse)
    warehouse: Warehouse

    @Field(type => Item, {nullable: true})
    @BelongsTo(() => Item)
    item: Item

    @Field(type => WarehouseItem, {nullable: true})
    @BelongsTo(() => WarehouseItem)
    warehouseItem: WarehouseItem

    public static async selectAll (options: any, ctx: IContextApp): TModelResponseSelectAll<WarehouseItemInfo> {
        options = setUserFilterToWhereSearch(options, ctx)
        return WarehouseItemInfo.findAndCountAll(options)
    }

    public static async selectOne (id: number, ctx: IContextApp): TModelResponse<WarehouseItemInfo> {
        return WarehouseItemInfo.findOne({
            where: {
                id,
                clientId: ctx.clientId
            },
            include: [
                {
                    required: true,
                    model: Item
                },
                {
                    required: true,
                    model: WarehouseItem
                }
            ]
        })
    }

    public static async selectByFilter (warehouseId: number, value: string, ctx: IContextApp): TModelResponseArray<WarehouseItemInfo> {
        const Op = Sequelize.Op
        return WarehouseItemInfo.findAll({
            where: {
                warehouseId,
                clientId: ctx.clientId
            },
            include: [
                {
                    model: Item,
                    required: true,
                    where: {
                        [Op.or]: [
                            {
                                barCode: {
                                    [Op.like]: `%${value}%`
                                }
                            },
                            {
                                code: {
                                    [Op.like]: `%${value}%`
                                }
                            },
                            {
                                shortName: {
                                    [Op.like]: `%${value}%`
                                }
                            }
                        ]
                    }
                },
                {
                    required: true,
                    model: WarehouseItem
                }
            ],
            limit: 25
        })
    }

}

@ObjectType('responseWarehouseItemsInfo')
class ClassPaginationResponse extends PaginatedResponse(WarehouseItemInfo) {}

@Resolver()
export class WarehouseItemInfoResolver {

    @UseMiddleware(checkJWT)
    @Query(returns => WarehouseItemInfo, {name: 'warehouseItemInfo'})
    selectOne (@Arg('id', type => Int)id: number,
        @Ctx() ctx: IContextApp) {
        return WarehouseItemInfo.selectOne(id, ctx)
    }

    @UseMiddleware(checkJWT)
    @Query(returns => ClassPaginationResponse, {name: 'warehouseItemsInfo'})
    async _qModelSelectAll (@Ctx() ctx: IContextApp,
        @Args() request: RequestFilterSort) {
        const find = requestOptions(request)
        const result = await WarehouseItemInfo.selectAll(find, ctx)
        return {
            items: result.rows,
            count: result.count,
            perPage: find.limit,
            page: Math.floor(find.offset / find.limit) + 1,
            hasMore: true
        }
    }

    @UseMiddleware(checkJWT)
    @Query(returns => [WarehouseItemInfo], {nullable: true, name: 'warehouseItemByFilter'})
    async getByFilter (@Arg('value', type => String)value: string,
        @Arg('warehouseId', type => Int)warehouseId: number,
        @Ctx() ctx: IContextApp) {
        return WarehouseItemInfo.selectByFilter(warehouseId, value, ctx)
    }

}
