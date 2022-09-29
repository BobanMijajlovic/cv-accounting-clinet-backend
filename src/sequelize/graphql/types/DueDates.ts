import {
    Field,
    InputType,
    Int,
    ObjectType
} from 'type-graphql'

@InputType({isAbstract: true})
export class DueDatesType {
    @Field()
    finance: number

    @Field()
    date: Date

    @Field({nullable: true})
    description: string
}

@ObjectType({isAbstract: true})
export class DueDatesSummarize {

    @Field(type => Int, {nullable: true})
    flag?: number

    @Field(type => Int, {nullable: true})
    status?: number

    @Field(type => Int, {nullable: true})
    customerId?: number

    @Field()
    finance: number

    @Field(type => Date, {nullable: true})
    date?: Date
}
