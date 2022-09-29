import {
    Field,
    InputType,
    Int
}                          from 'type-graphql'
import { InvoiceNoteType } from './Invoice'
import { DueDatesType }    from './DueDates'

@InputType({ isAbstract: true })
export class FinanceTransferDocumentInsertType {

    @Field(type => Int)
    customerId: number

    @Field(type => Int, { nullable: true })
    documentType: number

    @Field(type => Date, { nullable: false })
    date: Date

    @Field({ nullable: false })
    taxId: number

    @Field({ nullable: false })
    totalFinanceMP: number

    @Field({ nullable: false })
    itemDescription: string

    @Field(type => Int, { nullable: true })
    flag: number

    @Field(type => [InvoiceNoteType!], { nullable: true })
    notes: InvoiceNoteType[]

    @Field(type => [DueDatesType!], { nullable: true })
    dueDates: DueDatesType[]
}

@InputType({ isAbstract: true })
export class FinanceTransferDocumentUpdateType {

    @Field(type => Int, { nullable: true })
    status: number

}
