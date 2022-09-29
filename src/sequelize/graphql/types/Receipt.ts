import {
    Field,
    InputType,
    ObjectType
}             from 'type-graphql'
import {
    Max,
    Min
}             from 'class-validator'
import {User} from '../../models'
import Item   from '../../models/Item.model'

@InputType({isAbstract: true})
export class ReceiptPaymentType {
    @Field()
    type: number

    @Field()
    value: number
}

@InputType({isAbstract: true})
export class ReceiptItemType {
    @Field()
    itemId: number

    @Field()
    @Min(0.001)
    quantity: number

    @Field({nullable: true})
    @Min(0.01)
    price: number

    @Field({nullable:true})
    @Max(99.99)
    discountPercent: number

    @Field({nullable:true})
    discountValue: number

    @Field( type => Date, {nullable: true})
    date: Date
}

@InputType({isAbstract: true})
export class ReceiptType {
    @Field(type => [ReceiptItemType!], {nullable: true})
    items: ReceiptItemType[]

    @Field(type => [ReceiptPaymentType!], {nullable: true})
    payments: ReceiptPaymentType[]
}

@ObjectType({isAbstract: true})
export class TransactionReportsSummarize {

    @Field(type => User)
    user: User

    @Field(type => [ReportItems], {nullable: true})
    items: ReportItems[]
}

@ObjectType({isAbstract: true})
export class ReportSaleByItem {

    @Field(type => Item)
    item: Item

    @Field(type => [ReportItems], {nullable: true})
    items: ReportItems[]
}

@ObjectType({isAbstract: true})
export class ReportItems {
    @Field()
    totalFinance: number

    @Field()
    receiptCount: number

    @Field()
    date: string
}
