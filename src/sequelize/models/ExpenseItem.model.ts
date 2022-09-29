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
}                                     from 'sequelize-typescript'
import {
    Field,
    ID,
    Int,
    ObjectType
}                                     from 'type-graphql'
import {CONSTANT_MODEL}               from '../constants'
import Expense                        from './Expense.model'
import Tax                            from './Tax.model'
import {throwArgumentValidationError} from './index'
import {round as _round}              from 'lodash'
import {ExpenseItemType}              from '../graphql/types/Calculation'
import {IContextApp}                  from '../graphql/resolvers/basic'

@ObjectType()
@Table({
    tableName: 'expense_item'
})

export default class ExpenseItem extends Model {
    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field({nullable: true})
    @Min(0)
    @Column({
        allowNull: true,
        type: DataType.DECIMAL(10, 2),
    })
    financeMP: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(255)
    })
    description: string

    @Field({nullable: false})
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(10, 2),
        field: 'tax_percent'
    })
    taxPercent: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Tax)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_tax_id'
    })
    taxId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => Expense)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_expense_id'
    })
    expenseId: number

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

    @Field(type => Expense, {nullable: true})
    @BelongsTo(() => Expense)
    expense: Expense

    @Field(type => Tax, {nullable: true})
    @BelongsTo(() => Tax)
    tax: Tax

    /** we only insert the items */
    static async _validate (instance: ExpenseItem, options: any) {
        /** already exists */
        if (instance.financeMP !== _round(instance.financeMP, 2)) {
            throwArgumentValidationError('financeMP', instance, {message: 'Finance MP must be in valid form'})
        }
    }

    @BeforeCreate({name: 'beforeCreateHook'})
    static async _beforeCreateHook (instance: ExpenseItem, options: any) {
        await ExpenseItem._validate(instance, options)
    }

    public static async insertOne (expenseId: number, data: ExpenseItemType, ctx: IContextApp, options: any) {
        const taxes = await ctx.taxes
        const tax = taxes.find(t => t.id === data.taxId)
        return ExpenseItem.create({
            ...data,
            expenseId,
            taxPercent: tax && (tax.values && tax.values[0].value)
        }, options)
    }

}
