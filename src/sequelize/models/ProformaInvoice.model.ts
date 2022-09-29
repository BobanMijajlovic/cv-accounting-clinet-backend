import 'reflect-metadata'
import {
    AutoIncrement,
    BeforeCreate,
    BeforeUpdate,
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
}                          from 'sequelize-typescript'
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
}                          from 'type-graphql'
import {
    Address,
    Customer,
    Item,
    throwArgumentValidationError,
    Warehouse
}                          from './index'
import {
    createBaseResolver,
    IContextApp,
    TModelResponse,
    TModelResponseSelectAll
}                          from '../graphql/resolvers/basic'
import Client              from './Client.model'
import {
    InvoiceHeaderType,
    InvoiceType
}                          from '../graphql/types/Invoice'
import CurrencyDefinition  from './CurrencyDefinition.model'
import InvoiceDiscount     from './InvoiceDiscount.model'
import Tax                 from './Tax.model'
import TaxValue            from './TaxValue.model'
import Expense             from './Expense.model'
import ExpenseItem         from './ExpenseItem.model'
import InvoiceItem         from './InvoiceItem.model'
import {
    CONSTANT_MODEL,
    WAREHOUSE_TYPE
}                          from '../constants'
import InvoiceItemDiscount from './InvoiceItemDiscount.model'
import {IWarehouseItem}    from '../graphql/types/Warehouse'
import WarehouseItemInfo   from './WarehouseItemInfo.model'
import Invoice             from './Invoice.model'
import Notes               from './Notes.model'
import {checkJWT}          from '../graphql/middlewares'
import * as InvoiceUtils   from './Invoice.utils'
import TaxFinance          from './TaxFinance.model'

interface IItemForWarehouse {
    warehouseId: number,
    items: Partial<IWarehouseItem>[]
}

interface IItemWithWarehouseItemInfo {
    item: Item,
    quantity: number
    warehouseItemInfo: WarehouseItemInfo
}

export interface IItemsByWarehouse {
    warehouseId: number,
    items: IItemWithWarehouseItemInfo[]
}

@ObjectType()
@Table({
    tableName: 'proforma_invoice',
})

export default class ProformaInvoice extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: WAREHOUSE_TYPE.WHOLESALE,
        comment: 'define what kind of sale by warehouse items'
    })
    flag: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(32),
    })
    number: string

    @Field(type => Date)
    @Column({
        allowNull: false,
        type: DataType.DATE
    })
    date: Date

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        comment: 'Total net for faster search',
        field: 'total_finance_net_vp'
    })
    totalFinanceVP: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        comment: 'Total finance for faster search',
        field: 'total_finance_tax'
    })
    totalFinanceTax: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        comment: 'Total mp for faster search',
        field: 'total_finance_mp'
    })
    totalFinanceMP: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        comment: 'Currency value for faster search',
        field: 'currency_value'
    })
    currencyValue: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        comment: 'Default discount percent',
        field: 'discount_default'
    })
    discountDefault: number

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.PROFORMA_INVOICE_STATUS.OPENED
    })
    status: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => CurrencyDefinition)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_currency_id'
    })
    currencyId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Invoice)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_invoice_id'
    })
    invoiceId: number

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

    @Field(type => Customer, {nullable: true})
    @BelongsTo(() => Customer)
    customer: Customer

    @Field(type => Invoice, {nullable: true})
    @BelongsTo(() => Invoice)
    invoice: Invoice

    @Field(type => [TaxFinance], {nullable: true})
    @HasMany(() => TaxFinance)
    vats: TaxFinance[]

    @Field(type => [InvoiceDiscount], {nullable: true})
    @HasMany(() => InvoiceDiscount)
    discount: InvoiceDiscount[]

    @Field(type => [Notes], {nullable: true})
    @HasMany(() => Notes)
    notes: Notes[]

    @Field(type => [Expense], {nullable: true})
    @HasMany(() => Expense, {onDelete: 'CASCADE'})
    expense: Expense[]

    @Field(type => [InvoiceItem], {nullable: true})
    @HasMany(() => InvoiceItem)
    items: InvoiceItem[]

    static async _validate (instance: ProformaInvoice, options: any, update: boolean) {
        await InvoiceUtils.validate<ProformaInvoice>(ProformaInvoice, instance, options, update)
    }

    /** hooks */
    @BeforeCreate({name: 'beforeCreateHook'})
    static async _beforeCreateHook (instance: ProformaInvoice, options: any) {
        await ProformaInvoice._validate(instance, options, false)
    }

    @BeforeUpdate({name: 'beforeUpdateHook'})
    static async _beforeUpdateHook (instance: ProformaInvoice, options: any) {
        await ProformaInvoice._validate(instance, options, true)
    }

    public static includeOptions = () => {
        return [
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
                model: Invoice,
                required: false
            },
            {
                model: InvoiceDiscount,
                required: false
            },
            {
                model: Notes,
                required: false
            },
            {
                model: TaxFinance,
                required: false,
                include: [
                    {
                        model: Tax,
                        include: [TaxValue]
                    }
                ]
            },
            {
                model: Expense,
                required: false,
                include: [
                    {
                        model: ExpenseItem,
                        include: [
                            {
                                model: Tax,
                                include: [TaxValue]
                            }
                        ]
                    },
                    {
                        model: Customer
                    }
                ]
            },
            {
                model: InvoiceItem,
                required: false,
                include: [
                    {
                        model: Item,
                        include: [
                            {
                                model: Tax,
                                include: [TaxValue]
                            }
                        ]
                    },
                    {
                        model: Warehouse
                    },
                    {
                        model: Tax
                    },
                    {
                        model: InvoiceItemDiscount,
                        required: false
                    }
                ]
            }
        ]
    }

    public static selectOneById (id: number, clientId: number, options = {}): TModelResponse<ProformaInvoice> {
        return ProformaInvoice.findOne({
            where: {
                id: id,
                clientId
            },
            include: ProformaInvoice.includeOptions(),
            ...options
        })
    }

    public saveToWarehouse = async (options: any, ctx: any) => {

    }

    public static async selectOne (id: number, ctx: IContextApp): TModelResponse<ProformaInvoice> {
        return ProformaInvoice.selectOneById(id, ctx.clientId)
    }

    public static async selectAll (options: any, ctx: IContextApp): TModelResponseSelectAll<ProformaInvoice> {
        return ProformaInvoice.findAndCountAll(options)
    }

    private static async createInvoice (header: InvoiceHeaderType, options: any, ctx: IContextApp) {
        return InvoiceUtils.createHeaderInvoice<ProformaInvoice>(ProformaInvoice, header, options, ctx)

        /* const rec = await ProformaInvoice.findOne({
             order: [['id', 'DESC']]
         })

         let strNumber = (rec ? +rec.number.substr(16) + 1 : 1).toString()
         while (strNumber.length < 0) {
             strNumber = '0' + strNumber
         }
         const year = (new Date()).getFullYear()
             .toString()
             .substr(2)

         /!** invoice must be in form of INV-Year-number(6 digit) ( year dwo digit) *!/

         return ProformaInvoice.create({
             number: `PROFORMA-INV-${year}-${strNumber}`,
             customerId: header.customerId,
             discountDefault: header.discountDefault,
             flag: header.flag,
             date: new Date().toISOString(),
             clientId: ctx.clientId,
             status: CONSTANT_MODEL.PROFORMA_INVOICE_STATUS.OPENED,
         }, options)*/
    }

    public calcAll = async (options: any) => InvoiceUtils.recalculateInvoiceValuesFinance(this, options)

    public static async insertUpdate (id: number, entryData: InvoiceType, ctx: IContextApp): Promise<ProformaInvoice> {
        return InvoiceUtils.insertUpdate<ProformaInvoice>(ProformaInvoice, id, entryData, ctx)
    }

    public static async insertOne (entryData: InvoiceType, ctx: IContextApp): Promise<ProformaInvoice> {
        return ProformaInvoice.insertUpdate(0, entryData, ctx)
    }

    public static async updateOne (id: number, entryData: InvoiceType, ctx: IContextApp): Promise<ProformaInvoice> {
        return ProformaInvoice.insertUpdate(id, entryData, ctx)
    }

    public static async cloneProformaInvoiceById (id: number, ctx: IContextApp): Promise<ProformaInvoice> {
        const validTaxes = await Tax.getValidTax(ctx)
        if (!validTaxes) {
            throw Error('Vats not exists in system')
        }
        const transaction = await ProformaInvoice.sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}

        try {
            const pInvoice = await ProformaInvoice.selectOneById(id, ctx.clientId, options)
            if (!pInvoice) {
                throwArgumentValidationError('id', {}, {message: 'Proforma Invoice not exists or not editable'})
            }
            let newPInvoice = await ProformaInvoice.createInvoice({
                customerId: Number(pInvoice.customerId),
                discountDefault: Number(pInvoice.discountDefault),
                flag: Number(pInvoice.flag)
            }, options, ctx)

            if (!newPInvoice) {
                throwArgumentValidationError('id', {}, {message: 'Proforma invoice not exists'})
            }
            const additionalData = {
                proformaInvoiceId: Number(newPInvoice.id)
            }
            if (pInvoice.discount && pInvoice.discount.length !== 0) {
                const invoiceDiscountPromise = pInvoice.discount.filter(x => x.value || x.percent).map(x => InvoiceDiscount.insertOne({
                    percent: x.percent,
                    value: x.value,
                    description: x.description
                }, additionalData, options))
                await Promise.all(invoiceDiscountPromise)
            }

            if (pInvoice.items && pInvoice.items.length !== 0) {
                const promise = pInvoice.items.map((item) => {
                    const taxPercent = Tax.findTaxPercent(validTaxes, item.taxId)
                    return InvoiceItem.create(Object.assign({
                        clientId: ctx.clientId,
                        warehouseId: item.warehouseId,
                        itemId: item.itemId,
                        quantity: item.quantity,
                        price: item.price,
                        taxPercent,
                        taxId: item.taxId,
                        useDiscountDefault: item.useDiscountDefault,
                        financeVP: 0,
                        financeFinalVP: 0,
                        taxFinance: 0
                    }, additionalData), options)
                })
                const items = await Promise.all(promise)
                const itemDiscounts = pInvoice.items.map((item, index) => item.discount && item.discount.length !== 0 &&
                    InvoiceItemDiscount.insertOne(Number(items[index].id), {
                        percent: Number(item.discount[0].percent),
                        value: Number(item.discount[0].value),
                        description: item.discount[0].description
                    }, options))
                await Promise.all(itemDiscounts)
            }
            if (pInvoice.expense && pInvoice.expense.length !== 0) {
                if (pInvoice.expense && (pInvoice.expense as any).items && !pInvoice.expense.every(e => e.items.length)) {
                    throwArgumentValidationError('additionalExpense', pInvoice.expense, {message: 'Expense must have even one item'})
                }
                const expensePromise = pInvoice.expense.map((e: any) => Expense.insertOne({
                    financeMP: Number(e.financeMP),
                    financeTax: Number(e.financeTax),
                    items: e.items && e.items.map(item => {
                        return {
                            taxId: Number(item.taxId),
                            financeMP: Number(item.financeMP),
                            description: item.description,
                        }
                    })
                }, additionalData, ctx, options))
                await Promise.all(expensePromise)
            }

            if (pInvoice.notes && pInvoice.notes.length !== 0) {
                const notePromise = pInvoice.notes.map(x => Notes.create(Object.assign({note: x.note}, additionalData), options))
                await Promise.all(notePromise)
            }
            newPInvoice = await ProformaInvoice.selectOneById(newPInvoice.id, ctx.clientId, options)
            await newPInvoice.calcAll(options)
            const prevInvoice = await ProformaInvoice.selectOneById(id, ctx.clientId, options)
            await prevInvoice.update({status: CONSTANT_MODEL.PROFORMA_INVOICE_STATUS.CANCELED}, options)
            await transaction.commit()
            return ProformaInvoice.selectOne(newPInvoice.id, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    public static async generateInvoice (id: number, ctx: IContextApp): Promise<ProformaInvoice> {
        const validTaxes = await Tax.getValidTax(ctx)
        if (!validTaxes) {
            throw Error('Vats not exists in system')
        }

        const transaction = await Invoice.sequelize.transaction()

        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }

        const options = {transaction, validate: true}

        try {
            const pInvoice = await ProformaInvoice.selectOneById(id, ctx.clientId, options)
            if (!pInvoice) {
                throwArgumentValidationError('id', {}, {message: 'Proforma Invoice not exists or not editable'})
            }

            if (!pInvoice.items || pInvoice.items.length === 0) {
                throwArgumentValidationError('id', {}, {message: 'Proforma invoice items not add. To finish proforma invoice, first you need to add some items.'})
            }

            let invoice = await Invoice.createInvoice({
                customerId: Number(pInvoice.customerId),
                discountDefault: Number(pInvoice.discountDefault),
                flag: Number(pInvoice.flag)
            }, options, ctx)

            if (!invoice) {
                throwArgumentValidationError('id', {}, {message: 'Invoice not exists'})
            }

            const additionalData = {
                invoiceId: Number(invoice.id)
            }
            if (pInvoice.discount && pInvoice.discount.length !== 0) {
                const invoiceDiscountPromise = pInvoice.discount.filter(x => x.value || x.percent).map(x => InvoiceDiscount.insertOne({
                    percent: x.percent,
                    value: x.value,
                    description: x.description
                }, additionalData, options))
                await Promise.all(invoiceDiscountPromise)
            }

            if (pInvoice.items?.length !== 0) {
                const promise = pInvoice.items.map((item) => {
                    const taxPercent = Tax.findTaxPercent(validTaxes, item.taxId)
                    return InvoiceItem.create(Object.assign({
                        clientId: ctx.clientId,
                        warehouseId: item.warehouseId,
                        itemId: item.itemId,
                        quantity: item.quantity,
                        price: item.price,
                        taxPercent,
                        taxId: item.taxId,
                        useDiscountDefault: item.useDiscountDefault,
                        financeVP: 0,
                        financeFinalVP: 0,
                        taxFinance: 0
                    }, additionalData), options)
                })
                const items = await Promise.all(promise)
                const itemDiscounts = pInvoice.items.map((item, index) => item.discount && item.discount.length !== 0 &&
                    InvoiceItemDiscount.insertOne(Number(items[index].id), {
                        percent: Number(item.discount[0].percent),
                        value: Number(item.discount[0].value),
                        description: item.discount[0].description
                    }, options))
                await Promise.all(itemDiscounts)
            }

            if (pInvoice.expense && pInvoice.expense.length !== 0) {
                if (pInvoice.expense && (pInvoice.expense as any).items && !pInvoice.expense.every(e => e.items.length)) {
                    throwArgumentValidationError('additionalExpense', pInvoice.expense, {message: 'Expense must have even one item'})
                }

                const expensePromise = pInvoice.expense.map((e: any) => Expense.insertOne({
                    financeMP: Number(e.financeMP),
                    financeTax: Number(e.financeTax),
                    items: e.items && e.items.map(item => {
                        return {
                            taxId: Number(item.taxId),
                            financeMP: Number(item.financeMP),
                            description: item.description,
                        }
                    })
                }, additionalData, ctx, options))
                await Promise.all(expensePromise)
            }

            invoice = await Invoice.selectOneById(Number(invoice.id), ctx.clientId, options)
            await invoice.calcAll(options)
            await pInvoice.update({invoiceId: invoice.id, status: CONSTANT_MODEL.INVOICE_STATUS.SAVED}, options)
            await transaction.commit()
            return ProformaInvoice.selectOne(pInvoice.id, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }
}

const BaseResolver = createBaseResolver(ProformaInvoice, {
    updateInputType: InvoiceType,
    insertInputType: InvoiceType
})

@Resolver()
export class ProformaInvoiceResolver extends BaseResolver {

    @UseMiddleware(checkJWT)
    @Mutation(returns => ProformaInvoice, {name: 'cloneProformaInvoice'})
    async _cloneProformaInvoiceById (@Arg('id', type => Int) id: number,
        @Ctx() ctx: IContextApp) {
        return ProformaInvoice.cloneProformaInvoiceById(id, ctx)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => ProformaInvoice, {name: 'generateInvoice'})
    async _generateInvoiceByProformaInvoice (@Arg('id', type => Int) id: number,
        @Ctx() ctx: IContextApp) {
        return ProformaInvoice.generateInvoice(id, ctx)
    }

}
