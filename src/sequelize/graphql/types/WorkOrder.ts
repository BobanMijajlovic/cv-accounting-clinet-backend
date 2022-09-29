import {
    Field,
    InputType,
    Int
} from 'type-graphql'

@InputType({isAbstract: true})
export class WorkOrderType {

    @Field(type => Int,{nullable: true})
    fromWarehouseId: number

    @Field(type => Int,{nullable: true})
    toWarehouseId: number

    @Field(type => Date, {nullable: true})
    transferDate: Date

    @Field(type => Int,{nullable: true})
    status: number

    @Field(type => [WorkOrderItemType!]!, {nullable: true})
    items: WorkOrderItemType[]
}

@InputType({isAbstract: true})
export class WorkOrderItemType {

    @Field(type => Int,{nullable: true})
    warehouseItemInfoId: number

    @Field({nullable: true})
    quantity: number

    @Field(type => Int,{nullable: true})
    status: number
}
