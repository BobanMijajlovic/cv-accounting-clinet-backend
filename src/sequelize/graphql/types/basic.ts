import {
    ArgsType,
    ClassType,
    Field,
    InputType,
    Int,
    ObjectType
}                          from 'type-graphql'
import GraphQLJSON         from 'graphql-type-json'
import {Min}               from 'class-validator'
import {InvoiceHeaderType} from './Invoice'
import {
    IContextApp,
    TModelResponse
}                          from '../resolvers/basic'
import {
    Model,
    ModelType
}                          from 'sequelize-typescript'
import InvoiceItem         from '../../models/InvoiceItem.model'
import Expense             from '../../models/Expense.model'
import DueDates            from '../../models/DueDates.model'

export type BasicInvoice = {
    status: number,
    calcAll: (options: any)=> Promise<any>,
    dueDates?: DueDates[],
    totalFinanceMP: number,
    totalFinanceVP: number,
    totalFinanceTax: number,
    date: Date,
    number: string,
    expense: Expense[],
    customerId: number,
    items: InvoiceItem[],
    saveToWarehouse?: (options: any, ctx: IContextApp)=> Promise<any>,
    insertInvoiceTaxes?: (ctx: IContextApp, options: any)=> Promise<any>,
    finance?: number
    clientId?: number
} & Model

export type InvoiceUtilsAdditionalData = {
    invoiceId?: number,
    proformaInvoiceId?: number
    returnInvoiceId?: number
}

export type InvoiceModelUtils<T extends BasicInvoice> = {
    createInvoice: (header: InvoiceHeaderType, options: any, ctx: IContextApp)=> TModelResponse<T>
    selectOneById: (id: number, clientId: number, options?: any)=> TModelResponse<T>
    selectOne: (id: number, ctx: IContextApp)=> TModelResponse<T>
} & ModelType

@InputType()
export class PaginationFilterSortPart {

    @Field(type => String)
    direction: 'ASC' | 'DESC'

    @Field(type => String)
    field: string
}

@InputType()
export class PaginationFilterSearchPart {

    @Field(type => String)
    value: string

    @Field(type => [String])
    fields: [string]
}

@InputType()
export class PaginationFilterRequest {
    @Min(0)
    @Field(type => Int, {nullable: true})
    offset: number

    @Min(0)
    @Field(type => Int, {nullable: true})
    limit: number

    @Min(1)
    @Field(type => Int, {nullable: true})
    page: number

    @Min(1)
    @Field(type => Int, {nullable: true})
    perPage: number

    @Field(type => PaginationFilterSortPart, {nullable: true})
    sort: PaginationFilterSortPart

    @Field(type => PaginationFilterSearchPart, {nullable: true})
    filter: PaginationFilterSearchPart
}

@InputType()
class Sorting {
    @Field(type => String, {nullable: true, defaultValue: 'ASC'})
    direction: ('ASC' | 'DESC')
    @Field(type => String)
    field?: string
}

@ArgsType()
export class RequestFilter {
    @Field(type => GraphQLJSON, {nullable: true})
    filter: any

    @Field(type => GraphQLJSON, {nullable: true})
    include: any
}

@ArgsType()
export class RequestFilterSort {

    @Min(0, {
        message: 'Offset can not be negative value'
    })
    @Field(type => Int, {nullable: true, defaultValue: 0},)
    offset?: number

    @Min(1, {
        message: 'Limit can not be less then 1'
    })
    @Field(type => Int, {nullable: true, defaultValue: 1000})
    limit?: number

    @Min(1, {
        message: 'Page can not be less then 1'
    })
    @Field(type => Int, {nullable: true})
    page: number

    @Min(1, {
        message: 'Per page can not be less then 1'
    })
    @Field(type => Int, {nullable: true})
    perPage: number

    @Field(type => Sorting, {nullable: true})
    sort: Sorting

    @Field(type => GraphQLJSON, {nullable: true})
    filter: any

    @Field(type => [String], {nullable: true})
    group?: string[]

    @Field(type => [String], {nullable: true})
    attributes?: string[]

    @Field(type => GraphQLJSON, {nullable: true})
    include: any

}

export function PaginatedResponse<T> (classT: ClassType<T>) {

    @ObjectType({isAbstract: true})
    abstract class PaginatedResponseClass {
        @Field(type => [classT])
        items: T[]

        @Field(type => Int)
        count: number

        @Field(type => Int, {nullable: true})
        perPage: number

        @Field(type => Int, {nullable: true})
        page: number

        @Field()
        hasMore: boolean
    }

    return PaginatedResponseClass
}

export type TSumFinance<T> = T & Record<'finance', number>

export type TForeignKeys = {
    advanceInvoiceId?: number
    financeTransferDocumentId?: number
    invoiceId?: number
    returnInvoiceId?: number
    proformaInvoiceId?: number
    calculationId?: number
    productionOrderId?: number
}

