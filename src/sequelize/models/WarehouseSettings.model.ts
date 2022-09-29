import 'reflect-metadata'
import {
    Field,
    ID,
    Int,
    ObjectType
}                                     from 'type-graphql'
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
} from 'sequelize-typescript'
import Warehouse                      from './Warehouse.model'
import {modelSTATUS}                  from './validations'
import Client                         from './Client.model'
import {throwArgumentValidationError} from './index'
import Item                           from './Item.model'

@ObjectType()
@Table({
    tableName: 'warehouse_settings'
})

export default class WarehouseSettings extends Model {
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
        type: DataType.STRING(255)
    })
    name: string

    @Field()
    @Column({
        allowNull: false,
        type: DataType.STRING(255)
    })
    value: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(500)
    })
    description: string

    @Field(type => Int,{nullable:true})
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: modelSTATUS.ACTIVE
    })
    status: number

    @Field(type => Int)
    @ForeignKey(() => Warehouse)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_warehouse_id'
    })
    warehouseId: number

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

    @Field(type => Warehouse,{nullable: true})
    @BelongsTo(() => Warehouse)
    warehouse: Warehouse

    static async _validateWarehouseSettings (instance: WarehouseSettings,options: any,update: boolean) {
        const warehouse = await Warehouse.findOne({
            where: {
                id: instance.warehouseId,
                clientId: instance.clientId
            },
            ...options
        })
        if (!warehouse && (!update || instance.warehouseId !== warehouse.id)) {
            throwArgumentValidationError('warehouseId', {}, {message: 'Warehouse not exists'})
        }

    }

    /** hooks */

    @BeforeCreate({name:'beforeCreateHook'})
    static async _beforeCreateHook (instance: WarehouseSettings,options: any) {
        await WarehouseSettings._validateWarehouseSettings(instance,options,false)
    }

    @BeforeUpdate({name:'beforeUpdateHook'})
    static async _beforeUpdateHook (instance: WarehouseSettings,options: any) {
        await WarehouseSettings._validateWarehouseSettings(instance,options,true)
    }

}
