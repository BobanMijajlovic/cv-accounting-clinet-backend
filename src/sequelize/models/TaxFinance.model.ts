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
    Field,
    ID,
    Int,
    ObjectType
}                              from 'type-graphql'
import {CONSTANT_MODEL}        from '../constants'
import Tax                     from './Tax.model'
import {
    Calculation,
    Invoice,
    ReturnInvoice,
    throwArgumentValidationError
}                              from './index'
import _                       from 'lodash'
import Client                  from './Client.model'
import {IContextApp}           from '../graphql/resolvers/basic'
import FinanceTransferDocument from './FinanceTransferDocument.model'
import {TForeignKeys}          from '../graphql/types/basic'
import ProformaInvoice         from './ProformaInvoice.model'

@ObjectType()
@Table({
    tableName: 'tax_finance'
})

export default class TaxFinance extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field(type => String, { nullable: true })
    @Column({
        allowNull: false,
        type: DataType.DATEONLY,
    })
    date: Date

  /** this is total finance for tax */
    @Field({ nullable: false })
    @Min(0)
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(10, 2),
        field: 'tax_finance'
    })
    taxFinance: number

  /** this is value in % for that tax */
    @Field({ nullable: false })
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(10, 2),
        field: 'tax_percent'
    })
    taxPercent: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(12, 2),
        field: 'finance_mp'
    })
    financeMP: number

    @Field(type => Int)
    @ForeignKey(() => Tax)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_tax_id'
    })
    taxId: number

    @Field(type => Int, { nullable: true })
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.TAX_FINANCE.OPENED
    })
    status: number

    @Field(type => Int, { nullable: true })
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.TAX_FINANCE_FLAG.IN
    })
    flag: number

    @Field(type => Int, { nullable: true })
    @ForeignKey(() => FinanceTransferDocument)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_finance_transfer_document_id'
    })
    financeTransferDocumentId: number

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
    @ForeignKey(() => ProformaInvoice)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_proforma_invoice_id'
    })
    proformaInvoiceId: number

    @Field(type => Int, { nullable: true })
    @ForeignKey(() => Calculation)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_calculation_id'
    })
    calculationId: number

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

    @Field(type => Tax, { nullable: true })
    @BelongsTo(() => Tax)
    tax: Tax

  /** we are not going to check is same exists ( calculationId & taxId must be unique) */
    @BeforeCreate({ name: 'beforeCreateHook' })
    static async _beforeCreateHook (instance: TaxFinance, options: any) {
        if (instance.taxFinance !== _.round(instance.taxFinance, 2)) {
            throwArgumentValidationError('finance', instance, { message: 'Finance must be in valid form' })
        }
    }

    public static async insertOne (data: ITaxFinanceInsertProps, ctx: IContextApp, options: any) {
        const taxes = await ctx.taxes
        const tax = taxes.find(t => t.id === data.taxId)
        const financeMP = data.financeMP
        const taxPercent = tax && (tax.values && tax.values[0].value)
        const taxFinance = _.round(_.subtract(financeMP, _.round(_.divide(_.multiply(financeMP, 100), _.add(100, Number(taxPercent))), 2)), 2)
        return TaxFinance.create({
            ...data,
            clientId: ctx.clientId,
            taxPercent,
            taxFinance,
        }, options)
    }

    public static async insertOneCalculation (data: ITaxFinanceInsertProps, ctx: IContextApp, options: any) {
        const taxes = await ctx.taxes
        const tax = taxes.find(t => t.id === data.taxId)
        const taxPercent = tax && tax.value// tax && (tax.values && tax.values[0].value)
        return TaxFinance.create({
            ...data,
            clientId: ctx.clientId,
            taxPercent,
        }, options)
    }

    public static async markDeletedRecords (data: TForeignKeys, options: any) {
        return TaxFinance.update({ status: CONSTANT_MODEL.TAX_FINANCE.DELETED },
      {
          where: {
              ...data
          },
          ...options
      })
    }

    public static async deletedRecords (data: TForeignKeys, options: any) {
        return TaxFinance.destroy({
            where: {
                ...data
            },
            ...options
        })
    }

    public static async markActiveRecords (data: TForeignKeys, options: any) {
        return TaxFinance.update({ status: CONSTANT_MODEL.DUE_DATES_STATUS.ACTIVE },
      {
          where: {
              ...data
          },
          ...options
      })
    }
}

export interface ITaxFinanceInsertProps extends TForeignKeys {
    taxId: number,
    date: Date,
    financeMP?: number,
    taxFinance?: number,
    flag?: number,
    status?: number
}
