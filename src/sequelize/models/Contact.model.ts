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
}                       from 'type-graphql'
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
}                               from 'sequelize-typescript'
import * as validations         from './validations'
import {modelSTATUS}            from './validations'
import Customer                 from './Customer.model'
import Client                   from './Client.model'
import {
    IContextApp,
    TModelResponse
}                               from '../graphql/resolvers/basic'
import {ContactType}            from '../graphql/types/Contact'
import {checkJWT}               from '../graphql/middlewares'
import {CONSTANT_CONTACT_TYPES} from '../constants'

@ObjectType()
@Table({
    tableName: 'contact'
})

export default class Contact extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field(type => String)
    @Column({
        allowNull: false,
        defaultValue: 0,
        comment: 'flag defines the type of the contact',
        type: DataType.TINYINT,
        validate: {
            isValid: (value) => validations.checkValidationByEnum.bind(null, CONSTANT_CONTACT_TYPES, 'Flag is not valid')(value)
        }
    })
    type: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.STRING(100)
    })
    value: string

    @Field()
    @Column({
        allowNull: true,
        type: DataType.STRING(256),
        defaultValue: ''
    })
    description: string

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: modelSTATUS.ACTIVE,
        validate: {
            isValid: (value) => validations.isStatusValid.bind(null, 'Contact')(value)
        }
    })
    status: number

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

    /** functions */

    public static async updateOne (id: number, data: ContactType, ctx: IContextApp): TModelResponse<Contact> {
        let contact: Contact = await Contact.findOne({
            where: {
                id: id
            }
        })
        if (!contact) {
            throw Error('Contact not found')
        }
        if (contact.customerId) {
            const customer = await Customer.findOne({
                where: {
                    id: contact.customerId,
                    clientId: ctx.clientId
                }
            })
            if (!customer) {
                throw Error('Customer not found')
            }
        }
        contact = await contact.update(data)
        return Contact.findByPk(contact.id)
    }
}

@Resolver()
export class ContactResolver {

    @UseMiddleware(checkJWT)
    @Mutation(returns => Contact, {name: 'updateContact'})
    updateOne (@Arg('id', type => Int)id: number,
        @Arg('data') data: ContactType,
        @Ctx() ctx: IContextApp) {
        return Contact.updateOne(id, data, ctx)
    }

}
