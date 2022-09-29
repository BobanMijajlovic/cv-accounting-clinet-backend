import 'reflect-metadata'
import {
    Field,
    ID,
    Int,
    ObjectType
}               from 'type-graphql'
import {
    AutoIncrement,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}               from 'sequelize-typescript'
import Category from './Category.model'

@ObjectType()
@Table({
    tableName: 'category_relationship',
    underscored: true,
    indexes: [
        {
            unique: true,
            name: 'category_relationship_index',
            fields: ['parent', 'child'],
        },
    ]
})

export default class CategoryRelationship extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED,
    })
    id: number

    @Field(type => Int)
    @ForeignKey(() => Category)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED
    })
    parent: number

    @Field(type => Int)
    @ForeignKey(() => Category)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED
    })
    child: number

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: 0
    })
    type: number

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.INTEGER,
        defaultValue: 0
    })
    level: number

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

}

