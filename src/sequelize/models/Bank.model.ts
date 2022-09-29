import 'reflect-metadata'
import {
    Column,
    CreatedAt,
    DataType,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
} from 'sequelize-typescript'

import * as validations from './validations'
import {
    Arg,
    Ctx,
    Field,
    ID,
    Int,
    ObjectType,
    Query,
    Resolver,
    UseMiddleware
}                 from 'type-graphql'
import {
    IContextApp,
    TModelResponse
}                 from '../graphql/resolvers/basic'
import {checkJWT} from '../graphql/middlewares'
import {getBank}  from '../../server/Server'

@ObjectType()
@Table({
    tableName: 'bank'
})
export default class Bank extends Model {

    @Field(type => ID)
    @PrimaryKey
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.STRING(128),
        field: 'bank_name'
    })
    bankName: string

    @Field(type => Int)
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: validations.modelSTATUS.ACTIVE,
        validate: {
            isValid: (value) => validations.isStatusValid('Bank', value)
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

    public static selectOne (id: number, _ctx?: IContextApp): TModelResponse<Bank> {
        return Bank.findOne({
            where: {
                id
            }
        })
    }
    
    public static  async selectAll (): Promise<Bank[]> {
        let banks = await Bank.findAll()
        if (banks.length > 0) {
            return banks
        }
        try {
            banks = await getBank()
        } catch (e) {
            return []
        }       
        return banks
    }
    
}

@Resolver()
export class BankResolver {

    @UseMiddleware(checkJWT)
    @Query(returns => Bank, {nullable: true, name: 'bank'})
    getOne (@Arg('id', type => Int)id: number,
        @Ctx() ctx: IContextApp) {
        return Bank.selectOne(id, ctx)
    }

    @UseMiddleware(checkJWT)
    @Query(returns => [Bank], {name: 'banks'})
    getAll (@Ctx() ctx: IContextApp) {
        return Bank.selectAll()
    }

}

