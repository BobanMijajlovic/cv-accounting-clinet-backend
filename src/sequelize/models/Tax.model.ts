import 'reflect-metadata'
import {
    AutoIncrement,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    HasMany,
    Max,
    Min,
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

import { flatten as _flatten}  from 'lodash'
import {MinLength}      from 'class-validator'
import {IContextApp}    from '../graphql/resolvers/basic'
import TaxValue                       from './TaxValue.model'
import Sequelize                              from 'sequelize'
import {
    TaxTypeDefine,
    TaxValuesType
}                                             from '../graphql/types/Tax'
import {guid}                                 from '../../utils'
import {checkJWT}                             from '../graphql/middlewares'
import {CONSTANT_MODEL}                       from '../constants'
import * as validations                       from './validations'
import Client                                 from './Client.model'
import {throwArgumentValidationError}         from './index'
import {TRANSLATE_ERROR_NOT_EXISTS_IN_SYSTEM} from '../constants/translate'
import RecordsTax                             from './RecordsTax.model'

@ObjectType()
@Table({
    tableName: 'tax'
})

export default class Tax extends Model {

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
        type: DataType.STRING(32),
        field: 'name'
    })
    name: string

    @Field()
    @Column({
        allowNull: false,
        type: DataType.STRING(12),
        field: 'short'
    })
    short: string

    @Field()
    @MinLength(1)
    @Column({
        allowNull: false,
        type: DataType.STRING(4),
        field: 'mark'
    })
    mark: string

    @Field()
    @MinLength(1)
    @Column({
        allowNull: false,
        type: DataType.STRING(2),
        field: 'unique_key'
    })
    uniqueKey: string

    @Field()
    @Max(100)
    @Min(-1)
    @Column({
        allowNull: true,
        type: DataType.DECIMAL(10, 2),
    })
    value: number

    @Field(type => Int)
    @ForeignKey(() => Client)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_client_id'
    })
    clientId: number

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.STATUS.ACTIVE,
        validate: {
            isValid: (value) => validations.isStatusValid.bind(null, 'Tax')(value)
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

    @Field(type => [TaxValue], {nullable: true})
    @HasMany(() => TaxValue)
    values: TaxValue[]

    /** function that defines tax definitions */
    public static async defineTaxValues (data: TaxTypeDefine[], ctx: IContextApp) {
        const transaction = await Tax.sequelize.transaction()
        const options = {transaction}
        try {
            const taxs = await Tax.findAll({
                where: {
                    clientId: ctx.clientId
                },
                ...options
            })
            const proms = data.map(x => {
                const t = taxs.find(t => Number(t.uniqueKey) === Number(x.uniqueKey))
                const obj = {
                    ...t,
                    ...x,
                    name: !t.name ? x.name ? x.name : x.short : t.name,
                    clientId: ctx.clientId
                }
                return t ? t.update(obj, options) : Tax.create(obj, options)
            })
            await Promise.all(proms)
            await RecordsTax.insertUpdateTaxesRecords(data,ctx,options)
            await transaction.commit()
            return Tax.findAll({
                where: {
                    clientId: ctx.clientId
                }
            })
        } catch
        (e) {
            await transaction.rollback()
            throw e
        }
    }

    public static async setActive (uniqueKey: number,data: TaxTypeDefine,ctx: IContextApp) {
        const transaction = await Tax.sequelize.transaction()

        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = { transaction, validate: true }
        try {
            const tax = await Tax.findOne({
                where: {
                    uniqueKey,
                    clientId: ctx.clientId
                },
                ...options
            })
            if (!tax) {
                throwArgumentValidationError('uniqueKey', {}, {message: TRANSLATE_ERROR_NOT_EXISTS_IN_SYSTEM})
            }
            await tax.update(data,options)
            await transaction.commit()
            return Tax.findAll({
                where: {
                    clientId: ctx.clientId
                }
            })
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    public static async getValidTaxClient (clientId: number, date?: Date) {
        return Tax.findAll({
            where: {
                clientId
            }
        })
    }

    public static async getValidTax (ctx: IContextApp, date?: Date) {
        return Tax.findAll({
            where: {
                clientId: ctx.clientId
            }
        })
    }

    public static async getValidTaxByNumber (tax: number, ctx?: IContextApp) {
        const _tax = await Tax.getValidTax(ctx)
        return _tax.find(t => t.id === tax)
    }

    /** valid taxes get by
     *         const validTaxes = await Tax.getValidTax(ctx)
     if (!validTaxes) {
                        throw Error('Vats not exists in system')
                    }
     */
    public static findTaxPercent = (validTaxes: Tax[], taxId: number) => {
        const tax = validTaxes.find(t => t.id === taxId)
        const taxPercent = tax && tax.value
        return taxPercent
    }

}

@Resolver()
export class TaxResolver {
    @UseMiddleware(checkJWT)
    @Query(returns => [Tax], {name: 'taxDefinitions'})
    async getTaxDefinitions (@Ctx() ctx: IContextApp) {
        return Tax.findAll()
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => [Tax], {name: 'insertTaxDefinition'})
    async insertTaxDefinitions (@Arg('data', type => [TaxTypeDefine]) data: TaxTypeDefine[],
        @Ctx() ctx: IContextApp) {
        return Tax.defineTaxValues(data, ctx)
    }

    @UseMiddleware(checkJWT)
    @Query(returns => [Tax], {name: 'getValidTax'})
    async getValidTax (@Arg('date', {nullable: true}) date: Date,
        @Ctx() ctx: IContextApp) {
        return Tax.getValidTax(ctx, date)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => [Tax], {name: 'setTaxActive'})
    async _setActive (@Arg('uniqueKey', type => Int) uniqueKey: number,
        @Arg('data', type => TaxTypeDefine) data: TaxTypeDefine,
        @Ctx() ctx: IContextApp) {
        return Tax.setActive(uniqueKey,data, ctx)
    }
}

