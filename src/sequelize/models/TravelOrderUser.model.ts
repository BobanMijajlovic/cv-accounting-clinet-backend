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
import TravelOrder                    from './TravelOrder.model'
import {modelSTATUS}                  from './validations'
import {throwArgumentValidationError} from './index'


@ObjectType()
@Table({
    tableName: 'travel_order_user'
})

export default class TravelOrderUser extends Model {
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
        type: DataType.DECIMAL(10,2)
    })
    wage: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(10,2),
        field: 'total_finance_for_user'
    })
    totalFinanceForUser: number

    @Field(type => Int)
    @ForeignKey(() => TravelOrder)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_travel_order_id'
    })
    travelOrderId: number

    @Field(type => Int)
  // @ForeignKey(() => User)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_user_id'
    })
    userId: number

    @Field(type => Int,{nullable:true})
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: modelSTATUS.ACTIVE
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

    @Field(type => TravelOrder, {nullable:true})
    @BelongsTo(() => TravelOrder)
    travelOrder: TravelOrder

  /*  @Field(type => User, {nullable:true})
    @BelongsTo(() => User)
    user: User*/

    static async _validate (instance: TravelOrderUser, options: any, update: boolean) {
        const travelOrder = await TravelOrder.findOne({
            where: {
                id: instance.travelOrderId
            }
        })
        !travelOrder && (!update || travelOrder.id !== instance.travelOrderId) && throwArgumentValidationError('travelOrderId', instance, {message: 'Travel order not exists'})

        /* const user = await User.findOne({
            where: {
                id: instance.userId
            }
        })
        !user && (!update || user.id !== instance.userId) && throwArgumentValidationError('userId', instance, {message: 'User not exists'})
*/

    }

    @BeforeCreate({name: 'beforeCreateHook'})
    static async _beforeCreateHook (instance: TravelOrderUser, options: any) {
        await TravelOrderUser._validate(instance,options,false)
    }

    @BeforeUpdate({name: 'beforeUpdateHook'})
    static async _beforeUpdateHook (instance: TravelOrderUser, options: any) {
        await TravelOrderUser._validate(instance,options,true)
    }
}
