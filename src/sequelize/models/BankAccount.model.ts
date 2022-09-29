import 'reflect-metadata'
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
} from 'sequelize-typescript'
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

import * as validations  from './validations'
import {modelSTATUS}     from './validations'
import Customer          from './Customer.model'
import {
    IContextApp,
    TModelResponse,
    TModelResponseArray
}                        from '../graphql/resolvers/basic'
import {BankAccountType} from '../graphql/types/BankAccount'
import {checkJWT}        from '../graphql/middlewares'
import Sequelize         from 'sequelize'
import Bank              from './Bank.model'
import Client            from './Client.model'

@ObjectType()
@Table({
    tableName: 'bank_account'
})

export default class BankAccount extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field({nullable: true})
    @Column({
        allowNull: false,
        type: DataType.STRING(32)
    })
    account: string

    @Field({nullable: true})
    @Column({
        allowNull: false,
        type: DataType.STRING(32)
    })
    accountString: string

    @Field(type => Int)
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: modelSTATUS.ACTIVE,
        validate: {
            isValid: (value) => validations.isStatusValid.bind(null, 'BankAccount')(value)
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

    @Field(type => Int)
    @ForeignKey(() => Bank)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_bank_id'
    })
    bankId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Customer)
    @Column({
        allowNull: true,
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

    @Field(type => Client)
    @BelongsTo(() => Client)
    client: Client

    @Field(type => Customer, {nullable: true})
    @BelongsTo(() => Customer, {onDelete: 'CASCADE'})
    customer: Customer

    @Field(type => Bank, {nullable:true})
    @BelongsTo(() => Bank)
    bank: Bank

    public static selectOne (id: number, _ctx?: IContextApp): TModelResponse<BankAccount> {
        return BankAccount.findOne({
            where: {
                id
            },
            include: [
                {
                    model: Bank,
                    required: true
                }
            ]
        })
    }

    public static async selectByFilter (value: string, ctx: IContextApp): TModelResponseArray<BankAccount> {
        const Op = Sequelize.Op
        const data = await BankAccount.findAll({
            where: {
                clientId: ctx.clientId,
                accountString: {
                    [Op.like]: `%${value}%`
                }
            },
            include: [
                {
                    model: Customer,
                    required: true
                },
                {
                    model: Bank,
                    required: true
                }
            ],
            limit: 25
        })

        if (data.length >= 25) {
            return data.slice(0, 25)
        }

        const data2 = await BankAccount.findAll({
            where: {
                clientId: ctx.clientId
            },
            include: [
                {
                    model: Customer,
                    required: true,
                    where: {
                        shortName: {
                            [Op.like]: `%${value}%`
                        }
                    }
                },
                {
                    model: Bank,
                    required: true
                }
            ],
            limit: 25
        })

        return data2.reduce((acc, x) => {
            if (acc.find(y => y.id === x.id)) {
                return acc
            }
            return [...acc, x]
        }, data)

    }

    public static async updateOne (id: number, data: BankAccountType, ctx: IContextApp): TModelResponse<BankAccount> {
        const r: BankAccount = await BankAccount.findOne({
            where: {
                id: id
            }
        })
        if (!r) {
            throw Error('Bank account not found')
        }
        if (r.customerId) {
            const customer = Customer.findOne({
                where: {
                    id: r.customerId,
                    clientId: ctx.clientId
                }
            })

            if (!customer) {
                throw Error('Customer not found')
            }
        }
        await r.update(data)
        return BankAccount.findByPk(id)
    }

}

@Resolver()
export class BankAccountResolver {

    @UseMiddleware(checkJWT)
    @Query(returns => [BankAccount], {nullable: true, name: 'bankAccountFilter',})
    async getByFilter (@Arg('value', type => String)value: string,
        @Ctx() ctx: IContextApp) {
        return BankAccount.selectByFilter(value, ctx)
    }

    @UseMiddleware(checkJWT)
    @Query(returns => BankAccount, {nullable: true, name: 'bankAccount',})
    getOne (@Arg('id', type => Int)id: number,
        @Ctx() ctx: IContextApp) {
        return BankAccount.selectOne(id, ctx)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => BankAccount, {name: 'updateBankAccount'})
    updateOne (@Arg('id', type => Int)id: number,
        @Arg('data') data: BankAccountType,
        @Ctx() ctx: IContextApp) {
        return BankAccount.updateOne(id, data, ctx)
    }
}
