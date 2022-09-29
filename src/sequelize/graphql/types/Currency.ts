import {
    Field,
    InputType
}                    from 'type-graphql'
import {AddressType} from './Address'

@InputType({isAbstract: true})
export class CurrencyValueType {
    @Field()
    date: Date
    @Field()
    unit: number
    @Field()
    buyingRate: number
    @Field()
    middleRate: number
    @Field()
    sellingRate: number
    @Field()
    currencyDefinitionId: number
}

@InputType({isAbstract: true})
export class CurrencyDefinitionType {

    @Field({nullable: true})
    name: string
    @Field({nullable: true})
    short: string
    @Field({nullable: true})
    mark: string
    @Field(type => CurrencyValueType, {nullable: true})
    value: CurrencyValueType

    @Field({nullable: true})
    status: number
}
