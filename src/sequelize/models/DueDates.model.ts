import 'reflect-metadata'
import {
    AutoIncrement,
    BeforeCreate,
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    Min,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}                              from 'sequelize-typescript'
import {
    Args,
    Ctx,
    Field,
    ID,
    Int,
    ObjectType,
    Query,
    Resolver,
    UseMiddleware
}                              from 'type-graphql'
import Invoice                 from './Invoice.model'
import {
    setUserFilterToWhereSearch,
    throwArgumentValidationError
}                              from './index'
import {
    IContextApp,
    TModelResponseSelectAll
}                              from '../graphql/resolvers/basic'
import {CONSTANT_MODEL}        from '../constants'
import Customer                from './Customer.model'
import _                       from 'lodash'
import Client                  from './Client.model'
import ReturnInvoice           from './ReturnInvoice.model'
import {
    PaginatedResponse,
    RequestFilterSort,
    TForeignKeys
}                              from '../graphql/types/basic'
import FinanceTransferDocument from './FinanceTransferDocument.model'
import Calculation             from './Calculation.model'
import {checkJWT}              from '../graphql/middlewares'
import {requestOptions}        from '../graphql/FilterRequest'
import Sequelize               from 'sequelize'
import {DueDatesSummarize}     from '../graphql/types/DueDates'

@ObjectType()
@Table({
    underscored: true,
    tableName: 'due_dates',
    indexes: [
        {
            name: 'due-dates-client-sum-index-1',
            unique: false,
            using: 'BTREE',
            fields: ['fk_client_id', 'status', 'date']
        },
        {
            name: 'due-dates-client-index-1',
            unique: false,
            using: 'BTREE',
            fields: ['fk_client_id', 'status', 'flag', 'date']
        }
    ]
})

export default class DueDates extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        type: DataType.STRING(32)
    })
    description: string

    @Field()
    @Min(0)
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(12, 2)
    })
    finance: number

    @Field(type => String, { nullable: true })
    @Column({
        allowNull: false,
        type: DataType.DATEONLY,
    })
    date: Date

    @Field(type => Int, { nullable: true })
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.TAX_FINANCE_FLAG.IN
    })
    flag: number

    @Field(type => Int)
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.DUE_DATES_STATUS.OPENED
    })
    status: number

    @Field(type => Int, { nullable: true })
    @ForeignKey(() => Calculation)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_calculation_id'
    })
    calculationId: number

    @Field(type => Int, { nullable: true })
    @ForeignKey(() => Invoice)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_invoice_id'
    })
    invoiceId: number

    @Field(type => Int, { nullable: true })
    @ForeignKey(() => ReturnInvoice)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_return_invoice_id'
    })
    returnInvoiceId: number

    @Field(type => Int, { nullable: true })
    @ForeignKey(() => FinanceTransferDocument)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_finance_transfer_document_id'
    })
    financeTransferDocumentId: number

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

    /** relations*/
    @Field(type => Calculation, {nullable:true})
    @BelongsTo(() => Calculation)
    calculation: Calculation

    @Field(type => Invoice, {nullable:true})
    @BelongsTo(() => Invoice)
    invoice: Invoice

    @Field(type => ReturnInvoice, {nullable:true})
    @BelongsTo(() => ReturnInvoice)
    returnInvoice: ReturnInvoice

    @Field(type => FinanceTransferDocument, {nullable:true})
    @BelongsTo(() => FinanceTransferDocument)
    financeTransferDocument: FinanceTransferDocument

    @BeforeCreate({ name: 'beforeCreateHook' })
    static _beforeCreateHook (instance: DueDates, options: any) {
        if (instance.finance !== _.round(instance.finance, 2)) {
            throwArgumentValidationError('finance', instance, { message: 'Due Date - Finance must be in valid form' })
        }
    }

    public static async selectAll (options: any, ctx: IContextApp): TModelResponseSelectAll<DueDates> {
        options = setUserFilterToWhereSearch(options, ctx)
        return DueDates.findAndCountAll(options)
    }

    public static async insertRows (data: IDueDatesInsertProps[], ctx: IContextApp, options: any) {

        const array = data.map(d => DueDates.create({
            ...d,
            clientId: ctx.clientId
        }, options))

        return Promise.all(array)
    }

    public static async markDeletedRecords (data: TForeignKeys, options: any) {
        return DueDates.update({ status: CONSTANT_MODEL.DUE_DATES_STATUS.DELETED },
      {
          where: {
              ...data
          },
          ...options
      })
    }

    public static async markActiveRecords (data: TForeignKeys, options: any) {
        return DueDates.update({ status: CONSTANT_MODEL.DUE_DATES_STATUS.ACTIVE },
      {
          where: {
              ...data
          },
          ...options
      })
    }

    public static async deletedRecords (data: TForeignKeys, options: any) {
        return DueDates.destroy({
            where: {
                ...data
            },
            ...options
        })
    }

    public static async getSummarizeByFilter (options: any, ctx: IContextApp): Promise<DueDatesSummarize[]> {
        options = setUserFilterToWhereSearch(options, ctx)
        options = {
            ...options,
            attributes: [[Sequelize.fn('sum', Sequelize.col('finance')), 'finance'], ...(options.attributes || [])]
        }
        const data = await DueDates.findAll(options)
        return data.map(x => ({
            customerId: x.customerId,
            flag: x.flag,
            status: x.status,
            finance: x.finance,
            date: x.date || null
        }))
    }

}

@ObjectType('responseDueDates')
class ClassPaginationResponse extends PaginatedResponse(DueDates) {}

@Resolver()
export class DueDatesResolver {

    @UseMiddleware(checkJWT)
    @Query(returns => [DueDates], { name: 'dueDatesSummarizeByFilter', nullable: true })
    async _qModelSelectByFilter (@Ctx() ctx: IContextApp,
        @Args() request: RequestFilterSort) {
        const find = requestOptions(request)
        return DueDates.getSummarizeByFilter(find, ctx)
    }

    @UseMiddleware(checkJWT)
    @Query(returns => ClassPaginationResponse, { name: 'dueDates' })
    async _qModelSelectAll (@Ctx() ctx: IContextApp,
        @Args() request: RequestFilterSort) {
        const find = requestOptions(request)
        const result = await DueDates.selectAll(find, ctx)
        return {
            items: result.rows,
            count: result.count,
            perPage: find.limit,
            page: Math.floor(find.offset / find.limit) + 1,
            hasMore: true
        }
    }
}

export interface IDueDatesInsertProps extends TForeignKeys {
    customerId: number
    finance: number
    date: Date
    description?: string
    status?: number
    flag?: number
}
