import {
    Field,
    InputType,
    Int
}                      from 'type-graphql'
import {UploadType}    from './Client'
import {GraphQLUpload} from 'apollo-server-express'
import {IMAGE_TYPES}   from '../../constants'

@InputType()
export class ItemSupplierType {

    @Field(type => Int, {nullable: true})
    code: number

    @Field(type => Int, {nullable: true})
    supplierId: number

    @Field(type => Int, {nullable: true})
    itemId: number

    @Field(type => Int, {nullable: true})
    status: number
}

@InputType()
export class ItemType {

    @Field(type => Int, {nullable: true})
    type: number

    @Field({nullable: true})
    shortName: string

    @Field({nullable: true})
    fullName: string

    @Field(type => Int, {nullable: true})
    uom: number

    @Field({nullable: true})
    barCode: string

    @Field(type => Int, {nullable: true})
    code: number

    @Field(type => Int, {nullable: true})
    taxId: number

    @Field({nullable: true})
    vp: number

    @Field({nullable: true})
    mp: number

    @Field(type => Int,{nullable: true})
    categoryId: number

    @Field(type => GraphQLUpload,{nullable:true})
    image: UploadType

    @Field(type => [ItemSupplierType], {nullable: true})
    itemSuppliers: ItemSupplierType[]
}

@InputType()
export class ImageType {
    @Field()
    name: string

    @Field()
    url: string

    @Field()
    googleId: string

    @Field( type => Int)
    type: number

    @Field(type => Int)
    size: number
}

@InputType()
export class ItemImageType extends ImageType {

    @Field( type => Int)
    itemId: number
}

@InputType()
export class UserImageType extends ImageType {

    @Field( type => Int)
    userId: number
}

@InputType()
export class ItemCategoryType {

    @Field(type => Int)
    itemId: number

    @Field(type => Int)
    categoryId: number
}
