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
}                         from 'type-graphql'
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
import Client             from './Client.model'
import * as  validations  from './validations'
import Customer           from './Customer.model'
import {CustomerInfoType} from '../graphql/types/Customer'
import {
    IContextApp,
    TModelResponse
}                         from '../graphql/resolvers/basic'
import {checkJWT}         from '../graphql/middlewares'
import * as GraphQLJSON   from 'graphql-type-json'
import {CONSTANT_MODEL}   from '../constants'

@ObjectType()
@Table({
    tableName: 'customer_info'
})

export default class CustomerInfo extends Model {

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
        type: DataType.STRING(64)
    })
    key: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(256),
        defaultValue: ''
    })
    value: string

    @Field(type => GraphQLJSON.default, {nullable: true})
    @Column({
        allowNull: true,
        field: 'value_json',
        comment: 'For complex settings',
        type: DataType.JSON
    })
    valueJSON: object

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.STATUS.ACTIVE,
        validate: {
            isValid: (value) => validations.isStatusValid.bind(null, 'CustomerInfo')(value)
        }
    })
    status: number

    @Field(type => Int)
    @ForeignKey(() => Customer)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_customer_id'
    })
    customerId: number

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

    @Field(type => Customer)
    @BelongsTo(() => Customer)
    customer: Customer

    @Field(type => Client)
    @BelongsTo(() => Client)
    client: Client

    public static async updateOne (id: number, data: CustomerInfoType, ctx: IContextApp): TModelResponse<CustomerInfo> {
        const customerInfo = await CustomerInfo.findOne({
            where: {
                id,
                clientId: ctx.clientId
            }
        })
        if (!customerInfo) {
            throw ('Customer info not exists')
        }
        if (customerInfo.customerId) {
            const customer = await Customer.findOne({
                where: {
                    id: customerInfo.customerId,
                    clientId: ctx.clientId
                }
            })
            if (!customer) {
                throw ('Customer not exists')
            }
        }
        await customerInfo.update(data)
        return CustomerInfo.findByPk(id)
    }
}

@Resolver()
export class CustomerInfoResolver {

   /* @UseMiddleware(checkJWT)
    @Mutation(returns => CustomerInfo, {name: 'updateCustomerInfo'})
    updateOne (@Arg('id', type => Int)id: number,
        @Arg('data') data: CustomerInfoType,
        @Ctx() ctx: IContextApp) {
        return CustomerInfo.updateOne(id, data, ctx)
    }*/
}
