import {
    Field,
    InputType,
    Int
}           from 'type-graphql'
import Item from '../../models/Item.model'

@InputType({isAbstract: true})
export class WarehouseSettingType {
    @Field()
    name: string

    @Field()
    value: string

    @Field({nullable: true})
    description: string
}

@InputType({isAbstract: true})
export class WarehouseSettingsType {
    @Field(type => Int)
    warehouseId: number

    @Field(type => [WarehouseSettingType!]!)
    settings: WarehouseSettingType[]
}

@InputType({isAbstract: true})
export class WarehouseFinanceType {

    @Field(type => Date)
    date: Date

    @Field()
    owes: number

    @Field()
    claims: number

    @Field(type => Int)
    warehouseId: number

    @Field(type => Int,{nullable: true})
    invoiceId: number

    @Field(type => Int,{nullable: true})
    calculationId: number

}

@InputType({isAbstract: true})
export class WarehouseType {
    @Field({nullable: true})
    name: string

    @Field({nullable: true})
    description: string

    @Field({nullable: true})
    flag: number

    @Field(type => Int, {nullable: true})
    status: number
}

@InputType({isAbstract: true})
export class WarehouseItemType {
    @Field(type => Int)
    itemId: number

    @Field()
    quantity: number

    @Field({nullable:true})
    price: number

    @Field({nullable:true})
    finance: number
}

/** this is only for test purpose */
@InputType({isAbstract: true})
export class WarehouseItemsBulk {

    @Field(type => Int)
    warehouseId: number

    @Field(type => Int)
    customerId: number

    @Field(type => Int, {nullable: true})
    calculationId: number

    @Field(type => Int, {nullable: true})
    invoiceId: number

    @Field(type => [WarehouseItemType!]!)
    items: WarehouseItemType[]
}

export interface IWarehouseItem {
    item: Item
    quantity: number
    price?: number
    finance?: number
}

export interface IWarehouseItemsRecord {
    warehouseId: number
    calculationId?: number
    returnInvoiceId?: number
    invoiceId?: number
    customerId: number
    items: IWarehouseItem[]
}
