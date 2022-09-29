import 'reflect-metadata'
import {
    Arg,
    Ctx,
    Field,
    ID,
    Int,
    ObjectType,
    Query,
    Resolver,
    UseMiddleware
}                                     from 'type-graphql'
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
    Min,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}                                     from 'sequelize-typescript'
import Client                         from './Client.model'
import {
    Address,
    Customer,
    Item,
    setUserFilterToWhereSearch,
    throwArgumentValidationError,
    Warehouse
}                                     from './index'
import Expense                        from './Expense.model'
import CalculationItem                from './CalculationItem.model'
import {
    createBaseResolver,
    IContextApp,
    TModelResponseSelectAll
}                                     from '../graphql/resolvers/basic'
import {
    CalculationHeaderType,
    CalculationType,
    ExpenseType
}                                     from '../graphql/types/Calculation'
import Tax                            from './Tax.model'
import {CONSTANT_MODEL}               from '../constants'
import _                              from 'lodash'
import ExpenseItem                    from './ExpenseItem.model'
import TaxValue                       from './TaxValue.model'
import WarehouseItem                  from './WarehouseItem.model'
import {IWarehouseItem}               from '../graphql/types/Warehouse'
import WarehouseFinance               from './WarehouseFinance.model'
import Sequelize                      from 'sequelize'
import {TransactionCustomerSummarize} from '../graphql/types/Customer'
import {checkJWT}                     from '../graphql/middlewares'
import {TSumFinance}                  from '../graphql/types/basic'
import DueDates                       from './DueDates.model'
import TaxFinance                     from './TaxFinance.model'
import Discounts                      from './Discounts.model'

@ObjectType()
@Table({
    tableName: 'calculation',
    underscored: true,
    indexes: [
        {
            name: 'sum-by-customer-calculation',
            unique: false,
            using: 'BTREE',
            fields: ['fk_client_id', 'fk_supplier_id', 'status', 'date']

        }
    ]
})
export default class Calculation extends Model {
    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field({nullable: true})
    @Column({
        allowNull: false,
        type: DataType.STRING(32),
        comment: 'calculation number'
    })
    number: string

    @Field({nullable: true})
    @Column({
        allowNull: false,
        type: DataType.STRING(64),
        field: 'invoice_number',
        comment: 'invoice number'
    })
    invoiceNumber: string

    @Field({nullable: true})
    @Min(0)
    @Column({
        allowNull: true,
        type: DataType.DECIMAL(10, 2),
        comment: 'Total finance items + internal expenses ( same client ) but out of external expenses',
        field: 'total_finance_vp'
    })
    totalFinanceVP: number

    @Field()
    @Min(0)
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(10, 2),
        field: 'finance_tax'
    })
    financeTax: number

    @Field()
    @Min(0)
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(10, 2),
        field: 'total_finance_mp'
    })
    totalFinanceMP: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        field: 'expense_internal_finance_mp'
    })
    expenseInternalFinanceMP: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        field: 'expense_internal_finance_tax'
    })
    expenseInternalFinanceTax: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        field: 'expense_total_finance_mp'
    })
    expenseTotalFinanceMP: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        field: 'expense_total_finance_tax'
    })
    expenseTotalFinanceTax: number

    @Field(type => Date, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.DATE,
        comment: 'Date of calculation'
    })
    date: Date

    @Field(type => Date, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.DATE,
        field: 'invoice_date',
        comment: 'Date of invoice'
    })
    invoiceDate: Date

    @Field(type => Date, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.DATE,
        field: 'book_date',
        comment: 'Date of book calculation'
    })
    bookDate: Date

    @Field(type => Int)
    @ForeignKey(() => Client)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_client_id'
    })
    clientId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Customer)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_supplier_id'
    })
    supplierId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Warehouse)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_warehouse_id'
    })
    warehouseId: number

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_retail_shop_id'
    })
    retailShopId: number

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: 2,
        comment: 'finance no vat - 1 , finance with vat - 2, price no vat - 4, price with vat - 8',
        field: 'item_input_type'
    })
    itemInputType: number

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.CALCULATION_STATUS.OPENED,
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
    @Field(type => Client)
    @BelongsTo(() => Client)
    client: Client

    @Field(type => Customer, {nullable: true})
    @BelongsTo(() => Customer)
    supplier: Customer

    @Field(type => Warehouse, {nullable: true})
    @BelongsTo(() => Warehouse)
    warehouse: Warehouse

    @Field(type => [Discounts], {nullable: true})
    @HasMany(() => Discounts, {onDelete: 'CASCADE'})
    discount: Discounts[]

    @Field(type => [DueDates], {nullable: true})
    @HasMany(() => DueDates)
    dueDate: DueDates[]

    @Field(type => [TaxFinance], {nullable: true})
    @HasMany(() => TaxFinance)
    vats: TaxFinance[]

    @Field(type => [Expense], {nullable: true})
    @HasMany(() => Expense, {onDelete: 'CASCADE'})
    expense: Expense[]

    @Field(type => [CalculationItem], {nullable: true})
    @HasMany(() => CalculationItem)
    items: CalculationItem[]

    static async _validate (instance: Calculation, options: any, update: boolean) {
        const customer = await Customer.findOne({
            where: {
                clientId: instance.clientId,
                id: instance.supplierId
            },
            ...options
        })
        !customer && (!update || customer.id !== instance.id) && throwArgumentValidationError('supplierId', instance, {message: 'Supplier not defined'})

        const calc = await Calculation.findOne({
            where: {
                clientId: instance.clientId,
                number: instance.number
            },
            ...options
        })
        calc && (!update || calc.id !== instance.id) && throwArgumentValidationError('number', instance, {message: 'Calculation number already exists'})

    }

    /** hooks */
    @BeforeCreate({name: 'beforeCreateHook'})
    static async _beforeCreateHook (instance: Calculation, options: any) {
        await Calculation._validate(instance, options, false)
    }

    @BeforeUpdate({name: 'beforeUpdateHook'})
    static async _beforeUpdateHook (instance: Calculation, options: any) {
        await Calculation._validate(instance, options, true)
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
                model: Discounts,
                required: false
            },
            {
                model: DueDates,
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
                model: CalculationItem,
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
                        model: Tax
                    }
                ]
            },
            {
                model: Warehouse,
                required: false
            }
        ]
    }

    private mixItemsForFix = () => {
        const item = this.items[0]
        this.items.shift()
        this.items.push(item)
        /* const insertIndex = this.items.length > 10 ? 10 : this.items.length
        this.items.splice(insertIndex, 0, item)*/
    }

    private sortItemsForReCalculate = () => {
        this.items.sort((a: CalculationItem, b: CalculationItem) => _.subtract(b.financeMP, a.financeMP))
    }

    private reduceMPFinale = async (field, totalMP, options) => {
        // const totalMP = _.round(_.add(this.totalFinanceMP, this.totalExpenseExternal()))
        let sumItems = _.round(this.items.reduce((acc: number, item: CalculationItem) => _.add(acc, item[field]), 0), 2)
        const diff = _.multiply(_.divide(Math.abs(_.subtract(totalMP, sumItems)), totalMP), 100)
        const direction = sumItems < totalMP
        if (diff > 0.2) {
            for (let i = 0; i < this.items.length; i++) {
                const item = this.items[i]
                const difference = _.round(_.divide(_.multiply(item[field], diff), 100), 2)
                if (difference === 0) {
                    continue
                }
                item[field] = _.round(direction ? _.add(item[field], difference) : _.subtract(item[field], difference), 2)
            }
        }

        sumItems = _.round(this.items.reduce((acc: number, item: CalculationItem) => _.add(acc, item[field]), 0), 2)
        this.sortItemsForReCalculate()
        while (sumItems !== totalMP) {
            const item = this.items[0]
            item[field] = _.round(sumItems > totalMP ? _.subtract(item[field], 0.01) : _.add(item[field], 0.01), 2)
            await item.save(options)
            this.mixItemsForFix()
            sumItems = _.round(this.items.reduce((acc: number, item: CalculationItem) => _.add(acc, item[field]), 0), 2)
        }
    }

    private reduceVPFinale = async (fieldMP, fieldVP, total, options) => {
        let sumItems = _.round(this.items.reduce((acc: number, item: CalculationItem) => _.add(acc, _.subtract(item[fieldMP], item[fieldVP])), 0), 2)
        const diff = _.multiply(_.divide(Math.abs(_.subtract(total, sumItems)), total), 100)
        const direction = sumItems > total
        if (diff > 0.2) {
            for (let i = 0; i < this.items.length; i++) {
                const item = this.items[i]
                const difference = _.round(_.divide(_.multiply(item[fieldVP], diff), 100), 2)
                if (difference === 0) {
                    continue
                }
                item[fieldVP] = _.round(direction ? _.add(item[fieldVP], difference) : _.subtract(item[fieldVP], difference), 2)
            }
        }

        this.sortItemsForReCalculate()
        while (sumItems !== total) {
            const item = this.items[0]
            item[fieldVP] = _.round(sumItems > total ? _.add(item[fieldVP], 0.01) : _.subtract(item[fieldVP], 0.01), 2)
            await item.save(options)
            this.mixItemsForFix()
            sumItems = _.round(this.items.reduce((acc: number, item: CalculationItem) => _.add(acc, _.subtract(item[fieldMP], item[fieldVP])), 0), 2)
        }
    }

    /** fix MP for items to be the same like in header */
    private recalculateItemsData = async (options) => {

        const financeByCalc = _.round(_.subtract(this.totalFinanceMP, this.totalExpenseInternal()), 2)
        let sumItems = _.round(this.items.reduce((acc: number, item: CalculationItem) => _.add(acc, item.financeMP), 0), 2)
        let diff = _.multiply(_.divide(Math.abs(_.subtract(financeByCalc, sumItems)), financeByCalc), 100)
        if (diff > 1) {
            throwArgumentValidationError('header', this, {message: 'Total finance items can not differ more then 1%'})
        }
        this.sortItemsForReCalculate()
        while (sumItems !== financeByCalc) {
            const item = this.items[0]
            item.financeMP = _.round(sumItems > financeByCalc ? _.subtract(item.financeMP, 0.01) : _.add(item.financeMP, 0.01), 2)
            await item.save(options)
            this.mixItemsForFix()
            sumItems = _.round(this.items.reduce((acc: number, item: CalculationItem) => _.add(acc, item.financeMP), 0), 2)
        }

        /** recalculate internal expenses */
        if (this.totalExpenseInternal() === 0) {
            for (let i = 0; i < this.items.length; i++) {
                const item = this.items[i]
                item.financeExpInternalMP = item.financeMP
                item.financeExpInternalVP = item.financeVP
                await item.save(options)
            }
        } else {
            const totalFinanceItems = _.round(_.subtract(this.totalFinanceMP, this.totalExpenseInternal()), 2)
            const totalExpenses = this.totalExpenseInternal()
            const totalExpTax = this.totalExpenseInternalTax()
            for (let i = 0; i < this.items.length; i++) {
                const item = this.items[i]
                const relation = _.divide(item.financeMP, totalFinanceItems)
                item.financeExpInternalMP = _.round(_.add(_.round(_.multiply(totalExpenses, relation), 2), item.financeMP), 2)
                const taxBase = _.round(_.subtract(totalExpenses, totalExpTax), 2)
                item.financeExpInternalVP = _.round(_.add(item.financeVP, _.round(_.multiply(taxBase, relation), 2)), 2)
                await item.save(options)
            }
        }
        /**  remove some articles that not effect expenses to price  --  FIXME */

        await this.reduceMPFinale('financeExpInternalMP', this.totalFinanceMP, options)

        /**  fix the total tax */

        sumItems = _.round(this.items.reduce((acc: number, item: CalculationItem) => _.add(acc, _.subtract(item.financeExpInternalMP, item.financeExpInternalVP)), 0), 2)
        diff = _.multiply(_.divide(Math.abs(_.subtract(this.financeTax, sumItems)), this.financeTax), 100)
        if (diff > 1) {
            throwArgumentValidationError('header', this, {message: 'Total tax items can not differ more then 1%'})
        }

        await this.reduceVPFinale('financeExpInternalMP', 'financeExpInternalVP', this.financeTax, options)

        if (this.totalExpenseExternal() === 0) {
            for (let i = 0; i < this.items.length; i++) {
                const item = this.items[i]
                item.financeFinalMP = item.financeExpInternalMP
                item.financeFinalVP = item.financeExpInternalVP
                await item.save(options)
            }
        } else {
            /** should calculate with external */
            const totalFinanceItems = _.round(_.subtract(this.totalFinanceMP, this.totalExpenseInternal()), 2)
            const totalExpenses = this.totalExpenseExternal()
            const totalExpensesTax = this.totalExpenseExternalTax()
            for (let i = 0; i < this.items.length; i++) {
                const item = this.items[i]
                const relation = _.divide(item.financeMP, totalFinanceItems)
                item.financeFinalMP = _.round(_.add(_.multiply(totalExpenses, relation), item.financeExpInternalMP), 2)
                const taxBase = _.round(_.subtract(totalExpenses, totalExpensesTax), 2)
                item.financeFinalVP = _.round(_.add(item.financeExpInternalVP, _.multiply(taxBase, relation)), 2)
                await item.save(options)
            }

            /** fix final finance to be same as total + expenses (ext) */
            const totalMP = _.round(_.add(this.totalFinanceMP, this.totalExpenseExternal()))
            const totalTax = _.round(_.add(this.financeTax, totalExpensesTax), 2)
            await this.reduceMPFinale('financeFinalMP', totalMP, options)
            await this.reduceVPFinale('financeFinalMP', 'financeFinalVP', totalTax, options)
        }

    }

    public static async getCalculationById (id, options = {}): Promise<Calculation> {
        return Calculation.findOne({
            where: {
                id: id
            },
            include: Calculation.includeOptions(),
            ...options
        })
    }

    public static async selectOne (id: number, ctx?: IContextApp): Promise<Calculation> {
        return Calculation.getCalculationById(id)
    }

    public static async selectAll (options: any, ctx: IContextApp): TModelResponseSelectAll<Calculation> {
        options = setUserFilterToWhereSearch(options, ctx)
        return Calculation.findAndCountAll(options)
    }

    public totalExpenseExternal = () => {
        return _.round(this.expense.reduce((acc: number, v: Expense) => {
            if (!v.invoiceNumber) {
                return acc
            }
            /** this is external expense */
            return _.add(acc, v.financeMP)
        }, 0), 2)
    }

    public totalExpenseExternalTax = () => {
        return _.round(this.expense.reduce((acc: number, v: Expense) => {
            if (!v.invoiceNumber) {
                return acc
            }
            return _.add(acc, v.financeTax)
        }, 0), 2)
    }

    public totalExpenseInternal = () => {
        const totalExpense = _.round(this.expense.reduce((acc: number, v: Expense) => {
            if (v.invoiceNumber) {
                return acc
            }
            /** this is external expense */
            return _.add(acc, v.financeMP)
        }, 0), 2)
        return totalExpense
    }

    public totalExpenseInternalTax = () => {
        return _.round(this.expense.reduce((acc: number, v: Expense) => {
            if (v.invoiceNumber) {
                return acc
            }
            return _.add(acc, v.financeTax)
        }, 0), 2)
    }

    public getDiscount = () => this.discount?.[0]?.percent || 0

    private checkCalculationHeaderValid = () => {
        const totalDueDate = _.round(this.dueDate.reduce((acc: number, d: DueDates) => _.add(acc, Number(d.finance)), 0), 2)
        if (Number(this.totalFinanceMP) !== totalDueDate) {
            throwArgumentValidationError('header', this, {message: 'Due Date not cover total ( invoice + expenses)', source: 'DueDates'})
        }

        this.totalFinanceVP = this.totalFinanceMP - this.financeTax
        if (this.totalFinanceVP <= 0) {
            throwArgumentValidationError('header', this, {message: 'Total finance tax not valid'})
        }
        /** from here we assume that our calculation is well  entered */
    }

    private validateData = async (options) => {
        if (this.items.length === 0) {
            throwArgumentValidationError('validation', this, {message: 'No items detected !'})
        }
        this.checkCalculationHeaderValid()
        const promiseItems = this.items.map(item => {
            item.calculateMissingValues(this)
            return item.save(options)
        })
        await Promise.all(promiseItems)
        await this.save(options)
    }

    public saveToWarehouse = async (options: any, ctx: any) => {
        const warehouseItems = {
            warehouseId: this.warehouseId,
            customerId: this.supplierId,
            calculationId: this.id,
            items: this.items.map((item: CalculationItem) => ({
                item: item.item,
                quantity: item.quantity,
                finance: item.financeFinalVP
            } as IWarehouseItem))
        }

        const warehouseInfo = {
            warehouseId: this.warehouseId,
            calculationId: this.id,
            date: this.date,
            owes: _.round(this.items.reduce((acc: number, item: CalculationItem) => {
                return _.add(acc, item.financeFinalVP)
            }, 0), 2)

        }
        return Promise.all([WarehouseItem.insertBulk(warehouseItems, ctx, options), WarehouseFinance.insertOneRecordWithTransaction(warehouseInfo, options, ctx.clientId)])
    }

    public static async createCalculation (header: CalculationHeaderType, options: any, ctx: IContextApp) {
        const rec = await Calculation.findOne({
            order: [['id', 'DESC']],
            ...options
        })
        let strNumber = (rec ? +rec.number.substr(8) + 1 : 1).toString()
        while (strNumber.length < 0) {
            strNumber = '0' + strNumber
        }
        const year = (new Date()).getFullYear()
            .toString()
            .substr(2)
        return Calculation.create({
            ..._.omit(header, ['expense', 'discount', 'dueDate', 'vats']),
            number: `CALC-${year}-${strNumber}`,
            clientId: ctx.clientId,
            status: CONSTANT_MODEL.CALCULATION_STATUS.OPENED,
        }, options)
    }

    public static async insertUpdate (id: number, entryData: CalculationType, ctx: IContextApp): Promise<Calculation> {
        const validTaxes = await Tax.getValidTax(ctx)
        if (!validTaxes) {
            throw Error('Vats not exists in system')
        }
        if (entryData.header) {
            const header = entryData.header
            if (!header) {
                throwArgumentValidationError('header', entryData, {message: 'Header must exists'})
            }

            if (!header.dueDate.length) {
                throwArgumentValidationError('header', entryData, {message: 'Due Date must be defined'})
            }

            const transaction = await Calculation.sequelize.transaction()
            if (!transaction) {
                throw Error('Transaction can\'t be open')
            }
            const options = {transaction, validate: true}
            try {

                let calculation = id ? await Calculation.findOne({
                    where: {
                        id,
                        clientId: ctx.clientId,
                        status: CONSTANT_MODEL.CALCULATION_STATUS.OPENED, /** for now **/
                    },
                    ...options
                }) : await Calculation.createCalculation(header, options, ctx)

                if (!calculation) {
                    throwArgumentValidationError('id', header, {message: 'Calculation not exists or not editable'})
                }
                const additionalData = {calculationId: calculation.id}
                /** if id then it is update */
                if (id) {
                    await Promise.all([
                        TaxFinance.deletedRecords(additionalData, options),
                        Discounts.deletedRecords(additionalData, options),
                        DueDates.deletedRecords(additionalData, options),
                        Expense.deletedRecords(additionalData, options)
                    ])
                    await calculation.update(_.omit(header, ['expense', 'discount', 'dueDate', 'vats']), options)
                }

                /** better to check like this then to check in validator*/

                if (header.dueDate) {
                    const dueDates = header.dueDate.map(d => ({
                        finance: d.finance,
                        customerId: Number(calculation.supplierId),
                        date: new Date(d.date),
                        description: d.description,
                        flag: CONSTANT_MODEL.TAX_FINANCE_FLAG.IN,
                        ...additionalData
                    }))
                    await DueDates.insertRows(dueDates, ctx, options)
                }
                if (header.discount) {
                    const discounts = header.discount.map(x => ({
                        ...x,
                        ...additionalData
                    }))
                    await Discounts.insertRows(discounts, ctx, options)
                }

                if (header.vats) {
                    if (_.uniq(header.vats.map(v => v.taxId)).length !== header.vats.length) {
                        throwArgumentValidationError('header', header, {message: 'Vats must be unique'})
                    }
                    const taxPromise = header.vats.map(x => TaxFinance.insertOneCalculation({
                        ...x,
                        ...additionalData,
                        date: calculation.date,
                        flag: CONSTANT_MODEL.TAX_FINANCE_FLAG.IN
                    }, ctx, options))
                    await Promise.all(taxPromise)
                }

                if (header.expense && header.expense.length !== 0) {
                    if ((header.expense as any).items && !header.expense.every(e => e.items.length)) {
                        throwArgumentValidationError('header', header, {message: 'Expense must have even one item'})
                    }
                    const expensePromise = header.expense.map(e => {
                        const obj = {
                            items: e.items,
                        } as Partial<ExpenseType>
                        return Expense.insertOne(obj, {calculationId: calculation.id}, ctx, options)
                    })
                    await Promise.all(expensePromise)
                }

                if (header.additionalExpense && header.additionalExpense.length !== 0) {
                    if ((header.additionalExpense as any).items && !header.additionalExpense.every(e => e.items.length)) {
                        throwArgumentValidationError('header', header, {message: 'Expense must have even one item'})
                    }

                    const arrayCustomerId = _.uniq(header.additionalExpense.map(e => e.customerId))
                    const allCustomers = await Customer.findAll({
                        where: {
                            id: arrayCustomerId,
                            clientId: calculation.clientId
                        },
                        ...options
                    })

                    if (allCustomers.length !== arrayCustomerId.length) {
                        throwArgumentValidationError('header', header, {message: 'Customer not found in base'})
                    }

                    const expensePromise = header.additionalExpense.map((e, index) => {
                        if (!e.invoiceNumber || e.invoiceNumber !== e.invoiceNumber.trim().replace(/\s+/, ' ')) {
                            throwArgumentValidationError('header', header, {message: 'Additional Expense must have valid invoice number'})
                        }
                        const same = header.additionalExpense.find((a, ind) => ind !== index && a.customerId === e.customerId && a.invoiceNumber === e.invoiceNumber)
                        if (same) {
                            throwArgumentValidationError('header', header, {message: 'Additional Expense must be unique by client and number of invoice'})
                        }
                        return Expense.insertOne(e, {calculationId: calculation.id}, ctx, options)
                    })
                    await Promise.all(expensePromise)
                }
                calculation = await Calculation.getCalculationById(calculation.id, options)
                if (!calculation) {
                    throwArgumentValidationError('id', header, {message: 'Calculation not exists or not editable'})
                }
                await calculation.checkCalculationHeaderValid()
                await calculation.save(options)
                await transaction.commit()
                return Calculation.selectOne(calculation.id, ctx)
            } catch (e) {
                transaction.rollback()
                throw (e)
            }
        }

        if (entryData.itemInputType && id) {
            const transaction = await Calculation.sequelize.transaction()
            if (!transaction) {
                throw Error('Transaction can\'t be open')
            }
            const options = {transaction, validate: true}
            const calculation = await Calculation.findOne({
                where: {
                    id,
                    clientId: ctx.clientId,
                    status: CONSTANT_MODEL.CALCULATION_STATUS.OPENED, /** for now **/
                },
                ...options
            })
            if (!calculation) {
                throwArgumentValidationError('id', {}, {message: 'Calculation not exists or not editable'})
            }
            await calculation.update({itemInputType: entryData.itemInputType}, options)
            await transaction.commit()
            return Calculation.selectOne(calculation.id, ctx)
        }

        if (entryData.status && id) {
            /**  just validate **/
            if (entryData.status === CONSTANT_MODEL.CALCULATION_STATUS.VALIDATE) {
                const transaction = await Calculation.sequelize.transaction()
                if (!transaction) {
                    throw Error('Transaction can\'t be open')
                }
                const options = {transaction}
                try {
                    const calculation = await Calculation.getCalculationById(id, options)
                    await calculation.validateData(options)
                    transaction.commit()
                } catch (e) {
                    transaction.rollback()
                    throw e
                }
                return Calculation.selectOne(id, ctx)
            }

            if (entryData.status === CONSTANT_MODEL.CALCULATION_STATUS.RECALCULATE) {
                const transaction = await Calculation.sequelize.transaction()
                if (!transaction) {
                    throw Error('Transaction can\'t be open')
                }
                const options = {transaction}
                try {
                    const calculation = await Calculation.getCalculationById(id, options)
                    await calculation.recalculateItemsData(options)
                    transaction.commit()
                } catch (e) {
                    transaction.rollback()
                    throw e
                }
                return Calculation.selectOne(id, ctx)
            }

            /** for test  */
            if (entryData.status === CONSTANT_MODEL.CALCULATION_STATUS.SAVED) {
                const transaction = await Calculation.sequelize.transaction()
                if (!transaction) {
                    throw Error('Transaction can\'t be open')
                }
                const options = {transaction}
                try {
                    const calculation = await Calculation.getCalculationById(id, options)
                    await calculation.recalculateItemsData(options)
                    await calculation.update({status: entryData.status}, options)
                    const proms = calculation.dueDate.map(x => x.update({status: entryData.status, options}))
                    await Promise.all([...proms])
                    transaction.commit()
                } catch (e) {
                    transaction.rollback()
                    throw e
                }
                return Calculation.selectOne(id, ctx)
            }
            /**  for test end */

            if (entryData.status === CONSTANT_MODEL.CALCULATION_STATUS.OPENED || entryData.status === CONSTANT_MODEL.CALCULATION_STATUS.SAVED || entryData.status === CONSTANT_MODEL.CALCULATION_STATUS.BOOKED) {
                const transaction = await Calculation.sequelize.transaction()
                if (!transaction) {
                    throw Error('Transaction can\'t be open')
                }
                const options = {transaction, validate: true}
                try {
                    const calculation = await Calculation.getCalculationById(id, options)

                    switch (calculation.status) {
                        case CONSTANT_MODEL.CALCULATION_STATUS.BOOKED:
                            throw ('Action not allowed')
                        case CONSTANT_MODEL.CALCULATION_STATUS.SAVED:
                            if (entryData.status === CONSTANT_MODEL.CALCULATION_STATUS.VALIDATE) {
                                throw ('Action not allowed')
                            }
                    }

                    if (entryData.status !== CONSTANT_MODEL.CALCULATION_STATUS.OPENED) {
                        await calculation.validateData(options)
                    }
                    if (entryData.status === CONSTANT_MODEL.CALCULATION_STATUS.BOOKED) {
                        await calculation.saveToWarehouse(options, ctx)
                    }
                    await calculation.update({status: entryData.status}, options)
                    const proms = calculation.dueDate.map(x => x.update({status: CONSTANT_MODEL.DUE_DATES_STATUS.ACTIVE, options}))
                    await Promise.all([...proms])
                    await transaction.commit()
                    return Calculation.selectOne(id, ctx)
                } catch (e) {
                    transaction.rollback()
                    throw e
                }

            }
            return Calculation.selectOne(id, ctx)
        }

        return Calculation.selectOne(id, ctx)

    }

    public static async insertOne (entryData: CalculationType, ctx: IContextApp): Promise<Calculation> {
        return Calculation.insertUpdate(0, entryData, ctx)
    }

    public static async updateOne (id: number, entryData: CalculationType, ctx: IContextApp): Promise<Calculation> {
        return Calculation.insertUpdate(id, entryData, ctx)
    }

    public static async totalTransactionByCustomer (ctx: IContextApp, customerId?: number, dateStart?: Date, dateEnd?: Date): Promise<TransactionCustomerSummarize> {
        if (!dateStart) {
            dateStart = new Date(2000, 1, 1)
        }

        if (!dateEnd) {
            dateEnd = new Date()
            dateEnd.setDate(dateEnd.getDate() + 1)
        }

        const res = Calculation.findOne({
            where: Object.assign({
                clientId: ctx.clientId,
                status: CONSTANT_MODEL.CALCULATION_STATUS.BOOKED,
                date: {
                    [Sequelize.Op.and]: {
                        [Sequelize.Op.gte]: dateStart,
                        [Sequelize.Op.lte]: dateEnd
                    },
                },
            }, customerId && {supplierId: customerId}),
            attributes: [[Sequelize.fn('sum', Sequelize.col('total_finance_mp')), 'finance']]
        })

        const [result, customer] = await Promise.all([res, Customer.findByPk(customerId)])
        return {
            customer,
            finance: (result as TSumFinance<Calculation>).getDataValue('finance') || 0
        }
    }

}

const BaseResolver = createBaseResolver(Calculation, {
    updateInputType: CalculationType,
    insertInputType: CalculationType
})

@Resolver()
export class CalculationResolver extends BaseResolver {

    @UseMiddleware(checkJWT)
    @Query(returns => TransactionCustomerSummarize, {nullable: true, name: 'TransactionCalculationCustomerSum'})
    getCustomerSum (@Arg('customerId', type => Int, {nullable: true})customerId: number,
        @Arg('dateStart', type => Date, {nullable: true}) dateStart: Date,
        @Arg('dateEnd', type => Date, {nullable: true}) dateEnd: Date,
        @Ctx() ctx: IContextApp) {
        return Calculation.totalTransactionByCustomer(ctx, customerId, dateStart)
    }

}

