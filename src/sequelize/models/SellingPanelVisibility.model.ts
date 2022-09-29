import 'reflect-metadata'
import {
    Field,
    ID,
    Int,
    ObjectType
}                                     from 'type-graphql'
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
}                                     from 'sequelize-typescript'
import SellingPanel                   from './SellingPanel.model'
import Client                         from './Client.model'
import {IContextApp}                  from '../graphql/resolvers/basic'
import {throwArgumentValidationError} from './index'

@ObjectType()
@Table({
    tableName: 'selling_panel_visibility'
})

export default class SellingPanelVisibility extends Model {
    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field(type => Int)
    @ForeignKey(() => SellingPanel)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_selling_panel_id'
    })
    sellingPanelId: number

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

    @Field(type => Client)
    @BelongsTo(() => Client)
    client: Client

    @Field(type => SellingPanel)
    @BelongsTo(() => SellingPanel)
    panel: SellingPanel

    public static async insertSellingPanel (panelId: number, ctx: IContextApp, options: any) {
        const sellingPanel = await SellingPanel.selectById(panelId,ctx,options)
        if (!sellingPanel) {
            throwArgumentValidationError('panelId',{}, {message: 'Not exists'})
        }

        const sellingPanelVisible = await SellingPanelVisibility.findOne({
            where: {
                sellingPanelId: panelId,
                clientId: ctx.clientId
            },
            ...options
        })
        if (sellingPanelVisible) {
            await sellingPanelVisible.destroy(options)
        } else {
            await SellingPanelVisibility.create({
                sellingPanelId: panelId,
                clientId: ctx.clientId
            },options)
        }
    }

}
