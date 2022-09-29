import {
    Field,
    InputType,
    Int
}                      from 'type-graphql'
import {
    MaxLength,
    Min
}                      from 'class-validator'
import { ExpenseType } from './Calculation'

@InputType({ isAbstract: true })
export class InvoiceVersionType {
    @Field({ nullable: true })
    name: string

    @Field({ nullable: true })
    description: string

    @Field({ nullable: true })
    status: number
}

@InputType({ isAbstract: true })
export class InvoiceDiscountType {

    @Field({ nullable: true })
    percent: number

    @Field({ nullable: true })
    value: number

    @Field({ nullable: true })
    @MaxLength(255)
    description: string
}

@InputType({ isAbstract: true })
export class InvoiceDueDateType {
    @Field()
    finance: number

    @Field()
    dueDate: Date

    @Field({ nullable: true })
    description: string
}

@InputType({ isAbstract: true })
export class InvoiceNoteType {
    @Field()
    note: string
}

@InputType({ isAbstract: true })
export class InvoiceTaxType {
    @Field({ nullable: false })
    taxId: number
    @Field({ nullable: false })
    taxFinance: number
}

@InputType({ isAbstract: true })
export class InvoiceItemType {
    @Field({ nullable: true })
    @Min(0.001)
    quantity: number

    @Field(type => InvoiceDiscountType, { nullable: true })
    discount: InvoiceDiscountType

    @Field({ nullable: true })
    @Min(0.01)
    price: number

    @Field(type => Int, { nullable: false })
    itemId: number

    @Field(type => Int, { nullable: true })
    warehouseId: number

    @Field(type => Int, { nullable: true })
    useDiscountDefault: number
}

@InputType({ isAbstract: true })
export class InvoiceHeaderType {

    @Field(type => Int)
    customerId: number

    @Field({ nullable: true })
    discountDefault: number

    @Field(type => Int)
    flag?: number

    @Field(type => Date, { nullable: true })
    date?: Date
}

@InputType({ isAbstract: true })
export class InvoiceFooterType {
    @Field(type => [InvoiceNoteType!], { nullable: true })
    notes: InvoiceNoteType[]

    @Field(type => [InvoiceDueDateType!], { nullable: true })
    dueDates: InvoiceDueDateType[]

    @Field(type => [ExpenseType], { nullable: true })
    additionalExpense: ExpenseType[]

    @Field(type => [InvoiceDiscountType!], { nullable: true })
    discount: InvoiceDiscountType[]
}

@InputType({ isAbstract: true })
export class InvoiceType {

    @Field(type => InvoiceHeaderType, { nullable: true })
    header: InvoiceHeaderType

    @Field(type => InvoiceFooterType, { nullable: true })
    footer: InvoiceFooterType

    @Field(type => [InvoiceItemType!], { nullable: true })
    items: InvoiceItemType[]

    @Field(type => Int, { nullable: true })
    status: number
}

@InputType({ isAbstract: true })
export class InvoiceAdditionalType {

    @Field(type => Int, { nullable: true })
    invoiceId: number

    @Field(type => Int, { nullable: true })
    proformaInvoiceId: number

    @Field(type => Int, { nullable: true })
    returnInvoiceId: number
}

@InputType({ isAbstract: true })
export class AdvanceInvoiceUpdateType {
    @Field(type => Int, { nullable: true })
    status: number
}

@InputType({ isAbstract: true })
export class AdvanceInvoiceInsertType {

    @Field(type => Int)
    customerId: number

    @Field(type => Date, { nullable: false})
    dueDate: Date

    @Field(type => Date, { nullable: false })
    date: Date

    @Field({ nullable: false })
    taxId: number

    @Field({ nullable: false })
    totalFinanceMP: number

    @Field({ nullable: false })
    itemDescription: string

    @Field(type => [InvoiceNoteType!], { nullable: true })
    notes: InvoiceNoteType[]
}
