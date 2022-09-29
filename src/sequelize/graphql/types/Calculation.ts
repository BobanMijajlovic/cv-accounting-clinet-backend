import {
    Field,
    InputType,
    Int
} from 'type-graphql'
import {
    ArrayNotEmpty,
    MaxLength,
    Min
} from 'class-validator'

@InputType({isAbstract: true})
export class CalculationDiscountType {

    @Field({nullable: true})
    percent: number

    @Field({nullable: true})
    value: number

    @Field({nullable: true})
    @MaxLength(255)
    description: string
}

@InputType({isAbstract: true})
export class ExpenseItemType {

    @Field({nullable: false})
    taxId: number

    @Field({nullable: false})
    financeMP: number

    @Field({nullable: true})
    @MaxLength(255)
    description: string
}

@InputType({isAbstract: true})
export class ExpenseType {
    @Field({nullable: true})
    invoiceNumber: string

    @Field(type => Date, {nullable: true})
    invoiceDate: Date

    @Field(type => Date, {nullable: true})
    dueDate: Date

    @Field(type => Int, {nullable: true})
    customerId: number

    @Field( {nullable: true})
    financeMP: number

    @Field( {nullable: true})
    financeTax: number

    @Field(type => [ExpenseItemType!], {nullable: false})
    items: [ExpenseItemType]

}

@InputType({isAbstract: true})
export class CalculationDueDateType {
    @Field({nullable: true})
    @MaxLength(255)
    description: string

    @Field(type => Date, {nullable: false})
    date: Date

    @Field({nullable: false})
    finance: number
}

@InputType({isAbstract: true})
export class CalculationItemType {

    @Field({nullable: false})
    @Min(1)
    posNumber: number

    @Field({nullable: true})
    @Min(0)
    quantity: number

    @Field({nullable: true})
    priceNoVat: number

    @Field({nullable: true})
    priceWithVat: number

    @Field({nullable: true})
    financeVP: number

    @Field({nullable: true})
    financeMP: number

    @Field({nullable: true})
    discountValue: number

    @Field({nullable: true})
    discountPercent: number

    @Field(type => Int, {nullable: false})
    itemId: number

}

@InputType()
export class CalculationHeaderType {
    @Field({nullable: true})
    number: string

    @Field({nullable: false})
    @MaxLength(4)
    invoiceNumber: string

    @Field({nullable: false})
    @Min(0)
    totalFinanceMP: number

    @Field({nullable: false})
    @Min(0)
    financeTax: number

    @Field(type => Date, {nullable: false})
    date: Date

    @Field(type => Date, {nullable: false})
    invoiceDate: Date

    @Field(type => Int, {nullable: false})
    supplierId: number

    @Field(type => Int, {nullable: false})
    warehouseId: number

    @Field(type => [CalculationDueDateType]!, {nullable: false})
    @ArrayNotEmpty()
    dueDate: CalculationDueDateType[]

    @Field(type => [ExpenseType], {nullable: true})
    expense: ExpenseType[]

    @Field(type => [ExpenseType], {nullable: true})
    additionalExpense: ExpenseType[]

    @Field(type => [CalculationDiscountType], {nullable: true})
    discount: CalculationDiscountType[]

    @Field(type => [CalculationTaxType!], {nullable: true})
    vats: CalculationTaxType[]

}

@InputType({isAbstract: true})
export class CalculationTaxType {
    @Field({nullable: false})
    taxId: number

    @Field({nullable: false})
    taxFinance: number

    @Field({nullable: true})
    financeMP: number
}

@InputType({isAbstract: true})
export class CalculationType {

    @Field(type => CalculationHeaderType, {nullable: true})
    header: CalculationHeaderType

    @Field(type => [CalculationItemType!], {nullable: true})
    items: CalculationItemType[]

    @Field(type => Int,{nullable: true})
    itemInputType: number

    @Field(type => Int, {nullable: true})
    status: number

}

/** additional  Object that used out of GRAPHQL scope */

