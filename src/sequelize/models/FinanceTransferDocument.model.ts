import 'reflect-metadata'
import {
    AutoIncrement,
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    HasMany,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}                         from 'sequelize-typescript'
import {
    Field,
    ID,
    Int,
    ObjectType,
    Resolver
}                         from 'type-graphql'
import {
    Address,
    Customer,
    setUserFilterToWhereSearch,
    throwArgumentValidationError
} from './index'
import {
    createBaseResolver,
    IContextApp,
    TModelResponse,
    TModelResponseSelectAll
}                         from '../graphql/resolvers/basic'
import Client             from './Client.model'
import Notes                 from './Notes.model'
import Tax                   from './Tax.model'
import { CONSTANT_MODEL }    from '../constants'
import TaxValue              from './TaxValue.model'
import { sequelize }         from '../sequelize'
import {
    FinanceTransferDocumentInsertType,
    FinanceTransferDocumentUpdateType
}                            from '../graphql/types/FinanceTransferDocument'
import TaxFinance            from './TaxFinance.model'
import DueDates              from './DueDates.model'
import InvoiceAdvanceInvoice from './InvoiceAdvanceInvoice.model'

@ObjectType()
@Table({
    tableName: 'finance_transfer_document',
    underscored: true,
    indexes: [
        {
            name: 'finance-transfer-document-index-1',
            unique: false,
            using: 'BTREE',
            fields: ['fk_client_id', 'status', 'date']
        }
    ]
})

export default class FinanceTransferDocument extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        type: DataType.STRING(16),
    })
    number: string

    @Field(type => Date)
    @Column({
        allowNull: false,
        type: DataType.DATE
    })
    date: Date

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        type: DataType.STRING(256),
        field: 'item_description'
    })
    itemDescription: string

    @Field(type => Int, { nullable: true })
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.TAX_FINANCE.ACTIVE
    })
    status: number

  /** document type is */
    @Field(type => Int, { nullable: true })
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.FINANCE_DOCUMENT_TYPE.TRANSFER,
        comment: 'Document type means is it an advance invoice or a book document',
        field: 'document_type'
    })
    documentType: number

    @Field(type => Int, { nullable: true })
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.TAX_FINANCE_FLAG.IN
    })
    flag: number

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

  /** relations*/
    @Field(type => Client)
    @BelongsTo(() => Client)
    client: Client

    @Field(type => Customer, { nullable: true })
    @BelongsTo(() => Customer)
    customer: Customer

    @Field(type => [TaxFinance], { nullable: true })
    @HasMany(() => TaxFinance)
    tax: TaxFinance[]

    @Field(type => [DueDates], { nullable: true })
    @HasMany(() => DueDates)
    dueDates: DueDates[]

    @Field(type => [Notes], { nullable: true })
    @HasMany(() => Notes)
    notes: Notes[]

    @Field(type => [InvoiceAdvanceInvoice], { nullable: true })
    @HasMany(() => InvoiceAdvanceInvoice)
    invoiceAdvance: InvoiceAdvanceInvoice[]

    public static selectOneById (id: number, clientId: number, options = {}): TModelResponse<FinanceTransferDocument> {
        return FinanceTransferDocument.findOne({
            where: {
                id: id,
                clientId,
            },
            include: [
                {
                    model: Customer,
                    required: false,
                    include: [
                        {
                            model: Address,
                            required: false
                        }
                    ]
                },
                {
                    model: TaxFinance,
                    required: false
                },
                {
                    model: Notes,
                    required: false
                },
                {
                    model: DueDates,
                    required: true
                }
            ],
            ...options
        })
    }

    public static async selectOne (id: number, ctx: IContextApp): TModelResponse<FinanceTransferDocument> {
        return FinanceTransferDocument.selectOneById(id, ctx.clientId)
    }

    public static async selectAll (options: any, ctx: IContextApp): TModelResponseSelectAll<FinanceTransferDocument> {
        options = setUserFilterToWhereSearch(options, ctx)
        return FinanceTransferDocument.findAndCountAll(options)
    }

    public static async insertOne (entryData: FinanceTransferDocumentInsertType, ctx: IContextApp): Promise<FinanceTransferDocument> {
        const transaction = await sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }

        entryData.flag = entryData.flag === CONSTANT_MODEL.TAX_FINANCE_FLAG.IN ? CONSTANT_MODEL.TAX_FINANCE_FLAG.IN : CONSTANT_MODEL.TAX_FINANCE_FLAG.OUT
        entryData.documentType = entryData.documentType === CONSTANT_MODEL.FINANCE_DOCUMENT_TYPE.TRANSFER ? CONSTANT_MODEL.FINANCE_DOCUMENT_TYPE.TRANSFER : CONSTANT_MODEL.FINANCE_DOCUMENT_TYPE.ADVANCE

        if (entryData.dueDates?.length !== 1 || entryData.totalFinanceMP !== entryData.dueDates[0].finance) {
            throwArgumentValidationError('dueDates', entryData, { message: 'Due dates not good' })
        }

        const options = { transaction, validate: true }
        try {

            const rec = await FinanceTransferDocument.findOne({
                where: {
                    flag: entryData.flag,
                    documentType: entryData.documentType
                },
                order: [['id', 'DESC']],
                ...options
            })

            const invoiceNumber = entryData.documentType === CONSTANT_MODEL.FINANCE_DOCUMENT_TYPE.TRANSFER ? `FIN-TRAN-${entryData.flag ? 'O' : 'I' }` : `ADV-${entryData.flag ?  'O' : 'I'}`
            let strNumber = (rec ? +rec.number.substr(invoiceNumber.length + 4) + 1 : 1).toString()
            while (strNumber.length < 0) {
                strNumber = '0' + strNumber
            }
            const year = (new Date()).getFullYear()
                .toString()
                .substr(2)

            const newInstance = await FinanceTransferDocument.create({
                number: `${invoiceNumber}-${year}-${strNumber}`,
                customerId: entryData.customerId,
                documentType: entryData.documentType,
                flag: entryData.flag,
                date: entryData.date,
                clientId: ctx.clientId,
                itemDescription: entryData.itemDescription,
            } as any, options) as any

            await TaxFinance.insertOne({
                taxId: entryData.taxId,
                financeMP: entryData.totalFinanceMP,
                date: entryData.date,
                flag: entryData.flag,
                financeTransferDocumentId: newInstance.id,
                status: CONSTANT_MODEL.TAX_FINANCE.ACTIVE,
            }, ctx, options)

            await DueDates.insertRows(entryData.dueDates.map(x => ({
                ...x,
                customerId: entryData.customerId,
                status: CONSTANT_MODEL.DUE_DATES_STATUS.ACTIVE,
                flag: entryData.flag,
                financeTransferDocumentId: newInstance.id,
            })), ctx, options)

            if (entryData.notes) {
                await Notes.insertNotes(entryData.notes.map(x => ({
                    ...x,
                    financeTransferDocumentId: newInstance.id
                })), ctx, options)
            }
            await transaction.commit()
            return FinanceTransferDocument.selectOne(newInstance.id, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }

    }

    public static async updateOne (id: number, entryData: FinanceTransferDocumentUpdateType, ctx: IContextApp): Promise<FinanceTransferDocument> {

        const instance = await FinanceTransferDocument.findOne({
            where: {
                id,
                clientId: ctx.clientId
            }
        })

        if (!instance) {
            throwArgumentValidationError('id', entryData, { message: 'Object not exists' })
        }

        if (instance.status === CONSTANT_MODEL.TAX_FINANCE.DELETED || entryData.status !== CONSTANT_MODEL.TAX_FINANCE.DELETED) {
            throwArgumentValidationError('status', entryData, { message: 'Not Editable' })
        }

        const transaction = await sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = { transaction, validate: true }
        try {
            await Promise.all([instance.update(entryData, options),
                TaxFinance.markDeletedRecords({ financeTransferDocumentId: instance.id }, options),
                DueDates.markDeletedRecords({ financeTransferDocumentId: instance.id }, options)
            ])
            await transaction.commit()
        } catch (e) {
            transaction.rollback()
            throw (e)
        }

        return FinanceTransferDocument.selectOne(id, ctx)
    }

}

const BaseResolver = createBaseResolver(FinanceTransferDocument, {
    updateInputType: FinanceTransferDocumentUpdateType,
    insertInputType: FinanceTransferDocumentInsertType
})

@Resolver()
export class AdvanceInvoiceResolver extends BaseResolver {

}
