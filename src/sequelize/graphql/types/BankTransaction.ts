import {
    Field,
    InputType,
    Int,
    ObjectType
}                      from 'type-graphql'
import {ArrayNotEmpty} from 'class-validator'
import Customer        from '../../models/Customer.model'
import Bank            from '../../models/Bank.model'
import BankAccount     from '../../models/BankAccount.model'

@InputType({isAbstract: true})
export class BankTransactionAdditionalDataType {
    @Field({nullable: true})
    accountNumber: string

    @Field({nullable: true})
    modelString: string

    @Field({nullable: true})
    description: string

    @Field({nullable: true})
    transactionKey: string

    @Field({nullable: true})
    code: string
}

@InputType({isAbstract: true})
export class BankTransactionItemType {

    @Field(type => Int, {nullable: true})
    customerId: number

    @Field(type => Int, {nullable: true})
    bankAccountId: number

    @Field({nullable: true})
    finance: number

    @Field({nullable: true})
    expenses: number
    
    @Field(type => Date, {nullable: true})
    datePaid: Date

    @Field(type => Date, {nullable: true})
    dateProcessed: Date

    @Field(type => Int, {nullable: true})
    flag: number
    
    @Field(type => BankTransactionAdditionalDataType,{nullable: true})
    additionalData: BankTransactionAdditionalDataType
}

@InputType({isAbstract: true})
export class BankHeaderTransactionType {

    @Field({nullable: true})
    documentId: string

    @Field({nullable: true})
    description: string

    @Field(type => Date, {nullable: false})
    dateProcessed: Date

    @Field(type => Int, {nullable: false})
    bankAccountId: number

    @Field(type => Int, {nullable: true})
    status: number
}

@InputType({isAbstract: true})
export class BankTransactionType {
    @Field(type => BankHeaderTransactionType,{nullable:true})
    header: BankHeaderTransactionType

    @Field(type => Int, {nullable: true})
    status: number
}

@ObjectType({isAbstract: true})
export class BankTransactionCustomerSummarize {

    @Field(type => Customer, {nullable: true})
    customer?: Customer

    @Field()
    financeClaims: number

    @Field()
    financeOwes: number
}

@ObjectType({isAbstract: true})
export class BankTransactionItemsPdfType {
    @Field()
    claim: number

    @Field()
    owes: number

    @Field(type => Date)
    paidDate: Date

    @Field()
    code: string

    @Field(type => BankAccount,{nullable:true})
    bankAccount?: BankAccount
}

@ObjectType({isAbstract: true})
export class BankTransactionPdfParseType {
    @Field()
    bankAccount: string

    @Field(type => [BankTransactionItemsPdfType]!, {nullable: false})
    items: BankTransactionItemsPdfType[]
}

