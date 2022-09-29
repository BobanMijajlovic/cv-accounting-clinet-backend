import 'reflect-metadata'
import {
    AutoIncrement,
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
}                       from 'sequelize-typescript'
import {
    Field,
    ID,
    Int,
    ObjectType
}                       from 'type-graphql'
import {CONSTANT_MODEL} from '../constants'
import Calculation      from './Calculation.model'
import {
    Customer,
    throwArgumentValidationError
}                       from './index'
import Invoice         from './Invoice.model'
import ExpenseItem     from './ExpenseItem.model'
import {ExpenseType}   from '../graphql/types/Calculation'
import _, {
    omit as _omit,
    uniq as _uniq
}                      from 'lodash'
import ProformaInvoice from './ProformaInvoice.model'
import ReturnInvoice   from './ReturnInvoice.model'
import {TForeignKeys}  from '../graphql/types/basic'
import {IContextApp}   from '../graphql/resolvers/basic'
import ProductionOrder from "./ProductionOrder.model";

@ObjectType()
@Table({
    tableName: 'expense'
})

export default class Expense extends Model {
    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(20),
        field: 'invoice_number'
    })
    invoiceNumber: string

    @Field(type => Date, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.DATE,
        field: 'invoice_date',
        comment: 'Date of invoice'
    })
    invoiceDate: Date

    @Field({nullable: true})
    @Min(0)
    @Column({
        allowNull: true,
        type: DataType.DECIMAL(10, 2),
        field: 'finance_mp'
    })
    financeMP: number

    @Field({nullable: true})
    @Min(0)
    @Column({
        allowNull: true,
        type: DataType.DECIMAL(10, 2),
        field: 'finance_tax'
    })
    financeTax: number

    @Field(type => Date, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.DATE,
        field: 'due_date',
        comment: 'Due date'
    })
    dueDate: Date

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Calculation)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_calculation_id'
    })
    calculationId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Invoice)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_invoice_id'
    })
    invoiceId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => ProformaInvoice)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_proforma_invoice_id'
    })
    proformaInvoiceId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => ReturnInvoice)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_return_invoice_id'
    })
    returnInvoiceId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => ProductionOrder)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_production_order_id'
    })
    productionOrderId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Customer)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_customer_id'
    })
    customerId: number

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.STATUS.ACTIVE
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
    @Field(type => Calculation, {nullable: true})
    @BelongsTo(() => Calculation)
    calculation: Calculation

    @Field(type => Invoice, {nullable: true})
    @BelongsTo(() => Invoice)
    invoice: Invoice

    @Field(type => ReturnInvoice, {nullable: true})
    @BelongsTo(() => ReturnInvoice)
    returnInvoice: ReturnInvoice

    @Field(type => ProformaInvoice, {nullable: true})
    @BelongsTo(() => ProformaInvoice)
    proformaInvoice: ProformaInvoice

    @Field(type => ProductionOrder, {nullable: true})
    @BelongsTo(() => ProductionOrder)
    productionOrder: ProductionOrder

    @Field(type => Customer, {nullable: true})
    @BelongsTo(() => Customer)
    customer: Customer

    @Field(type => [ExpenseItem], {nullable: true})
    @HasMany(() => ExpenseItem, {onDelete: 'CASCADE'})
    items: ExpenseItem[]

    private calcMissingValues () {
        this.financeTax = this.items && this.items.length !== 0 ? this.items.reduce((acc: number, x) => {
            const taxFinance = _.divide(x.financeMP, _.divide(_.add(100, Number(x.taxPercent)), Number(x.taxPercent)))
            return _.round(_.add(acc, taxFinance), 2)
        }, 0) : this.financeTax
        this.financeMP = this.items && this.items.length !== 0 ? this.items.reduce((acc: number, x) => _.round(_.add(acc, x.financeMP), 2), 0) : this.financeMP
    }

    public static async insertRows (data: Partial<ExpenseType>[], additional: TForeignKeys, ctx: IContextApp, options: any): Promise<any> {
        const array = data.map(d => Expense.insertOne(d, additional, ctx, options))
        return Promise.all(array)
    }

    public static async insertOne (data: Partial<ExpenseType>, additional: TForeignKeys, ctx: IContextApp, options: any) {

        if (!additional || (!additional.calculationId && !additional.invoiceId && !additional.proformaInvoiceId && !additional.returnInvoiceId && !additional.productionOrderId)) {
            throwArgumentValidationError('data', {}, {message: 'Expense must be part of invoice or calculation or proforma invoice'})
        }

        if (data.invoiceNumber) {
            if (!data.customerId || !data.dueDate || !data.invoiceDate || !data.invoiceNumber) {
                throwArgumentValidationError('data', {}, {message: 'Expense for invoice must have all data'})
            }
        }

        const record = Object.assign({}, _omit(data, ['items']), additional)

        let instanceExpenses = await Expense.create(record, options)

        /** check here that expenses have unique tx id in order to make promiseAll */
        if (data.items) {
            if (_uniq(data.items.map(m => m.taxId)).length !== data.items.length) {
                throwArgumentValidationError('item', {}, {message: 'Expense Item must have unique tax'})
            }
            const arrayPromise = data.items.map(item => ExpenseItem.insertOne(instanceExpenses.id, item, ctx, options))
            await Promise.all(arrayPromise)
        }
        instanceExpenses = await Expense.findOne({
            where: {
                id: instanceExpenses.id,
            },
            include: [
                {
                    model: ExpenseItem
                }
            ],
            ...options
        })
        await instanceExpenses.calcMissingValues()
        await instanceExpenses.save(options)
        return instanceExpenses
    }

    public static async deletedRecords (data: TForeignKeys, options: any) {
        return Expense.destroy({
            where: {
                ...data
            },
            ...options
        })
    }

}

