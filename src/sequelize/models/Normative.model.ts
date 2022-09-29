import 'reflect-metadata'
import {
    Arg,
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
    BeforeCreate,
    BeforeUpdate,
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    HasMany,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}                       from 'sequelize-typescript'
import {CONSTANT_MODEL} from '../constants'
import Client           from './Client.model'
import {
    createBaseResolver,
    IContextApp,
    TModelResponse,
    TModelResponseArray,
    TModelResponseSelectAll
}                       from '../graphql/resolvers/basic'
import {
    Item,
    setUserFilterToWhereSearch,
    throwArgumentValidationError,
    WarehouseItem
}                       from './index'
import NormativeItem    from './NormativeItem.model'
import {NormativeType}  from '../graphql/types/Normative'
import {sequelize}      from '../sequelize'
import {checkJWT}       from '../graphql/middlewares'
import _                from 'lodash'
import Sequelize        from 'sequelize'

@ObjectType()
@Table({
    tableName: 'normative'
})

export default class Normative extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(128),
    })
    description: string

    @Field(type => Int)
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.NORMATIVE.ACTIVE,
    })
    status: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Client)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_client_id'
    })
    clientId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Item)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_item_id'
    })
    itemId: number

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
    @Field(type => Client, {nullable: true})
    @BelongsTo(() => Client)
    client: Client

    @Field(type => Item, {nullable: true})
    @BelongsTo(() => Item)
    item: Item

    @Field(type => [NormativeItem], {nullable: true})
    @HasMany(() => NormativeItem)
    items: NormativeItem[]

    static async _validate (instance: Normative, options: any, update: boolean) {

        const item = await Item.findOne({
            where: {
                id: instance.itemId
            },
            ...options
        })

        !item && (!update || item.id !== instance.itemId) && throwArgumentValidationError('itemId', instance, {message: 'Item not exists in system.'})

    }

    @BeforeCreate({name: 'beforeCreateHook'})
    static async _beforeCreateHook (instance: Normative, options: any) {
        await Normative._validate(instance, options, false)
    }

    @BeforeUpdate({name: 'beforeUpdateHook'})
    static async _beforeUpdateHook (instance: Normative, options: any) {
        await Normative._validate(instance, options, true)
    }

    public static async selectById (id: number, ctx: IContextApp, options: any = {}): TModelResponse<Normative> {
        const Op = Sequelize.Op
        return Normative.findOne({
            where: {
                id: id,
                clientId: ctx.clientId
            },
            include: [
                {
                    model: NormativeItem,
                    required: false,
                    include: [
                        {
                            model: Item,
                            required: true,
                            include: [
                                {
                                    model: Normative,
                                    required: false
                                },
                                {
                                    model: WarehouseItem,
                                    required: false,
                                    where: {
                                        calculationId: {
                                            [Op.ne]: null
                                        }
                                    },
                                    order: [['id','DESC']],
                                    limit: 1
                                }
                            ]
                        }
                    ]
                },
                {
                    model: Item,
                    required: true,
                }
            ],
            ...options
        })
    }

    public static async selectOne (id: number, ctx: IContextApp): TModelResponse<Normative> {
        return Normative.selectById(id, ctx)
    }

    public static async selectAll (options: any, ctx: IContextApp): TModelResponseSelectAll<Normative> {
        options = setUserFilterToWhereSearch(options, ctx)
        return Normative.findAndCountAll(options)
    }

    public static async insertOne (entryData: NormativeType, ctx: IContextApp): Promise<Normative> {
        return Normative.insertUpdate(0, entryData, ctx)
    }

    public static async updateOne (id: number, entryData: NormativeType, ctx: IContextApp): Promise<Normative | null> {
        return Normative.insertUpdate(id, entryData, ctx)
    }

    public static async insertUpdate (id: number, entryData: NormativeType, ctx: IContextApp): TModelResponse<Normative> {
        if (!entryData) {
            throwArgumentValidationError('id', entryData, {message: 'Data is not valid.'})
        }

        const transaction = await sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}

        try {

            const normative = !id ? await Normative.create({
                ...entryData,
                clientId: ctx.clientId,
                userId: ctx.userId
            }, options) : await Normative.selectById(id, ctx, options)

            if (id) {
                if (!normative) {
                    throwArgumentValidationError('id', {}, {message: 'Normative not exists in system.'})
                }
                await normative.update(entryData, options)
            }
            await transaction.commit()
            return Normative.selectOne(normative.id, ctx)
        } catch (e) {
            transaction.rollback()
            throw e
        }
    }

    public static async normativeSummarize (id: number, ctx: IContextApp): TModelResponse<Normative> {
        const normative = await Normative.selectById(id, ctx)
        if (!normative) {
            throwArgumentValidationError('id', {}, {message: 'Normative not exists in system.'})
        }
        if (normative.items && normative.items.length === 0) {
            return Normative.selectById(id, ctx)
        }
        const _normativeItems = normative.items
        let array = await Promise.all(_normativeItems.map(i => i.getNormativeItems()))
        array = _.flatten(array)

        let normativeItems = array.map(x => {
            return {
                id: x.id,
                normativeId: x.normativeId,
                itemId: x.itemId,
                quantity: x.quantity,
                status: x.status,
                createdAt: x.createdAt,
                updatedAt: x.updatedAt
            }
        })
        normativeItems = await normativeItems.reduce(async (acc: any, item: any) => {
            const accArr = await acc
            const index = accArr.findIndex(x => x.itemId === item.itemId)
            const _item = await Item.findOne({
                where: {
                    id: item.itemId
                }
            })
            if (index !== -1) {
                accArr[index].quantity = _.round(_.add(accArr[index].quantity, item.quantity), 2)
                return accArr
            }
            return [
                ...accArr,
                {
                    ...item,
                    item: _item
                }
            ]
        }, [])

        const item = await Item.selectOne(normative.itemId,ctx)

        return {
            id: _.add(_.random(99999,1000000), Number(normative.id)),
            description: normative.description,
            item,
            items: normativeItems,
            status: normative.status,
            createdAt: normative.createdAt,
            updatedAt: normative.updatedAt
        } as Normative
    }

    public static async itemNormativeFind (value: string, ctx: IContextApp): TModelResponseArray<Item> {
        const Op = Sequelize.Op
        const norms = await Normative.findAll({
            where: {
                clientId: ctx.clientId
            },
            include: [
                {
                    model: Item,
                    required: true,
                    where: {
                        [Op.or] : [
                            {
                                barCode: {
                                    [Op.like]: `%${value}%`
                                },
                            },
                            {
                                code: {
                                    [Op.like]: `%${value}%`
                                },
                            },
                            {
                                shortName: {
                                    [Op.like]: `%${value}%`
                                },
                            },
                            {
                                fullName: {
                                    [Op.like]: `%${value}%`
                                },
                            }
                        ]
                    }
                }
            ],
            limit: 25
        })
        
        let itemIds = norms.map(x => x.itemId)
        itemIds = _.uniq(itemIds)

        const data = await Item.findAll({
            where: {
                id: itemIds
            },
            limit: 25
        })

        if (data.length >= 25) {
            return data.slice(0, 25)
        }

        return data
    }
    
}

const BaseResolver = createBaseResolver(Normative, {
    updateInputType: NormativeType,
    insertInputType: NormativeType
})

@Resolver()
export class NormativeResolver extends BaseResolver {

    @UseMiddleware(checkJWT)
    @Query(returns => Normative, { name: 'normativeSummarize'})
    getCustomerSum (@Arg('id', type => Int)id: number,
        @Ctx() ctx: IContextApp) {
        return Normative.normativeSummarize(id, ctx)
    }

    @UseMiddleware(checkJWT)
    @Query(returns => [Item], {nullable: true, name: 'findItemsWithNormative',})
    async getByFilter (@Arg('value', type => String)value: string,
        @Ctx() ctx: IContextApp) {
        return Normative.itemNormativeFind(value, ctx)
    }

}
