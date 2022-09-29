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
}                            from 'type-graphql'
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
}                            from 'sequelize-typescript'
import {
    Item,
    throwArgumentValidationError
}                            from './index'
import {CONSTANT_MODEL}      from '../constants'
import Normative             from './Normative.model'
import {NormativeItemType}   from '../graphql/types/Normative'
import {
    IContextApp,
    TModelResponse
}                            from '../graphql/resolvers/basic'
import {sequelize}           from '../sequelize'
import {checkJWT}            from '../graphql/middlewares'
import {flatten as _flatten} from 'lodash'

@ObjectType()
@Table({
    tableName: 'normative_item'
})

export default class NormativeItem extends Model {
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

    @Field(type => Int)
    @ForeignKey(() => Item)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_item_id'
    })
    itemId: number

    @Field(type => Int)
    @ForeignKey(() => Normative)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_normative_id'
    })
    normativeId: number

    @Field(type => Int, {nullable:true})
    @ForeignKey(() => Normative)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_active_normative_id'
    })
    activeNormativeId: number

    @Field(type => Int, {nullable: true})
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

    /** relations */

    @Field(type => Item)
    @BelongsTo(() => Item)
    item: Item

    @Field(type => Normative)
    @BelongsTo(() => Normative)
    normative: Normative

    static async _validate (instance: NormativeItem, options: any, update: boolean) {

        const item = await Item.findOne({
            where: {
                id: instance.itemId
            },
            ...options
        })

        !item && (!update || item.id !== instance.itemId) && throwArgumentValidationError('itemId', instance, {message: 'Item not exists in system.'})

    }

    @BeforeCreate({name: 'beforeCreateHook'})
    static async _beforeCreateHook (instance: NormativeItem, options: any) {
        await NormativeItem._validate(instance, options, false)
    }

    @BeforeUpdate({name: 'beforeUpdateHook'})
    static async _beforeUpdateHook (instance: NormativeItem, options: any) {
        await NormativeItem._validate(instance, options, true)
    }

    public static async selectById (id: number, ctx: IContextApp, options: any = {}): TModelResponse<NormativeItem> {
        return NormativeItem.findOne({
            where: {
                id
            },
            include: [
                {
                    model: Item,
                    required: true,
                    include: [
                        {
                            model: Normative,
                            required: false
                        }
                    ]
                }
            ],
            ...options
        })
    }

    public static async insertUpdate (id: number, data: NormativeItemType, ctx: IContextApp): TModelResponse<Normative> {
        const transaction = await sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}
        const normativeId = data.normativeId
        try {
            const normative = await Normative.findOne({
                where: {
                    id: normativeId,
                    clientId: ctx.clientId,
                    status: CONSTANT_MODEL.NORMATIVE.ACTIVE
                },
                ...options
            })
            if (!normative) {
                throwArgumentValidationError('id', {}, {message: 'Normative not exists or not editable'})
            }

            const normativeItem = !id ? await NormativeItem.create({
                ...data,
                normativeId
            }, options) : await NormativeItem.selectById(id, ctx, options)

            if (id) {
                await normativeItem.update(data, options)
            }
            await transaction.commit()
            return Normative.selectOne(normativeId, ctx)
        } catch (e) {
            transaction.rollback()
            throw e
        }
    }

    public static async insertOne (entryData: NormativeItemType, ctx: IContextApp): Promise<Normative> {
        return NormativeItem.insertUpdate(0, entryData, ctx)
    }

    public static async updateOne (id: number, entryData: NormativeItemType, ctx: IContextApp): Promise<Normative | null> {
        return NormativeItem.insertUpdate(id, entryData, ctx)
    }

    public static async markActiveRecords (normativeId: number, options: any) {
        return NormativeItem.update({status: CONSTANT_MODEL.STATUS.ACTIVE},
            {
                where: {
                    normativeId
                },
                ...options
            })
    }

    public static async deleteOne (id: number, ctx: IContextApp): TModelResponse<Normative> {
        const transaction = await sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}

        try {
            const normativeItem = await NormativeItem.findOne({
                where: {
                    id
                },
                ...options
            })
            if (!normativeItem) {
                throwArgumentValidationError('id', {}, {message: 'Normative item not exits'})
            }

            await NormativeItem.destroy({
                where: {
                    id
                },
                ...options
            })
            await transaction.commit()
            return Normative.selectOne(normativeItem.normativeId, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    public getNormativeItems = async (normativeIdArray = []) => {
        const arrayNorms = await Normative.findAll({
            where: {
                itemId: this.itemId
            }
        })

        if (arrayNorms.length === 0) {
            return this
        }

        const normative = arrayNorms.find(f => normativeIdArray.find(x => +x === +f.id)) || arrayNorms[0]

        const normativeItems = await NormativeItem.findAll({
            where: {
                normativeId: normative.id
            }
        })

        const array = await Promise.all(normativeItems.map(i => {
            return i.getNormativeItems()
        }))

        return _flatten(array)
    }

}

@Resolver()
export class NormativeItemResolver {

    @UseMiddleware(checkJWT)
    @Mutation(returns => Normative, {name: 'deleteNormativeItem'})
    async _deleteNormativeItem (@Arg('id', type => Int) id: number,
        @Ctx() ctx: IContextApp) {
        return NormativeItem.deleteOne(id, ctx)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => Normative, {name: 'insertNormativeItem'})
    async _insertNormativeItem (@Arg('data', type => NormativeItemType) data: NormativeItemType,
        @Ctx() ctx: IContextApp) {
        return NormativeItem.insertOne(data, ctx)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => Normative, {name: 'updateNormativeItem'})
    async _updateNormativeItem (@Arg('id', type => Int) id: number,
        @Arg('data', type => NormativeItemType) data: NormativeItemType,
        @Ctx() ctx: IContextApp) {
        return NormativeItem.updateOne(id, data, ctx)

    }
}
