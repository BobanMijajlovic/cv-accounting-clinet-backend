import {
    Field,
    InputType,
    Int,
    ObjectType
}                    from 'type-graphql'
import {AddressType} from './Address'
import {ContactType} from './Contact'

import * as GraphQLJSON  from 'graphql-type-json'
import {BankAccountType} from './BankAccount'
import Customer          from '../../models/Customer.model'
import Item              from '../../models/Item.model'

@InputType()
export class CustomerType {

    @Field({nullable: true})
    shortName: string
    @Field({nullable: true})
    fullName: string

    @Field({nullable: true})
    taxNumber: string

    @Field({nullable: true})
    uniqueCompanyNumber: string

    @Field({nullable: true})
    description: string

    @Field({nullable: true})
    status: number

    @Field(type => [AddressType!], {nullable: true})
    addresses: AddressType[]

    @Field(type => [ContactType!], {nullable: true})
    contacts: ContactType[]

    @Field(type => [BankAccountType!], {nullable: true})
    banks: BankAccountType[]

    @Field(type => [CustomerInfoType!], {nullable: true})
    infos: CustomerInfoType[]
}

@InputType()
export class CustomerInfoType {

    @Field({nullable: true})
    key: string

    @Field({nullable: true})
    value: string

    @Field(type => GraphQLJSON.default, {nullable: true})
    valueJSON: object

    @Field({nullable: true})
    status: number
}

@InputType()
export class CustomerSettingsType {
    @Field(type => Int)
    customerId: number

    @Field(type => [CustomerInfoType!]!)
    settings: CustomerInfoType[]
}

@ObjectType({isAbstract: true})
export class TransactionCustomerSummarize {

    @Field(type => Customer, {nullable: true})
    customer: Customer

    @Field()
    finance: number
}

@ObjectType({isAbstract: true})
export class FinanceTodayFutureSummarize {

    @Field(type => Customer, {nullable: true})
    customer?: Customer

    @Field()
    financeToday: number

    @Field()
    financeFuture: number
}

@ObjectType({isAbstract: true})
export class SummarizeFinanceOwesClaimsNextWeek {
    @Field()
    dueDate: string

    @Field()
    finance: number

}

@ObjectType({isAbstract: true})
export class CustomerFinanceClaimsOwesNextWeek {
    @Field(type => [SummarizeFinanceOwesClaimsNextWeek])
    claims: SummarizeFinanceOwesClaimsNextWeek[]

    @Field(type => [SummarizeFinanceOwesClaimsNextWeek])
    owes: SummarizeFinanceOwesClaimsNextWeek[]
}

@ObjectType({isAbstract: true})
export class TransactionCustomerTotalSummarize {

    @Field(type => Customer, {nullable: true})
    customer: Customer

    @Field()
    financeOwes: number

    @Field()
    financeClaims: number

    @Field()
    financeBankClaims: number

    @Field()
    financeBankOwes: number

    @Field(type => FinanceTodayFutureSummarize, {nullable: true})
    invoiceDueDate?: FinanceTodayFutureSummarize

    @Field(type => FinanceTodayFutureSummarize, {nullable: true})
    returnInvoiceDueDate?: FinanceTodayFutureSummarize

    @Field(type => FinanceTodayFutureSummarize, {nullable: true})
    calculationDueDate?: FinanceTodayFutureSummarize
}

@ObjectType({isAbstract: true})
export class TransactionItemSummarize {

    @Field(type => Item, {nullable: true})
    item?: Item

    @Field({nullable: true})
    date?: string

    @Field()
    quantity: number

    @Field()
    financeVP: number

    @Field()
    taxFinance: number
}

