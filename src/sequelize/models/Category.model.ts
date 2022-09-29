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
}                              from 'type-graphql'
import {
    AutoIncrement,
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
}                              from 'sequelize-typescript'
import Client                  from './Client.model'
import {INDEX_RELATIONS_TYPE}  from '../constants'
import {omit as _omit}         from 'lodash'
import {
    setUserFilterToWhereSearch,
    throwArgumentValidationError
}                              from './index'
import {
    createBaseResolver,
    IContextApp,
    TModelResponse,
    TModelResponseSelectAll
}                              from '../graphql/resolvers/basic'
import CategoryRelationship    from './CategoryRelationship.model'
import {CategoryType}          from '../graphql/types/Category'
import ItemsCategory           from './ItemsCategory.model'
import {checkJWT}              from '../graphql/middlewares'
import {
    deleteFileFromDrive,
    uploadFileGoogleDrive
} from '../../google-api/GoogleAPI'
import config                  from '../../../config'

const SLUG_FOR_ROOT = 'default-slug-root'
const NAME_FOR_ROOT = 'default-category-root'

@ObjectType()
@Table({
    tableName: 'category'
})

export default class Category extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED,
    })
    id: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(256),
        field: 'avatar_url'
    })
    avatarUrl: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(128),
        field: 'avatar_id'
    })
    avatarId: string

    @Field()
    @Column({
        allowNull: false,
        type: DataType.STRING(128),
    })
    name: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(256)
    })
    description: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(256)
    })
    slug: string

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Category)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_parent_id'
    })
    parentId: number

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

    @Field(type => Client, {nullable: true})
    @BelongsTo(() => Client)
    client: Client

    @Field(type => Category, {nullable: true})
    @BelongsTo(() => Category)
    parent: Category

    @Field(type => [CategoryRelationship], {nullable: true})
    @HasMany(() => CategoryRelationship)
    children: CategoryRelationship[]

    @Field(type => [ItemsCategory], {nullable: true})
    @HasMany(() => ItemsCategory)
    itemsCategories: ItemsCategory[]

    public static selectOne (id: number, ctx: IContextApp): TModelResponse<Category> {
        return Category.findOne({
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
                    model: CategoryRelationship,
                    required: false,
                    where: {
                        type: INDEX_RELATIONS_TYPE.CATEGORY
                    }
                }
            ]
        })
    }

    private isRoot () {
        return this.slug === SLUG_FOR_ROOT
    }

    public static async deleteOne (id: number, ctx: IContextApp): TModelResponse<Category> {
        const transaction = await Category.sequelize.transaction()
        const options = {transaction}

        try {

            const instance = await Category.findOne({
                where: {
                    id,
                    clientId: ctx.clientId
                }, ...options
            })

            if (!instance || instance.isRoot()) {
                throwArgumentValidationError('id', {}, {message: 'Category not exists'})
            }

            const parent = await Category.findOne({
                where: {
                    id: instance.parentId,
                }, ...options
            })
            /** if is root then category must be clear , without any article  **/
            if (parent.isRoot()) {
                const articles = await ItemsCategory.findOne({
                    where: {
                        categoryId: instance.id
                    }, ...options
                })

                if (articles) {
                    throwArgumentValidationError('id', {}, {message: 'must be without articles'})
                }
            }

            const children = await Category.findAll({
                where: {
                    parentId: instance.id
                }, ...options
            })

            const promises = children.map(c => c.updateParent(instance.parentId, ctx.clientId, options))
            await Promise.all(promises)

            await ItemsCategory.update({categoryId: instance.parentId}, {
                where: {
                    categoryId: instance.id,
                }, ...options
            })

            await instance.destroy(options)
            await transaction.commit()

            return Category.selectOne(parent.id, ctx)
        } catch (e) {
            transaction.rollback()
            throw e
        }
    }

    private async updateParent (parentId: number, clientId: number, options = {}) {

        const newParent = await Category.findOne({
            where: {
                id: parentId,
                clientId
            }, ...options
        })

        if (!newParent) {
            throwArgumentValidationError('id', {}, {message: 'Category not exists'})
        }

        const children = await CategoryRelationship.findAll({
            where: {
                parent: this.id,
                type: INDEX_RELATIONS_TYPE.CATEGORY
            }, ...options
        })

        const childrenIds = children.map(x => x.child)

        const index = childrenIds.findIndex(p => p === parentId)
        if (index !== -1) {
            throwArgumentValidationError('id', {}, {message: 'Category not exists'})
        }

        const oldParents = await CategoryRelationship.findAll({
            where: {
                child: this.id,
                type: INDEX_RELATIONS_TYPE.CATEGORY
            },
            ...options
        })

        const oldParentsId = oldParents.map(x => x.parent)

        const promises3 = oldParentsId.map(id => {
            return CategoryRelationship.destroy({
                where: {
                    parent: id,
                    child: [...childrenIds, this.id],
                    type: INDEX_RELATIONS_TYPE.CATEGORY
                }, ...options
            })
        })

        await Promise.all(promises3)

        await this.update({
            parentId,
        }, options)

        /** here we remove old and index is changed */

        await CategoryRelationship.create({
            parent: parentId,
            child: this.id,
            type: INDEX_RELATIONS_TYPE.CATEGORY,
            level: 1,
        }, options)

        const promises = children.map(c => {
            return CategoryRelationship.create({
                parent: parentId,
                child: c.child,
                type: INDEX_RELATIONS_TYPE.CATEGORY,
                level: c.level + 1,
            }, options)
        })

        await Promise.all(promises)

        const newParentChildren = await CategoryRelationship.findAll({
            where: {
                parent: parentId,
                child: [...childrenIds, this.id],
                type: INDEX_RELATIONS_TYPE.CATEGORY,
            }, ...options
        })

        const newParents = await CategoryRelationship.findAll({
            where: {
                child: parentId,
                type: INDEX_RELATIONS_TYPE.CATEGORY
            },
            ...options
        })

        const promises2 = newParents.map(newParent => {
            const pr = newParentChildren.map(c => {
                return CategoryRelationship.create({
                    parent: newParent.parent,
                    child: c.child,
                    type: INDEX_RELATIONS_TYPE.CATEGORY,
                    level: c.level + newParent.level
                }, options)
            })
            return Promise.all(pr)
        })

        await Promise.all(promises2)

    }

    public static async updateOne (id: number, data: CategoryType, ctx: IContextApp): TModelResponse<Category> {
        const transaction = await Category.sequelize.transaction()
        const options = {transaction}

        try {

            let instance = await Category.findOne({
                where: {
                    id: id,
                    clientId: ctx.clientId
                },
                ...options
            })

            if (!instance) {
                throwArgumentValidationError('id', data, {message: 'Category not exists'})
            }

            if (data.parentId) {
                await instance.updateParent(data.parentId, ctx.clientId, options)
                instance = await Category.findOne({
                    where: {
                        id: id,
                        clientId: ctx.clientId
                    },
                    ...options
                })
            }

            let avatarData = void(0)
            if (data.avatar) {
                
                if (instance.avatarId) {
                    await deleteFileFromDrive(instance.avatarId)
                }
                const {googleDriveViewUrlPath,GOOGLE} = config
                const fileData =  await uploadFileGoogleDrive(data.avatar,GOOGLE.googleDriveFolderCategoryId)
                avatarData = {
                    avatarUrl: `${googleDriveViewUrlPath}${fileData.id}`,
                    avatarId : fileData.id
                }
            }
            const _data = {
                ..._omit(data, ['parentId']),
                ...avatarData
            }
            await instance.update(_data, options)
            await transaction.commit()
            return Category.selectOne(id, ctx)

        } catch (e) {
            transaction.rollback()
            throw e
        }
    }

    public static async insertOne (data: CategoryType, ctx: IContextApp): Promise<Category> {

        const transaction = await Category.sequelize.transaction()
        const options = {transaction}

        try {

            if (data?.parentId) {
                const parent = await Category.findOne({
                    where: {
                        id: data.parentId,
                        clientId: ctx.clientId
                    },
                    ...options
                })
                if (!parent) {
                    throwArgumentValidationError('parentId', data, {message: 'Category not exists'})
                }

            } else {

                let parent = await Category.findOne({
                    where: {
                        slug: SLUG_FOR_ROOT,
                        clientId: ctx.clientId
                    },
                    ...options
                })
                if (!parent) {
                    parent = await Category.create({
                        name: NAME_FOR_ROOT,
                        slug: SLUG_FOR_ROOT,
                        clientId: ctx.clientId
                    }, options)
                }

                data.parentId = parent.id

            }
            let avatarData = void(0)
            if (data.avatar) {
                const {googleDriveViewUrlPath,GOOGLE} = config
                const fileData =  await uploadFileGoogleDrive(data.avatar,GOOGLE.googleDriveFolderCategoryId)
                avatarData = {
                    avatarUrl: `${googleDriveViewUrlPath}${fileData.id}`,
                    avatarId : fileData.id
                }
            }

            const instance = await Category.create({
                ..._omit(data,['avatar']),
                clientId: ctx.clientId,
                ...avatarData
            }, options)

            if (!instance.parentId) {
                await transaction.commit()
                return Category.selectOne(instance.id, ctx)
            }

            await CategoryRelationship.create({
                parent: instance.parentId,
                child: instance.id,
                type: INDEX_RELATIONS_TYPE.CATEGORY,
                level: 1
            }, options)

            const parents = await CategoryRelationship.findAll({
                where: {
                    child: instance.parentId,
                    type: INDEX_RELATIONS_TYPE.CATEGORY
                },
                ...options
            })

            const promises = parents.map(p => {
                return CategoryRelationship.create({
                    parent: p.parent,
                    child: instance.id,
                    type: INDEX_RELATIONS_TYPE.CATEGORY,
                    level: p.level + 1
                }, options)
            })

            await Promise.all(promises)
            await transaction.commit()
            return Category.selectOne(instance.id, ctx)
        } catch (e) {
            transaction.rollback()
            throw e
        }
    }

    public static async selectAll (options: any, ctx: IContextApp): TModelResponseSelectAll<Category> {
        options = setUserFilterToWhereSearch(options, ctx)
        return Category.findAndCountAll(options)
    }

    public findChildren = async () => {
        const arrayChildren = await Category.findAll({
            where: {
                parentId: this.id
            }
        })
        if (arrayChildren.length === 0) {
            return this
        }
        const instance = this as Category
        const arr = await Promise.all(arrayChildren.map(c => c.findChildren()))
        return {
            ...instance,
            children: arr
        } as Category
    }

    public static async getRoot (ctx: IContextApp): TModelResponse<Category> {
        const transaction = await Category.sequelize.transaction()
        const options = {transaction}

        try {
            let parent = await Category.findOne({
                where: {
                    slug: SLUG_FOR_ROOT,
                    clientId: ctx.clientId
                },
                ...options
            })
            if (!parent) {
                parent = await Category.create({
                    name: NAME_FOR_ROOT,
                    slug: SLUG_FOR_ROOT,
                    clientId: ctx.clientId
                }, options)
            }
            await transaction.commit()
            return parent

        } catch (e) {
            await transaction.rollback()
            throw (e)
        }
    }

    public static async getAllCategories (ctx: IContextApp): Promise<Category[]> {

        const rootInstance = await Category.getRoot(ctx)
        const children = await CategoryRelationship.findAll({
            where: {
                parent: rootInstance.id
            },
            order: [['level', 'ASC']]
        })

        const childrenIds = children.map(c => c.child)
        const _categories = await Category.findAll({
            where: {
                id: childrenIds
            },
        })

        return [rootInstance, ..._categories]
        /** this code is for fronted **/
        /*
                const categories = [rootInstance,..._categories].map(p => p.toJSON() as Category)

                categories.forEach(cat => {
                    const cParent = categories.find(x => x.id === cat.parentId)
                    if (!cParent) {
                        return
                    }
                    if (!cParent.children) {
                        cParent.children = []
                    }

                    cParent.children.push(cat)
                })

                return rootInstance;
        */

    }
}

const BaseResolver = createBaseResolver(Category, {
    updateInputType: CategoryType,
    insertInputType: CategoryType
})

@Resolver()
export class CategoryResolver extends BaseResolver {

    @UseMiddleware(checkJWT)
    @Query(returns => [Category], {nullable: true, name: 'getAllCategories'})
    async _getAllCategories (@Ctx() ctx: IContextApp) {
        return Category.getAllCategories(ctx)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => Category, { name: 'deleteCategory' })
    async _deleteCategory (@Arg('id', type => Int) id: number,
        @Ctx() ctx: IContextApp) {
        return Category.deleteOne(id, ctx)
    }
    
}

