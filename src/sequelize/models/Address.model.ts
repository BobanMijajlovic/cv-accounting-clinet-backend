import 'reflect-metadata'
import {
    AutoIncrement,
    BeforeCreate,
    BeforeUpdate,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}                                     from 'sequelize-typescript'
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
} from 'type-graphql'

import * as validations         from './validations'
import {checkJWT}                     from '../graphql/middlewares'
import Customer                       from './Customer.model'
import {MinLength}                    from 'class-validator'
import {
    IContextApp,
    TModelResponse
}                                     from '../graphql/resolvers/basic'
import Client                         from './Client.model'
import Warehouse                      from './Warehouse.model'
import {CONSTANT_ADDRESS_TYPES}       from '../constants'
import {AddressType}                  from '../graphql/types/Address'
import {throwArgumentValidationError} from './index'

@ObjectType()
@Table({
    tableName: 'address'
})

export default class Address extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @MinLength(3)
    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(100)
    })
    street: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(12),
        field: 'zip_code'
    })
    zipCode: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(100)
    })
    city: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(100)
    })
    state: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        comment: 'some description of address like `this is warehouse down the street`, data is entered by user',
        type: DataType.STRING(256),
        defaultValue: ''
    })
    description: string

    @Field(type => String)
    @Column({
        allowNull: true,
        defaultValue: 0,
        comment: 'flag defines the type of the address ',
        type: DataType.TINYINT,
        validate: {
            isValid: (value) => validations.checkValidationByEnum(CONSTANT_ADDRESS_TYPES, 'Flag is not valid', value)
        }
    })
    type: number

    @Field(type => Int)
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: validations.modelSTATUS.ACTIVE,
        validate: {
            isValid: (value) => validations.isStatusValid('Address', value)
        }
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

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Customer)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_customer_id'
    })
    customerId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Client)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_client_id'
    })
    clientId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Warehouse)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_warehouse_id'
    })
    warehouseId: number

    static async _validateCustomer (instance: Address, options: any = {}, update: boolean) {
        if (instance.zipCode && instance.zipCode.length > 0) {
            !(/^[1-9]\d{3,8}$/g.exec(`${instance.zipCode}`)) && throwArgumentValidationError('zipCode', instance, {message: 'Zip code is not valid'})
        }
    }

    /** parts for hooks */
    @BeforeCreate({name: 'beforeCreateHook'})
    static async _beforeCreateHook (instance: Address, options: any) {
        await Address._validateCustomer(instance, options, false)
    }

    @BeforeUpdate({name: 'beforeUpdateHook'})
    static async _beforeUpdate (instance: Address, options: any) {
        await Address._validateCustomer(instance, options, true)
    }

    public static selectOne (id: number, _ctx?: IContextApp): TModelResponse<Address> {
        return Address.findOne({
            where: {
                id
            }
        })
    }

    public static async updateOne (id: number, data: AddressType, ctx: IContextApp): TModelResponse<Address> {
        const r: Address = await Address.findOne({
            where: {
                id: id
            }
        })
        if (!r) {
            throw Error('Address not found')
        }

        if (r.customerId) {
            const customer = Customer.findOne({
                where: {
                    id: r.customerId,
                    clientId: ctx.clientId
                }
            })

            if (!customer) {
                throw Error('Address not found')
            }
        }

        await r.update(data)
        return Address.findByPk(id)
    }
}

@Resolver()
export class AddressResolver {

    @UseMiddleware(checkJWT)
    @Query(returns => Address, {nullable: true, name: 'address',})
    getOne (@Arg('id', type => Int)id: number,
        @Ctx() ctx: IContextApp) {
        return Address.selectOne(id, ctx)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => Address, {name: 'updateAddress'})
    updateOne (@Arg('id', type => Int)id: number,
        @Arg('data') data: AddressType,
        @Ctx() ctx: IContextApp) {
        return Address.updateOne(id, data, ctx)
    }
}

