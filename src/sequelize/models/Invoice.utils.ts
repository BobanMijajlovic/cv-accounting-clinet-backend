import {
    InvoiceHeaderType,
    InvoiceType
}                                                from '../graphql/types/Invoice'
import {
    IContextApp,
    TModelResponse
}                                                from '../graphql/resolvers/basic'
import Tax                                       from './Tax.model'
import {
    Address,
    Customer,
    Item,
    throwArgumentValidationError,
    Warehouse
}                                                from './index'
import {CONSTANT_MODEL}                          from '../constants'
import _                                         from 'lodash'
import Expense                                   from './Expense.model'
import Notes                                     from './Notes.model'
import {sequelize}                               from '../sequelize'
import {ClassType}                               from 'type-graphql'
import {
    BasicInvoice,
    InvoiceModelUtils,
    InvoiceUtilsAdditionalData,
    TSumFinance
}                                                from '../graphql/types/basic'
import InvoiceItem                               from './InvoiceItem.model'
import TaxValue                                  from './TaxValue.model'
import ExpenseItem                               from './ExpenseItem.model'
import InvoiceItemDiscount                       from './InvoiceItemDiscount.model'
import {TransactionCustomerSummarize}            from '../graphql/types/Customer'
import Sequelize                                 from 'sequelize'
import Invoice                                   from './Invoice.model'
import {compareTwoDates}                         from '../utils'
import DueDates                                  from './DueDates.model'
import TaxFinance                                from './TaxFinance.model'
import Discounts                                 from './Discounts.model'

export const selectOneById = <T extends BasicInvoice>(ModelClass: ClassType, id: number, clientId: number, options = {}): TModelResponse<T> => {
    const model: InvoiceModelUtils<T> = sequelize.models[ModelClass.name]
    return model.findOne({
        where: {
            id: id,
            clientId
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
                model: Discounts,
                required: false
            },
            {
                model: Notes,
                required: false
            },
            {
                model: DueDates,
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
        ],
        ...options
    }) as any as TModelResponse<T>
}

export const invoiceGetAdditionalData = (name: string, id: number) => {
    switch (name) {
        case 'Invoice':
            return {
                invoiceId: id
            }
        case 'ReturnInvoice':
            return {
                returnInvoiceId: id
            }
        case 'ProformaInvoice':
            return {
                proformaInvoiceId: id
            }
        default:
            return {}
    }
}

export const totalTransactionByCustomer = async <T extends BasicInvoice>(ModelClass: ClassType, ctx: IContextApp, customerId?: number, dateStart?: Date, dateEnd?: Date): Promise<TransactionCustomerSummarize> => {
    if (!dateStart) {
        dateStart = new Date(2000, 1, 1)
    }

    if (!dateEnd) {
        dateEnd = new Date()
        dateEnd.setDate(dateEnd.getDate() + 1)
    }
    const model: InvoiceModelUtils<T> = sequelize.models[ModelClass.name]
    const res = model.findOne({
        where: Object.assign({
            clientId: ctx.clientId,
            status: CONSTANT_MODEL.INVOICE_STATUS.SAVED,
            date: {
                [Sequelize.Op.and]: {
                    [Sequelize.Op.gte]: dateStart,
                    [Sequelize.Op.lte]: dateEnd
                },
            },
        }, customerId ? {customerId: customerId} : null),
        attributes: [[Sequelize.fn('sum', Sequelize.col('total_finance_mp')), 'finance']]
    })

    const [result, customer] = await Promise.all([res, Customer.findByPk(customerId)])
    return {
        customer,
        finance: (result as TSumFinance<T>).getDataValue('finance') || 0
    }
}

export const createHeaderInvoice = async <T extends BasicInvoice>(ModelClass: ClassType, header: InvoiceHeaderType, options: any, ctx: IContextApp): Promise<T> => {

    const model: InvoiceModelUtils<T> = sequelize.models[ModelClass.name]

    const invoiceNumber = (() => {
        const name = ModelClass.name
        if (name === 'Invoice') {
            return 'INV'
        }
        if (name === 'ProformaInvoice') {
            return 'PROFORMA-INV'
        }
        if (name === 'ReturnInvoice') {
            return 'RETURN-INV'
        }
        return ''
    })()

    const rec = await model.findOne({
        order: [['id', 'DESC']],
        ...options
    }) as T

    let strNumber = (rec ? +rec.number.substr(invoiceNumber.length + 4) + 1 : 1).toString()
    while (strNumber.length < 0) {
        strNumber = '0' + strNumber
    }
    const year = (new Date()).getFullYear()
        .toString()
        .substr(2)

    /** invoice must be in form of INV-Year-number(6 digit) ( year dwo digit) */

    return model.create({
        number: `${invoiceNumber}-${year}-${strNumber}`,
        customerId: header.customerId,
        discountDefault: header.discountDefault || 0,
        flag: header.flag,
        date: header.date ? header.date : new Date().toISOString(),
        clientId: ctx.clientId,
        status: CONSTANT_MODEL.PROFORMA_INVOICE_STATUS.OPENED,
    } as any, options) as any
}

export const insertInvoiceTaxes = async <T extends BasicInvoice>(ModelClass: ClassType, instance: T, ctx: IContextApp, options: any): Promise<void> => {
    const additionalData = invoiceGetAdditionalData(ModelClass.name, instance.id)
    const _taxes = instance.items.reduce((acc: any, x: InvoiceItem) => {
        const index = acc.findIndex((y: any) => Number(y.taxId) === Number(x.taxId))
        if (index === -1) {
            return [...acc, {
                taxId: Number(x.taxId),
                financeMP: _.round(_.add(x.taxFinance, x.financeFinalVP), 2),
                flag: CONSTANT_MODEL.TAX_FINANCE_FLAG.OUT,
                date: instance.date
            }]
        }
        const vat = acc[index]
        acc.splice(index, 1, {
            ...vat,
            taxId: Number(vat.taxId),
            financeMP: _.round(_.add(Number(vat.financeMP), _.add(x.taxFinance, x.financeFinalVP)), 2)
        })
        return acc
    }, [])
    const proms = _taxes.map(x => TaxFinance.insertOne({
        ...additionalData,
        ...x
    }, ctx, options))
    await Promise.all(proms)

}

export const recalculateInvoiceValuesFinance = async <T extends BasicInvoice>(instance: T, options: any): Promise<void> => {
    const arr = instance.items.map(i => {
        i.calcMissingValues(instance as any)
        i.save(options)
    })
    await Promise.all(arr)
    instance.totalFinanceVP = instance.items.reduce((acc, item) => _.add(acc, item.financeFinalVP), 0)
    const totalExpenses = instance.expense.reduce((acc, exp) => _.add(acc, _.subtract(exp.financeMP, exp.financeTax)), 0)
    instance.totalFinanceVP = _.round(_.add(instance.totalFinanceVP, totalExpenses), 2)

    instance.totalFinanceTax = instance.items.reduce((acc, item) => _.add(acc, item.taxFinance), 0)
    const totalExpensesTax = instance.expense.reduce((acc, exp) => _.add(acc, exp.financeTax), 0)
    instance.totalFinanceTax = _.round(_.add(instance.totalFinanceTax, totalExpensesTax), 2)

    instance.totalFinanceMP = _.round(_.add(instance.totalFinanceTax, instance.totalFinanceVP), 2)

    /** * check due Date  */
    await instance.save(options)
}

export const insertUpdate = async <T extends BasicInvoice>(ModelClass: ClassType, id: number, entryData: InvoiceType, ctx: IContextApp): Promise<T> => {
    const validTaxes = await ctx.taxes
    if (!validTaxes) {
        throw Error('Vats not exists in system')
    }

    const model: InvoiceModelUtils<T> = sequelize.models[ModelClass.name]
    let additionalData: InvoiceUtilsAdditionalData = {}

    if (entryData.header) {
        const header = entryData.header
        if (!header) {
            throwArgumentValidationError('header', entryData, {message: 'Header must exists'})
        }

        const transaction = await sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}
        try {

            let invoice = id !== 0 ? await model.findOne({
                where: {
                    id,
                    clientId: ctx.clientId,
                    status: CONSTANT_MODEL.INVOICE_STATUS.OPENED /** for now **/
                },
                ...options
            }) as T : await model.createInvoice(header, options, ctx) as T

            if (!invoice) {
                throwArgumentValidationError('id', header, {message: 'Invoice not exists or not editable'})
            }
            additionalData = invoiceGetAdditionalData(ModelClass.name, invoice.id)
            if (id) {
                await invoice.update(header,options)
                invoice = await model.selectOneById(invoice.id, ctx.clientId, options)
                if (invoice.items) {
                    await invoice.calcAll(options)
                }
            }
            await transaction.commit()
            return model.selectOne(invoice.id, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    if (entryData.footer) {
        const footer = entryData.footer

        if (!footer) {
            throwArgumentValidationError('footer', entryData, {message: 'Footer must exists'})
        }

        if (!id) {
            throwArgumentValidationError('id', footer, {message: 'Invoice not exists or not editable'})
        }
        const transaction = await sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}
        try {
            let invoice = await model.selectOneById(id, ctx.clientId, options)
            if (!invoice || invoice.status !== CONSTANT_MODEL.INVOICE_STATUS.OPENED) {
                throwArgumentValidationError('id', footer, {message: 'Invoice not exists or not editable'})
            }
            additionalData = invoiceGetAdditionalData(ModelClass.name, invoice.id)

            await invoice.update(_.omit(footer, ['notes', 'discount', 'dueDates', 'additionalExpense']), options)

            if (footer.discount) {
                await Discounts.deletedRecords(additionalData, options)
                if (footer.discount.length) {
                    await Discounts.insertRows(footer.discount.map(d => ({...d, ...additionalData})), ctx, options)
                }
            }

            if (footer.dueDates) {
                await DueDates.deletedRecords(additionalData, options)
                const dueDates = footer.dueDates.reduce((acc: any, dueDate) => {
                    const index = acc.findIndex(x => compareTwoDates(x.dueDate, dueDate.dueDate))
                    if (index === -1) {
                        return [...acc, dueDate]
                    }
                    acc[index].finance = _.round(_.add(acc[index].finance, dueDate.finance), 2)
                    return acc
                }, []).map((d: any) => ({
                    finance: d.finance,
                    customerId: invoice.customerId,
                    date: new Date(d.dueDate).toISOString(),
                    description: d.description,
                    flag: ModelClass.name === 'ReturnInvoice' ? CONSTANT_MODEL.TAX_FINANCE_FLAG.IN : CONSTANT_MODEL.TAX_FINANCE_FLAG.OUT,
                    ...additionalData
                }))
                await DueDates.insertRows(dueDates, ctx, options)
            }

            if (footer.notes) {
                await Notes.deletedRecords(additionalData, options)
                const prom = footer.notes.map(x => ({
                    ...x,
                    ...additionalData
                }))
                await Notes.insertNotes(prom, ctx, options)
            }

            if (footer.additionalExpense) {
                await Expense.deletedRecords(additionalData, options)
                if (footer.additionalExpense.length !== 0) {
                    if (footer.additionalExpense && (footer.additionalExpense as any).items && !footer.additionalExpense.every(e => e.items.length)) {
                        throwArgumentValidationError('additionalExpense', footer.additionalExpense, {message: 'Expense must have even one item'})
                    }
                    await Expense.insertRows(footer.additionalExpense, additionalData, ctx, options)
                }
            }

            invoice = await model.selectOneById(id, ctx.clientId, options)
            await invoice.calcAll(options)
            await transaction.commit()
            return model.selectOne(invoice.id, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    if (entryData.status && id) {
        if (entryData.status === CONSTANT_MODEL.INVOICE_STATUS.SAVED) {
            const transaction = await sequelize.transaction()
            if (!transaction) {
                throw Error('Transaction can\'t be open')
            }

            const options = {transaction, validate: true}
            try {
                const invoice = await model.selectOneById(id, ctx.clientId, options)
                if (!invoice || invoice.status !== CONSTANT_MODEL.INVOICE_STATUS.OPENED) {
                    throwArgumentValidationError('id', {}, {message: 'Invoice not exists or not editable'})
                }
                const additionalData = invoiceGetAdditionalData(ModelClass.name, invoice.id)
                await invoice.update({status: CONSTANT_MODEL.INVOICE_STATUS.SAVED}, options)

                await invoice.calcAll(options)
                if (model.name !== 'ProformaInvoice') {
                    const totalDueDates = _.round(invoice.dueDates.reduce((acc, due) => _.add(acc, due.finance), 0), 2)
                    if (totalDueDates !== invoice.totalFinanceMP) {
                        throw ('Due dates not match total value')
                    }
                    await DueDates.markActiveRecords(additionalData, options)
                    await TaxFinance.markActiveRecords(additionalData, options)
                    await invoice.saveToWarehouse(options, ctx)
                }

                await transaction.commit()
                return model.selectOne(invoice.id, ctx)
            } catch (e) {
                await transaction.rollback()
                throw (e)
            }

        }

        if (entryData.status === CONSTANT_MODEL.INVOICE_STATUS.CANCELED) {
            const transaction = await sequelize.transaction()
            if (!transaction) {
                throw Error('Transaction can\'t be open')
            }
            const options = {transaction, validate: true}
            try {
                const invoice = await model.selectOneById(id, ctx.clientId, options)

                if (!invoice || invoice.status !== CONSTANT_MODEL.INVOICE_STATUS.OPENED) {
                    throwArgumentValidationError('id', {}, {message: 'Invoice not exists or not editable'})
                }
                const additionalData = invoiceGetAdditionalData(ModelClass.name, invoice.id)
                await invoice.calcAll(options)
                await invoice.update({status: entryData.status}, options)
                await DueDates.deletedRecords(additionalData, options)
                await Notes.deletedRecords(additionalData, options)

                await transaction.commit()
                return model.selectOne(invoice.id, ctx)
            } catch (e) {
                await transaction.rollback()
                throw (e)
            }
        }
    }
}

export const validate = async <T extends BasicInvoice>(ModelClass: ClassType, instance: T, options: any, update: boolean): Promise<void> => {
    const model = sequelize.models[ModelClass.name]
    const customer = await Customer.findOne({
        where: {
            clientId: instance.clientId,
            id: instance.customerId
        },
        ...options
    })
    !customer && (!update || customer.id !== instance.id) && throwArgumentValidationError('customerId', instance, {message: 'Customer not defined'})

    const data = await model.findOne({
        where: {
            clientId: instance.clientId,
            number: instance.number
        },
        ...options
    })
    data && (!update || data.id !== instance.id) && throwArgumentValidationError('number', instance, {message: 'Invoice number already exists'})
}
