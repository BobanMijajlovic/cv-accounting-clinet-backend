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
}                                 from 'sequelize-typescript'
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
}                                 from 'type-graphql'
import Invoice                    from './Invoice.model'
import { CONSTANT_MODEL }         from '../constants'
import * as validations           from './validations'
import Client                     from './Client.model'
import {
    Item,
    throwArgumentValidationError,
    Warehouse
}                                 from './index'
import Tax                        from './Tax.model'
import { IContextApp }            from '../graphql/resolvers/basic'
import { checkJWT }               from '../graphql/middlewares'
import {
    InvoiceAdditionalType,
    InvoiceItemType
}                                 from '../graphql/types/Invoice'
import _                          from 'lodash'
import InvoiceItemDiscount        from './InvoiceItemDiscount.model'
import { IInvoiceAdditionalData } from './InvoiceDiscount.model'
import ProformaInvoice            from '../models/ProformaInvoice.model'
import ReturnInvoice              from './ReturnInvoice.model'

@ObjectType()
@Table({
    tableName: 'invoice_item'
})

export default class InvoiceItem extends Model {
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
        type: DataType.DECIMAL(12, 2),
    })
    price: number

    @Field()
    @Column({
        allowNull: false,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 3),
    })
    quantity: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(12, 2),
        field: 'finance_vp'
    })
    financeVP: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(12, 2),
        field: 'finance_final_vp'
    })
    financeFinalVP: number

    @Field()
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
        field: 'tax_finance'
    })
    taxFinance: number

    @Field(type => Int)
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        field: 'use_discount_default'
    })
    useDiscountDefault: number

    @Field(type => Int)
    @ForeignKey(() => Tax)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_tax_id'
    })
    taxId: number

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

    @Field(type => Int)
    @ForeignKey(() => Client)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_client_id'
    })
    clientId: number

    @Field(type => Int)
    @ForeignKey(() => Item)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_item_id'
    })
    itemId: number

    @Field(type => Int)
    @ForeignKey(() => Warehouse)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_warehouse_id'
    })
    warehouseId: number

    @Field(type => Int, { nullable: true })
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.STATUS.ACTIVE,
        validate: {
            isValid: (value) => validations.isStatusValid.bind(null, 'InvoiceItem')(value)
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

  /** relations*/

    @Field(type => Invoice, { nullable: true })
    @BelongsTo(() => Invoice)
    invoice: Invoice

    @Field(type => ProformaInvoice, { nullable: true })
    @BelongsTo(() => ProformaInvoice)
    proformaInvoice: ProformaInvoice

    @Field(type => ReturnInvoice, { nullable: true })
    @BelongsTo(() => ReturnInvoice)
    returnInvoice: ReturnInvoice

    @Field(type => Client)
    @BelongsTo(() => Client)
    client: Client

    @Field(type => Item)
    @BelongsTo(() => Item)
    item: Item

    @Field(type => Tax)
    @BelongsTo(() => Tax)
    tax: Tax

    @Field(type => Warehouse)
    @BelongsTo(() => Warehouse)
    warehouse: Warehouse

    @Field(type => [InvoiceItemDiscount], { nullable: true })
    @HasMany(() => InvoiceItemDiscount)
    discount: InvoiceItemDiscount[]

    public static getInvoiceItemById (invId, id, ctx, options) {
        return InvoiceItem.findOne({
            where: {
                id,
                clientId: ctx.clientId,
                invoiceId: invId
            },
            include: [
                {
                    model: InvoiceItemDiscount,
                    required: false
                }
            ],
            ...options
        })
    }

    public calcMissingValues = (invoice: Invoice | ProformaInvoice | ReturnInvoice) => {
        const financeMP = _.round(_.multiply(this.quantity, this.price), 2)
        const tax = _.round(_.subtract(financeMP, _.round(_.divide(_.multiply(financeMP, 100), _.add(100, Number(this.taxPercent))), 2)), 2)
        this.financeVP = _.round(_.subtract(financeMP, tax), 2)

        const financeVPAfterHeaderDiscount = this.useDiscountDefault && (invoice as any).discountDefault ? _.round(_.divide(_.multiply(this.financeVP, _.subtract(100, (invoice as any).discountDefault)), 100), 2) : this.financeVP

        const financeVPAfterItemDiscount = !this.discount?.length ? financeVPAfterHeaderDiscount : _.round(this.discount.reduce((acc: number, disc) => {
            if (disc.percent) {
                return _.divide(_.multiply(acc, _.subtract(100, disc.percent)), 100)
            }
            if (disc.value) {
                return _.subtract(acc, disc.value)
            }
            return acc
        }, financeVPAfterHeaderDiscount), 2)

        this.financeFinalVP = !(invoice as any).discount && !(invoice as any).discount?.length ? financeVPAfterItemDiscount : _.round((invoice as any).discount.reduce((acc: number, disc) => {
            if (disc.percent) {
                return _.divide(_.multiply(acc, _.subtract(100, disc.percent)), 100)
            }
            if (disc.value) {
                return _.subtract(acc, disc.value)
            }
            return acc
        }, financeVPAfterItemDiscount), 2)

        this.taxFinance = _.round(_.divide(_.multiply(this.financeFinalVP, this.taxPercent), 100), 2)

    }
    
    private static findInvoiceUtilsByAdditionalData (additionalData: IInvoiceAdditionalData,ctx: IContextApp, options: any = {}): Promise<Invoice | ProformaInvoice | ReturnInvoice> {
        return additionalData.invoiceId ? Invoice.selectOneById(additionalData.invoiceId, ctx.clientId, options)
            : additionalData.returnInvoiceId ?  ReturnInvoice.selectOneById(additionalData.returnInvoiceId, ctx.clientId, options)
                : ProformaInvoice.selectOneById(additionalData.proformaInvoiceId, ctx.clientId, options)
    }

    public static async insertUpdateOne (additionalData: IInvoiceAdditionalData, data: InvoiceItemType, id: number, ctx: IContextApp): Promise<Invoice | ProformaInvoice | ReturnInvoice> {

        const validTaxes = await Tax.getValidTax(ctx)
        if (!validTaxes) {
            throw Error('Vats not exists in system')
        }

        const transaction = await InvoiceItem.sequelize.transaction()

        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = { transaction, validate: true }
        try {

            let invoice = await InvoiceItem.findInvoiceUtilsByAdditionalData(additionalData, ctx, options)
            if (!invoice || invoice.status !== CONSTANT_MODEL.INVOICE_STATUS.OPENED) {
                throwArgumentValidationError('id', {}, { message: 'Invoice not editable' })
            }

            if (!id) {
                const item = await Item.findOne({
                    where: {
                        id: data.itemId,
                        clientId: ctx.clientId,
                    },
                    ...options
                })

                if (!item) {
                    throwArgumentValidationError('id', {}, { message: 'Item not found' })
                }

                const taxPercent = Tax.findTaxPercent(validTaxes, item.taxId)
                const instance = await InvoiceItem.create(Object.assign({
                    clientId: ctx.clientId,
                    warehouseId: data.warehouseId,
                    itemId: data.itemId,
                    quantity: data.quantity,
                    price: data.price,
                    taxPercent,
                    taxId: item.taxId,
                    useDiscountDefault: data.useDiscountDefault,
                    financeVP: 0,
                    financeFinalVP: 0,
                    taxFinance: 0
                }, additionalData), options)

                id = instance.id
            }

            let instance = await InvoiceItem.findOne({
                where: {
                    ...Object.assign({
                        id,
                        clientId: ctx.clientId
                    }, additionalData)
                }, ...options
            })

            if (!instance) {
                throw Error('Item not exists')
            }

      /** update items */
            if (data.discount) {
                await InvoiceItemDiscount.destroy({
                    where: {
                        invoiceItemId: instance.id
                    }, ...options
                })
                await InvoiceItemDiscount.insertOne(instance.id, data.discount, options)
            }

            const objectToUpdate = _.pick(data, ['price', 'quantity', 'status', 'useDiscountDefault'])
            await instance.update(objectToUpdate, options)
            instance = await InvoiceItem.findOne({
                where: {
                    ...Object.assign({
                        id,
                        clientId: ctx.clientId
                    }, additionalData)
                },
                include: [
                    {
                        model: InvoiceItemDiscount,
                        required: false
                    }
                ],
                ...options
            })

            await instance.calcMissingValues(invoice)
            await instance.save(options)
            invoice = await InvoiceItem.findInvoiceUtilsByAdditionalData(additionalData, ctx, options)
            await invoice.calcAll(options)
            await transaction.commit()
            return InvoiceItem.findInvoiceUtilsByAdditionalData(additionalData, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    public static async deleteOne (additionalData: IInvoiceAdditionalData, id: number, ctx: IContextApp): Promise<Invoice | ProformaInvoice | ReturnInvoice> {

        const transaction = await InvoiceItem.sequelize.transaction()

        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = { transaction, validate: true }
        try {

            const calcItem = await InvoiceItem.findOne({
                where: {
                    ...Object.assign({
                        id: id
                    }, additionalData)
                },
                ...options
            })
            if (!calcItem) {
                throwArgumentValidationError('id', {}, { message: 'Invoice not exists' })
            }

            const invoice = additionalData.invoiceId ? await Invoice.findOne({
                where: {
                    id: additionalData.invoiceId,
                    clientId: ctx.clientId,
                    status: CONSTANT_MODEL.STATUS.ACTIVE, /** for now **/
                },
                ...options
            }) : additionalData.returnInvoiceId ? await ReturnInvoice.findOne({
                where: {
                    id: additionalData.returnInvoiceId,
                    clientId: ctx.clientId,
                    status: CONSTANT_MODEL.STATUS.ACTIVE, /** for now **/
                },
                ...options
            })  : await ProformaInvoice.findOne({
                where: {
                    id: additionalData.proformaInvoiceId,
                    clientId: ctx.clientId,
                    status: CONSTANT_MODEL.STATUS.ACTIVE, /** for now **/
                },
                ...options
            })

            if (!invoice) {
                throwArgumentValidationError('id', {}, { message: 'Invoice not editable' })
            }

            await InvoiceItem.destroy({
                where: {
                    id: id
                },
                ...options
            })
            await transaction.commit()
            return  InvoiceItem.findInvoiceUtilsByAdditionalData(additionalData, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }
}

@Resolver()
export class InvoiceItemResolver {

    @UseMiddleware(checkJWT)
    @Mutation(returns => Invoice || ProformaInvoice, { name: 'deleteInvoiceItem' })
    async deleteInvoiceItem (@Arg('id', type => Int) id: number,
        @Arg('additionalData', type => InvoiceAdditionalType) additionalData: IInvoiceAdditionalData,
        @Ctx() ctx: IContextApp) {
        return InvoiceItem.deleteOne(additionalData, id, ctx)

    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => Invoice || ProformaInvoice, { name: 'insertUpdateInvoiceItem' })
    async insertUpdateInvoiceItem (@Arg('data', type => InvoiceItemType) data: InvoiceItemType,
        @Arg('id', type => Int, { nullable: true }) id: number,
        @Arg('additionalData', type => InvoiceAdditionalType) additionalData: IInvoiceAdditionalData,
        @Ctx() ctx: IContextApp) {
        return InvoiceItem.insertUpdateOne(additionalData, data, id, ctx)
    }
}
