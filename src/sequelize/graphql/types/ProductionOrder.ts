import {
    Field,
    InputType,
    Int
}                    from 'type-graphql'
import {ExpenseType} from "./Calculation";

@InputType({ isAbstract: true })
export class ProductionOrderHeaderType {
    @Field(type => Date)
    date: Date

    @Field(type => Int)
    itemId: number

    @Field(type => Int)
    normativeId: number

    @Field()
    quantity: number

    @Field(type => [ExpenseType], {nullable: true})
    expense: ExpenseType[]
}

@InputType({ isAbstract: true })
export class ProductionOrderType {
    @Field(type => ProductionOrderHeaderType,{nullable:true})
    header: ProductionOrderHeaderType

    @Field(type => Int,{ nullable: true })
    status: number
}

@InputType({ isAbstract: true })
export class ProductionOrderItemType {

    @Field({nullable: true})
    quantity: number

    @Field(type => Int, {nullable: true})
    itemId: number
    
    @Field(type => Int, {nullable: true})
    productionOrderId: number

    @Field(type => Int,{ nullable: true })
    status: number
}