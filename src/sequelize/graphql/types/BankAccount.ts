import {
    Field,
    InputType
} from 'type-graphql'

@InputType({isAbstract: true})
export class BankAccountType {

    @Field({nullable: true})
    account: string

    @Field({nullable: true})
    bankId: number

    @Field({nullable: true})
    status: number
}

