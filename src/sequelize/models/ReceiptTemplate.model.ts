import 'reflect-metadata'
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
}                                             from 'sequelize-typescript'
import * as validations                       from './validations'
import Client                                 from './Client.model'
import {
    createBaseResolver,
    IContextApp,
    TModelResponse,
    TModelResponseSelectAll
}                                             from '../graphql/resolvers/basic'
import {ReceiptTemplateType}                  from '../graphql/types/ReceiptTemplate'
import {CONSTANT_MODEL}                       from '../constants'
import {
    setUserFilterToWhereSearch,
    throwArgumentValidationError
}                                             from './index'
import {TRANSLATE_ERROR_NOT_EXISTS_IN_SYSTEM} from '../constants/translate'
import {checkJWT}                             from '../graphql/middlewares'

@ObjectType()
@Table({
    tableName: 'receipt_template'
})

export default class ReceiptTemplate extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED,
    })
    id: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.STRING(64),
    })
    name: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(16384)
    })
    value: string

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.RECEIPT_TEMPLATE_STATUS.ACTIVE,
        validate: {
            isValid: (value) => validations.isStatusValid('Receipt template', value)
        }
    })
    status: number

    @Field(type => Int)
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

    public static async selectOne (id: number, ctx: IContextApp): TModelResponse<ReceiptTemplate> {
        return ReceiptTemplate.findOne({
            where: {
                id,
                clientId: ctx.clientId
            }
        })
    }

    public static async selectAll (options: any, ctx: IContextApp): TModelResponseSelectAll<ReceiptTemplate> {
        options = setUserFilterToWhereSearch(options, ctx)
        return ReceiptTemplate.findAndCountAll(options)
    }

    public static async insertOne (data: ReceiptTemplateType, ctx: IContextApp) {
        return ReceiptTemplate.insertUpdateOne(0, data, ctx)
    }

    public static async updateOne (id: number, data: ReceiptTemplateType, ctx: IContextApp): TModelResponse<ReceiptTemplate> {
        return ReceiptTemplate.insertUpdateOne(id, data, ctx)
    }

    public static async insertUpdateOne (id: number, data: ReceiptTemplateType, ctx: IContextApp): TModelResponse<ReceiptTemplate> {
        const transaction = await ReceiptTemplate.sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}

        try {
            const recTemp = await ReceiptTemplate.findOne({
                where: {
                    id,
                    clientId: ctx.clientId
                },
                ...options
            })
            const receiptTemplate = !recTemp ? await ReceiptTemplate.create({
                ...data,
                clientId: ctx.clientId
            }, options) : await recTemp.update(data, options)

            await transaction.commit()
            return ReceiptTemplate.selectOne(receiptTemplate.id, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    public static async deleteOne (id: number, ctx: IContextApp): TModelResponse<ReceiptTemplate> {
        const transaction = await ReceiptTemplate.sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}

        try {
            const template = await ReceiptTemplate.findOne({
                where: {
                    id,
                    clientId: ctx.clientId
                },
                ...options
            })
            if (!template) {
                throwArgumentValidationError('id', {}, {message: TRANSLATE_ERROR_NOT_EXISTS_IN_SYSTEM})
            }
            await template.destroy(options)
            await transaction.commit()
            return ReceiptTemplate.selectOne(id, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    public static async setUnsetActiveTemplate (templateId: number, ctx: IContextApp): TModelResponse<ReceiptTemplate> {
        const transaction = await ReceiptTemplate.sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}

        try {
            const receiptTemplate = await ReceiptTemplate.findOne({
                where: {
                    id: templateId,
                    clientId: ctx.clientId
                },
                ...options
            })

            if (!receiptTemplate) {
                throwArgumentValidationError('id', {}, {message: TRANSLATE_ERROR_NOT_EXISTS_IN_SYSTEM})
            }
            if (receiptTemplate.status !==  CONSTANT_MODEL.RECEIPT_TEMPLATE_STATUS.USING) {
                const active = await ReceiptTemplate.findOne({
                    where: {
                        clientId: ctx.clientId,
                        status: CONSTANT_MODEL.RECEIPT_TEMPLATE_STATUS.USING
                    },
                    ...options
                })
                if (active) {
                    await active.update({status: CONSTANT_MODEL.RECEIPT_TEMPLATE_STATUS.ACTIVE}, options)
                }
                await receiptTemplate.update({status: CONSTANT_MODEL.RECEIPT_TEMPLATE_STATUS.USING}, options)
            }
            await transaction.commit()
            return ReceiptTemplate.selectOne(templateId, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    public static async getActiveTemplate (ctx: IContextApp): TModelResponse<ReceiptTemplate> {
        return ReceiptTemplate.findOne({
            where: {
                clientId: ctx.clientId,
                status: CONSTANT_MODEL.RECEIPT_TEMPLATE_STATUS.USING
            }
        })
    }

}
const BaseResolver = createBaseResolver(ReceiptTemplate, {
    updateInputType: ReceiptTemplateType,
    insertInputType: ReceiptTemplateType
})

@Resolver()
export class ReceiptTemplateResolver extends BaseResolver {

    @UseMiddleware(checkJWT)
    @Query(returns => ReceiptTemplate || null, {name: 'getActiveReceiptTemplate', nullable: true})
    async _getActiveReceiptTemplate (@Ctx() ctx: IContextApp) {
        return ReceiptTemplate.getActiveTemplate(ctx)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => ReceiptTemplate || null, {name: 'deleteReceiptTemplate', nullable: true})
    async _deleteReceiptTemplate (@Arg('id', type => Int) id: number,
        @Ctx() ctx: IContextApp) {
        return ReceiptTemplate.deleteOne(id, ctx)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => ReceiptTemplate, {name: 'setUnsetActiveReceiptTemplate', nullable: true})
    async _setUnsetActiveReceiptTemplate (@Arg('templateId', type => Int) templateId: number,
        @Ctx() ctx: IContextApp) {
        return ReceiptTemplate.setUnsetActiveTemplate(templateId, ctx)
    }

}
