import 'reflect-metadata'
import {
    Field,
    ID,
    Int,
    ObjectType
}               from 'type-graphql'
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
}                         from 'sequelize-typescript'
import Category           from './Category.model'
import {
    Item,
    throwArgumentValidationError
}                         from './index'
import {ItemCategoryType} from '../graphql/types/Item'
import {IContextApp}      from '../graphql/resolvers/basic'

@ObjectType()
@Table({
    tableName: 'items_category',
    underscored: true,
})

export default class ItemsCategory extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED,
    })
    id: number

    @Field(type => Int)
    @ForeignKey(() => Item)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_item_id'
    })
    itemId: number

    @Field(type => Int)
    @ForeignKey(() => Category)
    @Column({
        allowNull: false,
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

    @Field(type => Item)
    @BelongsTo(() => Item)
    item: Item

    @Field(type => Category)
    @BelongsTo(() => Category)
    category: Category

    public static async insertUpdate (id: number, data: ItemCategoryType, ctx: IContextApp, options: any) {
        const category = await Category.findOne({
            where: {
                id: data.categoryId,
                clientId: ctx.clientId
            },
            ...options
        })
        if (!category) {
            throwArgumentValidationError('categoryId',data,{message: 'Category not exists'})
        }
        
        const itemCategory = id ? await ItemsCategory.findOne({
            where: {
                id
            },
            ...options
        }) :   await ItemsCategory.create(data,options)
        
        if (!itemCategory) {
            throwArgumentValidationError('id',data,{message: 'Category item not exists'})   
        }
        if (id) {
            await itemCategory.update({
                categoryId: data.categoryId
            },options)
        }
    }

}

