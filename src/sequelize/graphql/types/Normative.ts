import {
    Field,
    InputType,
    Int
} from 'type-graphql'

@InputType({ isAbstract: true })
export class NormativeType {

    @Field({nullable: true})
    financeVP: number

    @Field(type => Int, {nullable:true})
    itemId: number
    
    @Field({nullable: true})
    description: string

    @Field({nullable: true})
    plannedPrice: number

    @Field(type => Int,{ nullable: true })
    status: number
}

@InputType({ isAbstract: true })
export class NormativeItemType {

    @Field({nullable: true})
    quantity: number

    @Field(type => Int)
    normativeId: number

    @Field(type => Int, {nullable:true})
    activeNormativeId: number

    @Field(type => Int)
    itemId: number

    @Field(type => Int,{ nullable: true })
    status: number
}