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
}                                            from 'type-graphql'
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
}                                            from 'sequelize-typescript'
import SellingPanel                          from './SellingPanel.model'
import {
    Item,
    throwArgumentValidationError
}                                            from './index'
import {SellingPanelItemType}                from '../graphql/types/SellingPanel'
import {
    IContextApp,
    TModelResponse
}                                            from '../graphql/resolvers/basic'
import {SELLING_PANEL_ITEM_PRICE_IMAGE_FLAG} from '../constants'
import {checkJWT}                            from '../graphql/middlewares'
import Sequelize                             from 'sequelize'
import _                                     from 'lodash'
import SellingPanelVisibility                from './SellingPanelVisibility.model'
import {
    TRANSLATE_ERROR_DATA_NOT_VALID,
    TRANSLATE_ERROR_NOT_EXISTS_IN_SYSTEM
}                                            from '../constants/translate'

@ObjectType()
@Table({
    tableName: 'selling_panel_items',
    underscored: true
})

export default class SellingPanelItems extends Model {

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
        type: DataType.STRING(32),
    })
    label: string

    /** Show image flag and show price flag define for 1 item or for hole panel */

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: SELLING_PANEL_ITEM_PRICE_IMAGE_FLAG.NOT_USE,
        field: 'image_flag',
        comment: '0 - NOT USE / 1 - USE'
    })
    imageFlag: number

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: SELLING_PANEL_ITEM_PRICE_IMAGE_FLAG.NOT_USE,
        field: 'price_flag',
        comment: '0 - NOT USE / 1 - USE'
    })
    priceFlag: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(128),
    })
    color: string

    @Field(type => Int)
    @Column({
        allowNull: false,
        type: DataType.INTEGER,
    })
    position: number

    @Field(type => Int)
    @ForeignKey(() => SellingPanel)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_selling_panel_layout_id'
    })
    sellingPanelId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Item)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_item_id'
    })
    itemId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => SellingPanel)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_child_selling_panel_layout_id'
    })
    childSellingPanelId: number

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

    @Field(type => SellingPanel)
    @BelongsTo(() => SellingPanel, {foreignKey: 'sellingPanelId'})
    parent: SellingPanel

    @Field(type => SellingPanel, {nullable: true})
    @BelongsTo(() => SellingPanel, {foreignKey: 'childSellingPanelId'})
    child: SellingPanel

    @Field(type => Item, {nullable: true})
    @BelongsTo(() => Item)
    item: Item

    static async _validate (instance: SellingPanelItems, options: any = {}, update: boolean) {
        const parentPanelLayout = await SellingPanel.findOne({
            where: {
                id: instance.sellingPanelId
            },
            ...options
        })
        !parentPanelLayout && (!update || parentPanelLayout.id !== instance.sellingPanelId) && throwArgumentValidationError('sellingPanelId', instance, {message: 'Selling panel layout not defined'})

        if (instance.childSellingPanelId) {
            const childPanelLayout = await SellingPanel.findOne({
                where: {
                    id: instance.childSellingPanelId
                },
                ...options
            })
            !childPanelLayout && (!update || childPanelLayout.id !== instance.childSellingPanelId) && throwArgumentValidationError('childSellingPanelId', instance, {message: 'Child selling panel layout not defined'})
        }

        if (instance.itemId) {
            const item = await Item.findOne({
                where: {
                    id: instance.itemId
                },
                ...options
            })
            !item && (!update || item.id !== instance.itemId) && throwArgumentValidationError('itemId', instance, {message: 'Item not defined'})
        }

    }

    /** parts for hooks */
    @BeforeCreate({name: 'beforeCreateHook'})
    static async _beforeCreateHook (instance: SellingPanelItems, options: any) {
        await SellingPanelItems._validate(instance, options, false)
    }

    @BeforeUpdate({name: 'beforeUpdateHook'})
    static async _beforeUpdate (instance: SellingPanelItems, options: any) {
        await SellingPanelItems._validate(instance, options, true)
    }

    public static async insertOne (data: SellingPanelItemType, ctx: IContextApp): Promise<SellingPanel> {
        if (!data.sellingPanelId) {
            throwArgumentValidationError('sellingPanelId', data, {message: TRANSLATE_ERROR_DATA_NOT_VALID})
        }
        const transaction = await SellingPanel.sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}

        try {

            const panel = await SellingPanel.selectById(data.sellingPanelId, ctx, options)

            if (!panel) {
                throwArgumentValidationError('sellingPanelId', data, {message: TRANSLATE_ERROR_NOT_EXISTS_IN_SYSTEM})
            }

            const position = data.position ?
                data.position : panel.items && panel.items.length ? Number(panel.items[panel.items.length - 1].position) + 1 : 1

            const sellingPanelItem = await SellingPanelItems.create({
                ...data,
                position,
            }, options)

            await transaction.commit()
            return SellingPanel.selectOne(sellingPanelItem.sellingPanelId, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    public static async updateOne (id: number, data: SellingPanelItemType, ctx: IContextApp): TModelResponse<SellingPanel> {
        const transaction = await SellingPanel.sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}

        try {
            const panelItem = await SellingPanelItems.findOne({
                where: {
                    id
                },
                ...options
            })
            if (!panelItem) {
                throwArgumentValidationError('id', {}, {message: TRANSLATE_ERROR_NOT_EXISTS_IN_SYSTEM})
            }
            await panelItem.update({
                ...data
            }, options)
            await transaction.commit()
            return SellingPanel.selectOne(panelItem.sellingPanelId, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    public static async moveOne (id: number, position: number, ctx: IContextApp): TModelResponse<SellingPanel> {
        const Op = Sequelize.Op
        const transaction = await SellingPanel.sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}

        try {
            const panelItem = await SellingPanelItems.findOne({
                where: {
                    id
                },
                ...options
            })
            if (!panelItem) {
                throwArgumentValidationError('id', {}, {message: TRANSLATE_ERROR_NOT_EXISTS_IN_SYSTEM})
            }

            if (panelItem.position > position) {
                const beforeItems = await SellingPanelItems.findAll({
                    where: {
                        sellingPanelId: panelItem.sellingPanelId,
                        position: {
                            [Op.lt]: panelItem.position
                        }
                    },
                    ...options
                })

                const beforePromise = beforeItems.map(item => item.update({
                    position: Number(item.position) + 1
                }, options))

                await Promise.all(beforePromise)
            } else {
                const afterItems = await SellingPanelItems.findAll({
                    where: {
                        sellingPanelId: panelItem.sellingPanelId,
                        position: {
                            [Op.gt]: panelItem.position
                        }
                    },
                    ...options
                })

                const afterPromise = afterItems.map(item => item.update({
                    position: Number(item.position) - 1
                }, options))
                await Promise.all(afterPromise)
            }
            await panelItem.update({
                position
            }, options)
            await transaction.commit()
            return SellingPanel.selectOne(panelItem.sellingPanelId, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    public static async deleteOne (id: number, ctx: IContextApp): TModelResponse<SellingPanel> {
        const transaction = await SellingPanel.sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}

        try {
            const panelItem = await SellingPanelItems.findOne({
                where: {
                    id
                },
                ...options
            })
            if (!panelItem) {
                throwArgumentValidationError('id', {}, {message: TRANSLATE_ERROR_NOT_EXISTS_IN_SYSTEM})
            }
            const panel = await SellingPanel.selectById(panelItem.sellingPanelId, ctx, options)
            if (!panel) {
                throwArgumentValidationError('sellingPanelId', {}, {message: TRANSLATE_ERROR_NOT_EXISTS_IN_SYSTEM})
            }

            panel.items.sort((x, y) => _.subtract(x.position, y.position))
            let lastPosition = panelItem.position + 1
            const itemsProms = panel.items.map(item => {
                if (item.position === lastPosition) {
                    lastPosition = item.position + 1
                    return item.update({position: item.position - 1}, options)
                }
            })
            await Promise.all(itemsProms)
            await panelItem.destroy(options)
            await transaction.commit()
            return SellingPanel.selectOne(panelItem.sellingPanelId, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    public static async insertionOne (id: number, data: SellingPanelItemType, ctx: IContextApp): Promise<SellingPanel> {
        if (!data.sellingPanelId) {
            throwArgumentValidationError('sellingPanelId', data, {message: TRANSLATE_ERROR_DATA_NOT_VALID})
        }
        const transaction = await SellingPanel.sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}

        try {

            const currentItem = await SellingPanelItems.findOne({
                where: {
                    id
                },
                ...options
            })

            if (!currentItem) {
                throwArgumentValidationError('id', data, {message: TRANSLATE_ERROR_NOT_EXISTS_IN_SYSTEM})
            }

            const panel = await SellingPanel.selectById(data.sellingPanelId, ctx, options)

            if (!panel) {
                throwArgumentValidationError('sellingPanelId', data, {message: TRANSLATE_ERROR_NOT_EXISTS_IN_SYSTEM})
            }

            const sellingPanelItem = await SellingPanelItems.create({
                ...data,
                position: currentItem.position,
            }, options)
            panel.items.sort((x, y) => _.subtract(x.position, y.position))
            let lastPosition = currentItem.position
            const itemsProms = panel.items.map(item => {
                if (item.position === lastPosition) {
                    lastPosition = item.position + 1
                    return item.update({position: lastPosition}, options)
                }
            })
            await Promise.all(itemsProms)
            await transaction.commit()
            return SellingPanel.selectOne(sellingPanelItem.sellingPanelId, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    public getPanelItems = async () => {
        const panel = await SellingPanel.findOne({
            where: {
                id: this.childSellingPanelId
            },
            include: [
                {
                    model: SellingPanelVisibility,
                    required: false
                }
            ]
        })
        if (!panel) {
            return []
        }

        const items = await SellingPanelItems.findAll({
            where: {
                sellingPanelId: panel.id
            }
        })
        const _items = items.filter(i => i.childSellingPanelId)
        if (!_items || !_items.length) {
            return {
                id: panel.id,
                color: panel.color,
                name: panel.name,
                icon: panel.icon,
                active: panel.active,
            }
        }
        const array = await Promise.all(_items.map((i: any) => i.getPanelItems()))
        const panelItems = await Promise.all(_.flatten(array))
        return {
            id: panel.id,
            color: panel.color,
            name: panel.name,
            icon: panel.icon,
            active: panel.active,
            children: panelItems
        }
    }

}

@Resolver()
export class SellingPanelItemsResolver {

    @UseMiddleware(checkJWT)
    @Mutation(returns => SellingPanel, {name: 'deleteSellingPanelItem'})
    async _deleteSellingPanelItem (@Arg('id', type => Int) id: number,
        @Ctx() ctx: IContextApp) {
        return SellingPanelItems.deleteOne(id, ctx)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => SellingPanel, {name: 'updateSellingPanelItem'})
    async _updateSellingPanelItem (@Arg('id', type => Int) id: number,
        @Arg('data', type => SellingPanelItemType) data: SellingPanelItemType,
        @Ctx() ctx: IContextApp) {
        return SellingPanelItems.updateOne(id, data, ctx)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => SellingPanel, {name: 'insertSellingPanelItem'})
    async _insertSellingPanelItem (@Arg('data', type => SellingPanelItemType) data: SellingPanelItemType,
        @Ctx() ctx: IContextApp) {
        return SellingPanelItems.insertOne(data, ctx)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => SellingPanel, {name: 'moveSellingPanelItem'})
    async _moveSellingPanelItem (@Arg('id', type => Int) id: number,
        @Arg('position', type => Int) position: number,
        @Ctx() ctx: IContextApp) {
        return SellingPanelItems.moveOne(id, position, ctx)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => SellingPanel, {name: 'insertionSellingPanelItem'})
    async _insertionSellingPanelItem (@Arg('id', type => Int) id: number,
        @Arg('data', type => SellingPanelItemType) data: SellingPanelItemType,
        @Ctx() ctx: IContextApp) {
        return SellingPanelItems.insertionOne(id, data, ctx)
    }
}
