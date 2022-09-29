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
}                              from 'sequelize-typescript'
import {
    Field,
    ID,
    Int,
    ObjectType
}                              from 'type-graphql'
import CurrencyDefinition      from './CurrencyDefinition.model'
import {CONSTANT_MODEL}        from '../constants'
import Invoice                 from './Invoice.model'
import FinanceTransferDocument from './FinanceTransferDocument.model'

@ObjectType()
@Table({
    tableName: 'invoice_advance_invoice',
    underscored: true,
})

export default class InvoiceAdvanceInvoice extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

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

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(12, 2),
        comment: 'Total net for faster search',
        field: 'total_finance_net_vp'
    })
    totalFinanceVP: number

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(12, 2),
        comment: 'Total finance for faster search',
        field: 'total_finance_tax'
    })
    totalFinanceTax: number

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(12, 2),
        comment: 'Total mp for faster search',
        field: 'total_finance_mp'
    })
    totalFinanceMP: number

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        comment: 'Currency value for faster search',
        field: 'currency_value'
    })
    currencyValue: number

    @Field(type => Int, { nullable: true })
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.INVOICE_STATUS.OPENED
    })
    status: number

    @Field(type => Int, { nullable: true })
    @ForeignKey(() => CurrencyDefinition)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_currency_id'
    })
    currencyId: number

    @Field(type => Int, { nullable: false })
    @ForeignKey(() => Invoice)
    @Column({
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_invoice_id'
    })
    invoiceId: number

    @Field(type => Int, { nullable: false })
    @ForeignKey(() => FinanceTransferDocument)
    @Column({
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_finance_transfer_document_id'
    })
    financeTransferDocumentId: number

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

    @Field(type => Invoice, { nullable: false })
    @BelongsTo(() => Invoice)
    invoice: Invoice

    @Field(type => FinanceTransferDocument, { nullable: false })
    @BelongsTo(() => FinanceTransferDocument)
    financeTransferDocument: FinanceTransferDocument
}
