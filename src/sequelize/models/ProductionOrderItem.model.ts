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
}                                from 'type-graphql'
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
}                                from 'sequelize-typescript'
import {CONSTANT_MODEL}          from '../constants'
import {
    Item,
    throwArgumentValidationError
}                                from './index'
import {ProductionOrderItemType} from '../graphql/types/ProductionOrder'
import {
    IContextApp,
    TModelResponse
}                                from '../graphql/resolvers/basic'
import ProductionOrder           from './ProductionOrder.model'
import {sequelize}               from '../sequelize'
import {checkJWT}                from '../graphql/middlewares'

@ObjectType()
@Table({
    tableName: 'production_order_item'
})

export default class ProductionOrderItem extends Model {

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
        defaultValue: 0,
        type: DataType.DECIMAL(10, 3),
    })
    quantity: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Item)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_item_id'
    })
    itemId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => ProductionOrder)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_production_order_id'
    })
    productionOrderId: number

    @Field(type => Int)
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.STATUS.ACTIVE,
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
    @Field(type => Item, {nullable: true})
    @BelongsTo(() => Item)
    item: Item

    public static async insertOne (entryData: ProductionOrderItemType, ctx: IContextApp): Promise<ProductionOrder> {
        const transaction = await sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}
        try {
            const productionOrder = await ProductionOrder.findOne({
                where: {
                    id: entryData.productionOrderId,
                    clientId: ctx.clientId,
                    status: CONSTANT_MODEL.PRODUCTION_ORDER.OPENED
                },
                ...options
            })
            if (!productionOrder) {
                throwArgumentValidationError('id', {}, {message: 'Production order not exists in system.'})
            }
            await ProductionOrderItem.create({
                ...entryData,
            }, options)
            await transaction.commit()
            return ProductionOrder.selectOne(productionOrder.id, ctx)
        } catch (e) {
            transaction.rollback()
            throw e
        }
    }

    public static async updateOne (id: number, entryData: ProductionOrderItemType, ctx: IContextApp): Promise<ProductionOrder> {
        const transaction = await sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}
        try {
            const productionOrderItem = await ProductionOrderItem.findOne({
                where: {
                    id
                },
                ...options
            })
            if (!productionOrderItem) {
                throwArgumentValidationError('id', {}, {message: 'Production order item not exists in system.'})
            }
            await productionOrderItem.update(entryData, options)
            await transaction.commit()
            return ProductionOrder.selectOne(productionOrderItem.productionOrderId, ctx)
        } catch (e) {
            transaction.rollback()
            throw e
        }
    }

    public static async deleteOne (id: number, ctx: IContextApp): TModelResponse<ProductionOrder> {
        const transaction = await sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}
        try {
            const productionOrderItem = await ProductionOrderItem.findOne({
                where: {
                    id
                },
                ...options
            })
            if (!productionOrderItem) {
                throwArgumentValidationError('id', {}, {message: 'Production order item not exists in system.'})
            }
            await ProductionOrderItem.destroy({
                where: {
                    id
                },
                ...options
            })
            await transaction.commit()
            return ProductionOrder.selectOne(productionOrderItem.productionOrderId, ctx)
        } catch (e) {
            transaction.rollback()
            throw e
        }
    }
}

@Resolver()
export class ProductionOrderItemResolver {

    @UseMiddleware(checkJWT)
    @Mutation(returns => ProductionOrder, {name: 'deleteProductionOrderItem'})
    async _deleteProductionOrderItem (@Arg('id', type => Int) id: number,
        @Ctx() ctx: IContextApp) {
        return ProductionOrderItem.deleteOne(id, ctx)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => ProductionOrder, {name: 'insertProductionOrderItem'})
    async _insertProductionOrderItem (@Arg('data', type => ProductionOrderItemType) data: ProductionOrderItemType,
        @Ctx() ctx: IContextApp) {
        return ProductionOrderItem.insertOne(data, ctx)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => ProductionOrder, {name: 'updateProductionOrderItem'})
    async _updateProductionOrderItem (@Arg('id', type => Int) id: number,
        @Arg('data', type => ProductionOrderItemType) data: ProductionOrderItemType,
        @Ctx() ctx: IContextApp) {
        return ProductionOrderItem.updateOne(id, data, ctx)

    }
}