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
}                                             from 'type-graphql'
import {
    AutoIncrement,
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    HasMany,
    HasOne,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}                                             from 'sequelize-typescript'
import Client                                 from './Client.model'
import {
    Item,
    setUserFilterToWhereSearch,
    throwArgumentValidationError
}                                             from './index'
import {
    createBaseResolver,
    IContextApp,
    TModelResponse,
    TModelResponseSelectAll
}                                             from '../graphql/resolvers/basic'
import Category                               from './Category.model'
import {
    GetSellingPanels,
    SellingPanelType
}                                             from '../graphql/types/SellingPanel'
import {SELLING_PANEL_TYPE}                   from '../constants'
import SellingPanelItems                      from './SellingPanelItems.model'
import {checkJWT}                             from '../graphql/middlewares'
import ItemsImages                            from './ItemsImages.model'
import SellingPanelVisibility                 from './SellingPanelVisibility.model'
import {TRANSLATE_ERROR_NOT_EXISTS_IN_SYSTEM} from '../constants/translate'

@ObjectType()
@Table({
    tableName: 'selling_panel'
})

export default class SellingPanel extends Model {

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
        type: DataType.STRING(128),
    })
    name: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(128),
    })
    icon: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(128),
    })
    color: string

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: SELLING_PANEL_TYPE.PANEL,
        comment: '0 - PANEL / 1 - FOLDER'
    })
    type: number

    @Field(type => Int)
    @ForeignKey(() => Client)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_client_id'
    })
    clientId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Category)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_category_id'
    })
    categoryId: number

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

    @Field(type => Client, {nullable: true})
    @BelongsTo(() => Client)
    client: Client

    @Field(type => Category, {nullable: true})
    @BelongsTo(() => Category)
    category: Category

    @Field(type => [SellingPanelItems], {nullable: true})
    @HasMany(() => SellingPanelItems, {onDelete: 'CASCADE'})
    items: SellingPanelItems[]

    @Field(type => SellingPanelVisibility, {nullable: true})
    @HasOne(() => SellingPanelVisibility)
    active: SellingPanelVisibility

    public static selectById (id: number, ctx: IContextApp, options: any = {}): TModelResponse<SellingPanel> {
        return SellingPanel.findOne({
            where: {
                id: id,
                clientId: ctx.clientId
            },
            include: [
                {
                    model: Category,
                    required: false
                },
                {
                    model: SellingPanelVisibility,
                    required: false
                },
                {
                    model: SellingPanelItems,
                    required: false,
                    include: [
                        {
                            model: Item,
                            required: false,
                            include: [
                                {
                                    model: ItemsImages,
                                    required: false
                                }
                            ]
                        },
                        {
                            model: SellingPanel,
                            required: false,
                            as: 'child'
                        }
                    ]
                }
            ],
            ...options
        })
    }

    public static selectOne (id: number, ctx: IContextApp): TModelResponse<SellingPanel> {
        return SellingPanel.selectById(id, ctx)
    }

    public static async selectAll (options: any, ctx: IContextApp): TModelResponseSelectAll<SellingPanel> {
        options = setUserFilterToWhereSearch(options, ctx)
        return SellingPanel.findAndCountAll(options)
    }

    public static async insertOne (data: SellingPanelType, ctx: IContextApp): TModelResponse<SellingPanel> {
        const transaction = await SellingPanel.sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}

        try {

            const panel = await SellingPanel.create({
                ...data,
                clientId: ctx.clientId
            }, options)
            await transaction.commit()
            return SellingPanel.selectOne(panel.id, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    public static async updateOne (id: number, data: SellingPanelType, ctx: IContextApp): TModelResponse<SellingPanel> {
        const transaction = await SellingPanel.sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}

        try {
            const panel = await SellingPanel.findOne({
                where: {
                    id,
                    clientId: ctx.clientId
                },
                ...options
            })

            if (!panel) {
                throwArgumentValidationError('id', {}, {message: TRANSLATE_ERROR_NOT_EXISTS_IN_SYSTEM})
            }
            await panel.update(data, options)

            await transaction.commit()
            return SellingPanel.selectOne(panel.id, ctx)
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
            const panel = await SellingPanel.findOne({
                where: {
                    id,
                    clientId: ctx.clientId
                },
                ...options
            })
            if (!panel) {
                throwArgumentValidationError('id', {}, {message: TRANSLATE_ERROR_NOT_EXISTS_IN_SYSTEM})
            }
            await SellingPanelItems.destroy({
                where: {
                    sellingPanelId: panel.id
                },
                ...options
            })
            await SellingPanelItems.destroy({
                where: {
                    childSellingPanelId: panel.id
                },
                ...options
            })
            await panel.destroy(options)
            await transaction.commit()
            return SellingPanel.selectOne(id, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    public static async setUnsetActivePanel (panelId: number, ctx: IContextApp): TModelResponse<SellingPanel> {
        const transaction = await SellingPanel.sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}

        try {
            const panel = await SellingPanel.findOne({
                where: {
                    id: panelId,
                    clientId: ctx.clientId
                },
                ...options
            })

            if (!panel) {
                throwArgumentValidationError('id', {}, {message: TRANSLATE_ERROR_NOT_EXISTS_IN_SYSTEM})
            }

            await SellingPanelVisibility.insertSellingPanel(Number(panel.id), ctx, options)

            await transaction.commit()
            return SellingPanel.selectOne(panelId, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    public static async getPanels (ctx: IContextApp) {
        const _panels = await SellingPanel.findAll({
            where: {
                clientId: ctx.clientId
            },
            include: [
                {
                    model: SellingPanelItems,
                    required: false
                },
                {
                    model: SellingPanelVisibility,
                    required: false
                }
            ]
        })

        const array = await _panels.map(async (p) => {
            if (p.items.length === 0) {
                return {
                    id: p.id,
                    color: p.color,
                    name: p.name,
                    icon: p.icon,
                    active: p.active
                }
            }
            const items = p.items.filter(i => i.childSellingPanelId)
            const panelItems = await Promise.all(items.map(item => item.getPanelItems()))
            return {
                id: p.id,
                color: p.color,
                name: p.name,
                icon: p.icon,
                active: p.active,
                children: panelItems
            }
        })
        const panels = await Promise.all(array)
        return panels
    }

    public static async getListOfActivePanels (ctx: IContextApp): Promise<SellingPanel[]> {
        const sellingPanelVisible = await SellingPanelVisibility.findAll({
            where: {
                clientId: ctx.clientId
            },
            include: [
                {
                    model: SellingPanel
                }
            ]
        })

        const panelsIds = sellingPanelVisible.map(x => x.sellingPanelId)

        return SellingPanel.findAll({
            where: {
                id: panelsIds
            }
        })
    }

}

const BaseResolver = createBaseResolver(SellingPanel, {
    updateInputType: SellingPanelType,
    insertInputType: SellingPanelType
})

@Resolver()
export class SellingPanelResolver extends BaseResolver {

    @UseMiddleware(checkJWT)
    @Mutation(returns => SellingPanel || null, {name: 'deleteSellingPanel', nullable: true})
    async _deleteSellingPanel (@Arg('id', type => Int) id: number,
        @Ctx() ctx: IContextApp) {
        return SellingPanel.deleteOne(id, ctx)
    }

    @UseMiddleware(checkJWT)
    @Query(returns => [GetSellingPanels], {name: 'getPanels', nullable: true})
    async _getPanels (@Ctx() ctx: IContextApp) {
        return SellingPanel.getPanels(ctx)
    }

    @UseMiddleware(checkJWT)
    @Query(returns => [SellingPanel], {name: 'getListOfActivePanels'})
    async _getListOfActivePanels (@Ctx() ctx: IContextApp) {
        return SellingPanel.getListOfActivePanels(ctx)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => SellingPanel, {name: 'setUnsetActivePanel', nullable: true})
    async _setUnsetActivePanel (@Arg('panelId', type => Int) panelId: number,
        @Ctx() ctx: IContextApp) {
        return SellingPanel.setUnsetActivePanel(panelId, ctx)
    }

}
