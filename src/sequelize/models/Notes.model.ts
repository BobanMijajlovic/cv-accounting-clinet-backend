import 'reflect-metadata'
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
}                              from 'sequelize-typescript'
import {
    Field,
    ID,
    Int,
    ObjectType
}                              from 'type-graphql'
import Invoice                 from './Invoice.model'
import {CONSTANT_MODEL}        from '../constants'
import * as validations        from './validations'
import ProformaInvoice         from './ProformaInvoice.model'
import ReturnInvoice           from './ReturnInvoice.model'
import FinanceTransferDocument from './FinanceTransferDocument.model'
import {TForeignKeys}          from '../graphql/types/basic'
import {IContextApp}           from '../graphql/resolvers/basic'

@ObjectType()
@Table({
    tableName: 'notes'
})

export default class Notes extends Model {

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
        type: DataType.STRING(255),
    })
    note: string

    @Field(type => Int, { nullable: true })
    @ForeignKey(() => Invoice)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_invoice_id'
    })
    invoiceId: number

    @Field(type => Int, { nullable: true })
    @ForeignKey(() => ProformaInvoice)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_proforma_invoice_id'
    })
    proformaInvoiceId: number

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

    @Field(type => Int, { nullable: true })
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.STATUS.ACTIVE,
        validate: {
            isValid: (value) => validations.isStatusValid.bind(null, 'InvoiceNote')(value)
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

    public static async insertNotes (data: INotesInsertProps[],ctx: IContextApp, options: any) {
        const array = data.map(d => Notes.create({
            ...d,
            clientId: ctx.clientId
        }, options))
        return Promise.all(array)
    }

    public static async deletedRecords (data: TForeignKeys, options: any) {
        return Notes.destroy({
            where: {
                ...data
            },
            ...options
        })
    }

    public static async markDeletedRecords (data: TForeignKeys, options: any) {
        return Notes.update({ status: CONSTANT_MODEL.STATUS.DELETED },
            {
                where: {
                    ...data
                },
                ...options
            })
    }

}

export interface INotesInsertProps extends TForeignKeys {
    note: string
}
