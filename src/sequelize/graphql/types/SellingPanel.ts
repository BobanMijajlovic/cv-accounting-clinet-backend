import {
    Field,
    InputType,
    Int,
    ObjectType
}                             from 'type-graphql'
import SellingPanelVisibility from "../../models/SellingPanelVisibility.model";

@InputType({isAbstract: true})
export class SellingPanelType {

    @Field({nullable: true})
    name: string

    @Field({nullable: true})
    icon: string

    @Field({nullable: true})
    color: string

    @Field(type => Int, {nullable: true})
    type: number

    @Field(type => Int, {nullable: true})
    categoryId: number
}

@InputType({isAbstract: true})
export class SellingPanelItemType {

    @Field({nullable: true})
    label: string

    @Field({nullable: true})
    color: string

    @Field(type => Int, {nullable: true})
    priceFlag: number

    @Field(type => Int, {nullable: true})
    position: number

    @Field(type => Int, {nullable: true})
    itemId: number

    @Field(type => Int, {nullable: true})
    sellingPanelId: number

    @Field(type => Int, {nullable: true})
    childSellingPanelId: number
}

@ObjectType({isAbstract: true})
export class GetSellingPanels {
    @Field(type => Int)
    id: number

    @Field()
    name: string

    @Field({nullable: true})
    color: string

    @Field({nullable: true})
    icon: string

    @Field(type => SellingPanelVisibility, {nullable: true})
    active: SellingPanelVisibility

    @Field(type => [GetSellingPanels], {nullable: true})
    children: GetSellingPanels[]
}
