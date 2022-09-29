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
}                         from 'type-graphql'
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
}                         from 'sequelize-typescript'
import {
    Customer,
    Item,
    throwArgumentValidationError
}                         from './index'
import {checkJWT}         from '../graphql/middlewares'
import {
    IContextApp,
    TModelResponse
}                         from '../graphql/resolvers/basic'
import {ItemSupplierType} from '../graphql/types/Item'
import {modelSTATUS}      from './validations'
import {CONSTANT_MODEL}   from '../constants'

@ObjectType()
@Table({
    tableName: 'item_supplier'
})

export default class ItemSupplier extends Model {
    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.INTEGER
    })
    code: number

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: modelSTATUS.ACTIVE
    })
    status: number

    @Field(type => Int)
    @ForeignKey(() => Item)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_item_id'
    })
    itemId: number

    @Field(type => Int)
    @ForeignKey(() => Customer)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_customer_id'
    })
    supplierId: number

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

    @Field(type => Item)
    @BelongsTo(() => Item)
    item: Item

    @Field(type => Customer)
    @BelongsTo(() => Customer)
    supplier: Customer

    static async _validate (instance: ItemSupplier, options: any, update: boolean) {

        /** must have code or barCode */
        instance.code < 1 && throwArgumentValidationError('code', instance, {message: 'Code must be define'})

        let item = await ItemSupplier.findOne({
            where: {
                itemId: instance.itemId,
                supplierId: instance.supplierId,
                status: CONSTANT_MODEL.STATUS.ACTIVE
            },
            ...options
        })
        item && item.supplierId === instance.supplierId && (!update || item.id !== instance.id) && throwArgumentValidationError('code', instance, {
            message: 'This item already have code for this supplier. ',
            model: ItemSupplier.name
        })

        item = await ItemSupplier.findOne({
            where: {
                supplierId: instance.supplierId,
                code: instance.code,
                status: CONSTANT_MODEL.STATUS.ACTIVE
            },
            ...options
        })

        item && (!update || item.id !== instance.id) && throwArgumentValidationError('code', instance, {
            message: 'This code is already taken by another item.',
            model: ItemSupplier.name
        })

    }

    /** hooks */
    @BeforeCreate({name: 'beforeCreateHook'})
    static async _beforeCreateHook (instance: ItemSupplier, options: any) {
        await ItemSupplier._validate(instance, options, false)
    }

    /** hooks */
    @BeforeUpdate({name: 'beforeUpdateHook'})
    static async _beforeUpdateHook (instance: ItemSupplier, options: any) {
        await ItemSupplier._validate(instance, options, true)
    }

    public static async updateOne (id: number, data: ItemSupplierType, ctx: IContextApp): TModelResponse<ItemSupplier> {
        const r: ItemSupplier = await ItemSupplier.findOne({
            where: {
                id: id,
                status: CONSTANT_MODEL.STATUS.ACTIVE
            }
        })
        if (!r) {
            throw Error('ItemSupplier not found')
        }

        const item = await Item.findOne({
            where: {
                id: r.itemId,
                clientId: ctx.clientId
            }
        })

        if (!item) {
            throw Error('Item not found')
        }
        await r.update(data)
        return ItemSupplier.findOne({
            where: {
                id: id
            },
            include: [
                {
                    model: Customer,
                    as: 'supplier'
                }
            ]
        })
    }
}

@Resolver()
export class ItemSupplierResolver {
    @UseMiddleware(checkJWT)
    @Mutation(returns => ItemSupplier, {name: 'updateItemSupplier'})
    updateOne (@Arg('id', type => Int)id: number,
        @Arg('data') data: ItemSupplierType,
        @Ctx() ctx: IContextApp) {
        return ItemSupplier.updateOne(id, data, ctx)
    }
}
