import {
    Field,
    InputType,
    Int
} from 'type-graphql'

@InputType({isAbstract: true})
export class TaxTypeDefine {
    @Field({nullable: true})
    name: string

    @Field({nullable: true})
    short: string

    @Field({nullable: true})
    mark: string

    @Field({nullable: true})
    uniqueKey: number

    @Field({nullable: true})
    value: number

    @Field(type => Int, {nullable: true})
    status: number
}

@InputType({isAbstract: true})
export class TaxValueType {
    @Field()
    value: number
    @Field(type => Int, {nullable: true})
    taxId: number
}

@InputType({isAbstract: true})
export class TaxValuesType {
    @Field()
    date: Date

    @Field(type => Int, {nullable: true})
    clientId: number

    @Field(type => [TaxValueType!]!)
    values: TaxValueType[]
}

